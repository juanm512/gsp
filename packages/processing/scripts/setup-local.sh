#!/bin/bash

# Local Development Setup Script
# This script automates the setup of the local development environment

set -e

echo "🚀 Setting up local development environment..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Docker
echo -n "Checking Docker... "
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗${NC}"
    echo "Docker is not installed. Please install Docker Desktop."
    exit 1
fi
echo -e "${GREEN}✓${NC}"

# Check Python
echo -n "Checking Python 3.11+... "
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗${NC}"
    echo "Python 3 is not installed."
    exit 1
fi
echo -e "${GREEN}✓${NC}"

# Check FFmpeg
echo -n "Checking FFmpeg... "
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${YELLOW}✗${NC}"
    echo "FFmpeg is not installed. Install with:"
    echo "  macOS: brew install ffmpeg"
    echo "  Ubuntu: sudo apt install ffmpeg"
    echo "  Windows: choco install ffmpeg"
    echo ""
fi
echo -e "${GREEN}✓${NC}"

echo ""
echo "📦 Setting up services..."
echo ""

# Start Redis
echo -n "Starting Redis... "
if docker ps | grep -q redis-local; then
    echo -e "${YELLOW}already running${NC}"
elif docker ps -a | grep -q redis-local; then
    docker start redis-local > /dev/null 2>&1
    echo -e "${GREEN}✓${NC}"
else
    docker run -d -p 6379:6379 --name redis-local redis:7-alpine > /dev/null 2>&1
    echo -e "${GREEN}✓${NC}"
fi

# Check Redis connection
echo -n "Testing Redis connection... "
if docker exec redis-local redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "Failed to connect to Redis"
    exit 1
fi

echo ""
echo "🐍 Installing Python dependencies..."
echo ""

pip3 install --quiet boto3==1.34.* opencv-python-headless==4.9.* pillow==10.2.* numpy==1.26.*

echo -e "${GREEN}✓${NC} Python dependencies installed"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo ""
echo "  1. Configure .env.local with your credentials"
echo "     cp .env.example .env.local"
echo ""
echo "  2. Apply database migrations"
echo "     pnpm db:push"
echo ""
echo "  3. Start the services:"
echo "     Terminal 1: pnpm --filter @acme/processing start:cpu"
echo "     Terminal 2: pnpm --filter @acme/processing dev:mock"
echo "     Terminal 3: pnpm dev:next"
echo ""
echo "  4. Open http://localhost:3000"
echo ""
echo "📊 Optional: Start monitoring dashboard"
echo "     pnpm --filter @acme/processing dev:dashboard"
echo "     Open http://localhost:3001/admin/queues"
echo ""
