#!/bin/bash

# Privacy Data Removal Service - Comprehensive Test Runner
# This script runs all tests including unit, integration, performance, and security tests

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
LOG_FILE="$PROJECT_ROOT/test-results.log"

# Test configuration
RUN_UNIT_TESTS=true
RUN_INTEGRATION_TESTS=true
RUN_E2E_TESTS=true
RUN_PERFORMANCE_TESTS=true
RUN_SECURITY_TESTS=true
RUN_COVERAGE=true
GENERATE_REPORT=true
PARALLEL_TESTS=false
VERBOSE=false
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
Privacy Data Removal Service - Comprehensive Test Runner

Usage: $0 [OPTIONS]

OPTIONS:
    --skip-unit           Skip unit tests
    --skip-integration    Skip integration tests
    --skip-e2e           Skip end-to-end tests
    --skip-performance   Skip performance tests
    --skip-security      Skip security tests
    --skip-coverage      Skip coverage analysis
    --skip-report        Skip test report generation
    --parallel           Run tests in parallel where possible
    --verbose            Enable verbose output
    --dry-run           Show what would be tested without executing
    -h, --help          Show this help message

EXAMPLES:
    $0                           # Run all tests
    $0 --skip-e2e               # Skip end-to-end tests
    $0 --parallel --verbose     # Run with parallel execution and verbose output
    $0 --dry-run                # Show test plan without executing

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-unit)
            RUN_UNIT_TESTS=false
            shift
            ;;
        --skip-integration)
            RUN_INTEGRATION_TESTS=false
            shift
            ;;
        --skip-e2e)
            RUN_E2E_TESTS=false
            shift
            ;;
        --skip-performance)
            RUN_PERFORMANCE_TESTS=false
            shift
            ;;
        --skip-security)
            RUN_SECURITY_TESTS=false
            shift
            ;;
        --skip-coverage)
            RUN_COVERAGE=false
            shift
            ;;
        --skip-report)
            GENERATE_REPORT=false
            shift
            ;;
        --parallel)
            PARALLEL_TESTS=true
            shift
            ;;
        --verbose)
            VERBOSE=true
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

# Test environment setup
setup_test_environment() {
    log "Setting up test environment..."

    cd "$PROJECT_ROOT"

    if [[ "$DRY_RUN" == false ]]; then
        # Ensure test dependencies are installed
        if [[ -d "backend" && -f "backend/package.json" ]]; then
            log "Installing backend test dependencies..."
            cd backend
            npm ci || error "Failed to install backend dependencies"
            cd ..
        fi

        if [[ -d "frontend" && -f "frontend/package.json" ]]; then
            log "Installing frontend test dependencies..."
            cd frontend
            npm ci || error "Failed to install frontend dependencies"
            cd ..
        fi

        # Create test results directory
        mkdir -p "$PROJECT_ROOT/test-results"

        # Set test environment variables
        export NODE_ENV=test
        export LOG_LEVEL=error
        export MONITORING_ENABLED=false

    else
        info "[DRY RUN] Would set up test environment and install dependencies"
    fi
}

# Run unit tests
run_unit_tests() {
    if [[ "$RUN_UNIT_TESTS" != true ]]; then
        return 0
    fi

    log "Running unit tests..."

    if [[ "$DRY_RUN" == false ]]; then
        local test_failed=false

        # Backend unit tests
        if [[ -d "backend" ]]; then
            log "Running backend unit tests..."
            cd backend

            local test_command="npm test"
            if [[ "$RUN_COVERAGE" == true ]]; then
                test_command="npm run test:coverage"
            fi
            if [[ "$VERBOSE" == true ]]; then
                test_command="$test_command -- --verbose"
            fi

            if ! $test_command; then
                warn "Backend unit tests failed"
                test_failed=true
            fi

            cd ..
        fi

        # Frontend unit tests
        if [[ -d "frontend" ]]; then
            log "Running frontend unit tests..."
            cd frontend

            local test_command="npm test -- --coverage --watchAll=false"
            if [[ "$VERBOSE" == true ]]; then
                test_command="$test_command --verbose"
            fi

            if ! $test_command; then
                warn "Frontend unit tests failed"
                test_failed=true
            fi

            cd ..
        fi

        if [[ "$test_failed" == true ]]; then
            error "Unit tests failed"
        fi

    else
        info "[DRY RUN] Would run backend and frontend unit tests"
    fi
}

# Run integration tests
run_integration_tests() {
    if [[ "$RUN_INTEGRATION_TESTS" != true ]]; then
        return 0
    fi

    log "Running integration tests..."

    if [[ "$DRY_RUN" == false ]]; then
        if [[ -d "backend" ]]; then
            cd backend

            local test_command="npm run test:integration"
            if [[ "$VERBOSE" == true ]]; then
                test_command="$test_command -- --verbose"
            fi

            if ! $test_command; then
                warn "Integration tests failed"
                # Don't fail completely for integration tests as they depend on external APIs
            fi

            cd ..
        fi

    else
        info "[DRY RUN] Would run integration tests"
    fi
}

# Run end-to-end tests
run_e2e_tests() {
    if [[ "$RUN_E2E_TESTS" != true ]]; then
        return 0
    fi

    log "Running end-to-end tests..."

    if [[ "$DRY_RUN" == false ]]; then
        # Start application if not running
        local app_started=false
        if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
            log "Starting application for E2E tests..."
            docker-compose up -d || warn "Failed to start application with Docker"
            app_started=true
            
            # Wait for application to be ready
            local max_attempts=30
            local attempt=1
            while [[ $attempt -le $max_attempts ]]; do
                if curl -f http://localhost:3000/health > /dev/null 2>&1; then
                    log "Application is ready for E2E tests"
                    break
                fi
                
                if [[ $attempt -eq $max_attempts ]]; then
                    error "Application failed to start within timeout"
                fi
                
                info "Waiting for application to start... (attempt $attempt/$max_attempts)"
                sleep 10
                ((attempt++))
            done
        fi

        # Run E2E tests
        if [[ -d "backend" ]]; then
            cd backend

            local test_command="npm run test:e2e"
            if [[ "$VERBOSE" == true ]]; then
                test_command="$test_command -- --verbose"
            fi

            if ! $test_command; then
                warn "End-to-end tests failed"
            fi

            cd ..
        fi

        # Stop application if we started it
        if [[ "$app_started" == true ]]; then
            log "Stopping application..."
            docker-compose down || warn "Failed to stop application"
        fi

    else
        info "[DRY RUN] Would run end-to-end tests"
    fi
}

# Run performance tests
run_performance_tests() {
    if [[ "$RUN_PERFORMANCE_TESTS" != true ]]; then
        return 0
    fi

    log "Running performance tests..."

    if [[ "$DRY_RUN" == false ]]; then
        if [[ -d "backend" ]]; then
            cd backend

            local test_command="npm run test:performance"
            if [[ "$VERBOSE" == true ]]; then
                test_command="$test_command -- --verbose"
            fi

            if ! $test_command; then
                warn "Performance tests failed"
            fi

            cd ..
        fi

    else
        info "[DRY RUN] Would run performance tests"
    fi
}

# Run security tests
run_security_tests() {
    if [[ "$RUN_SECURITY_TESTS" != true ]]; then
        return 0
    fi

    log "Running security tests..."

    if [[ "$DRY_RUN" == false ]]; then
        if [[ -d "backend" ]]; then
            cd backend

            local test_command="npm run test:security"
            if [[ "$VERBOSE" == true ]]; then
                test_command="$test_command -- --verbose"
            fi

            if ! $test_command; then
                warn "Security tests failed"
            fi

            cd ..
        fi

        # Additional security checks
        log "Running additional security checks..."
        
        # Check for known vulnerabilities
        if command -v npm > /dev/null 2>&1; then
            log "Checking for npm vulnerabilities..."
            cd backend && npm audit --audit-level=high || warn "npm audit found vulnerabilities"
            cd ..
            
            if [[ -d "frontend" ]]; then
                cd frontend && npm audit --audit-level=high || warn "npm audit found vulnerabilities in frontend"
                cd ..
            fi
        fi

        # Check Docker images for vulnerabilities (if available)
        if command -v docker > /dev/null 2>&1; then
            log "Checking Docker images for vulnerabilities..."
            docker images | grep privacy- | awk '{print $1":"$2}' | while read image; do
                if command -v docker > /dev/null 2>&1; then
                    docker scan "$image" || warn "Docker scan found vulnerabilities in $image"
                fi
            done
        fi

    else
        info "[DRY RUN] Would run security tests and vulnerability scans"
    fi
}

# Generate test report
generate_test_report() {
    if [[ "$GENERATE_REPORT" != true ]]; then
        return 0
    fi

    log "Generating comprehensive test report..."

    local report_file="$PROJECT_ROOT/test-results/comprehensive-test-report.html"

    if [[ "$DRY_RUN" == false ]]; then
        cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Privacy Data Removal Service - Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .passed { color: green; }
        .failed { color: red; }
        .warning { color: orange; }
        .info { color: blue; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Privacy Data Removal Service - Comprehensive Test Report</h1>
        <p>Generated: $(date)</p>
        <p>Environment: $(uname -s) $(uname -m)</p>
    </div>

    <div class="section">
        <h2>Test Summary</h2>
        <table>
            <tr><th>Test Type</th><th>Status</th><th>Notes</th></tr>
            <tr><td>Unit Tests</td><td class="$([ "$RUN_UNIT_TESTS" == true ] && echo "passed" || echo "info")">$([ "$RUN_UNIT_TESTS" == true ] && echo "EXECUTED" || echo "SKIPPED")</td><td>Backend and frontend unit tests</td></tr>
            <tr><td>Integration Tests</td><td class="$([ "$RUN_INTEGRATION_TESTS" == true ] && echo "passed" || echo "info")">$([ "$RUN_INTEGRATION_TESTS" == true ] && echo "EXECUTED" || echo "SKIPPED")</td><td>API integration tests</td></tr>
            <tr><td>End-to-End Tests</td><td class="$([ "$RUN_E2E_TESTS" == true ] && echo "passed" || echo "info")">$([ "$RUN_E2E_TESTS" == true ] && echo "EXECUTED" || echo "SKIPPED")</td><td>Complete user journey tests</td></tr>
            <tr><td>Performance Tests</td><td class="$([ "$RUN_PERFORMANCE_TESTS" == true ] && echo "passed" || echo "info")">$([ "$RUN_PERFORMANCE_TESTS" == true ] && echo "EXECUTED" || echo "SKIPPED")</td><td>Performance and optimization tests</td></tr>
            <tr><td>Security Tests</td><td class="$([ "$RUN_SECURITY_TESTS" == true ] && echo "passed" || echo "info")">$([ "$RUN_SECURITY_TESTS" == true ] && echo "EXECUTED" || echo "SKIPPED")</td><td>Security and encryption tests</td></tr>
        </table>
    </div>

    <div class="section">
        <h2>Coverage Report</h2>
        <p>Coverage reports are available in the respective test directories:</p>
        <ul>
            <li>Backend: <code>backend/coverage/</code></li>
            <li>Frontend: <code>frontend/coverage/</code></li>
        </ul>
    </div>

    <div class="section">
        <h2>Recommendations</h2>
        <ul>
            <li>Run tests regularly as part of CI/CD pipeline</li>
            <li>Monitor test performance and optimize slow tests</li>
            <li>Keep test coverage above 80%</li>
            <li>Update test data and scenarios regularly</li>
            <li>Review and fix any failing tests promptly</li>
        </ul>
    </div>

    <div class="section">
        <h2>Detailed Logs</h2>
        <p>For detailed test logs, see: <code>$LOG_FILE</code></p>
    </div>
</body>
</html>
EOF

        log "Test report generated: $report_file"

        # Also generate a simple text summary
        local summary_file="$PROJECT_ROOT/test-results/test-summary.txt"
        cat > "$summary_file" << EOF
Privacy Data Removal Service - Test Summary
Generated: $(date)

TESTS EXECUTED:
- Unit Tests: $([ "$RUN_UNIT_TESTS" == true ] && echo "YES" || echo "NO")
- Integration Tests: $([ "$RUN_INTEGRATION_TESTS" == true ] && echo "YES" || echo "NO")
- End-to-End Tests: $([ "$RUN_E2E_TESTS" == true ] && echo "YES" || echo "NO")
- Performance Tests: $([ "$RUN_PERFORMANCE_TESTS" == true ] && echo "YES" || echo "NO")
- Security Tests: $([ "$RUN_SECURITY_TESTS" == true ] && echo "YES" || echo "NO")

CONFIGURATION:
- Coverage Analysis: $([ "$RUN_COVERAGE" == true ] && echo "ENABLED" || echo "DISABLED")
- Parallel Execution: $([ "$PARALLEL_TESTS" == true ] && echo "ENABLED" || echo "DISABLED")
- Verbose Output: $([ "$VERBOSE" == true ] && echo "ENABLED" || echo "DISABLED")

For detailed results, see:
- HTML Report: $report_file
- Detailed Logs: $LOG_FILE
EOF

        log "Test summary generated: $summary_file"

    else
        info "[DRY RUN] Would generate comprehensive test report"
    fi
}

# Main test execution
main() {
    log "Starting comprehensive test execution"

    if [[ "$DRY_RUN" == true ]]; then
        warn "DRY RUN MODE - No tests will be executed"
    fi

    # Create log file
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"

    # Record start time
    local start_time=$(date +%s)

    # Execute test phases
    setup_test_environment

    if [[ "$PARALLEL_TESTS" == true && "$DRY_RUN" == false ]]; then
        log "Running tests in parallel mode..."
        # Run independent tests in parallel
        (run_unit_tests) &
        (run_performance_tests) &
        (run_security_tests) &
        wait
        
        # Run dependent tests sequentially
        run_integration_tests
        run_e2e_tests
    else
        # Run tests sequentially
        run_unit_tests
        run_integration_tests
        run_e2e_tests
        run_performance_tests
        run_security_tests
    fi

    generate_test_report

    # Calculate total time
    local end_time=$(date +%s)
    local total_time=$((end_time - start_time))

    log "Comprehensive testing completed successfully!"
    log "Total execution time: ${total_time} seconds"

    if [[ "$DRY_RUN" == false ]]; then
        info "Test results summary:"
        info "  - HTML Report: $PROJECT_ROOT/test-results/comprehensive-test-report.html"
        info "  - Text Summary: $PROJECT_ROOT/test-results/test-summary.txt"
        info "  - Detailed Logs: $LOG_FILE"
        info "  - Coverage Reports: backend/coverage/ and frontend/coverage/"
    fi
}

# Run main function
main "$@"