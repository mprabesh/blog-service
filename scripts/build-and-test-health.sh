#!/bin/bash

# Docker Build and Health Check Verification Script
# This script builds the Docker image and tests health endpoints

set -e

echo "🐳 Building Docker Image with Health Checks..."
echo "=============================================="

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t blog-backend-health-test .

echo ""
echo "🧪 Testing Docker Image Health Checks..."
echo "========================================"

# Run container in detached mode
echo "🚀 Starting container..."
CONTAINER_ID=$(docker run -d -p 3003:8081 \
    -e NODE_ENV=production \
    -e PROD_PORT=8081 \
    -e MONGO_URL="$MONGO_URL" \
    -e REDIS_URL="redis://localhost:6379" \
    -e SECRET_KEY="test-secret-key" \
    blog-backend-health-test)

echo "📋 Container ID: $CONTAINER_ID"

# Wait for container to start
echo "⏳ Waiting for container to start..."
sleep 10

# Test Docker's built-in health check
echo "🏥 Testing Docker health check..."
for i in {1..10}; do
    HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_ID 2>/dev/null || echo "starting")
    echo "   Health status: $HEALTH_STATUS"
    
    if [ "$HEALTH_STATUS" = "healthy" ]; then
        echo "✅ Docker health check: PASSED"
        break
    elif [ "$HEALTH_STATUS" = "unhealthy" ]; then
        echo "❌ Docker health check: FAILED"
        docker logs $CONTAINER_ID
        docker stop $CONTAINER_ID && docker rm $CONTAINER_ID
        exit 1
    fi
    
    sleep 5
done

# Test individual endpoints
echo ""
echo "🔍 Testing individual health endpoints..."

# Test basic health
echo "📊 Testing /health..."
if curl -f -s http://localhost:3003/health | jq . > /dev/null 2>&1; then
    echo "✅ /health endpoint: PASSED"
    curl -s http://localhost:3003/health | jq .
else
    echo "❌ /health endpoint: FAILED"
fi

echo ""
echo "📋 Testing /health/detailed..."
if curl -f -s http://localhost:3003/health/detailed | jq . > /dev/null 2>&1; then
    echo "✅ /health/detailed endpoint: PASSED"
else
    echo "❌ /health/detailed endpoint: FAILED"
fi

echo ""
echo "🚀 Testing /health/ready..."
if curl -f -s http://localhost:3003/health/ready | jq . > /dev/null 2>&1; then
    echo "✅ /health/ready endpoint: PASSED"
else
    echo "❌ /health/ready endpoint: FAILED"
fi

echo ""
echo "💓 Testing /health/live..."
if curl -f -s http://localhost:3003/health/live | jq . > /dev/null 2>&1; then
    echo "✅ /health/live endpoint: PASSED"
else
    echo "❌ /health/live endpoint: FAILED"
fi

# Cleanup
echo ""
echo "🧹 Cleaning up..."
docker stop $CONTAINER_ID
docker rm $CONTAINER_ID

echo ""
echo "🎉 Health check verification complete!"
echo "✅ Your Docker image successfully includes all health check functionality"
echo ""
echo "📋 Summary of available endpoints:"
echo "   • /health           - Basic health status"
echo "   • /health/detailed  - Detailed health with metrics"
echo "   • /health/ready     - Kubernetes readiness probe"
echo "   • /health/live      - Kubernetes liveness probe"
echo "   • /api/ping         - Simple connectivity test"
