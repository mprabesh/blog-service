/**
 * Express Application Configuration
 * 
 * This file configures the main Express.js application with all necessary middleware,
 * database connections, routes, and error handling. It serves as the central hub
 * for the blog application's backend API.
 * 
 * Features:
 * - MongoDB Atlas connection with Mongoose ODM
 * - CORS enabled for cross-origin requests
 * - JSON body parsing middleware
 * - Request logging for debugging
 * - Health check endpoints for monitoring
 * - RESTful API routes for blogs, users, and authentication
 * - Error handling and unknown endpoint middleware
 */

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
const { info } = require("./utils/logger");

// Import route controllers
const blogsController = require("./controllers/blogs");
const userController = require("./controllers/user");
const loginController = require("./controllers/login");
const testingRouter = require("./controllers/testing");
const healthRouter = require("./controllers/health-router");

// Import configuration and middleware
const { mongoURL } = require("./utils/config");
const { redisClient } = require("./utils/redis");
const {
  errorHandler,
  requestLogger,
  unknownEndpoint,
} = require("./utils/middleware");

/**
 * Core Middleware Setup
 * 
 * Configure essential middleware for request processing:
 * - express.json(): Parse JSON request bodies
 * - cors(): Enable Cross-Origin Resource Sharing for frontend communication
 */
app.use(express.json());

// Configure CORS for multi-environment deployment
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Development environments
    const devPatterns = [
      /^http:\/\/localhost:\d+$/,           // Any localhost port
      /^http:\/\/127\.0\.0\.1:\d+$/,       // Any 127.0.0.1 port
      /^http:\/\/0\.0\.0\.0:\d+$/,         // Any 0.0.0.0 port
    ];
    
    // Production/VM environments - broader patterns for flexibility
    const prodPatterns = [
      /^http:\/\/\d+\.\d+\.\d+\.\d+:\d+$/, // Any IPv4 with port
      /^http:\/\/\d+\.\d+\.\d+\.\d+$/,     // Any IPv4 without port (port 80)
      /^https:\/\/\d+\.\d+\.\d+\.\d+:\d+$/, // HTTPS with port
      /^https:\/\/\d+\.\d+\.\d+\.\d+$/,    // HTTPS without port
    ];
    
    // Docker network environments
    const dockerPatterns = [
      /^http:\/\/[a-zA-Z0-9\-_]+:\d+$/,    // Container names with port
      /^http:\/\/[a-zA-Z0-9\-_]+$/,        // Container names without port
      /^http:\/\/172\.\d+\.\d+\.\d+:\d+$/, // Docker bridge networks
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,  // Docker custom networks
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Common private networks
    ];
    
    // Domain-based patterns for production
    const domainPatterns = [
      /^https?:\/\/[\w\-]+(\.[\w\-]+)*:\d+$/, // Any domain with port
      /^https?:\/\/[\w\-]+(\.[\w\-]+)*$/,     // Any domain without port
    ];
    
    // Combine all patterns
    const allPatterns = [...devPatterns, ...prodPatterns, ...dockerPatterns, ...domainPatterns];
    
    // Check if origin matches any pattern
    const isAllowed = allPatterns.some(pattern => pattern.test(origin));
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // Log the rejected origin for debugging
      console.log(`CORS: Rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/**
 * Database and Cache Connection
 * 
 * Connect to MongoDB Atlas using Mongoose ODM and initialize Redis cache.
 * Both connections are loaded from environment variables for security.
 * 
 * Configuration:
 * - MongoDB: strictQuery: false - Allows flexible query syntax
 * - Redis: Automatic reconnection and error handling
 */
mongoose.set("strictQuery", false);
mongoose
  .connect(mongoURL,{ useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    info("Connected to MongoDB successfully!!");
  })
  .catch((err) => info(err));

// Initialize Redis connection with enhanced error handling
const initializeRedis = async () => {
  try {
    info("Initializing Redis connection...");
    const connected = await redisClient.connect();
    
    if (connected) {
      info("✅ Redis initialized successfully");
    } else {
      info("⚠️ Redis connection failed, continuing without cache");
    }
  } catch (error) {
    info("❌ Redis initialization error:", error.message);
    info("⚠️ Application will continue without Redis caching");
  }
};

initializeRedis();

/**
 * Request Logging Middleware
 * 
 * Log all incoming HTTP requests for debugging and monitoring purposes.
 * This helps track API usage and troubleshoot issues in development.
 */
app.use(requestLogger);

/**
 * Test Environment Routes
 * 
 * Conditionally add testing routes only in test environment.
 * These routes are used for test database cleanup and setup.
 */
if (process.env.NODE_ENV === "test") {
  app.use("/api/testing", testingRouter);
}

/**
 * Health Check Endpoints
 * 
 * Provide endpoints for monitoring service health and status.
 * Used by Docker health checks and load balancers.
 */
app.use('/health', healthRouter);
app.get("/",(req,res)=>{res.send("Server is running")});
app.get("/api/ping", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

/**
 * API Route Registration
 * 
 * Register all API routes with their respective controllers.
 * Each controller handles a specific domain of the application.
 * 
 * Routes:
 * - /api/login : User authentication and JWT token generation
 * - /api/users : User registration and profile management
 * - /api/blogs : Blog CRUD operations (Create, Read, Update, Delete)
 */
app.use("/api/login", loginController);
app.use("/api/users", userController);
app.use("/api/blogs", blogsController);

/**
 * Error Handling Middleware
 * 
 * Handle unknown endpoints and application errors.
 * Must be registered after all routes to catch unmatched requests.
 * 
 * Middleware order:
 * 1. unknownEndpoint: Handle 404 errors for unmatched routes
 * 2. errorHandler: Handle application errors and validation errors
 */
app.use(unknownEndpoint);

app.use(errorHandler);

/**
 * Graceful Shutdown Handling
 * 
 * Handle process termination signals and clean up resources properly.
 * This ensures database connections are closed and cache is cleared.
 */
const gracefulShutdown = async (signal) => {
  info(`Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Close Redis connection
    if (redisClient) {
      await redisClient.disconnect();
      info('✅ Redis connection closed gracefully');
    }
    
    // Close MongoDB connection
    await mongoose.connection.close();
    info('✅ MongoDB connection closed gracefully');
    
    info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    info('❌ Error during graceful shutdown:', error.message);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  info('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  info('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Export the configured Express application
module.exports = app;
