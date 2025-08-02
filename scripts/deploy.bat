@echo off
REM Privacy Data Removal Service - Windows Deployment Script

setlocal enabledelayedexpansion

REM Configuration
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..
set LOG_FILE=%PROJECT_ROOT%\deploy.log
set ENVIRONMENT=production
set SKIP_TESTS=false
set SKIP_BACKUP=false
set FORCE_REBUILD=false
set DRY_RUN=false

REM Colors (limited in Windows CMD)
set GREEN=[92m
set YELLOW=[93m
set RED=[91m
set BLUE=[94m
set NC=[0m

REM Parse command line arguments
:parse_args
if "%~1"=="" goto :start_deployment
if "%~1"=="-e" (
    set ENVIRONMENT=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="--environment" (
    set ENVIRONMENT=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="-s" (
    set SKIP_TESTS=true
    shift
    goto :parse_args
)
if "%~1"=="--skip-tests" (
    set SKIP_TESTS=true
    shift
    goto :parse_args
)
if "%~1"=="-b" (
    set SKIP_BACKUP=true
    shift
    goto :parse_args
)
if "%~1"=="--skip-backup" (
    set SKIP_BACKUP=true
    shift
    goto :parse_args
)
if "%~1"=="-f" (
    set FORCE_REBUILD=true
    shift
    goto :parse_args
)
if "%~1"=="--force-rebuild" (
    set FORCE_REBUILD=true
    shift
    goto :parse_args
)
if "%~1"=="-d" (
    set DRY_RUN=true
    shift
    goto :parse_args
)
if "%~1"=="--dry-run" (
    set DRY_RUN=true
    shift
    goto :parse_args
)
if "%~1"=="-h" goto :show_help
if "%~1"=="--help" goto :show_help
echo Unknown option: %~1
goto :show_help

:show_help
echo Privacy Data Removal Service - Windows Deployment Script
echo.
echo Usage: %~nx0 [OPTIONS]
echo.
echo OPTIONS:
echo     -e, --environment ENV    Target environment (production, staging) [default: production]
echo     -s, --skip-tests        Skip running tests before deployment
echo     -b, --skip-backup       Skip creating backup before deployment
echo     -f, --force-rebuild     Force rebuild of Docker images
echo     -d, --dry-run          Show what would be done without executing
echo     -h, --help             Show this help message
echo.
echo EXAMPLES:
echo     %~nx0                                    # Deploy to production with all checks
echo     %~nx0 -e staging                        # Deploy to staging environment
echo     %~nx0 --skip-tests --force-rebuild      # Deploy without tests, force rebuild
echo     %~nx0 --dry-run                         # Show deployment plan without executing
echo.
exit /b 0

:log
echo %GREEN%[%date% %time%] %~1%NC%
echo [%date% %time%] %~1 >> "%LOG_FILE%"
goto :eof

:warn
echo %YELLOW%[%date% %time%] WARNING: %~1%NC%
echo [%date% %time%] WARNING: %~1 >> "%LOG_FILE%"
goto :eof

:error
echo %RED%[%date% %time%] ERROR: %~1%NC%
echo [%date% %time%] ERROR: %~1 >> "%LOG_FILE%"
exit /b 1

:info
echo %BLUE%[%date% %time%] INFO: %~1%NC%
echo [%date% %time%] INFO: %~1 >> "%LOG_FILE%"
goto :eof

:start_deployment
call :log "Starting deployment process for %ENVIRONMENT% environment"

if "%DRY_RUN%"=="true" (
    call :warn "DRY RUN MODE - No actual changes will be made"
)

REM Create log file
if not exist "%PROJECT_ROOT%" mkdir "%PROJECT_ROOT%"
echo. > "%LOG_FILE%"

REM Pre-deployment checks
call :log "Starting pre-deployment checks..."

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    call :error "Docker is not running. Please start Docker and try again."
)

REM Check if docker-compose is available
docker-compose --version >nul 2>&1
if errorlevel 1 (
    call :error "docker-compose is not installed. Please install it and try again."
)

REM Check if required files exist
set COMPOSE_FILE=docker-compose.prod.yml
if "%ENVIRONMENT%"=="staging" set COMPOSE_FILE=docker-compose.staging.yml

if not exist "%PROJECT_ROOT%\%COMPOSE_FILE%" (
    call :error "Docker compose file not found: %COMPOSE_FILE%"
)

call :log "Pre-deployment checks completed successfully"

REM Run tests
if "%SKIP_TESTS%"=="true" (
    call :warn "Skipping tests as requested"
) else (
    call :log "Running tests..."
    
    cd /d "%PROJECT_ROOT%"
    
    REM Backend tests
    if exist "backend\package.json" (
        call :log "Running backend tests..."
        if "%DRY_RUN%"=="false" (
            cd backend
            call npm test
            if errorlevel 1 call :error "Backend tests failed"
            cd ..
        ) else (
            call :info "[DRY RUN] Would run: cd backend && npm test"
        )
    )
    
    REM Frontend tests
    if exist "frontend\package.json" (
        call :log "Running frontend tests..."
        if "%DRY_RUN%"=="false" (
            cd frontend
            call npm test -- --coverage --watchAll=false
            if errorlevel 1 call :error "Frontend tests failed"
            cd ..
        ) else (
            call :info "[DRY RUN] Would run: cd frontend && npm test -- --coverage --watchAll=false"
        )
    )
    
    call :log "All tests passed successfully"
)

REM Create backup
if "%SKIP_BACKUP%"=="true" (
    call :warn "Skipping backup as requested"
) else (
    call :log "Creating backup..."
    
    set BACKUP_TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
    set BACKUP_TIMESTAMP=%BACKUP_TIMESTAMP: =0%
    set BACKUP_NAME=backup_%ENVIRONMENT%_%BACKUP_TIMESTAMP%
    set BACKUP_PATH=%PROJECT_ROOT%\backups\%BACKUP_NAME%
    
    if "%DRY_RUN%"=="false" (
        if not exist "%PROJECT_ROOT%\backups" mkdir "%PROJECT_ROOT%\backups"
        mkdir "%BACKUP_PATH%"
        
        REM Backup configuration files
        if exist "backend\.env*" copy "backend\.env*" "%BACKUP_PATH%\" >nul 2>&1
        if exist "docker-compose*.yml" copy "docker-compose*.yml" "%BACKUP_PATH%\" >nul 2>&1
        
        call :log "Backup created at: %BACKUP_PATH%"
    ) else (
        call :info "[DRY RUN] Would create backup at: %BACKUP_PATH%"
    )
)

REM Deploy
call :log "Starting deployment to %ENVIRONMENT%..."

cd /d "%PROJECT_ROOT%"

REM Stop existing containers
call :log "Stopping existing containers..."
if "%DRY_RUN%"=="false" (
    docker-compose -f "%COMPOSE_FILE%" down 2>nul
) else (
    call :info "[DRY RUN] Would run: docker-compose -f %COMPOSE_FILE% down"
)

REM Build images
set BUILD_ARGS=
if "%FORCE_REBUILD%"=="true" (
    set BUILD_ARGS=--no-cache
    call :log "Force rebuilding Docker images..."
) else (
    call :log "Building Docker images..."
)

if "%DRY_RUN%"=="false" (
    docker-compose -f "%COMPOSE_FILE%" build %BUILD_ARGS%
    if errorlevel 1 call :error "Failed to build Docker images"
) else (
    call :info "[DRY RUN] Would run: docker-compose -f %COMPOSE_FILE% build %BUILD_ARGS%"
)

REM Start containers
call :log "Starting containers..."
if "%DRY_RUN%"=="false" (
    docker-compose -f "%COMPOSE_FILE%" up -d
    if errorlevel 1 call :error "Failed to start containers"
) else (
    call :info "[DRY RUN] Would run: docker-compose -f %COMPOSE_FILE% up -d"
)

REM Wait for services to be healthy
call :log "Waiting for services to be healthy..."
if "%DRY_RUN%"=="false" (
    set /a MAX_ATTEMPTS=30
    set /a ATTEMPT=1
    
    :health_check_loop
    docker-compose -f "%COMPOSE_FILE%" ps | findstr "healthy" >nul
    if not errorlevel 1 (
        call :log "Services are healthy"
        goto :health_check_done
    )
    
    if !ATTEMPT! geq !MAX_ATTEMPTS! (
        call :error "Services failed to become healthy within timeout"
    )
    
    call :info "Waiting for services to be healthy... (attempt !ATTEMPT!/!MAX_ATTEMPTS!)"
    timeout /t 10 /nobreak >nul
    set /a ATTEMPT+=1
    goto :health_check_loop
    
    :health_check_done
) else (
    call :info "[DRY RUN] Would wait for services to be healthy"
)

call :log "Deployment completed successfully!"

REM Post-deployment verification
call :log "Running post-deployment verification..."

if "%DRY_RUN%"=="false" (
    REM Display running containers
    call :log "Running containers:"
    docker-compose -f "%COMPOSE_FILE%" ps
    
    REM Test health endpoints
    call :log "Testing health endpoints..."
    
    REM Backend health check
    curl -f http://localhost:3000/health >nul 2>&1
    if not errorlevel 1 (
        call :log "Backend health check: PASSED"
    ) else (
        call :warn "Backend health check: FAILED"
    )
    
    REM Frontend health check
    curl -f http://localhost/health >nul 2>&1
    if not errorlevel 1 (
        call :log "Frontend health check: PASSED"
    ) else (
        call :warn "Frontend health check: FAILED"
    )
) else (
    call :info "[DRY RUN] Would run post-deployment verification"
)

REM Cleanup old backups
call :log "Cleaning up old backups..."
if "%DRY_RUN%"=="false" (
    REM Keep only last 10 backups (simplified for Windows)
    if exist "%PROJECT_ROOT%\backups" (
        forfiles /p "%PROJECT_ROOT%\backups" /m backup_* /c "cmd /c echo @path" 2>nul | sort /r | more +10 > temp_cleanup.txt 2>nul
        for /f "delims=" %%i in (temp_cleanup.txt) do rd /s /q "%%~i" 2>nul
        del temp_cleanup.txt 2>nul
        call :log "Old backups cleaned up"
    )
) else (
    call :info "[DRY RUN] Would clean up old backups"
)

call :log "Deployment process completed successfully!"

if "%DRY_RUN%"=="false" (
    call :info "Application is now running at:"
    call :info "  Frontend: http://localhost"
    call :info "  Backend API: http://localhost:3000"
    call :info "  Health Check: http://localhost:3000/health"
    call :info "  Monitoring: http://localhost:3000/api/monitoring/dashboard"
)

endlocal
exit /b 0