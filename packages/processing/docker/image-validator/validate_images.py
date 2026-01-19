#!/usr/bin/env python3
"""
Image Validator Worker
Validates image overlap for photogrammetry processing.
"""

import os
import sys
import json
import tempfile
import zipfile
from pathlib import Path
from typing import List, Tuple
import cv2
import numpy as np
import boto3

def download_and_extract_zip(s3_client, bucket: str, key: str, extract_dir: str) -> List[str]:
    """
    Download ZIP from S3 and extract images

    Returns:
        List of image file paths
    """
    zip_path = os.path.join(extract_dir, "images.zip")

    # Download ZIP
    print(f"Downloading ZIP from S3: {key}")
    s3_client.download_file(bucket, key, zip_path)

    # Extract ZIP
    with zipfile.ZipFile(zip_path, 'r') as zipf:
        zipf.extractall(extract_dir)

    # Find all image files
    image_extensions = {'.jpg', '.jpeg', '.png'}
    images = []
    for ext in image_extensions:
        images.extend(Path(extract_dir).rglob(f"*{ext}"))

    return [str(img) for img in images]

def calculate_image_similarity(img1_path: str, img2_path: str) -> float:
    """
    Calculate similarity between two images using ORB feature matching

    Returns:
        Similarity score (0-1, higher is more similar)
    """
    # Read images
    img1 = cv2.imread(img1_path, cv2.IMREAD_GRAYSCALE)
    img2 = cv2.imread(img2_path, cv2.IMREAD_GRAYSCALE)

    if img1 is None or img2 is None:
        return 0.0

    # Resize images to speed up processing
    max_dim = 800
    h1, w1 = img1.shape
    if max(h1, w1) > max_dim:
        scale = max_dim / max(h1, w1)
        img1 = cv2.resize(img1, None, fx=scale, fy=scale)

    h2, w2 = img2.shape
    if max(h2, w2) > max_dim:
        scale = max_dim / max(h2, w2)
        img2 = cv2.resize(img2, None, fx=scale, fy=scale)

    # Detect ORB keypoints and descriptors
    orb = cv2.ORB_create(nfeatures=1000)
    kp1, des1 = orb.detectAndCompute(img1, None)
    kp2, des2 = orb.detectAndCompute(img2, None)

    if des1 is None or des2 is None:
        return 0.0

    # Match descriptors
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = bf.match(des1, des2)

    # Calculate similarity score
    max_matches = min(len(kp1), len(kp2))
    if max_matches == 0:
        return 0.0

    similarity = len(matches) / max_matches
    return min(similarity, 1.0)

def validate_overlap(images: List[str], min_overlap: float = 0.3) -> Tuple[int, float]:
    """
    Validate that consecutive images have sufficient overlap

    Returns:
        Tuple of (valid_pairs, average_overlap_score)
    """
    if len(images) < 2:
        return 0, 0.0

    # Sort images by name (assuming sequential naming)
    images.sort()

    overlap_scores = []
    valid_pairs = 0

    # Check overlap between consecutive images
    for i in range(len(images) - 1):
        print(f"Checking overlap: {i+1}/{len(images)-1}")
        score = calculate_image_similarity(images[i], images[i+1])
        overlap_scores.append(score)

        if score >= min_overlap:
            valid_pairs += 1

    avg_overlap = sum(overlap_scores) / len(overlap_scores) if overlap_scores else 0.0

    return valid_pairs, avg_overlap

def main():
    """Main processor function"""
    # Get job data
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
        # Download and extract images
        images = download_and_extract_zip(s3_client, s3_bucket, input_file_key, tmpdir)
        print(f"Extracted {len(images)} images")

        if len(images) < 2:
            raise ValueError(f"Insufficient images for validation: {len(images)}")

        # Validate overlap
        print("Validating image overlap...")
        valid_pairs, avg_overlap = validate_overlap(images, min_overlap=0.3)

        # Check if validation passed
        success_rate = valid_pairs / (len(images) - 1) if len(images) > 1 else 0
        validation_passed = success_rate >= 0.7  # At least 70% of pairs should have overlap

        if not validation_passed:
            raise ValueError(
                f"Insufficient overlap: {success_rate:.1%} of image pairs have overlap. "
                f"Need at least 70%."
            )

        # Output result
        result = {
            "outputKey": input_file_key,  # Pass through the same file
            "metadata": {
                "validImages": len(images),
                "overlapScore": round(avg_overlap, 3),
                "validPairs": valid_pairs,
                "totalPairs": len(images) - 1,
                "successRate": round(success_rate, 3),
            }
        }
        print(json.dumps(result))

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
