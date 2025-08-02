#!/bin/bash

# Privacy Data Removal Service - Deployment Script
# This script handles the deployment of the application to production

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_FILE="$PROJECT_ROOT/deploy.log"

# Default values
ENVIRONMENT="production"
SKIP_TESTS=false
SKIP_BACKUP=false
FORCE_REBUILD=false
DRY_RUN=false

# Functions
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

# Help function
show_help() {
    cat << EOF
Privacy Data Removal Service - Deployment Script

Usage: $0 [OPTIONS]

OPTIONS:
    -e, --environment ENV    Target environment (production, staging) [default: production]
    -s, --skip-tests        Skip running tests before deployment
    -b, --skip-backup       Skip creating backup before deployment
    -f, --force-rebuild     Force rebuild of Docker images
    -d, --dry-run          Show what would be done without executing
    -h, --help             Show this help message

EXAMPLES:
    $0                                    # Deploy to production with all checks
    $0 -e staging                        # Deploy to staging environment
    $0 --skip-tests --force-rebuild      # Deploy without tests, force rebuild
    $0 --dry-run                         # Show deployment plan without executing

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -b|--skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        -f|--force-rebuild)
            FORCE_REBUILD=true
            shift
            ;;
        -d|--dry-run)
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

# Validate environment
if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "staging" ]]; then
    error "Invalid environment: $ENVIRONMENT. Must be 'production' or 'staging'"
fi

# Pre-deployment checks
pre_deployment_checks() {
    log "Starting pre-deployment checks..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running. Please start Docker and try again."
    fi
    
    # Check if docker-compose is available
    if ! command -v docker-compose > /dev/null 2>&1; then
        error "docker-compose is not installed. Please install it and try again."
    fi
    
    # Check if required files exist
    local compose_file="docker-compose.prod.yml"
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        compose_file="docker-compose.staging.yml"
    fi
    
    if [[ ! -f "$PROJECT_ROOT/$compose_file" ]]; then
        error "Docker compose file not found: $compose_file"
    fi
    
    # Check if environment file exists
    local env_file="backend/.env.production"
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        env_file="backend/.env.staging"
    fi
    
    if [[ ! -f "$PROJECT_ROOT/$env_file" ]]; then
        warn "Environment file not found: $env_file"
        info "Please copy from $env_file.example and configure it"
    fi
    
    # Check available disk space (require at least 2GB)
    local available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 2097152 ]]; then  # 2GB in KB
        warn "Low disk space available: $(($available_space / 1024))MB"
    fi
    
    log "Pre-deployment checks completed successfully"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        warn "Skipping tests as requested"
        return 0
    fi
    
    log "Running tests..."
    
    cd "$PROJECT_ROOT"
    
    # Backend tests
    if [[ -f "backend/package.json" ]]; then
        log "Running backend tests..."
        if [[ "$DRY_RUN" == false ]]; then
            cd backend
            npm test || error "Backend tests failed"
            cd ..
        else
            info "[DRY RUN] Would run: cd backend && npm test"
        fi
    fi
    
    # Frontend tests
    if [[ -f "frontend/package.json" ]]; then
        log "Running frontend tests..."
        if [[ "$DRY_RUN" == false ]]; then
            cd frontend
            npm test -- --coverage --watchAll=false || error "Frontend tests failed"
            cd ..
        else
            info "[DRY RUN] Would run: cd frontend && npm test -- --coverage --watchAll=false"
        fi
    fi
    
    log "All tests passed successfully"
}

# Create backup
create_backup() {
    if [[ "$SKIP_BACKUP" == true ]]; then
        warn "Skipping backup as requested"
        return 0
    fi
    
    log "Creating backup..."
    
    local backup_timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_name="backup_${ENVIRONMENT}_${backup_timestamp}"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    if [[ "$DRY_RUN" == false ]]; then
        mkdir -p "$backup_path"
        
        # Backup current containers (if running)
        if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
            log "Backing up current deployment..."
            docker-compose -f docker-compose.prod.yml config > "$backup_path/docker-compose.yml"
            
            # Export container data
            docker-compose -f docker-compose.prod.yml exec -T backend tar czf - /app/logs 2>/dev/null > "$backup_path/backend_logs.tar.gz" || true
        fi
        
        # Backup configuration files
        cp -r backend/.env* "$backup_path/" 2>/dev/null || true
        cp docker-compose*.yml "$backup_path/" 2>/dev/null || true
        
        log "Backup created at: $backup_path"
    else
        info "[DRY RUN] Would create backup at: $backup_path"
    fi
}

# Build and deploy
deploy() {
    log "Starting deployment to $ENVIRONMENT..."
    
    cd "$PROJECT_ROOT"
    
    local compose_file="docker-compose.prod.yml"
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        compose_file="docker-compose.staging.yml"
    fi
    
    # Stop existing containers
    log "Stopping existing containers..."
    if [[ "$DRY_RUN" == false ]]; then
        docker-compose -f "$compose_file" down || true
    else
        info "[DRY RUN] Would run: docker-compose -f $compose_file down"
    fi
    
    # Build images
    local build_args=""
    if [[ "$FORCE_REBUILD" == true ]]; then
        build_args="--no-cache"
        log "Force rebuilding Docker images..."
    else
        log "Building Docker images..."
    fi
    
    if [[ "$DRY_RUN" == false ]]; then
        docker-compose -f "$compose_file" build $build_args || error "Failed to build Docker images"
    else
        info "[DRY RUN] Would run: docker-compose -f $compose_file build $build_args"
    fi
    
    # Start containers
    log "Starting containers..."
    if [[ "$DRY_RUN" == false ]]; then
        docker-compose -f "$compose_file" up -d || error "Failed to start containers"
    else
        info "[DRY RUN] Would run: docker-compose -f $compose_file up -d"
    fi
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    if [[ "$DRY_RUN" == false ]]; then
        local max_attempts=30
        local attempt=1
        
        while [[ $attempt -le $max_attempts ]]; do
            if docker-compose -f "$compose_file" ps | grep -q "healthy"; then
                log "Services are healthy"
                break
            fi
            
            if [[ $attempt -eq $max_attempts ]]; then
                error "Services failed to become healthy within timeout"
            fi
            
            info "Waiting for services to be healthy... (attempt $attempt/$max_attempts)"
            sleep 10
            ((attempt++))
        done
    else
        info "[DRY RUN] Would wait for services to be healthy"
    fi
    
    log "Deployment completed successfully!"
}

# Post-deployment verification
post_deployment_verification() {
    log "Running post-deployment verification..."
    
    if [[ "$DRY_RUN" == false ]]; then
        # Check if services are running
        local compose_file="docker-compose.prod.yml"
        if [[ "$ENVIRONMENT" == "staging" ]]; then
            compose_file="docker-compose.staging.yml"
        fi
        
        local running_services=$(docker-compose -f "$compose_file" ps --services --filter "status=running" | wc -l)
        local total_services=$(docker-compose -f "$compose_file" ps --services | wc -l)
        
        if [[ $running_services -eq $total_services ]]; then
            log "All services are running ($running_services/$total_services)"
        else
            warn "Some services are not running ($running_services/$total_services)"
        fi
        
        # Test health endpoints
        log "Testing health endpoints..."
        
        # Backend health check
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            log "Backend health check: PASSED"
        else
            warn "Backend health check: FAILED"
        fi
        
        # Frontend health check
        if curl -f http://localhost/health > /dev/null 2>&1; then
            log "Frontend health check: PASSED"
        else
            warn "Frontend health check: FAILED"
        fi
        
        # Display running containers
        log "Running containers:"
        docker-compose -f "$compose_file" ps
        
    else
        info "[DRY RUN] Would run post-deployment verification"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    if [[ "$DRY_RUN" == false ]]; then
        # Keep only last 10 backups
        if [[ -d "$BACKUP_DIR" ]]; then
            find "$BACKUP_DIR" -maxdepth 1 -type d -name "backup_*" | sort -r | tail -n +11 | xargs rm -rf
            log "Old backups cleaned up"
        fi
    else
        info "[DRY RUN] Would clean up old backups"
    fi
}

# Main deployment process
main() {
    log "Starting deployment process for $ENVIRONMENT environment"
    
    if [[ "$DRY_RUN" == true ]]; then
        warn "DRY RUN MODE - No actual changes will be made"
    fi
    
    # Create log file
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    # Run deployment steps
    pre_deployment_checks
    run_tests
    create_backup
    deploy
    post_deployment_verification
    cleanup_old_backups
    
    log "Deployment process completed successfully!"
    
    if [[ "$DRY_RUN" == false ]]; then
        info "Application is now running at:"
        info "  Frontend: http://localhost"
        info "  Backend API: http://localhost:3000"
        info "  Health Check: http://localhost:3000/health"
        info "  Monitoring: http://localhost:3000/api/monitoring/dashboard"
    fi
}

# Run main function
main "$@"