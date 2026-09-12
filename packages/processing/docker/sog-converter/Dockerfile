FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04 AS base

WORKDIR /app

# Install Python and dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip3 install --no-cache-dir \
    numpy==1.26.* \
    plyfile==1.0.* \
    boto3==1.34.*

# Copy converter script
COPY convert_sog.py .

# Run the processor
CMD ["python3", "convert_sog.py"]
