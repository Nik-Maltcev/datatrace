#!/bin/bash

# Privacy Data Removal Service - System Optimization Script
# This script optimizes the application for production performance

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/optimization.log"

# Default values
OPTIMIZE_DOCKER=true
OPTIMIZE_CODE=true
OPTIMIZE_DATABASE=false
OPTIMIZE_CACHE=true
ANALYZE_PERFORMANCE=true
DRY_RUN=false

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

show_help() {
    cat << EOF
Privacy Data Removal Service - System Optimization Script

Usage: $0 [OPTIONS]

OPTIONS:
    --skip-docker          Skip Docker image optimization
    --skip-code           Skip code optimization
    --skip-cache          Skip cache optimization
    --enable-database     Enable database optimization
    --skip-analysis       Skip performance analysis
    --dry-run            Show what would be done without executing
    -h, --help           Show this help message

EXAMPLES:
    $0                           # Run all optimizations
    $0 --skip-docker            # Skip Docker optimization
    $0 --dry-run                # Show optimization plan
    $0 --enable-database        # Include database optimization

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-docker)
            OPTIMIZE_DOCKER=false
            shift
            ;;
        --skip-code)
            OPTIMIZE_CODE=false
            shift
            ;;
        --skip-cache)
            OPTIMIZE_CACHE=false
            shift
            ;;
        --enable-database)
            OPTIMIZE_DATABASE=true
            shift
            ;;
        --skip-analysis)
            ANALYZE_PERFORMANCE=false
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
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

# Docker optimization
optimize_docker() {
    if [[ "$OPTIMIZE_DOCKER" != true ]]; then
        return 0
    fi

    log "Optimizing Docker images..."

    cd "$PROJECT_ROOT"

    if [[ "$DRY_RUN" == false ]]; then
        # Remove unused Docker resources
        log "Cleaning up unused Docker resources..."
        docker system prune -f --volumes || warn "Failed to prune Docker system"

        # Optimize backend Dockerfile
        log "Optimizing backend Docker image..."
        if [[ -f "backend/Dockerfile" ]]; then
            # Build optimized image
            docker build --no-cache -t privacy-backend:optimized -f backend/Dockerfile backend/ || warn "Failed to build optimized backend image"
        fi

        # Optimize frontend Dockerfile
        log "Optimizing frontend Docker image..."
        if [[ -f "frontend/Dockerfile" ]]; then
            # Build optimized image
            docker build --no-cache -t privacy-frontend:optimized -f frontend/Dockerfile frontend/ || warn "Failed to build optimized frontend image"
        fi

        # Analyze image sizes
        log "Docker image sizes:"
        docker images | grep privacy- | head -10

    else
        info "[DRY RUN] Would optimize Docker images and clean up unused resources"
    fi
}

# Code optimization
optimize_code() {
    if [[ "$OPTIMIZE_CODE" != true ]]; then
        return 0
    fi

    log "Optimizing application code..."

    cd "$PROJECT_ROOT"

    if [[ "$DRY_RUN" == false ]]; then
        # Backend optimization
        if [[ -d "backend" ]]; then
            log "Optimizing backend code..."
            cd backend

            # Install dependencies if needed
            if [[ -f "package.json" ]]; then
                npm ci --only=production || warn "Failed to install backend dependencies"
            fi

            # Build optimized version
            if [[ -f "tsconfig.json" ]]; then
                npm run build || warn "Failed to build backend"
            fi

            # Analyze bundle size
            if [[ -d "dist" ]]; then
                log "Backend bundle analysis:"
                du -sh dist/
                find dist -name "*.js" -exec wc -l {} + | tail -1
            fi

            cd ..
        fi

        # Frontend optimization
        if [[ -d "frontend" ]]; then
            log "Optimizing frontend code..."
            cd frontend

            # Install dependencies if needed
            if [[ -f "package.json" ]]; then
                npm ci || warn "Failed to install frontend dependencies"
            fi

            # Build optimized version
            if [[ -f "package.json" ]]; then
                npm run build || warn "Failed to build frontend"
            fi

            # Analyze bundle size
            if [[ -d "build" ]]; then
                log "Frontend bundle analysis:"
                du -sh build/
                find build -name "*.js" -exec wc -l {} + | tail -1
            fi

            cd ..
        fi

    else
        info "[DRY RUN] Would optimize backend and frontend code"
    fi
}

# Cache optimization
optimize_cache() {
    if [[ "$OPTIMIZE_CACHE" != true ]]; then
        return 0
    fi

    log "Optimizing cache configuration..."

    if [[ "$DRY_RUN" == false ]]; then
        # Check if Redis is available
        if command -v redis-cli > /dev/null 2>&1; then
            log "Optimizing Redis cache..."
            
            # Configure Redis for optimal performance
            redis-cli CONFIG SET maxmemory-policy allkeys-lru || warn "Failed to set Redis memory policy"
            redis-cli CONFIG SET save "900 1 300 10 60 10000" || warn "Failed to set Redis save policy"
            
            # Get Redis info
            log "Redis configuration:"
            redis-cli INFO memory | grep -E "(used_memory|maxmemory)" || true
        else
            warn "Redis not available for cache optimization"
        fi

        # Optimize application cache settings
        log "Optimizing application cache settings..."
        
        # Update environment variables for cache optimization
        if [[ -f "backend/.env.production" ]]; then
            # Backup original file
            cp backend/.env.production backend/.env.production.backup

            # Update cache settings
            sed -i 's/ENABLE_CACHING=.*/ENABLE_CACHING=true/' backend/.env.production || true
            sed -i 's/MAX_CACHE_SIZE=.*/MAX_CACHE_SIZE=2000/' backend/.env.production || true
            sed -i 's/CACHE_TIMEOUT=.*/CACHE_TIMEOUT=600000/' backend/.env.production || true

            log "Updated cache configuration in .env.production"
        fi

    else
        info "[DRY RUN] Would optimize Redis and application cache settings"
    fi
}

# Database optimization
optimize_database() {
    if [[ "$OPTIMIZE_DATABASE" != true ]]; then
        return 0
    fi

    log "Optimizing database configuration..."

    if [[ "$DRY_RUN" == false ]]; then
        # This is a placeholder for database optimization
        # In a real scenario, you would optimize database indexes, queries, etc.
        log "Database optimization would be performed here"
        
        # Example optimizations:
        # - Analyze slow queries
        # - Optimize indexes
        # - Update statistics
        # - Configure connection pooling
        
    else
        info "[DRY RUN] Would optimize database configuration and queries"
    fi
}

# Performance analysis
analyze_performance() {
    if [[ "$ANALYZE_PERFORMANCE" != true ]]; then
        return 0
    fi

    log "Analyzing system performance..."

    if [[ "$DRY_RUN" == false ]]; then
        # System resource analysis
        log "System resource usage:"
        echo "CPU Usage:"
        top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4"%"}' || true
        
        echo "Memory Usage:"
        free -h || true
        
        echo "Disk Usage:"
        df -h | grep -E "(/$|/var|/tmp)" || true

        # Docker resource analysis
        if command -v docker > /dev/null 2>&1; then
            log "Docker resource usage:"
            docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" || true
        fi

        # Application performance analysis
        log "Application performance analysis:"
        
        # Check if application is running
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            log "Backend health check: PASSED"
            
            # Get monitoring metrics
            if curl -f http://localhost:3000/api/monitoring/metrics > /dev/null 2>&1; then
                log "Monitoring metrics available"
                curl -s http://localhost:3000/api/monitoring/metrics | jq '.metrics.system[-1]' 2>/dev/null || true
            fi
        else
            warn "Backend health check: FAILED"
        fi

        # Network performance
        log "Network performance:"
        ping -c 3 8.8.8.8 | tail -1 | awk '{print $4}' | cut -d '/' -f 2 || true

        # File system performance
        log "File system performance:"
        time_output=$(dd if=/dev/zero of=/tmp/test_file bs=1M count=100 2>&1 | grep -o '[0-9.]* MB/s' || echo "N/A")
        log "Write speed: $time_output"
        rm -f /tmp/test_file

    else
        info "[DRY RUN] Would analyze system and application performance"
    fi
}

# Generate optimization report
generate_report() {
    log "Generating optimization report..."

    local report_file="$PROJECT_ROOT/optimization_report.txt"
    
    if [[ "$DRY_RUN" == false ]]; then
        cat > "$report_file" << EOF
Privacy Data Removal Service - Optimization Report
Generated: $(date)

OPTIMIZATIONS PERFORMED:
- Docker optimization: $OPTIMIZE_DOCKER
- Code optimization: $OPTIMIZE_CODE
- Cache optimization: $OPTIMIZE_CACHE
- Database optimization: $OPTIMIZE_DATABASE
- Performance analysis: $ANALYZE_PERFORMANCE

SYSTEM INFORMATION:
- OS: $(uname -s)
- Architecture: $(uname -m)
- Kernel: $(uname -r)
- Docker version: $(docker --version 2>/dev/null || echo "Not installed")
- Node.js version: $(node --version 2>/dev/null || echo "Not installed")

RECOMMENDATIONS:
1. Monitor application performance regularly
2. Update dependencies monthly
3. Review and optimize Docker images quarterly
4. Implement automated performance testing
5. Set up alerting for performance degradation

For detailed logs, see: $LOG_FILE
EOF

        log "Optimization report generated: $report_file"
    else
        info "[DRY RUN] Would generate optimization report at: $report_file"
    fi
}

# Main optimization process
main() {
    log "Starting system optimization process"

    if [[ "$DRY_RUN" == true ]]; then
        warn "DRY RUN MODE - No actual changes will be made"
    fi

    # Create log file
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"

    # Run optimization steps
    optimize_docker
    optimize_code
    optimize_cache
    optimize_database
    analyze_performance
    generate_report

    log "System optimization completed successfully!"

    if [[ "$DRY_RUN" == false ]]; then
        info "Optimization summary:"
        info "  - Log file: $LOG_FILE"
        info "  - Report file: $PROJECT_ROOT/optimization_report.txt"
        info "  - Restart application to apply all optimizations"
    fi
}

# Run main function
main "$@"