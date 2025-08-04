#!/bin/bash

# Build monitoring and testing script
# Tests different Docker build strategies locally

set -e

PROJECT_ROOT=$(dirname "$(dirname "$(realpath "$0")")")
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_DIR="$PROJECT_ROOT/logs/build"

# Create logs directory
mkdir -p "$LOG_DIR"

echo "🔨 Starting local build testing at $(date)"
echo "📁 Logs will be saved to: $LOG_DIR"

# Function to test a Dockerfile
test_dockerfile() {
    local dockerfile=$1
    local strategy=$2
    local log_file="$LOG_DIR/build_${strategy}_${TIMESTAMP}.log"
    
    echo ""
    echo "🧪 Testing $strategy strategy with $dockerfile"
    echo "📝 Log file: $log_file"
    
    # Record build start time
    local start_time=$(date +%s)
    
    # Build Docker image
    if docker build -f "$dockerfile" -t "datatrace-test-$strategy" . > "$log_file" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo "✅ $strategy build succeeded in ${duration}s"
        
        # Test if the image can start
        if docker run --rm -d --name "datatrace-test-$strategy-container" -p 3001:3000 "datatrace-test-$strategy" > /dev/null 2>&1; then
            sleep 5
            
            # Test health endpoint
            if curl -f http://localhost:3001/health > /dev/null 2>&1; then
                echo "✅ $strategy container health check passed"
                docker stop "datatrace-test-$strategy-container" > /dev/null 2>&1
            else
                echo "❌ $strategy container health check failed"
                docker stop "datatrace-test-$strategy-container" > /dev/null 2>&1 || true
            fi
        else
            echo "❌ $strategy container failed to start"
        fi
        
        # Clean up image
        docker rmi "datatrace-test-$strategy" > /dev/null 2>&1 || true
        
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo "❌ $strategy build failed after ${duration}s"
        echo "📋 Last 10 lines of build log:"
        tail -n 10 "$log_file"
    fi
}

# Test different Docker strategies
echo "🚀 Testing Docker build strategies locally"

if [ -f "backend/Dockerfile.fixed" ]; then
    test_dockerfile "backend/Dockerfile.fixed" "fixed"
fi

if [ -f "backend/Dockerfile.simple" ]; then
    test_dockerfile "backend/Dockerfile.simple" "simple"
fi

if [ -f "backend/Dockerfile.fallback" ]; then
    test_dockerfile "backend/Dockerfile.fallback" "fallback"
fi

if [ -f "backend/Dockerfile.debug" ]; then
    test_dockerfile "backend/Dockerfile.debug" "debug"
fi

echo ""
echo "📊 Build testing completed at $(date)"
echo "📁 All logs saved to: $LOG_DIR"
echo ""
echo "💡 To deploy a specific strategy:"
echo "   ./scripts/deploy.sh docker    # Use Dockerfile.fixed"
echo "   ./scripts/deploy.sh simple    # Use Dockerfile.simple"
echo "   ./scripts/deploy.sh buildpack # Use Railway buildpack"