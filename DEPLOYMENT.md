# Privacy Data Removal Service - Deployment Guide

This guide provides comprehensive instructions for deploying the Privacy Data Removal Service in various environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Development Deployment](#development-deployment)
- [Production Deployment](#production-deployment)
- [Docker Configuration](#docker-configuration)
- [Environment Variables](#environment-variables)
- [Monitoring and Health Checks](#monitoring-and-health-checks)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

## Prerequisites

### System Requirements

- **Operating System**: Linux, macOS, or Windows 10/11
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Memory**: Minimum 4GB RAM (8GB recommended for production)
- **Storage**: Minimum 10GB free space (20GB recommended for production)
- **Network**: Internet connection for API calls and image downloads

### Required Software

1. **Docker & Docker Compose**
   ```bash
   # Linux (Ubuntu/Debian)
   sudo apt-get update
   sudo apt-get install docker.io docker-compose
   
   # macOS (using Homebrew)
   brew install docker docker-compose
   
   # Windows
   # Download Docker Desktop from https://www.docker.com/products/docker-desktop
   ```

2. **Node.js** (for local development)
   ```bash
   # Install Node.js 18 or higher
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Git**
   ```bash
   # Linux
   sudo apt-get install git
   
   # macOS
   brew install git
   
   # Windows
   # Download from https://git-scm.com/download/win
   ```

## Environment Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd privacy-data-removal-service
```

### 2. Configure Environment Variables

#### Development Environment

```bash
# Copy example environment files
cp backend/.env.example backend/.env
cp backend/.env.production.example backend/.env.production

# Edit the environment files with your API keys
nano backend/.env
```

#### Production Environment

```bash
# Create production environment file
cp backend/.env.production.example backend/.env.production

# Configure production settings
nano backend/.env.production
```

**Important**: Make sure to set all required API keys:
- `DYXLESS_API_KEY`
- `ITP_API_KEY`
- `LEAK_OSINT_API_KEY`
- `USERBOX_API_KEY`
- `VEKTOR_API_KEY`

### 3. Verify Configuration

```bash
# Check Docker installation
docker --version
docker-compose --version

# Verify environment files exist
ls -la backend/.env*
```

## Development Deployment

### Quick Start

```bash
# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Step-by-Step Development Setup

1. **Build and Start Services**
   ```bash
   # Build images
   docker-compose build
   
   # Start services in detached mode
   docker-compose up -d
   
   # Check service status
   docker-compose ps
   ```

2. **Verify Services**
   ```bash
   # Check backend health
   curl http://localhost:3000/health
   
   # Check frontend
   curl http://localhost:3001
   
   # View monitoring dashboard
   open http://localhost:3000/api/monitoring/dashboard
   ```

3. **Development Workflow**
   ```bash
   # View real-time logs
   docker-compose logs -f backend
   docker-compose logs -f frontend
   
   # Restart specific service
   docker-compose restart backend
   
   # Rebuild after code changes
   docker-compose build backend
   docker-compose up -d backend
   ```

## Production Deployment

### Automated Deployment (Recommended)

#### Linux/macOS

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Deploy to production
./scripts/deploy.sh

# Deploy with options
./scripts/deploy.sh --environment production --force-rebuild

# Dry run to see what would be deployed
./scripts/deploy.sh --dry-run
```

#### Windows

```cmd
# Run deployment script
scripts\deploy.bat

# Deploy with options
scripts\deploy.bat -e production -f

# Dry run
scripts\deploy.bat --dry-run
```

### Manual Production Deployment

1. **Prepare Environment**
   ```bash
   # Ensure production environment file exists
   cp backend/.env.production.example backend/.env.production
   
   # Configure production settings
   nano backend/.env.production
   ```

2. **Build Production Images**
   ```bash
   # Build production images
   docker-compose -f docker-compose.prod.yml build --no-cache
   ```

3. **Deploy Services**
   ```bash
   # Stop any existing services
   docker-compose -f docker-compose.prod.yml down
   
   # Start production services
   docker-compose -f docker-compose.prod.yml up -d
   
   # Verify deployment
   docker-compose -f docker-compose.prod.yml ps
   ```

4. **Verify Production Deployment**
   ```bash
   # Check health endpoints
   curl http://localhost:3000/health
   curl http://localhost/health
   
   # View logs
   docker-compose -f docker-compose.prod.yml logs
   
   # Monitor resource usage
   docker stats
   ```

## Docker Configuration

### Development Configuration (`docker-compose.yml`)

- **Hot Reload**: Code changes are automatically reflected
- **Debug Mode**: Detailed logging and debugging enabled
- **Volume Mounts**: Source code mounted for live editing
- **Port Mapping**: Direct port access for development

### Production Configuration (`docker-compose.prod.yml`)

- **Optimized Images**: Multi-stage builds for smaller images
- **Security**: Non-root users, security headers
- **Performance**: Production-optimized settings
- **Monitoring**: Health checks and resource limits
- **Persistence**: Named volumes for data persistence

### Service Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │    Frontend     │    │    Backend      │
│  (Reverse Proxy)│◄──►│   (React App)   │◄──►│  (Node.js API)  │
│     Port 443    │    │     Port 80     │    │    Port 3000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│      Redis      │    │   File Storage  │    │   Log Storage   │
│   (Caching)     │    │   (Volumes)     │    │   (Volumes)     │
│    Port 6379    │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Environment Variables

### Backend Environment Variables

#### Required Variables

```bash
# API Keys (REQUIRED)
DYXLESS_API_KEY=your_dyxless_api_key_here
ITP_API_KEY=your_itp_api_key_here
LEAK_OSINT_API_KEY=your_leak_osint_api_key_here
USERBOX_API_KEY=your_userbox_api_key_here
VEKTOR_API_KEY=your_vektor_api_key_here

# Application Settings
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com
```

#### Optional Variables

```bash
# Monitoring
MONITORING_ENABLED=true
METRICS_INTERVAL=60000
ALERTS_ENABLED=true

# Performance Thresholds
CPU_WARNING_THRESHOLD=70
CPU_CRITICAL_THRESHOLD=90
MEMORY_WARNING_THRESHOLD=80
MEMORY_CRITICAL_THRESHOLD=95

# Security
ENABLE_CORS=true
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend Environment Variables

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:3000
REACT_APP_ENVIRONMENT=production

# Build Configuration
GENERATE_SOURCEMAP=false
```

## Monitoring and Health Checks

### Health Check Endpoints

- **Backend Health**: `http://localhost:3000/health`
- **Frontend Health**: `http://localhost/health`
- **Monitoring Dashboard**: `http://localhost:3000/api/monitoring/dashboard`

### Monitoring Features

1. **System Metrics**
   - CPU usage and load average
   - Memory consumption
   - Process information

2. **Application Metrics**
   - Request counts and response times
   - Search statistics
   - Error rates and types

3. **Alerts**
   - Automatic threshold monitoring
   - Configurable alert levels
   - Alert resolution tracking

### Log Management

```bash
# View application logs
docker-compose logs -f backend
docker-compose logs -f frontend

# View specific service logs
docker logs privacy-backend-prod

# Log rotation (production)
# Logs are automatically rotated based on size and age
```

## Troubleshooting

### Common Issues

#### 1. Docker Issues

```bash
# Docker daemon not running
sudo systemctl start docker

# Permission denied
sudo usermod -aG docker $USER
# Log out and log back in

# Out of disk space
docker system prune -a
```

#### 2. Port Conflicts

```bash
# Check what's using a port
sudo netstat -tulpn | grep :3000

# Kill process using port
sudo kill -9 $(sudo lsof -t -i:3000)
```

#### 3. Environment Variable Issues

```bash
# Check if environment file exists
ls -la backend/.env*

# Verify environment variables are loaded
docker-compose config
```

#### 4. API Connection Issues

```bash
# Test API connectivity
curl -v http://localhost:3000/health

# Check container networking
docker network ls
docker network inspect privacy-network
```

#### 5. Memory Issues

```bash
# Check container resource usage
docker stats

# Increase Docker memory limit
# Docker Desktop: Settings > Resources > Memory
```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug

# Run with debug output
docker-compose up --build

# Access container shell
docker exec -it privacy-backend-prod /bin/sh
```

### Performance Optimization

1. **Resource Limits**
   ```yaml
   # In docker-compose.prod.yml
   deploy:
     resources:
       limits:
         cpus: '1.0'
         memory: 1G
   ```

2. **Image Optimization**
   ```bash
   # Use multi-stage builds
   # Minimize layer count
   # Use .dockerignore files
   ```

3. **Caching**
   ```bash
   # Enable Redis caching
   # Configure nginx caching
   # Use Docker build cache
   ```

## Maintenance

### Regular Maintenance Tasks

#### 1. Update Dependencies

```bash
# Update Docker images
docker-compose pull

# Rebuild with latest base images
docker-compose build --no-cache
```

#### 2. Backup Data

```bash
# Create backup
./scripts/deploy.sh --skip-tests --skip-backup=false

# Manual backup
docker-compose exec backend tar czf - /app/logs > backup_$(date +%Y%m%d).tar.gz
```

#### 3. Clean Up Resources

```bash
# Remove unused Docker resources
docker system prune -a

# Remove old backups
find ./backups -name "backup_*" -mtime +30 -delete
```

#### 4. Monitor Performance

```bash
# Check resource usage
docker stats

# Review logs for errors
docker-compose logs --tail=100 | grep ERROR

# Monitor disk usage
df -h
```

### Security Updates

1. **Regular Updates**
   ```bash
   # Update base images monthly
   docker pull node:18-alpine
   docker pull nginx:alpine
   
   # Rebuild with updated images
   docker-compose build --no-cache
   ```

2. **Security Scanning**
   ```bash
   # Scan images for vulnerabilities
   docker scan privacy-backend:latest
   docker scan privacy-frontend:latest
   ```

3. **SSL/TLS Configuration**
   ```bash
   # Update SSL certificates
   # Configure HTTPS in nginx
   # Enable HSTS headers
   ```

### Scaling

#### Horizontal Scaling

```yaml
# In docker-compose.prod.yml
services:
  backend:
    deploy:
      replicas: 3
    
  frontend:
    deploy:
      replicas: 2
```

#### Load Balancing

```bash
# Use nginx for load balancing
# Configure upstream servers
# Enable session affinity if needed
```

## Support

For additional support:

1. Check the [troubleshooting section](#troubleshooting)
2. Review application logs
3. Consult the monitoring dashboard
4. Contact the development team

---

**Note**: This deployment guide assumes you have the necessary API keys and permissions to access the external services used by the application. Make sure to configure all environment variables properly before deployment.