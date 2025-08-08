/**
 * Application Configuration Module
 * 
 * This module handles all environment-specific configuration for the blog application.
 * It loads environment variables from .env files and provides appropriate values
 * based on the current NODE_ENV (development, production, or test).
 * 
 * Environment Variables Required:
 * - MONGO_URL: MongoDB Atlas connection string for production/development
 * - TEST_MONGO_URL: MongoDB connection string for testing
 * - PROD_PORT: Port number for production environment
 * - DEV_PORT: Port number for development environment
 * - TEST_PORT: Port number for testing environment
 * - SECRET_KEY: JWT signing secret key
 */

// Load environment variables from .env file
require("dotenv").config();

/**
 * Database Configuration
 * 
 * Select the appropriate MongoDB connection URL based on the environment:
 * - Test environment: Use TEST_MONGO_URL (isolated test database)
 * - All other environments: Use MONGO_URL (production/development database)
 * 
 * This separation ensures tests don't interfere with real data.
 */
const mongoURL =
  process.env.NODE_ENV !== "test"
    ? process.env.MONGO_URL
    : process.env.TEST_MONGO_URL;

/**
 * Server Port Configuration
 * 
 * Select the appropriate port number based on the environment:
 * - Production: PROD_PORT (typically 8081 for containerized deployment)
 * - Development: DEV_PORT (typically 3001 for local development)
 * - Test: TEST_PORT (typically 3002 to avoid conflicts during testing)
 * 
 * This allows multiple environments to run simultaneously without port conflicts.
 */
const PORT =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_PORT
    : process.env.NODE_ENV === "development"
    ? process.env.DEV_PORT
    : process.env.TEST_PORT;

/**
 * JWT Secret Key
 * 
 * Secret key used for signing and verifying JSON Web Tokens (JWT).
 * This key should be kept secure and never exposed in client-side code.
 * Used for user authentication and session management.
 */
const SECRET_KEY = process.env.SECRET_KEY;

/**
 * Redis Configuration
 * 
 * Redis connection URL for caching and session storage.
 * Falls back to localhost for development if not specified.
 * Used for:
 * - Blog post caching
 * - User session management
 * - Real-time data storage
 */
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Export all configuration values for use throughout the application
module.exports = { mongoURL, PORT, SECRET_KEY, REDIS_URL };
