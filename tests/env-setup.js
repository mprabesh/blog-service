/**
 * Test Environment Setup
 * 
 * Sets up environment variables and configuration
 * specifically for testing with Redis.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.TEST_MONGO_URL = process.env.TEST_MONGO_URL || 'mongodb://localhost:27017/bloglist-test';
process.env.SECRET_KEY = process.env.SECRET_KEY || 'test-secret-key-for-jwt';
process.env.TEST_PORT = process.env.TEST_PORT || '3002';
