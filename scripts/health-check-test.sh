#!/bin/bash

# Health Check Test Script
# This script tests all health endpoints to verify they're working in the Docker container

set -e

echo "🏥 Testing Health Check Endpoints..."
echo "=================================="

BASE_URL="http://localhost:${PROD_PORT:-8081}"

# Test basic health endpoint
echo "📊 Testing basic health check..."
if curl -f -s "${BASE_URL}/health" > /dev/null; then
    echo "✅ Basic health check: PASSED"
else
    echo "❌ Basic health check: FAILED"
    exit 1
fi

# Test detailed health endpoint
echo "📋 Testing detailed health check..."
if curl -f -s "${BASE_URL}/health/detailed" > /dev/null; then
    echo "✅ Detailed health check: PASSED"
else
    echo "❌ Detailed health check: FAILED"
    exit 1
fi

# Test readiness probe
echo "🚀 Testing readiness probe..."
if curl -f -s "${BASE_URL}/health/ready" > /dev/null; then
    echo "✅ Readiness probe: PASSED"
else
    echo "❌ Readiness probe: FAILED"
    exit 1
fi

# Test liveness probe
echo "💓 Testing liveness probe..."
if curl -f -s "${BASE_URL}/health/live" > /dev/null; then
    echo "✅ Liveness probe: PASSED"
else
    echo "❌ Liveness probe: FAILED"
    exit 1
fi

# Test ping endpoint
echo "🏓 Testing ping endpoint..."
if curl -f -s "${BASE_URL}/api/ping" > /dev/null; then
    echo "✅ Ping endpoint: PASSED"
else
    echo "❌ Ping endpoint: FAILED"
    exit 1
fi

echo ""
echo "🎉 All health check endpoints are working!"
echo "✅ Your Docker image includes all health check functionality"
