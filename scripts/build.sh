#!/bin/bash

# Privacy Data Removal Service - Build Script
# This script builds the Docker images for the application

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
ENVIRONMENT="development"
NO_CACHE=false
PUSH_IMAGES=false
REGISTRY=""

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

show_help() {
    cat << EOF
Privacy Data Removal Service - Build Script

Usage: $0 [OPTIONS]

OPTIONS:
    -e, --environment ENV    Target environment (development, production) [default: development]
    -n, --no-cache          Build without using cache
    -p, --push              Push images to registry after building
    -r, --registry URL      Docker registry URL for pushing images
    -h, --help              Show this help message

EXAMPLES:
    $0                                    # Build development images
    $0 -e production                     # Build production images
    $0 --no-cache --push                 # Build without cache and push to registry
    $0 -r myregistry.com -p              # Build and push to custom registry

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -n|--no-cache)
            NO_CACHE=true
            shift
            ;;
        -p|--push)
            PUSH_IMAGES=true
            shift
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Validate environment
if [[ "$ENVIRONMENT" != "development" && "$ENVIRONMENT" != "production" ]]; then
    error "Invalid environment: $ENVIRONMENT. Must be 'development' or 'production'"
fi

# Build images
build_images() {
    log "Building images for $ENVIRONMENT environment..."
    
    cd "$PROJECT_ROOT"
    
    local compose_file="docker-compose.yml"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        compose_file="docker-compose.prod.yml"
    fi
    
    local build_args=""
    if [[ "$NO_CACHE" == true ]]; then
        build_args="--no-cache"
        log "Building without cache..."
    fi
    
    # Build backend
    log "Building backend image..."
    if [[ "$ENVIRONMENT" == "production" ]]; then
        docker build $build_args -t privacy-backend:latest -f backend/Dockerfile backend/
    else
        docker build $build_args -t privacy-backend:dev -f backend/Dockerfile.dev backend/
    fi
    
    # Build frontend
    log "Building frontend image..."
    if [[ "$ENVIRONMENT" == "production" ]]; then
        docker build $build_args -t privacy-frontend:latest -f frontend/Dockerfile frontend/
    else
        docker build $build_args -t privacy-frontend:dev -f frontend/Dockerfile.dev frontend/
    fi
    
    log "Images built successfully!"
}

# Tag and push images
push_images() {
    if [[ "$PUSH_IMAGES" != true ]]; then
        return 0
    fi
    
    if [[ -z "$REGISTRY" ]]; then
        error "Registry URL is required when pushing images. Use -r option."
    fi
    
    log "Tagging and pushing images to $REGISTRY..."
    
    local tag_suffix="latest"
    if [[ "$ENVIRONMENT" == "development" ]]; then
        tag_suffix="dev"
    fi
    
    # Tag and push backend
    docker tag privacy-backend:$tag_suffix $REGISTRY/privacy-backend:$tag_suffix
    docker push $REGISTRY/privacy-backend:$tag_suffix
    
    # Tag and push frontend
    docker tag privacy-frontend:$tag_suffix $REGISTRY/privacy-frontend:$tag_suffix
    docker push $REGISTRY/privacy-frontend:$tag_suffix
    
    log "Images pushed successfully!"
}

# Main function
main() {
    log "Starting build process..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running. Please start Docker and try again."
    fi
    
    build_images
    push_images
    
    log "Build process completed successfully!"
    
    # Show built images
    log "Built images:"
    docker images | grep privacy- | head -10
}

# Run main function
main "$@"