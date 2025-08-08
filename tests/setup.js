/**
 * Test Setup and Teardown
 * 
 * Global setup and teardown for all tests,
 * including Redis connection management.
 */

const { redisClient } = require('../utils/redis');
const mongoose = require('mongoose');

// Global test setup
beforeAll(async () => {
  // Connect to Redis if not already connected
  if (!redisClient.isReady()) {
    try {
      await redisClient.connect();
      console.log('✅ Redis connected for tests');
    } catch (error) {
      console.warn('⚠️ Redis connection failed, tests will run without cache:', error.message);
    }
  }
});

// Global test teardown
afterAll(async () => {
  // Close all connections
  await mongoose.connection.close();
  
  if (redisClient.isReady()) {
    await redisClient.disconnect();
    console.log('✅ Redis disconnected after tests');
  }
  
  // Small delay to ensure all connections are closed
  await new Promise(resolve => setTimeout(resolve, 500));
});
