#!/bin/bash

# SafeDrive Deployment Script
# This script builds and deploys the SafeDrive application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="safedrive-app"
REGISTRY="${DOCKER_REGISTRY:-}"  # Set this to your container registry
VERSION="${VERSION:-latest}"

echo -e "${GREEN}SafeDrive Deployment Script${NC}"
echo "================================"

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

print_info "Docker is installed: $(docker --version)"

# Build the Docker image
print_info "Building Docker image: ${IMAGE_NAME}:${VERSION}"
docker build -t ${IMAGE_NAME}:${VERSION} .

if [ $? -eq 0 ]; then
    print_info "Docker image built successfully!"
else
    print_error "Docker build failed!"
    exit 1
fi

# Tag the image
if [ ! -z "$REGISTRY" ]; then
    print_info "Tagging image for registry: ${REGISTRY}/${IMAGE_NAME}:${VERSION}"
    docker tag ${IMAGE_NAME}:${VERSION} ${REGISTRY}/${IMAGE_NAME}:${VERSION}
    
    # Push to registry
    read -p "Do you want to push the image to the registry? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Pushing image to registry..."
        docker push ${REGISTRY}/${IMAGE_NAME}:${VERSION}
        
        if [ $? -eq 0 ]; then
            print_info "Image pushed successfully!"
        else
            print_error "Failed to push image to registry!"
            exit 1
        fi
    fi
else
    print_warn "No registry specified. Skipping push to registry."
    print_info "To push to a registry, set the DOCKER_REGISTRY environment variable."
fi

# Run locally
read -p "Do you want to run the container locally? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Starting container locally on port 8080..."
    
    # Stop and remove existing container if it exists
    docker stop safedrive-app 2>/dev/null || true
    docker rm safedrive-app 2>/dev/null || true
    
    # Run the container
    docker run -d \
        -p 8080:8080 \
        -e PORT=8080 \
        --name safedrive-app \
        ${IMAGE_NAME}:${VERSION}
    
    if [ $? -eq 0 ]; then
        print_info "Container started successfully!"
        print_info "Access the application at: http://localhost:8080"
        print_info "View logs with: docker logs -f safedrive-app"
    else
        print_error "Failed to start container!"
        exit 1
    fi
fi

echo ""
print_info "Deployment complete!"
echo ""
echo "Next steps:"
echo "  - For Google Cloud Run: gcloud run deploy safedrive --image ${REGISTRY}/${IMAGE_NAME}:${VERSION} --platform managed"
echo "  - For AWS ECS: Use the AWS Console or CLI to create a new task definition and service"
echo "  - For Azure: az container create --resource-group myResourceGroup --name safedrive --image ${REGISTRY}/${IMAGE_NAME}:${VERSION}"
echo ""
