#!/bin/bash

echo "========================================"
echo "Setting up Qdrant Vector Database"
echo "========================================"
echo

echo "Checking if Docker is installed..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    echo "Please install Docker from: https://docs.docker.com/get-docker/"
    echo "After installation, restart this script."
    exit 1
fi

echo "✅ Docker is installed"
echo

echo "Checking if Qdrant container is already running..."
if docker ps --filter "name=qdrant" --format "table {{.Names}}" | grep -q "qdrant"; then
    echo "✅ Qdrant is already running"
    echo
    echo "Qdrant is available at: http://localhost:6333"
    echo "Qdrant UI is available at: http://localhost:6333/dashboard"
    echo
    exit 0
fi

echo "Starting Qdrant container..."
if ! docker run -d --name qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant; then
    echo "❌ Failed to start Qdrant container"
    echo "Please check if Docker is running and try again."
    exit 1
fi

echo "✅ Qdrant container started successfully"
echo
echo "Qdrant is now available at: http://localhost:6333"
echo "Qdrant UI is available at: http://localhost:6333/dashboard"
echo
echo "The container will automatically start on system boot."
echo "To stop Qdrant, run: docker stop qdrant"
echo "To remove Qdrant, run: docker rm qdrant"
echo 