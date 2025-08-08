/**
 * Redis Connection and Cache Tests
 * 
 * This test suite verifies Redis connection, caching operations,
 * and cache middleware functionality.
 * 
 * Test Categories:
 * - Redis connection and configuration
 * - Basic cache operations (get, set, delete)
 * - Cache pattern operations
 * - Cache TTL (Time To Live) functionality
 * - Error handling and resilience
 */

const { redisClient, cache } = require('../utils/redis');

describe('Redis Connection Tests', () => {
  beforeAll(async () => {
    // Ensure Redis is connected for tests
    if (!redisClient.isReady()) {
      await redisClient.connect();
    }
  });

  afterAll(async () => {
    // Clean up test data and disconnect
    await cache.clearPattern('test:*');
    await redisClient.disconnect();
  });

  beforeEach(async () => {
    // Clear test keys before each test
    await cache.clearPattern('test:*');
  });

  describe('Connection Management', () => {
    test('Redis client should be connected and ready', () => {
      expect(redisClient.isReady()).toBe(true);
    });

    test('Redis client should respond to ping', async () => {
      const client = redisClient.getClient();
      const pong = await client.ping();
      expect(pong).toBe('PONG');
    });

    test('Should throw error when accessing client without connection', () => {
      const disconnectedClient = new (require('../utils/redis').redisClient.constructor)();
      expect(() => disconnectedClient.getClient()).toThrow('Redis client not connected');
    });
  });

  describe('Basic Cache Operations', () => {
    test('Should set and get a string value', async () => {
      const key = 'test:string';
      const value = 'Hello Redis!';
      
      await cache.set(key, value, 60);
      const result = await cache.get(key);
      
      expect(result).toBe(value);
    });

    test('Should set and get an object value', async () => {
      const key = 'test:object';
      const value = { 
        id: 1, 
        title: 'Test Blog',
        author: 'Test User',
        timestamp: new Date().toISOString()
      };
      
      await cache.set(key, value, 60);
      const result = await cache.get(key);
      
      expect(result).toEqual(value);
    });

    test('Should set and get an array value', async () => {
      const key = 'test:array';
      const value = [
        { id: 1, title: 'Blog 1' },
        { id: 2, title: 'Blog 2' },
        { id: 3, title: 'Blog 3' }
      ];
      
      await cache.set(key, value, 60);
      const result = await cache.get(key);
      
      expect(result).toEqual(value);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
    });

    test('Should return null for non-existent key', async () => {
      const result = await cache.get('test:nonexistent');
      expect(result).toBeNull();
    });

    test('Should delete existing key', async () => {
      const key = 'test:delete';
      const value = 'To be deleted';
      
      await cache.set(key, value, 60);
      let result = await cache.get(key);
      expect(result).toBe(value);
      
      await cache.del(key);
      result = await cache.get(key);
      expect(result).toBeNull();
    });
  });

  describe('Cache TTL (Time To Live)', () => {
    test('Should respect TTL and expire key', async () => {
      const key = 'test:ttl';
      const value = 'Expires soon';
      
      // Set with 1 second TTL
      await cache.set(key, value, 1);
      
      // Should exist immediately
      let result = await cache.get(key);
      expect(result).toBe(value);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should be expired
      result = await cache.get(key);
      expect(result).toBeNull();
    }, 2000);

    test('Should use default TTL when not specified', async () => {
      const key = 'test:default-ttl';
      const value = 'Default TTL test';
      
      await cache.set(key, value); // Should use default 300s TTL
      const result = await cache.get(key);
      
      expect(result).toBe(value);
      
      // Check TTL in Redis
      const client = redisClient.getClient();
      const ttl = await client.ttl(key);
      expect(ttl).toBeGreaterThan(250); // Should be close to 300
      expect(ttl).toBeLessThanOrEqual(300);
    });
  });

  describe('Pattern Operations', () => {
    test('Should clear keys matching pattern', async () => {
      // Set multiple keys with same pattern
      await cache.set('test:blog:1', { id: 1, title: 'Blog 1' }, 60);
      await cache.set('test:blog:2', { id: 2, title: 'Blog 2' }, 60);
      await cache.set('test:blog:3', { id: 3, title: 'Blog 3' }, 60);
      await cache.set('test:user:1', { id: 1, name: 'User 1' }, 60);
      
      // Verify all keys exist
      expect(await cache.get('test:blog:1')).toBeTruthy();
      expect(await cache.get('test:blog:2')).toBeTruthy();
      expect(await cache.get('test:blog:3')).toBeTruthy();
      expect(await cache.get('test:user:1')).toBeTruthy();
      
      // Clear only blog pattern
      await cache.clearPattern('test:blog:*');
      
      // Blog keys should be gone
      expect(await cache.get('test:blog:1')).toBeNull();
      expect(await cache.get('test:blog:2')).toBeNull();
      expect(await cache.get('test:blog:3')).toBeNull();
      
      // User key should remain
      expect(await cache.get('test:user:1')).toBeTruthy();
    });

    test('Should handle empty pattern matches gracefully', async () => {
      // Try to clear pattern that matches no keys
      await expect(cache.clearPattern('test:nonexistent:*')).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('Should handle cache operations gracefully when Redis is not ready', async () => {
      // Mock Redis not ready
      const originalIsReady = redisClient.isReady;
      redisClient.isReady = jest.fn().mockReturnValue(false);
      
      // Operations should not throw errors
      await expect(cache.set('test:error', 'value')).resolves.not.toThrow();
      await expect(cache.get('test:error')).resolves.toBeNull();
      await expect(cache.del('test:error')).resolves.not.toThrow();
      await expect(cache.clearPattern('test:*')).resolves.not.toThrow();
      
      // Restore original function
      redisClient.isReady = originalIsReady;
    });

    test('Should handle JSON parse errors gracefully', async () => {
      const key = 'test:invalid-json';
      
      // Manually set invalid JSON in Redis
      const client = redisClient.getClient();
      await client.set(key, 'invalid-json-data');
      
      // Should return null instead of throwing
      const result = await cache.get(key);
      expect(result).toBeNull();
    });
  });
});
