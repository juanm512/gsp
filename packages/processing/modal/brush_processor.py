"""
Brush Training Processor - Modal Function
Trains Gaussian Splatting model using Brush.

Based on https://github.com/ArthurBrussee/brush
"""

import modal
import os
import json
import tempfile
import zipfile
from pathlib import Path

# Create Modal app
app = modal.App("brush-processor")

# Create image with Brush and dependencies
# Based on Brush's official Dockerfile: https://github.com/ArthurBrussee/brush/blob/main/extras/Dockerfile
# Note: We switch to nvidia/cuda base to ensure proper GPU drivers/bootstrapping, and install Rust manually
brush_image = (
    modal.Image.from_registry("nvidia/opengl:1.0-glvnd-devel-ubuntu22.04", add_python="3.11")
    # Install dependencies
    .apt_install([
        "build-essential",
        "curl",
        "git",
        "cmake",
        "libvulkan1",
        "vulkan-tools",
        "pkg-config",
        "libssl-dev",
    ])
    # Install Rust (nightly required for Brush 1.89+ logic, though official docker uses 1.86, we stick to recent)
    .run_commands(
        "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain nightly",
        "echo 'source $HOME/.cargo/env' >> $HOME/.bashrc",
    )
    # Clone and build Brush
    # We use full path to cargo to avoid shell issues with 'source'
    .run_commands(
        "git clone https://github.com/ArthurBrussee/brush.git /brush",
        "$HOME/.cargo/bin/cargo build --release --manifest-path /brush/Cargo.toml",
    )
    # Install Python dependencies for our script
    .pip_install([
        "boto3==1.34.*",
        "fastapi",
    ])
)

@app.function(
    image=brush_image,
    gpu="A10G",  # A10G for more VRAM needed for training
    timeout=7200,  # 2 hours timeout
    memory=49152,  # 48 GB RAM
    secrets=[modal.Secret.from_name("storage-credentials")],
)
@modal.fastapi_endpoint(method="POST")
def train_gaussian_splatting(job_data: dict) -> dict:
    """
    Train Gaussian Splatting model using Brush

    Args:
        job_data: Dict with presentationId, stageId, inputFileKey, framesFileKey

    Returns:
        Dict with outputKey and metadata
    """
    import boto3
    import subprocess
    from botocore.config import Config

    presentation_id = job_data["presentationId"]
    stage_id = job_data["stageId"]
    input_file_key = job_data["inputFileKey"]  # COLMAP output ZIP
    frames_file_key = job_data.get("framesFileKey")  # Original frames ZIP

    # Storage configuration
    s3_bucket = os.environ["STORAGE_BUCKET_NAME"]
    
    # R2 requires path-style addressing (not virtual-hosted style)
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
            # Try with bucket prefix
            prefixed_key = f"{s3_bucket}/{key}"
            s3_client.head_object(Bucket=s3_bucket, Key=prefixed_key)
            s3_client.download_file(s3_bucket, prefixed_key, dest_path)
            return prefixed_key

    with tempfile.TemporaryDirectory() as tmpdir:
        # Log all job data for debugging
        print(f"=== BRUSH PROCESSOR JOB DATA ===")
        print(f"  presentationId: {presentation_id}")
        print(f"  stageId: {stage_id}")
        print(f"  inputFileKey (COLMAP): {input_file_key}")
        print(f"  framesFileKey: {frames_file_key}")
        print(f"================================")
        
        # Download COLMAP data
        colmap_zip_path = os.path.join(tmpdir, "colmap.zip")
        print(f"Downloading COLMAP data from S3: {input_file_key}")
        download_with_fallback(input_file_key, colmap_zip_path)

        # Extract COLMAP data
        colmap_dir = os.path.join(tmpdir, "colmap")
        os.makedirs(colmap_dir, exist_ok=True)
        with zipfile.ZipFile(colmap_zip_path, 'r') as zipf:
            zipf.extractall(colmap_dir)

        # Download and extract frames (images) - required for Brush training
        if frames_file_key:
            frames_zip_path = os.path.join(tmpdir, "frames.zip")
            print(f"Downloading frames from S3: {frames_file_key}")
            try:
                download_with_fallback(frames_file_key, frames_zip_path)
                
                # Extract frames into colmap_dir/images (Brush expects images in an "images" subdirectory)
                images_dir = os.path.join(colmap_dir, "images")
                os.makedirs(images_dir, exist_ok=True)
                with zipfile.ZipFile(frames_zip_path, 'r') as zipf:
                    zipf.extractall(images_dir)
                print(f"Extracted frames to: {images_dir}")
                
                # List extracted files
                all_files = []
                for root, dirs, files in os.walk(images_dir):
                    for f in files:
                        all_files.append(os.path.relpath(os.path.join(root, f), images_dir))
                print(f"Images extracted: {len(all_files)} files")
                if all_files[:5]:
                    print(f"Sample files: {all_files[:5]}")
            except Exception as e:
                print(f"ERROR downloading frames: {e}")
                raise
        else:
            print("WARNING: No framesFileKey provided, Brush may fail to find images")

        # Create output directory
        output_dir = os.path.join(tmpdir, "output")
        os.makedirs(output_dir, exist_ok=True)

        # Run Brush training
        # Brush CLI expects: brush <PATH_OR_URL> [OPTIONS]
        # The path should point to the COLMAP data directory
        print("Running Brush training...")
        print(f"COLMAP data directory: {colmap_dir}")
        print(f"Contents: {os.listdir(colmap_dir)}")
        
        # Check if there's a sparse subdirectory (COLMAP output structure)
        sparse_dir = os.path.join(colmap_dir, "sparse", "0")
        if os.path.exists(sparse_dir):
            data_path = colmap_dir  # Brush should find sparse/0 automatically
        else:
            data_path = colmap_dir
        
        # Brush CLI arguments:
        # --export-every: Export PLY at intervals
        # --export-path: Directory to save exports
        # --export-name: Base name for exported files
        brush_cmd = [
            "/brush/target/release/brush",
            data_path,
            "--export-path", output_dir,
            "--export-every", "30000",  # Export at final step
            "--export-name", "model",
        ]
        
        print(f"Brush command: {' '.join(brush_cmd)}")
        
        # Set environment for headless GPU
        # The nvidia/opengl image should handle the driver libs via glvnd
        env = os.environ.copy()
        env["DISPLAY"] = ""
        env["NVIDIA_DRIVER_CAPABILITIES"] = "all"
        env["NVIDIA_VISIBLE_DEVICES"] = "all"
        
        # DEBUG: Check Vulkan status
        print("Checking Vulkan status...")
        try:
            print("--- /etc/vulkan/icd.d ---")
            subprocess.run(["ls", "-R", "/etc/vulkan"], check=False)
            print("--- /usr/share/vulkan/icd.d ---")
            subprocess.run(["ls", "-R", "/usr/share/vulkan"], check=False)
            print("--- NVIDIA Libraries ---")
            subprocess.run(["find", "/usr", "-name", "lib*nvidia*"], check=False)
            
            subprocess.run(["nvidia-smi"], check=False, env=env)
            subprocess.run(["vulkaninfo", "--summary"], check=False, env=env)
        except Exception as e:
            print(f"Vulkan check failed: {e}")
            
        print(f"Brush command: {' '.join(brush_cmd)}")
        subprocess.run(brush_cmd, check=True, env=env)

        # Find output PLY file (Brush saves as point_cloud.ply)
        ply_files = list(Path(output_dir).glob("*.ply"))
        if not ply_files:
            raise ValueError("No PLY file generated by Brush")

        ply_path = str(ply_files[0])
        ply_size = os.path.getsize(ply_path)

        # Count vertices in PLY (approximate)
        with open(ply_path, 'rb') as f:
            content = f.read(10000)  # Read first 10KB
            # Look for "element vertex" line
            ply_vertices = 0
            for line in content.decode('utf-8', errors='ignore').split('\n'):
                if 'element vertex' in line:
                    ply_vertices = int(line.split()[-1])
                    break

        # Upload PLY to S3
        output_key = f"processed/{presentation_id}/brush_{stage_id}.ply"
        print(f"Uploading PLY to S3: {output_key}")
        s3_client.upload_file(ply_path, s3_bucket, output_key)

        return {
            "outputKey": output_key,
            "outputSize": ply_size,
            "metadata": {
                "plyVertices": ply_vertices,
                "iterations": 30000,
                "trainingCompleted": True,
            }
        }

@app.local_entrypoint()
def main():
    """Local entrypoint for testing"""
    job_data = {
        "presentationId": "test-123",
        "stageId": "stage-789",
        "inputFileKey": "processed/test/colmap.zip"
    }

    result = train_gaussian_splatting.remote(job_data)
    print(json.dumps(result, indent=2))
