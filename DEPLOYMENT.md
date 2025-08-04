# DataTrace Deployment Guide

This guide provides comprehensive instructions for deploying the DataTrace application to Railway and other platforms.

## Quick Start

### Option 1: Automated Deployment Script

```bash
# For Linux/macOS
./scripts/deploy.sh docker

# For Windows
scripts\deploy.bat docker
```

### Option 2: Manual Railway Configuration

1. Update `railway.toml` with your preferred strategy
2. Commit and push changes
3. Monitor deployment on Railway dashboard

## Deployment Strategies

### 1. Docker Strategy (Recommended)

Uses `Dockerfile.fixed` with comprehensive optimizations and fallback strategies.

**Configuration:**
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "backend/Dockerfile.fixed"
buildCommand = "npm run build"
```

**Features:**
- ✅ npm ci with fallback to npm install
- ✅ Memory-optimized build process
- ✅ Comprehensive error handling
- ✅ Multi-stage build optimization

**Use when:** You want maximum reliability and optimization

### 2. Simple Docker Strategy

Uses `Dockerfile.simple` that avoids npm ci entirely.

**Configuration:**
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "backend/Dockerfile.simple"
buildCommand = "npm run build"
```

**Features:**
- ✅ Uses npm install throughout
- ✅ Avoids package-lock.json issues
- ✅ Maximum compatibility
- ✅ Simplified build process

**Use when:** Docker builds are failing with npm ci issues

### 3. Buildpack Strategy

Uses Railway's Node.js buildpack for automatic dependency detection.

**Configuration:**
```toml
[build]
builder = "NIXPACKS"
```

**Features:**
- ✅ Automatic dependency detection
- ✅ No Dockerfile required
- ✅ Railway-optimized build process
- ✅ Simplified configuration

**Use when:** Docker builds are consistently failing

## Environment Variables

### Required Variables

Set these in Railway's environment variables section:

```bash
NODE_ENV=production
PORT=3000

# API Keys
DYXLESS_API_KEY=your_dyxless_api_key
ITP_API_KEY=your_itp_api_key
LEAK_OSINT_API_KEY=your_leak_osint_api_key
USERBOX_API_KEY=your_userbox_api_key
VEKTOR_API_KEY=your_vektor_api_key

# Security
ENCRYPTION_KEY=your_32_character_encryption_key
JWT_SECRET=your_jwt_secret_key
CORS_ORIGIN=https://your-frontend-domain.com
```

### Optional Variables

```bash
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/app/logs/application.log

# Monitoring
HEALTH_CHECK_TIMEOUT=5000
MONITORING_ENABLED=true
```

## Troubleshooting

### Common Issues

#### 1. npm ci fails with package-lock.json not found

**Solution:** Switch to simple Docker strategy
```bash
./scripts/deploy.sh simple
```

#### 2. Build fails with exit code 137 (memory issues)

**Solution:** The Docker strategy includes memory optimizations. If still failing, try buildpack:
```bash
./scripts/deploy.sh buildpack
```

#### 3. TypeScript compilation errors

**Solution:** Ensure all TypeScript errors are fixed locally first:
```bash
cd backend
npm run build
```

#### 4. Health check failures

**Symptoms:** Application builds but health checks fail
**Solution:** 
1. Check that the application starts on the correct port (3000)
2. Verify the `/health` endpoint exists
3. Check application logs in Railway dashboard

### Build Testing Locally

Test different strategies locally before deploying:

```bash
# Test all Docker strategies
./scripts/build.sh

# Test specific strategy
docker build -f backend/Dockerfile.fixed -t datatrace-test .
docker run -p 3000:3000 datatrace-test
```

### Deployment Monitoring

Monitor deployments using:

1. **Railway Dashboard:** https://railway.app
2. **Build Logs:** Available in Railway's deployment section
3. **Application Logs:** Check Railway's application logs
4. **Health Endpoint:** `https://your-app.railway.app/health`

## Alternative Platforms

### Vercel (Frontend + Serverless Functions)

For frontend deployment with serverless API:

```json
{
  "builds": [
    { "src": "frontend/package.json", "use": "@vercel/static-build" },
    { "src": "backend/src/index.ts", "use": "@vercel/node" }
  ]
}
```

### Heroku

For Heroku deployment:

```json
{
  "engines": {
    "node": "18.x",
    "npm": "8.x"
  },
  "scripts": {
    "heroku-postbuild": "npm run build"
  }
}
```

### DigitalOcean App Platform

Use the buildpack strategy configuration with DigitalOcean's Node.js buildpack.

## Performance Optimization

### Build Performance

- **Docker Layer Caching:** Enabled automatically on Railway
- **npm Cache:** Configured in Dockerfiles
- **Memory Limits:** Set to 1GB for build, 512MB for runtime
- **Parallel Builds:** Multi-stage Docker builds

### Runtime Performance

- **Health Checks:** Configured with 5-minute timeout
- **Restart Policy:** Automatic restart on failure
- **Resource Limits:** Optimized for Railway's infrastructure

## Security Considerations

### Production Security

- ✅ Non-root user in Docker containers
- ✅ Environment variable encryption
- ✅ CORS configuration
- ✅ Rate limiting enabled
- ✅ Input validation middleware

### API Security

- ✅ API key validation
- ✅ Request sanitization
- ✅ Error message sanitization
- ✅ Security headers (Helmet.js)

## Monitoring and Alerting

### Health Monitoring

- **Endpoint:** `/health`
- **Timeout:** 300 seconds
- **Retry Policy:** 10 retries on failure

### Application Monitoring

- **Logging:** Winston with structured logging
- **Error Tracking:** Comprehensive error middleware
- **Performance Metrics:** Response time tracking

## Support

### Getting Help

1. **Check Logs:** Railway dashboard → Deployments → Logs
2. **Test Locally:** Use `./scripts/build.sh` to test builds
3. **Switch Strategy:** Use deployment scripts to try different approaches
4. **Health Check:** Verify `/health` endpoint responds correctly

### Emergency Procedures

#### Rollback Deployment

1. Go to Railway dashboard
2. Navigate to Deployments
3. Click "Redeploy" on a previous successful deployment

#### Switch Deployment Strategy

```bash
# Quick switch to buildpack if Docker fails
./scripts/deploy.sh buildpack
git add railway.toml
git commit -m "Emergency switch to buildpack deployment"
git push origin main
```

This deployment guide ensures reliable and optimized deployment of the DataTrace application across multiple platforms and strategies.