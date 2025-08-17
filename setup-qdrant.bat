@echo off
echo ========================================
echo Setting up Qdrant Vector Database
echo ========================================
echo.

echo Checking if Docker is installed...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed or not in PATH
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/
    echo After installation, restart this script.
    pause
    exit /b 1
)

echo ✅ Docker is installed
echo.

echo Checking if Qdrant container is already running...
docker ps --filter "name=qdrant" --format "table {{.Names}}" | findstr "qdrant" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Qdrant is already running
    echo.
    echo Qdrant is available at: http://localhost:6333
    echo Qdrant UI is available at: http://localhost:6333/dashboard
    echo.
    pause
    exit /b 0
)

echo Starting Qdrant container...
docker run -d --name qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant

if %errorlevel% neq 0 (
    echo ❌ Failed to start Qdrant container
    echo Please check if Docker is running and try again.
    pause
    exit /b 1
)

echo ✅ Qdrant container started successfully
echo.
echo Qdrant is now available at: http://localhost:6333
echo Qdrant UI is available at: http://localhost:6333/dashboard
echo.
echo The container will automatically start on system boot.
echo To stop Qdrant, run: docker stop qdrant
echo To remove Qdrant, run: docker rm qdrant
echo.
pause 