/**
 * Redis Connection Test Script
 * 
 * This script tests the Redis connection and basic cache operations
 * to verify that the Redis setup is working correctly.
 */

const { redisClient, cache } = require('./utils/redis');

async function testRedisConnection() {
  console.log('🧪 Testing Redis Connection...\n');

  try {
    // Connect to Redis
    await redisClient.connect();
    
    // Test basic operations
    console.log('📝 Testing cache operations...');
    
    // Test SET operation
    await cache.set('test:key', { message: 'Hello Redis!', timestamp: new Date() }, 60);
    console.log('✅ Cache SET successful');
    
    // Test GET operation
    const result = await cache.get('test:key');
    console.log('✅ Cache GET successful:', result);
    
    // Test pattern operations
    await cache.set('blogs:all', [{ id: 1, title: 'Test Blog' }], 300);
    await cache.set('blogs:user:123', [{ id: 1, title: 'User Blog' }], 300);
    console.log('✅ Cache pattern data set');
    
    // Test pattern deletion
    await cache.clearPattern('blogs:*');
    console.log('✅ Cache pattern clear successful');
    
    // Verify cleared data
    const clearedData = await cache.get('blogs:all');
    console.log('✅ Cache cleared verification:', clearedData === null ? 'SUCCESS' : 'FAILED');
    
    console.log('\n🎉 All Redis tests passed!');
    
  } catch (error) {
    console.error('❌ Redis test failed:', error.message);
  } finally {
    // Clean up
    await redisClient.disconnect();
    process.exit(0);
  }
}

// Run tests
testRedisConnection();
