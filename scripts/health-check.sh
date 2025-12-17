#!/bin/sh

# Health Check Script for SafeDrive
# This script checks if the application is running and accessible

# Configuration
PORT=${PORT:-8080}
HOST=${HOST:-localhost}
TIMEOUT=5

# Check if the application is responding
if command -v curl > /dev/null 2>&1; then
    # Use curl if available
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT http://${HOST}:${PORT}/health)
    
    if [ "$response" = "200" ]; then
        echo "Health check passed: Application is healthy"
        exit 0
    else
        echo "Health check failed: HTTP status code $response"
        exit 1
    fi
elif command -v wget > /dev/null 2>&1; then
    # Use wget if curl is not available
    if wget --spider --timeout=$TIMEOUT -q http://${HOST}:${PORT}/health; then
        echo "Health check passed: Application is healthy"
        exit 0
    else
        echo "Health check failed: Application not responding"
        exit 1
    fi
else
    echo "Error: Neither curl nor wget is available"
    exit 2
fi
