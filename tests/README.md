# Redis Cache Tests Documentation

## Overview

This directory contains comprehensive tests for the Redis caching system integrated into the blog application. The tests ensure that caching works correctly, maintains data consistency, and provides performance benefits.

## Test Structure

### 1. **redis.test.js** - Redis Connection & Basic Cache Tests
- Redis connection management
- Basic cache operations (get, set, delete)
- Cache pattern operations
- TTL (Time To Live) functionality
- Error handling and resilience

### 2. **cache-middleware.test.js** - Cache Middleware Tests
- Response caching middleware
- Cache invalidation middleware
- Blog-specific cache operations
- Session cache operations
- Performance testing

### 3. **cached-api.test.js** - API Integration Tests
- Blog CRUD operations with caching
- Cache consistency across operations
- Error handling with cache failures
- Real-world usage scenarios

## Running Tests

### Prerequisites
1. **Redis Server**: Ensure Redis is running locally on port 6379
   ```bash
   # Start Redis with Docker
   docker compose up -d redis
   
   # Or start Redis locally
   redis-server
   ```

2. **MongoDB**: Test database should be available
   ```bash
   # MongoDB should be running for integration tests
   ```

### Test Commands

```bash
# Run all tests (including Redis tests)
npm run test:all

# Run only Redis connection tests
npm run test:redis

# Run only cache middleware tests
npm run test:cache

# Run original tests without Redis
npm test
```

## Test Categories

### Unit Tests
- Redis client connection and configuration
- Cache helper functions
- Middleware functions in isolation

### Integration Tests
- API endpoints with caching enabled
- Cache invalidation workflows
- Multi-operation consistency

### Performance Tests
- Cache hit vs database query timing
- Concurrent request handling
- Memory usage validation

## Test Data Management

### Cache Cleanup
- Each test clears cache patterns before running
- Global cleanup after all tests complete
- Isolated test environments

### Database State
- Uses existing test helper functions
- Maintains compatibility with original tests
- Proper cleanup between test runs

## Environment Variables

Tests require these environment variables:

```bash
NODE_ENV=test
REDIS_URL=redis://localhost:6379
TEST_MONGO_URL=mongodb://localhost:27017/bloglist-test
SECRET_KEY=test-secret-key-for-jwt
TEST_PORT=3002
```

## Mock Scenarios

### Redis Unavailable
Tests verify the application works correctly when Redis is unavailable:
- API endpoints function normally
- No caching errors thrown
- Graceful degradation

### Cache Errors
Tests handle various error conditions:
- Connection failures
- Invalid data format
- Network timeouts

## Performance Expectations

### Cache Hit Performance
- Sub-millisecond cache retrieval
- Reduced database load
- Consistent response times

### Cache Miss Handling
- Automatic database fallback
- Cache population on first request
- Proper error logging

## Debugging Tests

### Common Issues

1. **Redis Connection Failed**
   ```bash
   # Ensure Redis is running
   docker compose ps
   # Should show redis service as "Up"
   ```

2. **Test Timeouts**
   ```bash
   # Tests have 30-second timeout
   # Check Redis server performance
   redis-cli ping
   ```

3. **Cache Data Inconsistency**
   ```bash
   # Verify cache is cleared between tests
   # Check test isolation
   ```

### Debugging Commands

```bash
# Check Redis connectivity
redis-cli ping

# Monitor Redis operations during tests
redis-cli monitor

# Check test database
mongo bloglist-test --eval "db.blogs.count()"

# Run specific test file
npm test -- cache-middleware.test.js
```

## Continuous Integration

### CI/CD Considerations
- Redis service must be available in CI environment
- Environment variables properly configured
- Proper service startup order (Redis before app)

### Docker Integration
```yaml
# Example CI service configuration
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

## Test Coverage

The test suite covers:
- ✅ Redis connection management
- ✅ Basic cache operations
- ✅ Cache middleware functionality
- ✅ API endpoint caching
- ✅ Cache invalidation
- ✅ Error handling
- ✅ Performance validation
- ✅ Concurrent access
- ✅ Data consistency

## Maintenance

### Adding New Cache Tests
1. Follow existing test patterns
2. Use proper setup/teardown
3. Clear cache before each test
4. Test both success and error cases

### Updating Test Data
1. Maintain compatibility with existing helpers
2. Include email fields for new user objects
3. Clear cache in helper functions

This comprehensive test suite ensures the Redis caching system is reliable, performant, and maintains data integrity across all application operations.
