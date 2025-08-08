/**
 * Redis Configuration and Client Setup
 * 
 * This module provides Redis client configuration and connection management
 * for the blog application. It handles caching operations, session storage,
 * and real-time data management.
 * 
 * Features:
 * - Automatic connection management with retry logic
 * - Environment-based configuration
 * - Error handling and logging
 * - Connection health monitoring
 * - Graceful shutdown handling
 */

const { createClient } = require('redis');
const logger = require('./logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.retryAttempts = 0;
    this.maxRetries = 5;
    this.retryDelay = 1000; // 1 second
    this.circuitBreakerFailures = 0;
    this.circuitBreakerThreshold = 5;
    this.circuitBreakerTimeout = 30000; // 30 seconds
    this.circuitBreakerLastFailure = null;
    this.isCircuitBreakerOpen = false;
  }

  /**
   * Initialize Redis connection
   * 
   * Creates and configures Redis client with environment-based settings.
   * Includes automatic retry logic and error handling.
   */
  // Circuit breaker check
  isCircuitBreakerTripped() {
    if (!this.isCircuitBreakerOpen) return false;
    
    // Check if circuit breaker should be reset
    if (Date.now() - this.circuitBreakerLastFailure > this.circuitBreakerTimeout) {
      logger.info('Circuit breaker timeout expired, attempting to reset');
      this.isCircuitBreakerOpen = false;
      this.circuitBreakerFailures = 0;
      return false;
    }
    
    return true;
  }

  // Record circuit breaker failure
  recordFailure() {
    this.circuitBreakerFailures++;
    this.circuitBreakerLastFailure = Date.now();
    
    if (this.circuitBreakerFailures >= this.circuitBreakerThreshold) {
      this.isCircuitBreakerOpen = true;
      logger.warn(`Redis circuit breaker opened after ${this.circuitBreakerFailures} failures`);
    }
  }

  // Reset circuit breaker on successful operation
  recordSuccess() {
    if (this.circuitBreakerFailures > 0) {
      this.circuitBreakerFailures = 0;
      if (this.isCircuitBreakerOpen) {
        this.isCircuitBreakerOpen = false;
        logger.info('Redis circuit breaker closed - connection restored');
      }
    }
  }

  async connect() {
    if (this.isCircuitBreakerTripped()) {
      logger.warn('Redis circuit breaker is open, skipping connection attempt');
      return false;
    }

    try {
      if (this.client && this.isConnected) {
        return true;
      }

      logger.info('Attempting to connect to Redis...');
      
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 10000,
          lazyConnect: true,
          reconnectStrategy: (retries) => {
            if (retries > this.maxRetries) {
              logger.error(`Redis connection failed after ${retries} attempts`);
              this.recordFailure();
              return new Error('Max retries exceeded');
            }
            const delay = Math.min(this.retryDelay * Math.pow(2, retries), 10000);
            logger.warn(`Redis reconnect attempt ${retries} in ${delay}ms`);
            return delay;
          }
        }
      });

      // Enhanced event handlers
      this.client.on('connect', () => {
        logger.info('Redis client connected successfully');
        this.isConnected = true;
        this.retryAttempts = 0;
        this.recordSuccess();
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready for commands');
      });

      this.client.on('error', (error) => {
        logger.error('Redis client error:', error.message);
        this.isConnected = false;
        this.recordFailure();
      });

      this.client.on('end', () => {
        logger.warn('Redis client connection ended');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis client attempting to reconnect...');
      });

      await this.client.connect();
      return true;

    } catch (error) {
      logger.error('Failed to connect to Redis:', error.message);
      this.isConnected = false;
      this.recordFailure();
      
      // Don't throw error - allow app to continue without Redis
      return false;
    }
  }

  async executeWithFallback(operation, fallback = null) {
    // Check circuit breaker
    if (this.isCircuitBreakerTripped()) {
      logger.debug('Redis circuit breaker is open, using fallback');
      return fallback;
    }

    // Check connection
    if (!this.isConnected || !this.client) {
      logger.debug('Redis not connected, using fallback');
      return fallback;
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      logger.error('Redis operation failed:', error.message);
      this.recordFailure();
      return fallback;
    }
  }

  /**
   * Set up Redis client event listeners
   * 
   * Handles connection events, errors, and monitoring.
   */
  setupEventListeners() {
    this.client.on('connect', () => {
      logger.info('🔗 Redis client connected');
    });

    this.client.on('ready', () => {
      logger.info('⚡ Redis client ready');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      logger.error('❌ Redis client error:', error.message);
      this.isConnected = false;
    });

    this.client.on('end', () => {
      logger.warn('🔌 Redis connection ended');
      this.isConnected = false;
    });

    this.client.on('reconnecting', (delay, attempt) => {
      logger.warn(`🔄 Redis reconnecting in ${delay}ms (attempt ${attempt})`);
    });
  }

  /**
   * Get Redis client instance safely
   * 
   * @returns {Object|null} Redis client instance or null if not connected
   */
  getClient() {
    if (!this.client || !this.isConnected) {
      return null;
    }
    return this.client;
  }

  /**
   * Get Redis client instance (throws error if not connected)
   * 
   * @returns {Object} Redis client instance
   */
  getClientOrThrow() {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }
    return this.client;
  }

  /**
   * Check if Redis is connected
   * 
   * @returns {boolean} Connection status
   */
  isReady() {
    return this.isConnected && this.client?.isReady;
  }

  /**
   * Gracefully disconnect from Redis
   */
  async disconnect() {
    if (this.client) {
      try {
        logger.info('🔌 Disconnecting from Redis...');
        await this.client.quit();
        this.isConnected = false;
        logger.info('✅ Redis disconnected successfully');
      } catch (error) {
        logger.error('❌ Error disconnecting from Redis:', error.message);
      }
    }
  }
}

// Create singleton instance
const redisClient = new RedisClient();

/**
 * Cache Helper Functions
 * 
 * Utility functions for common caching operations with error handling.
 */

/**
 * Get value from cache
 * 
 * @param {string} key - Cache key
 * @returns {Promise<any>} Cached value or null
 */
const get = async (key) => {
  return await redisClient.executeWithFallback(async () => {
    const client = redisClient.getClient();
    if (!client) return null;
    
    const value = await client.get(key);
    if (value) {
      logger.debug(`📖 Cache hit: ${key}`);
      return JSON.parse(value);
    }
    
    logger.debug(`📭 Cache miss: ${key}`);
    return null;
  }, null);
};

/**
 * Set value in cache with expiration
 * 
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
 */
const set = async (key, value, ttl = 300) => {
  return await redisClient.executeWithFallback(async () => {
    const client = redisClient.getClient();
    if (!client) return false;
    
    await client.setEx(key, ttl, JSON.stringify(value));
    logger.debug(`💾 Cache set: ${key} (TTL: ${ttl}s)`);
    return true;
  }, false);
};

/**
 * Delete key from cache
 * 
 * @param {string} key - Cache key to delete
 */
const del = async (key) => {
  return await redisClient.executeWithFallback(async () => {
    const client = redisClient.getClient();
    if (!client) return false;
    
    await client.del(key);
    logger.debug(`🗑️ Cache deleted: ${key}`);
    return true;
  }, false);
};

/**
 * Clear all cache with pattern matching
 * 
 * @param {string} pattern - Pattern to match (e.g., 'blogs:*')
 */
const clearPattern = async (pattern) => {
  return await redisClient.executeWithFallback(async () => {
    const client = redisClient.getClient();
    if (!client) return 0;
    
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
      logger.debug(`🧹 Cache cleared: ${keys.length} keys matching '${pattern}'`);
    }
    return keys.length;
  }, 0);
};
module.exports = {
  redisClient,
  cache: {
    get,
    set,
    del,
    clearPattern
  }
};
