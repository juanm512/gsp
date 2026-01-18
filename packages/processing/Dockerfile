FROM node:20-slim

WORKDIR /app

# Install Python and dependencies for CPU workers
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    libvips-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip3 install --no-cache-dir \
    boto3==1.34.* \
    opencv-python-headless==4.9.* \
    pillow==10.2.* \
    numpy==1.26.*

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy workspace packages
COPY packages/processing ./packages/processing
COPY packages/db ./packages/db
COPY tooling ./tooling

# Install Node dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Build packages
RUN pnpm --filter @acme/db build
RUN pnpm --filter @acme/processing build

# Set working directory to processing package
WORKDIR /app/packages/processing

# Default: Start all CPU workers
CMD ["pnpm", "start:cpu"]

# For specific workers, override CMD:
# docker run -e WORKER_TYPE=frame-extractor ...
# docker run -e WORKER_TYPE=image-validator ...
