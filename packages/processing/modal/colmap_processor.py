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

# Create Modal app
app = modal.App("colmap-processor")

# Create image with COLMAP installed
colmap_image = (
    modal.Image.from_registry("colmap/colmap:latest", add_python="3.11")
    .apt_install(["git", "wget"])
    .pip_install(["boto3==1.34.*", "fastapi"])
)

@app.function(
    image=colmap_image,
    gpu="T4",  # T4 is sufficient for COLMAP
    timeout=3600,  # 1 hour timeout
    memory=32768,  # 32 GB RAM
    secrets=[modal.Secret.from_name("storage-credentials")],
)
@modal.fastapi_endpoint(method="POST")
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
    from botocore.config import Config

    presentation_id = job_data["presentationId"]
    stage_id = job_data["stageId"]
    input_file_key = job_data["inputFileKey"]

    # Storage configuration from environment (set via Modal secrets)
    s3_bucket = os.environ["STORAGE_BUCKET_NAME"]
    s3_endpoint = os.environ.get("STORAGE_ENDPOINT")
    s3_region = os.environ.get("STORAGE_REGION", "auto")
    
    # Debug logging for configuration
    print(f"S3 Configuration:")
    print(f"  Bucket: {s3_bucket}")
    print(f"  Endpoint: {s3_endpoint}")
    print(f"  Region: {s3_region}")
    print(f"  Input File Key: {input_file_key}")
    print(f"  Access Key ID (first 5 chars): {os.environ.get('STORAGE_ACCESS_KEY_ID', 'MISSING')[:5]}...")
    
    # R2 requires path-style addressing (not virtual-hosted style)
    s3_config = Config(
        s3={'addressing_style': 'path'},
        signature_version='s3v4',
    )
    
    s3_client = boto3.client(
        "s3",
        aws_access_key_id=os.environ.get("STORAGE_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("STORAGE_SECRET_ACCESS_KEY"),
        endpoint_url=s3_endpoint,
        region_name=s3_region,
        config=s3_config,
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        # Download images ZIP
        zip_path = os.path.join(tmpdir, "images.zip")
        print(f"Downloading images from S3: {input_file_key}")
        
        # Test 1: Try to list objects in the bucket (to verify connectivity)
        print("Testing S3 connectivity...")
        try:
            # List a few objects to verify bucket access
            list_response = s3_client.list_objects_v2(Bucket=s3_bucket, MaxKeys=5)
            print(f"Bucket accessible! Found {list_response.get('KeyCount', 0)} objects")
            if list_response.get('Contents'):
                for obj in list_response['Contents'][:3]:
                    print(f"  - {obj['Key']}")
        except Exception as e:
            print(f"list_objects_v2 failed: {type(e).__name__}: {e}")
        
        # Test 2: Try to list with prefix to see if the path exists
        try:
            prefix = "/".join(input_file_key.split("/")[:-1]) + "/"
            print(f"Checking prefix: {prefix}")
            list_response = s3_client.list_objects_v2(Bucket=s3_bucket, Prefix=prefix, MaxKeys=10)
            print(f"Found {list_response.get('KeyCount', 0)} objects with prefix")
            if list_response.get('Contents'):
                for obj in list_response['Contents']:
                    print(f"  - {obj['Key']}")
        except Exception as e:
            print(f"list_objects_v2 with prefix failed: {type(e).__name__}: {e}")
        
        # Try to find and download the file
        # Note: Some files may have been uploaded with bucket name as prefix (e.g., "gps/processed/...")
        actual_key = input_file_key
        
        # First try the original key
        print(f"Attempting to access: {input_file_key}")
        try:
            head_response = s3_client.head_object(Bucket=s3_bucket, Key=input_file_key)
            print(f"File found at original key, size: {head_response.get('ContentLength', 'unknown')} bytes")
        except Exception as e:
            print(f"File not found at original key, trying with bucket prefix...")
            # Try with bucket name as prefix (workaround for incorrectly uploaded files)
            prefixed_key = f"{s3_bucket}/{input_file_key}"
            try:
                head_response = s3_client.head_object(Bucket=s3_bucket, Key=prefixed_key)
                print(f"File found at prefixed key: {prefixed_key}")
                print(f"Size: {head_response.get('ContentLength', 'unknown')} bytes")
                actual_key = prefixed_key
            except Exception as e2:
                print(f"File not found at either location")
                print(f"  Original key: {input_file_key}")
                print(f"  Prefixed key: {prefixed_key}")
                raise ValueError(f"File not found in S3: {input_file_key}")
        
        print(f"Downloading from key: {actual_key}")
        s3_client.download_file(s3_bucket, actual_key, zip_path)

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

        # Create ZIP of COLMAP output (without images - Brush will download frames separately)
        output_zip = os.path.join(tmpdir, "colmap_output.zip")
        print(f"Creating output ZIP...")
        with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add COLMAP output (database.db, sparse/)
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
                "framesFileKey": actual_key,  # Store frames path for Brush to use
            }
        }

@app.local_entrypoint()
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
