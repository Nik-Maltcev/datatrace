#!/bin/bash

# Deployment script with multiple strategy support
# Usage: ./scripts/deploy.sh [docker|buildpack|simple]

set -e

STRATEGY=${1:-docker}
PROJECT_ROOT=$(dirname "$(dirname "$(realpath "$0")")")

echo "🚀 Starting deployment with strategy: $STRATEGY"

case $STRATEGY in
  "docker")
    echo "📦 Using Docker deployment strategy"
    echo "Using Dockerfile.fixed with comprehensive optimizations"
    
    # Update railway.toml to use Docker strategy
    cat > railway.toml << EOF
[build]
builder = "DOCKERFILE"
dockerfilePath = "backend/Dockerfile.fixed"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[settings]
generateDomain = true
EOF
    
    echo "✅ Railway configured for Docker deployment"
    ;;
    
  "buildpack")
    echo "🏗️ Using Buildpack deployment strategy"
    echo "Switching to Railway's Node.js buildpack"
    
    # Update railway.toml to use buildpack strategy
    cat > railway.toml << EOF
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[settings]
generateDomain = true
EOF
    
    echo "✅ Railway configured for Buildpack deployment"
    ;;
    
  "simple")
    echo "🔧 Using Simple Docker deployment strategy"
    echo "Using Dockerfile.simple without npm ci complexity"
    
    # Update railway.toml to use simple Docker strategy
    cat > railway.toml << EOF
[build]
builder = "DOCKERFILE"
dockerfilePath = "backend/Dockerfile.simple"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[settings]
generateDomain = true
EOF
    
    echo "✅ Railway configured for Simple Docker deployment"
    ;;
    
  *)
    echo "❌ Unknown deployment strategy: $STRATEGY"
    echo "Available strategies: docker, buildpack, simple"
    exit 1
    ;;
esac

echo "📝 Deployment configuration updated"
echo "💡 Commit and push changes to trigger Railway deployment"
echo ""
echo "Next steps:"
echo "1. git add railway.toml"
echo "2. git commit -m 'Switch to $STRATEGY deployment strategy'"
echo "3. git push origin main"
echo ""
echo "🔍 Monitor deployment at: https://railway.app"