@echo off
REM Deployment script with multiple strategy support for Windows
REM Usage: scripts\deploy.bat [docker|buildpack|simple]

setlocal enabledelayedexpansion

set STRATEGY=%1
if "%STRATEGY%"=="" set STRATEGY=docker

echo 🚀 Starting deployment with strategy: %STRATEGY%

if "%STRATEGY%"=="docker" (
    echo 📦 Using Docker deployment strategy
    echo Using Dockerfile.fixed with comprehensive optimizations
    
    REM Update railway.toml to use Docker strategy
    (
        echo [build]
        echo builder = "DOCKERFILE"
        echo dockerfilePath = "backend/Dockerfile.fixed"
        echo buildCommand = "npm run build"
        echo.
        echo [deploy]
        echo startCommand = "npm start"
        echo healthcheckPath = "/health"
        echo healthcheckTimeout = 300
        echo restartPolicyType = "ON_FAILURE"
        echo restartPolicyMaxRetries = 10
        echo.
        echo [settings]
        echo generateDomain = true
    ) > railway.toml
    
    echo ✅ Railway configured for Docker deployment
    
) else if "%STRATEGY%"=="buildpack" (
    echo 🏗️ Using Buildpack deployment strategy
    echo Switching to Railway's Node.js buildpack
    
    REM Update railway.toml to use buildpack strategy
    (
        echo [build]
        echo builder = "NIXPACKS"
        echo.
        echo [deploy]
        echo startCommand = "npm start"
        echo healthcheckPath = "/health"
        echo healthcheckTimeout = 300
        echo restartPolicyType = "ON_FAILURE"
        echo restartPolicyMaxRetries = 10
        echo.
        echo [settings]
        echo generateDomain = true
    ) > railway.toml
    
    echo ✅ Railway configured for Buildpack deployment
    
) else if "%STRATEGY%"=="simple" (
    echo 🔧 Using Simple Docker deployment strategy
    echo Using Dockerfile.simple without npm ci complexity
    
    REM Update railway.toml to use simple Docker strategy
    (
        echo [build]
        echo builder = "DOCKERFILE"
        echo dockerfilePath = "backend/Dockerfile.simple"
        echo buildCommand = "npm run build"
        echo.
        echo [deploy]
        echo startCommand = "npm start"
        echo healthcheckPath = "/health"
        echo healthcheckTimeout = 300
        echo restartPolicyType = "ON_FAILURE"
        echo restartPolicyMaxRetries = 10
        echo.
        echo [settings]
        echo generateDomain = true
    ) > railway.toml
    
    echo ✅ Railway configured for Simple Docker deployment
    
) else (
    echo ❌ Unknown deployment strategy: %STRATEGY%
    echo Available strategies: docker, buildpack, simple
    exit /b 1
)

echo 📝 Deployment configuration updated
echo 💡 Commit and push changes to trigger Railway deployment
echo.
echo Next steps:
echo 1. git add railway.toml
echo 2. git commit -m "Switch to %STRATEGY% deployment strategy"
echo 3. git push origin main
echo.
echo 🔍 Monitor deployment at: https://railway.app

endlocal