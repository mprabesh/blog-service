const { redisClient } = require('../utils/redis');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

/**
 * Health check controller with MongoDB and Redis status
 */

/**
 * Basic health check endpoint
 */
const healthCheck = async (req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        api: 'healthy',
        mongodb: 'unknown',
        redis: 'unknown'
      }
    };

    // Check MongoDB connection
    try {
      const mongoState = mongoose.connection.readyState;
      switch (mongoState) {
        case 0:
          health.services.mongodb = 'disconnected';
          break;
        case 1:
          health.services.mongodb = 'healthy';
          break;
        case 2:
          health.services.mongodb = 'connecting';
          break;
        case 3:
          health.services.mongodb = 'disconnecting';
          break;
        default:
          health.services.mongodb = 'unknown';
      }

      // Test MongoDB with a simple ping
      if (mongoState === 1) {
        await mongoose.connection.db.admin().ping();
        health.services.mongodb = 'healthy';
      }
    } catch (error) {
      logger.error('MongoDB health check failed:', error.message);
      health.services.mongodb = 'unhealthy';
      health.status = 'degraded'; // MongoDB is critical for app functionality
    }

    // Check Redis connection
    try {
      if (redisClient.isReady()) {
        // Try a simple ping operation
        const client = redisClient.getClient();
        if (client) {
          await client.ping();
          health.services.redis = 'healthy';
        } else {
          health.services.redis = 'disconnected';
        }
      } else {
        health.services.redis = 'disconnected';
        // Don't mark as degraded - app can work without Redis
      }
    } catch (error) {
      logger.error('Redis health check failed:', error.message);
      health.services.redis = 'unhealthy';
      // Don't mark as degraded - app can work without Redis
    }

    // Return appropriate status code
    const statusCode = health.status === 'degraded' ? 503 : 200;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check error:', error.message);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
};

/**
 * Detailed health check with circuit breaker status
 */
const detailedHealthCheck = async (req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      memory: process.memoryUsage(),
      services: {
        api: {
          status: 'healthy',
          version: process.env.npm_package_version || '1.0.0'
        },
        mongodb: {
          status: 'unknown',
          connected: false,
          readyState: 0,
          responseTime: null
        },
        redis: {
          status: 'unknown',
          connected: false,
          circuitBreaker: {
            isOpen: false,
            failures: 0,
            lastFailure: null
          }
        }
      }
    };

    // Detailed MongoDB health check
    try {
      const mongoState = mongoose.connection.readyState;
      health.services.mongodb.readyState = mongoState;
      health.services.mongodb.connected = mongoState === 1;

      if (mongoState === 1) {
        const startTime = Date.now();
        await mongoose.connection.db.admin().ping();
        const responseTime = Date.now() - startTime;
        
        health.services.mongodb.status = 'healthy';
        health.services.mongodb.responseTime = responseTime;
        health.services.mongodb.host = mongoose.connection.host;
        health.services.mongodb.name = mongoose.connection.name;
      } else {
        switch (mongoState) {
          case 0:
            health.services.mongodb.status = 'disconnected';
            break;
          case 2:
            health.services.mongodb.status = 'connecting';
            break;
          case 3:
            health.services.mongodb.status = 'disconnecting';
            break;
          default:
            health.services.mongodb.status = 'unknown';
        }
        health.status = 'degraded'; // MongoDB is critical
      }
    } catch (error) {
      logger.error('Detailed MongoDB health check failed:', error.message);
      health.services.mongodb.status = 'unhealthy';
      health.services.mongodb.error = error.message;
      health.status = 'degraded'; // MongoDB is critical
    }

    // Detailed Redis health check
    try {
      health.services.redis.connected = redisClient.isReady();
      health.services.redis.circuitBreaker.isOpen = redisClient.isCircuitBreakerOpen;
      health.services.redis.circuitBreaker.failures = redisClient.circuitBreakerFailures;
      health.services.redis.circuitBreaker.lastFailure = redisClient.circuitBreakerLastFailure;

      if (redisClient.isReady()) {
        const startTime = Date.now();
        const client = redisClient.getClient();
        if (client) {
          await client.ping();
          const responseTime = Date.now() - startTime;
          
          health.services.redis.status = 'healthy';
          health.services.redis.responseTime = responseTime;
        } else {
          health.services.redis.status = 'disconnected';
        }
      } else if (redisClient.isCircuitBreakerOpen) {
        health.services.redis.status = 'circuit-breaker-open';
        // Don't mark as degraded - app can work without Redis
      } else {
        health.services.redis.status = 'disconnected';
        // Don't mark as degraded - app can work without Redis
      }
    } catch (error) {
      logger.error('Detailed Redis health check failed:', error.message);
      health.services.redis.status = 'unhealthy';
      health.services.redis.error = error.message;
      // Don't mark as degraded - app can work without Redis
    }

    // Return appropriate status code
    const statusCode = health.status === 'degraded' ? 503 : 200;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Detailed health check error:', error.message);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed'
    });
  }
};

/**
 * Readiness probe for Kubernetes/Docker
 * 
 * This endpoint determines if the application is ready to receive traffic.
 * It should return 200 only when the app can successfully handle requests.
 */
const readinessCheck = async (req, res) => {
  try {
    let isReady = true;
    const services = {
      api: true,
      mongodb: false,
      redis: redisClient.isReady()
    };

    // Check MongoDB - critical for readiness
    try {
      const mongoState = mongoose.connection.readyState;
      if (mongoState === 1) {
        // Test with a simple ping
        await mongoose.connection.db.admin().ping();
        services.mongodb = true;
      } else {
        services.mongodb = false;
        isReady = false; // MongoDB is required for app functionality
      }
    } catch (error) {
      logger.error('MongoDB readiness check failed:', error.message);
      services.mongodb = false;
      isReady = false;
    }

    const ready = {
      ready: isReady,
      timestamp: new Date().toISOString(),
      services
    };

    // Return 503 if not ready, 200 if ready
    const statusCode = isReady ? 200 : 503;
    res.status(statusCode).json(ready);
  } catch (error) {
    logger.error('Readiness check error:', error.message);
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed'
    });
  }
};

/**
 * Liveness probe for Kubernetes/Docker
 */
const livenessCheck = async (req, res) => {
  try {
    // Simple check that the process is alive
    res.status(200).json({
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    logger.error('Liveness check error:', error.message);
    res.status(500).json({
      alive: false,
      timestamp: new Date().toISOString(),
      error: 'Liveness check failed'
    });
  }
};

module.exports = {
  healthCheck,
  detailedHealthCheck,
  readinessCheck,
  livenessCheck
};
