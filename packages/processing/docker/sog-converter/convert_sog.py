#!/usr/bin/env python3
"""
SOG Converter Worker
Converts PLY/SPLAT files to SOG format for web visualization.
"""

import os
import sys
import json
import tempfile
import shutil
import boto3


def log(title: str, data: dict = None):
    """Print a JSON log entry"""
    entry = {"type": "log", "title": title}
    if data:
        entry["data"] = data
    print(json.dumps(entry))


def convert_to_sog(input_path: str, output_path: str) -> None:
    """Convert PLY/SPLAT to SOG format (placeholder)"""
    shutil.copy2(input_path, output_path)
    log("SOG conversion completed", {"status": "placeholder"})


def main():
    """Main processor function"""
    job_data_str = os.environ.get("JOB_DATA") or sys.stdin.read()
    job_data = json.loads(job_data_str)

    presentation_id = job_data["presentationId"]
    stage_id = job_data["stageId"]
    input_file_key = job_data["inputFileKey"]

    s3_bucket = os.environ["STORAGE_BUCKET_NAME"]
    s3_client = boto3.client(
        "s3",
        aws_access_key_id=os.environ.get("STORAGE_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("STORAGE_SECRET_ACCESS_KEY"),
        endpoint_url=os.environ.get("STORAGE_ENDPOINT"),
        region_name=os.environ.get("STORAGE_REGION", "auto"),
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, "input.ply")
        log("Downloading file", {"key": input_file_key})
        s3_client.download_file(s3_bucket, input_file_key, input_path)

        input_size = os.path.getsize(input_path)
        log("Input file", {"size_mb": round(input_size / 1024 / 1024, 2)})

        output_path = os.path.join(tmpdir, "output.sog")
        log("Converting to SOG")
        convert_to_sog(input_path, output_path)

        output_size = os.path.getsize(output_path)
        log("Output file", {"size_mb": round(output_size / 1024 / 1024, 2)})

        output_key = f"processed/{presentation_id}/final_{stage_id}.sog"
        log("Uploading to S3", {"key": output_key})
        s3_client.upload_file(output_path, s3_bucket, output_key)

        compression_ratio = input_size / output_size if output_size > 0 else 1.0

        result = {
            "type": "result",
            "outputKey": output_key,
            "outputSize": output_size,
            "metadata": {
                "inputSize": input_size,
                "outputSize": output_size,
                "compressionRatio": round(compression_ratio, 2),
            }
        }
        print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"type": "error", "error": str(e)}))
        sys.exit(1)
