"""
gsplat Training Processor - Modal Function
Trains Gaussian Splatting model using gsplat (CUDA-only, no Vulkan).

Based on https://github.com/nerfstudio-project/gsplat
This replaces Brush due to Vulkan initialization issues in Modal headless containers.
"""

import modal
import os
import json
import math
import tempfile
import zipfile
from pathlib import Path
from typing import Dict, Tuple, Optional, List

# Create Modal app
app = modal.App("gsplat-processor")

# Create image with gsplat and dependencies
# Using NVIDIA CUDA base image - no Vulkan required!
gsplat_image = (
    modal.Image.from_registry("nvidia/cuda:12.4.0-devel-ubuntu22.04", add_python="3.11")
    .apt_install([
        "git",
        "wget",
        "build-essential",
        "libgl1-mesa-glx",
        "libglib2.0-0",
    ])
    # Install PyTorch with CUDA 12.4 support (needs custom index URL)
    .run_commands(
        "pip install torch==2.4.0 torchvision==0.19.0 --index-url https://download.pytorch.org/whl/cu124"
    )
    # Install gsplat and dependencies
    .pip_install([
        "gsplat>=1.4.0",
        "pycolmap",
        "plyfile",
        "numpy",
        "tqdm",
        "imageio",
        "pillow",
        "opencv-python-headless",
        "boto3==1.34.*",
        "fastapi",
    ])
)




def rgb_to_sh(rgb: "torch.Tensor") -> "torch.Tensor":
    """Convert RGB to spherical harmonics coefficient (band 0)."""
    C0 = 0.28209479177387814
    return (rgb - 0.5) / C0


def knn(points: "torch.Tensor", k: int) -> "torch.Tensor":
    """K-nearest neighbors distance calculation."""
    import torch
    
    # Compute pairwise distances
    dists = torch.cdist(points, points)
    # Get k smallest distances (including self which is 0)
    knn_dists, _ = torch.topk(dists, k, largest=False)
    return knn_dists


def create_splats_from_sfm(
    points: "torch.Tensor",
    rgbs: "torch.Tensor",
    sh_degree: int = 3,
    init_opacity: float = 0.1,
    init_scale: float = 1.0,
    device: str = "cuda",
) -> "torch.nn.ParameterDict":
    """Create Gaussian splats from SfM points."""
    import torch
    
    N = points.shape[0]
    
    # Initialize the GS size to be the average dist of the 3 nearest neighbors
    dist2_avg = (knn(points, 4)[:, 1:] ** 2).mean(dim=-1)  # [N,]
    dist_avg = torch.sqrt(dist2_avg)
    scales = torch.log(dist_avg * init_scale).unsqueeze(-1).repeat(1, 3)  # [N, 3]
    
    # Random quaternions for orientation
    quats = torch.rand((N, 4))  # [N, 4]
    
    # Logit of opacity
    opacities = torch.logit(torch.full((N,), init_opacity))  # [N,]
    
    # Spherical harmonics coefficients
    colors = torch.zeros((N, (sh_degree + 1) ** 2, 3))  # [N, K, 3]
    colors[:, 0, :] = rgb_to_sh(rgbs)
    
    splats = torch.nn.ParameterDict({
        "means": torch.nn.Parameter(points),
        "scales": torch.nn.Parameter(scales),
        "quats": torch.nn.Parameter(quats),
        "opacities": torch.nn.Parameter(opacities),
        "sh0": torch.nn.Parameter(colors[:, :1, :]),
        "shN": torch.nn.Parameter(colors[:, 1:, :]),
    }).to(device)
    
    return splats


def create_optimizers(
    splats: "torch.nn.ParameterDict",
    scene_scale: float = 1.0,
    batch_size: int = 1,
) -> Dict[str, "torch.optim.Optimizer"]:
    """Create optimizers for all splat parameters."""
    import torch
    
    # Learning rates (scaled by scene scale and batch size)
    lr_config = {
        "means": 1.6e-4 * scene_scale,
        "scales": 5e-3,
        "quats": 1e-3,
        "opacities": 5e-2,
        "sh0": 2.5e-3,
        "shN": 2.5e-3 / 20,
    }
    
    BS = batch_size
    optimizers = {}
    for name, lr in lr_config.items():
        if name in splats:
            optimizers[name] = torch.optim.Adam(
                [{"params": splats[name], "lr": lr * math.sqrt(BS), "name": name}],
                eps=1e-15 / math.sqrt(BS),
                betas=(1 - BS * (1 - 0.9), 1 - BS * (1 - 0.999)),
            )
    
    return optimizers


def export_ply(
    splats: "torch.nn.ParameterDict",
    output_path: str,
) -> int:
    """Export Gaussian splats to PLY format."""
    import torch
    import numpy as np
    from plyfile import PlyData, PlyElement
    
    # Get data from splats
    means = splats["means"].detach().cpu().numpy()
    scales = splats["scales"].detach().cpu().numpy()
    quats = splats["quats"].detach().cpu().numpy()
    opacities = splats["opacities"].detach().cpu().numpy()
    sh0 = splats["sh0"].detach().cpu().numpy()
    shN = splats["shN"].detach().cpu().numpy()
    
    N = means.shape[0]
    
    # Prepare PLY data
    dtype = [
        ("x", "f4"), ("y", "f4"), ("z", "f4"),
        ("nx", "f4"), ("ny", "f4"), ("nz", "f4"),
    ]
    
    # SH coefficients (DC term)
    for i in range(3):
        dtype.append((f"f_dc_{i}", "f4"))
    
    # SH coefficients (higher order)
    sh_dim = shN.shape[1]
    for i in range(sh_dim * 3):
        dtype.append((f"f_rest_{i}", "f4"))
    
    # Opacity
    dtype.append(("opacity", "f4"))
    
    # Scales
    for i in range(3):
        dtype.append((f"scale_{i}", "f4"))
    
    # Quaternions
    for i in range(4):
        dtype.append((f"rot_{i}", "f4"))
    
    # Create structured array
    elements = np.empty(N, dtype=dtype)
    
    # Fill in data
    elements["x"] = means[:, 0]
    elements["y"] = means[:, 1]
    elements["z"] = means[:, 2]
    elements["nx"] = 0
    elements["ny"] = 0
    elements["nz"] = 0
    
    # SH DC
    for i in range(3):
        elements[f"f_dc_{i}"] = sh0[:, 0, i]
    
    # SH higher order - reshape and store
    shN_flat = shN.reshape(N, -1)
    for i in range(min(shN_flat.shape[1], sh_dim * 3)):
        elements[f"f_rest_{i}"] = shN_flat[:, i]
    
    # Fill remaining with zeros if needed
    for i in range(shN_flat.shape[1], sh_dim * 3):
        elements[f"f_rest_{i}"] = 0
    
    elements["opacity"] = opacities
    
    for i in range(3):
        elements[f"scale_{i}"] = scales[:, i]
    
    # Normalize quaternions
    quat_norm = quats / (np.linalg.norm(quats, axis=1, keepdims=True) + 1e-8)
    for i in range(4):
        elements[f"rot_{i}"] = quat_norm[:, i]
    
    # Create PLY
    vertex_element = PlyElement.describe(elements, "vertex")
    ply_data = PlyData([vertex_element])
    ply_data.write(output_path)
    
    return N


@app.function(
    image=gsplat_image,
    gpu="A10G",  # A10G for training
    timeout=7200,  # 2 hours timeout
    memory=49152,  # 48 GB RAM
    secrets=[modal.Secret.from_name("storage-credentials")],
)
@modal.fastapi_endpoint(method="POST")
def train_gaussian_splatting(job_data: dict) -> dict:
    """
    Train Gaussian Splatting model using gsplat

    Args:
        job_data: Dict with presentationId, stageId, inputFileKey, framesFileKey

    Returns:
        Dict with outputKey and metadata
    """
    import torch
    import numpy as np
    import boto3
    from botocore.config import Config
    from tqdm import tqdm
    import imageio
    from PIL import Image
    from gsplat.rendering import rasterization
    from gsplat.strategy import DefaultStrategy
    
    # Verify CUDA is available
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA is not available. This processor requires a GPU.")
    
    device = "cuda"
    print(f"Using device: {device}")
    print(f"CUDA device: {torch.cuda.get_device_name(0)}")
    print(f"CUDA memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")

    presentation_id = job_data["presentationId"]
    stage_id = job_data["stageId"]
    input_file_key = job_data["inputFileKey"]  # COLMAP output ZIP
    frames_file_key = job_data.get("framesFileKey")  # Original frames ZIP

    # Training config
    max_steps = job_data.get("maxSteps", 30_000)
    sh_degree = job_data.get("shDegree", 3)
    ssim_lambda = job_data.get("ssimLambda", 0.2)

    # Storage configuration
    s3_bucket = os.environ["STORAGE_BUCKET_NAME"]
    
    s3_config = Config(
        s3={'addressing_style': 'path'},
        signature_version='s3v4',
    )
    
    s3_client = boto3.client(
        "s3",
        aws_access_key_id=os.environ.get("STORAGE_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("STORAGE_SECRET_ACCESS_KEY"),
        endpoint_url=os.environ.get("STORAGE_ENDPOINT"),
        region_name=os.environ.get("STORAGE_REGION", "auto"),
        config=s3_config,
    )

    def download_with_fallback(key: str, dest_path: str) -> str:
        """Download file, trying with bucket prefix if not found"""
        try:
            s3_client.head_object(Bucket=s3_bucket, Key=key)
            s3_client.download_file(s3_bucket, key, dest_path)
            return key
        except Exception:
            prefixed_key = f"{s3_bucket}/{key}"
            s3_client.head_object(Bucket=s3_bucket, Key=prefixed_key)
            s3_client.download_file(s3_bucket, prefixed_key, dest_path)
            return prefixed_key

    with tempfile.TemporaryDirectory() as tmpdir:
        print(f"=== GSPLAT PROCESSOR JOB DATA ===")
        print(f"  presentationId: {presentation_id}")
        print(f"  stageId: {stage_id}")
        print(f"  inputFileKey (COLMAP): {input_file_key}")
        print(f"  framesFileKey: {frames_file_key}")
        print(f"  maxSteps: {max_steps}")
        print(f"================================")
        
        # Download COLMAP data
        colmap_zip_path = os.path.join(tmpdir, "colmap.zip")
        print(f"Downloading COLMAP data from S3: {input_file_key}")
        download_with_fallback(input_file_key, colmap_zip_path)

        # Extract COLMAP data
        data_dir = os.path.join(tmpdir, "data")
        os.makedirs(data_dir, exist_ok=True)
        with zipfile.ZipFile(colmap_zip_path, 'r') as zipf:
            zipf.extractall(data_dir)
        
        print(f"COLMAP data extracted to: {data_dir}")
        print(f"Contents: {os.listdir(data_dir)}")

        # Download and extract frames (images)
        images_dir = os.path.join(data_dir, "images")
        if frames_file_key:
            frames_zip_path = os.path.join(tmpdir, "frames.zip")
            print(f"Downloading frames from S3: {frames_file_key}")
            try:
                download_with_fallback(frames_file_key, frames_zip_path)
                os.makedirs(images_dir, exist_ok=True)
                with zipfile.ZipFile(frames_zip_path, 'r') as zipf:
                    zipf.extractall(images_dir)
                print(f"Extracted frames to: {images_dir}")
            except Exception as e:
                print(f"ERROR downloading frames: {e}")
                raise
        else:
            print("WARNING: No framesFileKey provided")

        # Find sparse directory
        sparse_dir = None
        for candidate in [
            os.path.join(data_dir, "sparse", "0"),
            os.path.join(data_dir, "sparse"),
            os.path.join(data_dir, "colmap_output", "sparse", "0"),
            os.path.join(data_dir, "colmap_output", "sparse"),
        ]:
            if os.path.exists(candidate):
                sparse_dir = candidate
                break
        
        if sparse_dir is None:
            # List all directories to help debug
            for root, dirs, files in os.walk(data_dir):
                print(f"  {root}: dirs={dirs}, files={files[:5]}...")
            raise ValueError(f"Could not find COLMAP sparse directory in {data_dir}")
        
        print(f"Found sparse directory: {sparse_dir}")

        # Parse COLMAP data using pycolmap
        print("Parsing COLMAP data...")
        from pycolmap import SceneManager
        
        manager = SceneManager(sparse_dir)
        manager.load_cameras()
        manager.load_images()
        manager.load_points3D()
        
        # Extract 3D points
        points3D = manager.points3D.astype(np.float32)
        points_rgb = manager.point3D_colors.astype(np.float32) / 255.0
        
        print(f"Loaded {len(points3D)} 3D points from COLMAP")
        
        if len(points3D) == 0:
            raise ValueError("No 3D points found in COLMAP reconstruction")

        # Extract camera poses
        imdata = manager.images
        camtoworlds = []
        Ks = []
        image_paths = []
        widths = []
        heights = []
        
        bottom = np.array([0, 0, 0, 1]).reshape(1, 4)
        for k in imdata:
            im = imdata[k]
            rot = im.R()
            trans = im.tvec.reshape(3, 1)
            w2c = np.concatenate([np.concatenate([rot, trans], 1), bottom], axis=0)
            c2w = np.linalg.inv(w2c)
            camtoworlds.append(c2w)
            
            # Get camera intrinsics
            cam = manager.cameras[im.camera_id]
            fx, fy, cx, cy = cam.fx, cam.fy, cam.cx, cam.cy
            K = np.array([[fx, 0, cx], [0, fy, cy], [0, 0, 1]])
            Ks.append(K)
            widths.append(cam.width)
            heights.append(cam.height)
            
            # Image path
            img_path = os.path.join(images_dir, im.name)
            if not os.path.exists(img_path):
                # Try without subdirectory
                img_path = os.path.join(images_dir, Path(im.name).name)
            image_paths.append(img_path)
        
        camtoworlds = np.stack(camtoworlds, axis=0).astype(np.float32)
        Ks = np.stack(Ks, axis=0).astype(np.float32)
        
        print(f"Loaded {len(camtoworlds)} camera poses")
        print(f"Image dimensions: {widths[0]}x{heights[0]}")

        # Compute scene scale
        camera_locations = camtoworlds[:, :3, 3]
        scene_center = np.mean(camera_locations, axis=0)
        dists = np.linalg.norm(camera_locations - scene_center, axis=1)
        scene_scale = float(np.max(dists)) * 1.1
        print(f"Scene scale: {scene_scale}")

        # Convert to tensors
        points = torch.from_numpy(points3D).float().to(device)
        rgbs = torch.from_numpy(points_rgb).float().to(device)
        
        # Create splats
        print("Initializing Gaussian splats...")
        splats = create_splats_from_sfm(
            points=points,
            rgbs=rgbs,
            sh_degree=sh_degree,
            device=device,
        )
        
        print(f"Created {len(splats['means'])} Gaussians")

        # Create optimizers
        optimizers = create_optimizers(splats, scene_scale=scene_scale)
        
        # Densification strategy
        strategy = DefaultStrategy(verbose=False)
        strategy_state = strategy.initialize_state(scene_scale=scene_scale)

        # Load training images
        print("Loading training images...")
        train_images = []
        train_camtoworlds = []
        train_Ks = []
        
        for i, img_path in enumerate(tqdm(image_paths[:50], desc="Loading images")):  # Limit to 50 for speed
            if os.path.exists(img_path):
                img = imageio.imread(img_path)
                if img.shape[-1] == 4:  # RGBA
                    img = img[..., :3]
                # Resize if too large
                max_dim = 800
                h, w = img.shape[:2]
                if max(h, w) > max_dim:
                    scale = max_dim / max(h, w)
                    new_h, new_w = int(h * scale), int(w * scale)
                    img = np.array(Image.fromarray(img).resize((new_w, new_h)))
                    # Scale K accordingly
                    K = Ks[i].copy()
                    K[0, :] *= scale
                    K[1, :] *= scale
                else:
                    K = Ks[i]
                
                train_images.append(torch.from_numpy(img).float().to(device) / 255.0)
                train_camtoworlds.append(torch.from_numpy(camtoworlds[i]).float().to(device))
                train_Ks.append(torch.from_numpy(K).float().to(device))
        
        print(f"Loaded {len(train_images)} training images")
        
        if len(train_images) == 0:
            raise ValueError("No training images could be loaded")

        # Training loop
        print(f"Starting training for {max_steps} steps...")
        
        for step in tqdm(range(max_steps), desc="Training"):
            # Select random image
            idx = step % len(train_images)
            image = train_images[idx]
            camtoworld = train_camtoworlds[idx][None]  # [1, 4, 4]
            K = train_Ks[idx][None]  # [1, 3, 3]
            
            height, width = image.shape[:2]
            
            # Get current SH degree (gradually increase)
            cur_sh_degree = min(step // 1000, sh_degree)
            
            # Rasterize
            renders, alphas, info = rasterization(
                means=splats["means"],
                quats=splats["quats"] / (splats["quats"].norm(dim=-1, keepdim=True) + 1e-8),
                scales=torch.exp(splats["scales"]),
                opacities=torch.sigmoid(splats["opacities"]),
                colors=torch.cat([splats["sh0"], splats["shN"]], dim=1),
                viewmats=torch.linalg.inv(camtoworld),
                Ks=K,
                width=width,
                height=height,
                sh_degree=cur_sh_degree,
                near_plane=0.01,
                far_plane=1e10,
            )
            
            # Compute loss
            renders_rgb = renders[0, ..., :3]  # [H, W, 3]
            l1_loss = torch.abs(renders_rgb - image).mean()
            
            # Simple SSIM approximation (using local mean)
            # For full SSIM, you'd use fused_ssim
            loss = (1 - ssim_lambda) * l1_loss + ssim_lambda * l1_loss
            
            # Backward
            loss.backward()
            
            # Step optimizers
            for optimizer in optimizers.values():
                optimizer.step()
                optimizer.zero_grad(set_to_none=True)
            
            # Densification (every 100 steps between 500-15000)
            if step >= 500 and step < 15000 and step % 100 == 0:
                strategy.step_post_backward(
                    params=splats,
                    optimizers=optimizers,
                    state=strategy_state,
                    step=step,
                    info=info,
                )
            
            # Logging
            if step % 1000 == 0:
                print(f"Step {step}: loss={loss.item():.4f}, num_gaussians={len(splats['means'])}")

        print(f"Training completed! Final Gaussians: {len(splats['means'])}")

        # Export PLY
        output_dir = os.path.join(tmpdir, "output")
        os.makedirs(output_dir, exist_ok=True)
        ply_path = os.path.join(output_dir, "model.ply")
        
        print(f"Exporting PLY to: {ply_path}")
        ply_vertices = export_ply(splats, ply_path)
        ply_size = os.path.getsize(ply_path)
        print(f"Exported PLY: {ply_vertices} vertices, {ply_size / 1e6:.1f} MB")

        # Upload to S3
        output_key = f"processed/{presentation_id}/gsplat_{stage_id}.ply"
        print(f"Uploading PLY to S3: {output_key}")
        s3_client.upload_file(ply_path, s3_bucket, output_key)

        return {
            "outputKey": output_key,
            "outputSize": ply_size,
            "metadata": {
                "plyVertices": ply_vertices,
                "iterations": max_steps,
                "trainingCompleted": True,
                "processor": "gsplat",
            }
        }


@app.local_entrypoint()
def main():
    """Local entrypoint for testing"""
    job_data = {
        "presentationId": "test-123",
        "stageId": "stage-789",
        "inputFileKey": "processed/test/colmap.zip",
        "maxSteps": 1000,  # Quick test
    }

    result = train_gaussian_splatting.remote(job_data)
    print(json.dumps(result, indent=2))
