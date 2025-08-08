/**
 * Redis Cache Middleware Module
 * 
 * This module provides Express middleware functions for caching API responses
 * and managing cache invalidation. It improves application performance by
 * reducing database queries for frequently accessed data.
 * 
 * Features:
 * - Response caching with configurable TTL
 * - Cache invalidation on data modifications
 * - Automatic cache key generation
 * - Error handling and fallback behavior
 * - Support for different cache strategies
 */

const { cache } = require('./redis');
const logger = require('./logger');

/**
 * Cache response middleware with enhanced error handling
 * 
 * @param {Object} options - Caching options
 * @param {string} options.keyGenerator - Function to generate cache key
 * @param {number} options.ttl - Time to live in seconds
 * @param {boolean} options.skipCache - Skip caching for this request
 */
const cacheResponse = (options = {}) => {
  const {
    keyGenerator = (req) => `api:${req.method}:${req.originalUrl}`,
    ttl = 300, // 5 minutes default
    skipCache = false
  } = options;

  return async (req, res, next) => {
    // Skip caching for non-GET requests or when explicitly disabled
    if (req.method !== 'GET' || skipCache) {
      return next();
    }

    try {
      const cacheKey = keyGenerator(req);
      logger.debug(`Checking cache for key: ${cacheKey}`);

      // Try to get from cache
      const cachedData = await cache.get(cacheKey);
      
      if (cachedData) {
        logger.debug(`Cache hit for key: ${cacheKey}`);
        // Add cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${ttl}`
        });
        return res.json(cachedData);
      }

      logger.debug(`Cache miss for key: ${cacheKey}`);
      
      // Store original res.json method
      const originalJson = res.json.bind(res);
      
      // Override res.json to cache the response
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Cache asynchronously to avoid blocking response
          setImmediate(async () => {
            try {
              await cache.set(cacheKey, data, ttl);
              logger.debug(`Response cached with key: ${cacheKey}`);
            } catch (error) {
              logger.error(`Failed to cache response for key ${cacheKey}:`, error.message);
            }
          });
          
          // Add cache headers
          res.set({
            'X-Cache': 'MISS',
            'X-Cache-Key': cacheKey,
            'Cache-Control': `public, max-age=${ttl}`
          });
        } else {
          logger.debug(`Skipping cache for non-success response: ${res.statusCode}`);
        }
        
        return originalJson(data);
      };

      next();

    } catch (error) {
      logger.error('Cache middleware error:', error.message);
      // Continue without caching if there's an error
      res.set('X-Cache', 'ERROR');
      next();
    }
  };
};

/**
 * Cache invalidation middleware with enhanced error handling and safety
 * 
 * @param {string|string[]|Function} patterns - Cache patterns to invalidate
 */
const invalidateCache = (patterns) => {
  return async (req, res, next) => {
    // Store original response methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    const originalEnd = res.end.bind(res);

    // Create a wrapper function for cache invalidation
    const performInvalidation = async () => {
      try {
        let patternsToInvalidate = [];
        
        // Handle different pattern types
        if (typeof patterns === 'function') {
          patternsToInvalidate = patterns(req, res);
        } else if (Array.isArray(patterns)) {
          patternsToInvalidate = patterns;
        } else if (typeof patterns === 'string') {
          patternsToInvalidate = [patterns];
        }

        // Ensure patterns is an array
        if (!Array.isArray(patternsToInvalidate)) {
          patternsToInvalidate = [patternsToInvalidate];
        }

        // Invalidate each pattern
        const invalidationPromises = patternsToInvalidate.map(async (pattern) => {
          try {
            const deletedCount = await cache.clearPattern(pattern);
            if (deletedCount > 0) {
              logger.info(`Cache invalidated: ${deletedCount} keys for pattern '${pattern}'`);
            }
            return { pattern, deletedCount, success: true };
          } catch (error) {
            logger.error(`Failed to invalidate cache pattern '${pattern}':`, error.message);
            return { pattern, error: error.message, success: false };
          }
        });

        const results = await Promise.allSettled(invalidationPromises);
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.length - successful;

        if (failed > 0) {
          logger.warn(`Cache invalidation completed with ${failed} failures out of ${results.length} patterns`);
        } else if (successful > 0) {
          logger.debug(`Cache invalidation successful for ${successful} patterns`);
        }

      } catch (error) {
        logger.error('Cache invalidation error:', error.message);
      }
    };

    // Override response methods to trigger invalidation on successful responses
    const wrapResponse = (originalMethod, methodName) => {
      return function(...args) {
        // Check if this is a successful response (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Perform invalidation asynchronously to avoid blocking response
          setImmediate(performInvalidation);
        }
        
        return originalMethod.apply(this, args);
      };
    };

    res.json = wrapResponse(originalJson, 'json');
    res.send = wrapResponse(originalSend, 'send');
    res.end = wrapResponse(originalEnd, 'end');

    next();
  };
};

/**
 * Blog-specific Cache Middleware
 * 
 * Pre-configured cache middleware for blog endpoints with
 * appropriate TTL and key prefixes.
 */
const blogCache = {
  // Cache all blogs list for 5 minutes
  list: cacheResponse(300, 'blogs'),
  
  // Cache individual blog posts for 15 minutes
  single: cacheResponse(900, 'blog'),
  
  // Cache user's blogs for 10 minutes
  userBlogs: cacheResponse(600, 'user-blogs'),
  
  // Cache popular/trending blogs for 30 minutes
  popular: cacheResponse(1800, 'popular-blogs')
};

/**
 * Blog Cache Invalidation Patterns
 * 
 * Pre-defined cache invalidation patterns for different blog operations.
 */
const blogInvalidation = {
  // Invalidate all blog-related caches when creating/updating/deleting blogs
  all: invalidateCache(['blogs:*', 'blog:*', 'user-blogs:*', 'popular-blogs:*']),
  
  // Invalidate specific user's blog cache
  user: (userId) => invalidateCache([`user-blogs:*${userId}*`, 'blogs:*']),
  
  // Invalidate specific blog cache
  single: (blogId) => invalidateCache([`blog:*${blogId}*`, 'blogs:*'])
};

/**
 * Helper Functions
 */

/**
 * Generate cache key from request
 * 
 * @param {Object} req - Express request object
 * @param {string} prefix - Key prefix
 * @returns {string} Generated cache key
 */
function generateCacheKey(req, prefix) {
  const path = req.path.replace(/\//g, ':');
  const query = Object.keys(req.query).length > 0 
    ? ':' + JSON.stringify(req.query)
    : '';
  
  return `${prefix}${path}${query}`;
}

/**
 * Invalidate cache patterns
 * 
 * @param {Array} patterns - Array of cache key patterns to invalidate
 */
async function invalidateCachePatterns(patterns) {
  try {
    for (const pattern of patterns) {
      await cache.clearPattern(pattern);
      logger.debug(`🧹 Cache invalidated: ${pattern}`);
    }
  } catch (error) {
    logger.error('❌ Cache invalidation error:', error.message);
  }
}

/**
 * User Session Cache Functions
 * 
 * Helper functions for caching user session data and authentication info.
 */
const sessionCache = {
  /**
   * Cache user session data
   * 
   * @param {string} userId - User ID
   * @param {Object} userData - User data to cache
   * @param {number} ttl - TTL in seconds (default: 1 hour)
   */
  setUser: async (userId, userData, ttl = 3600) => {
    await cache.set(`user:${userId}`, userData, ttl);
  },

  /**
   * Get cached user session data
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Cached user data
   */
  getUser: async (userId) => {
    return await cache.get(`user:${userId}`);
  },

  /**
   * Invalidate user session cache
   * 
   * @param {string} userId - User ID
   */
  invalidateUser: async (userId) => {
    await cache.del(`user:${userId}`);
  }
};

module.exports = {
  cacheResponse,
  invalidateCache,
  blogCache,
  blogInvalidation,
  sessionCache
};
