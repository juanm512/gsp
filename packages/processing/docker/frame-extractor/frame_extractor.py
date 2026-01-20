#!/usr/bin/env python3
"""
Frame Extractor Worker
Extracts frames from videos and uploads them to S3 as a ZIP file.
"""

import os
import sys
import json
import subprocess
import tempfile
import zipfile
from pathlib import Path
import boto3

def extract_frames(video_path: str, output_dir: str, fps: int = 2) -> int:
    """
    Extract frames from video using FFmpeg

    Args:
        video_path: Path to input video file
        output_dir: Directory to save extracted frames
        fps: Frames per second to extract (default: 2)

    Returns:
        Number of frames extracted
    """
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    # Extract frames using FFmpeg with memory-optimized settings
    # -vf fps={fps},scale=w=1280:h=-1 - Extract {fps} fps, max width 1280
    # -qscale:v 4 - Lower quality to reduce memory/CPU
    # -threads 1 - Single thread to limit memory
    output_pattern = os.path.join(output_dir, "frame_%06d.jpg")

    cmd = [
        "ffmpeg",
        "-i", video_path,
        "-vf", f"fps={fps},scale=w=1280:h=-1:force_original_aspect_ratio=decrease",
        "-qscale:v", "4",
        "-threads", "1",
        "-an",  # No audio
        output_pattern
    ]

    subprocess.run(cmd, check=True, capture_output=True)

    # Count extracted frames
    frames = list(Path(output_dir).glob("frame_*.jpg"))
    return len(frames)

def create_zip(source_dir: str, output_zip: str) -> int:
    """
    Create ZIP file from directory

    Returns:
        Size of ZIP file in bytes
    """
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir)
                zipf.write(file_path, arcname)

    return os.path.getsize(output_zip)

def main():
    """Main processor function"""
    # Get job data from stdin or environment
    job_data_str = os.environ.get("JOB_DATA") or sys.stdin.read()
    job_data = json.loads(job_data_str)

    presentation_id = job_data["presentationId"]
    stage_id = job_data["stageId"]
    input_file_key = job_data["inputFileKey"]

    # Storage configuration
    s3_bucket = os.environ["STORAGE_BUCKET_NAME"]
    s3_client = boto3.client(
        "s3",
        aws_access_key_id=os.environ.get("STORAGE_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("STORAGE_SECRET_ACCESS_KEY"),
        endpoint_url=os.environ.get("STORAGE_ENDPOINT"),
    )

    # Create temporary directory
    with tempfile.TemporaryDirectory() as tmpdir:
        # Download video from S3
        video_path = os.path.join(tmpdir, "input_video.mp4")
        print(f"Downloading video from S3: {input_file_key}")
        s3_client.download_file(s3_bucket, input_file_key, video_path)

        # Extract frames
        frames_dir = os.path.join(tmpdir, "frames")
        print("Extracting frames from video...")
        frame_count = extract_frames(video_path, frames_dir, fps=2)
        print(f"Extracted {frame_count} frames")

        # Create ZIP file
        zip_path = os.path.join(tmpdir, "frames.zip")
        print("Creating ZIP file...")
        zip_size = create_zip(frames_dir, zip_path)
        print(f"Created ZIP file: {zip_size / 1024 / 1024:.2f} MB")

        # Upload ZIP to S3
        output_key = f"processed/{presentation_id}/frames_{stage_id}.zip"
        print(f"Uploading ZIP to S3: {output_key}")
        s3_client.upload_file(zip_path, s3_bucket, output_key)

        # Output result as JSON
        result = {
            "outputKey": output_key,
            "outputSize": zip_size,
            "metadata": {
                "frameCount": frame_count,
                "fps": 2,
            }
        }
        print(json.dumps(result))

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
