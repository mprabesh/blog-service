/**
 * Express Middleware Collection
 * 
 * This module provides custom middleware functions for the Express application.
 * Middleware functions execute during the request-response cycle and can:
 * - Execute code
 * - Modify request/response objects
 * - End the request-response cycle
 * - Call the next middleware function
 * 
 * Middleware Types:
 * - Request logging for debugging
 * - JWT token extraction and validation
 * - User authentication and authorization
 * - Error handling for different error types
 * - Unknown endpoint handling (404 errors)
 */

const { info } = require("./logger");
const { SECRET_KEY } = require("./config");
const jwt = require("jsonwebtoken");

/**
 * Request Logger Middleware
 * 
 * Logs detailed information about incoming HTTP requests for debugging purposes.
 * This helps developers track API usage and troubleshoot issues.
 * 
 * Logged Information:
 * - HTTP method (GET, POST, PUT, DELETE)
 * - Request path/URL
 * - Request body content
 * 
 * @param {Object} request - Express request object
 * @param {Object} response - Express response object
 * @param {Function} next - Next middleware function
 */
const requestLogger = (request, response, next) => {
  info("Method:", request.method);
  info("Path:  ", request.path);
  info("Body:  ", request.body);
  info("---");
  next();
};

/**
 * JWT Token Extractor Middleware
 * 
 * Extracts JWT token from the Authorization header and adds it to the request object.
 * Expected header format: "Bearer <token>"
 * 
 * Security Flow:
 * 1. Check if Authorization header exists
 * 2. Extract token from "Bearer <token>" format
 * 3. Add token to request object for subsequent middleware
 * 4. Return 401 error if no token provided
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 * @returns {Object} 401 error if no authorization header found
 */
const tokenExtractor = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: "missing token" });
  }
  const token = req.headers.authorization.split(" ")[1];
  req.token = token;
  next();
};

/**
 * User Extractor Middleware
 * 
 * Verifies JWT token and extracts user information for authenticated routes.
 * This middleware should be used after tokenExtractor middleware.
 * 
 * Authentication Flow:
 * 1. Get token from request object (set by tokenExtractor)
 * 2. Verify token using SECRET_KEY
 * 3. Extract user ID from decoded token
 * 4. Add user ID to request object for route handlers
 * 5. Return 401 error if token is invalid or expired
 * 
 * @param {Object} req - Express request object (must contain req.token)
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 * @returns {Object} 401 error if token is invalid
 */
const userExtractor = (req, res, next) => {
  const token = req.token;
  const decodedToken = jwt.verify(token, SECRET_KEY);
  if (!decodedToken.userId) {
    return res.status(401).json({ error: "invalid token" });
  }
  req.user = decodedToken.userId;
  next();
};

/**
 * Unknown Endpoint Handler
 * 
 * Handles requests to undefined routes by returning a 404 error.
 * This middleware should be registered after all valid routes.
 * 
 * @param {Object} request - Express request object
 * @param {Object} response - Express response object
 * @returns {Object} 404 error response
 */
const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: "unknown endpoint" });
};

/**
 * Global Error Handler
 * 
 * Centralized error handling middleware that catches and processes different types of errors.
 * This middleware should be registered last to catch all unhandled errors.
 * 
 * Error Types Handled:
 * - CastError: Invalid MongoDB ObjectId format
 * - ValidationError: Mongoose validation failures
 * - TokenExpiredError: Expired JWT tokens
 * - JsonWebTokenError: Invalid JWT tokens
 * 
 * @param {Error} error - Error object caught by Express
 * @param {Object} request - Express request object
 * @param {Object} response - Express response object
 * @param {Function} next - Next middleware function
 * @returns {Object} Appropriate error response based on error type
 */
const errorHandler = (error, request, response, next) => {
  info(error.message);

  if (error.name === "CastError") {
    return response.status(400).send({ error: "malformatted id" });
  } else if (error.name === "ValidationError") {
    return response.status(400).json({ error: error.message });
  } else if (error.name === "TokenExpiredError") {
    return response.status(400).json({ error: error.message });
  } else if (error.name === "JsonWebTokenError") {
    return response.status(401).json({ error: error.message });
  }
  next(error);
};

// Export all middleware functions for use in the main application
module.exports = {
  requestLogger,
  unknownEndpoint,
  errorHandler,
  tokenExtractor,
  userExtractor,
};
