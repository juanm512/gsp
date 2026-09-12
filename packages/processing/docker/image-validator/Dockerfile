FROM python:3.11-slim

WORKDIR /app

# Install OpenCV and dependencies
RUN apt-get update && apt-get install -y \
    libopencv-dev \
    python3-opencv \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    opencv-python-headless==4.9.* \
    numpy==1.26.* \
    boto3==1.34.*

# Copy the processor script
COPY validate_images.py .

# Run the processor
CMD ["python", "validate_images.py"]
