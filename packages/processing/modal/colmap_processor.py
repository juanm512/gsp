"""
COLMAP Processor - Modal Function
Runs COLMAP for 3D reconstruction from images.
"""

import modal
import os
import json
import tempfile
import zipfile
from pathlib import Path

# Create Modal stub
stub = modal.Stub("colmap-processor")

# Create image with COLMAP installed
colmap_image = (
    modal.Image.from_registry("colmap/colmap:3.9.1", add_python="3.11")
    .apt_install(["git", "wget"])
    .pip_install(["boto3==1.34.*"])
)

@stub.function(
    image=colmap_image,
    gpu="T4",  # T4 is sufficient for COLMAP
    timeout=3600,  # 1 hour timeout
    memory=32768,  # 32 GB RAM
    secrets=[modal.Secret.from_name("aws-s3-credentials")],
)
def run_colmap(job_data: dict) -> dict:
    """
    Run COLMAP on images from S3

    Args:
        job_data: Dict with presentationId, stageId, inputFileKey

    Returns:
        Dict with outputKey and metadata
    """
    import boto3
    import subprocess

    presentation_id = job_data["presentationId"]
    stage_id = job_data["stageId"]
    input_file_key = job_data["inputFileKey"]

    # S3 configuration from environment (set via Modal secrets)
    s3_bucket = os.environ["S3_BUCKET"]
    s3_client = boto3.client(
        "s3",
        aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
        endpoint_url=os.environ.get("S3_ENDPOINT_URL"),
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        # Download images ZIP
        zip_path = os.path.join(tmpdir, "images.zip")
        print(f"Downloading images from S3: {input_file_key}")
        s3_client.download_file(s3_bucket, input_file_key, zip_path)

        # Extract images
        images_dir = os.path.join(tmpdir, "images")
        os.makedirs(images_dir, exist_ok=True)

        with zipfile.ZipFile(zip_path, 'r') as zipf:
            zipf.extractall(images_dir)

        # Create output directory
        output_dir = os.path.join(tmpdir, "colmap_output")
        os.makedirs(output_dir, exist_ok=True)

        # Run COLMAP feature extraction
        print("Running COLMAP feature extraction...")
        subprocess.run([
            "colmap", "feature_extractor",
            "--database_path", os.path.join(output_dir, "database.db"),
            "--image_path", images_dir,
            "--ImageReader.camera_model", "SIMPLE_RADIAL",
            "--ImageReader.single_camera", "1",
        ], check=True)

        # Run COLMAP feature matching
        print("Running COLMAP feature matching...")
        subprocess.run([
            "colmap", "exhaustive_matcher",
            "--database_path", os.path.join(output_dir, "database.db"),
        ], check=True)

        # Run COLMAP sparse reconstruction
        sparse_dir = os.path.join(output_dir, "sparse")
        os.makedirs(sparse_dir, exist_ok=True)

        print("Running COLMAP sparse reconstruction...")
        subprocess.run([
            "colmap", "mapper",
            "--database_path", os.path.join(output_dir, "database.db"),
            "--image_path", images_dir,
            "--output_path", sparse_dir,
        ], check=True)

        # Count reconstruction points
        points_file = os.path.join(sparse_dir, "0", "points3D.bin")
        colmap_points = 0
        if os.path.exists(points_file):
            # Approximate count by file size (each point ~50 bytes)
            colmap_points = os.path.getsize(points_file) // 50

        # Create ZIP of COLMAP output
        output_zip = os.path.join(tmpdir, "colmap_output.zip")
        with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(output_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, output_dir)
                    zipf.write(file_path, arcname)

        output_size = os.path.getsize(output_zip)

        # Upload to S3
        output_key = f"processed/{presentation_id}/colmap_{stage_id}.zip"
        print(f"Uploading COLMAP output to S3: {output_key}")
        s3_client.upload_file(output_zip, s3_bucket, output_key)

        return {
            "outputKey": output_key,
            "outputSize": output_size,
            "metadata": {
                "colmapPoints": colmap_points,
                "imageCount": len(list(Path(images_dir).rglob("*.jpg"))) + len(list(Path(images_dir).rglob("*.png"))),
            }
        }

@stub.local_entrypoint()
def main():
    """Local entrypoint for testing"""
    # Example job data
    job_data = {
        "presentationId": "test-123",
        "stageId": "stage-456",
        "inputFileKey": "uploads/test/images.zip"
    }

    result = run_colmap.remote(job_data)
    print(json.dumps(result, indent=2))
