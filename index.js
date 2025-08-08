/**
 * Blog Application Server Entry Point
 * 
 * This file serves as the main entry point for the Node.js/Express backend server.
 * It imports the configured Express application and starts the server on the specified port.
 * 
 * Dependencies:
 * - app: The configured Express application with all middleware and routes
 * - config: Environment configuration (PORT, MongoDB URL)
 * - logger: Structured logging utility for server events
 * - redisClient: Redis connection for graceful shutdown
 */

const app = require("./app");
const { PORT, mongoURL } = require("./utils/config");
const { info } = require("./utils/logger");
const { redisClient } = require("./utils/redis");

/**
 * Start the Express server
 * 
 * Binds the server to the configured port and logs the startup information.
 * The server will begin accepting HTTP requests once this function executes.
 * 
 * @listens {number} PORT - The port number from environment variables or default
 */
const server = app.listen(PORT, () => {
  info(`Listening to port ${PORT} and DB URL is ${mongoURL}`);
});

/**
 * Graceful Shutdown Handler
 * 
 * Handles application shutdown signals and closes connections gracefully.
 * This ensures data integrity and prevents connection leaks.
 */
const gracefulShutdown = async (signal) => {
  info(`${signal} received. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(async () => {
    info('HTTP server closed');
    
    try {
      // Close Redis connection
      await redisClient.disconnect();
      info('Redis connection closed');
      
      // Exit process
      info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      info('Error during graceful shutdown:', error.message);
      process.exit(1);
    }
  });
  
  // Force shutdown after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    info('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
