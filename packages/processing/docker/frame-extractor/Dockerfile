FROM python:3.11-slim

WORKDIR /app

# Install FFmpeg and required libraries
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libvips-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    boto3==1.34.* \
    opencv-python-headless==4.9.* \
    pillow==10.2.*

# Copy the processor script
COPY frame_extractor.py .

# Run the processor
CMD ["python", "frame_extractor.py"]
