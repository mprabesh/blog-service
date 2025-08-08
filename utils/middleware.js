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

const { info, error: logError, warn } = require("./logger");
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
  try {
    const authorization = req.headers.authorization;
    
    if (!authorization) {
      warn(`Token extraction failed: No authorization header - ${req.method} ${req.path}`);
      return res.status(401).json({ 
        error: "Authentication required",
        message: "Missing authorization header"
      });
    }
    
    if (!authorization.startsWith('Bearer ')) {
      warn(`Token extraction failed: Invalid authorization format - ${req.method} ${req.path}`);
      return res.status(401).json({ 
        error: "Invalid authorization format",
        message: "Authorization header must start with 'Bearer '"
      });
    }
    
    const token = authorization.split(" ")[1];
    
    if (!token || token.trim().length === 0) {
      warn(`Token extraction failed: Empty token - ${req.method} ${req.path}`);
      return res.status(401).json({ 
        error: "Authentication required",
        message: "Missing authentication token"
      });
    }
    
    req.token = token.trim();
    next();
  } catch (err) {
    logError('Token extraction error:', err.message);
    return res.status(500).json({ 
      error: "Authentication processing error",
      message: "Unable to process authentication"
    });
  }
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
  try {
    const token = req.token;
    
    if (!token) {
      warn(`User extraction failed: No token in request - ${req.method} ${req.path}`);
      return res.status(401).json({ 
        error: "Authentication required",
        message: "No authentication token found"
      });
    }
    
    if (!SECRET_KEY) {
      logError('JWT verification failed: SECRET_KEY not configured');
      return res.status(500).json({ 
        error: "Authentication service error",
        message: "Authentication service is not properly configured"
      });
    }
    
    const decodedToken = jwt.verify(token, SECRET_KEY);
    
    if (!decodedToken || typeof decodedToken !== 'object') {
      warn(`User extraction failed: Invalid token payload - ${req.method} ${req.path}`);
      return res.status(401).json({ 
        error: "Invalid token",
        message: "Authentication token is malformed"
      });
    }
    
    if (!decodedToken.userId) {
      warn(`User extraction failed: Missing userId in token - ${req.method} ${req.path}`);
      return res.status(401).json({ 
        error: "Invalid token",
        message: "Authentication token is missing user information"
      });
    }
    
    // Add user information to request
    req.user = decodedToken.userId;
    req.userInfo = {
      userId: decodedToken.userId,
      username: decodedToken.username,
      name: decodedToken.name
    };
    
    next();
  } catch (err) {
    logError('User extraction error:', err.message);
    
    // Handle specific JWT errors
    if (err.name === 'TokenExpiredError') {
      warn(`Token expired for ${req.method} ${req.path}`);
      return res.status(401).json({ 
        error: "Token expired",
        message: "Your session has expired. Please log in again"
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      warn(`Invalid token for ${req.method} ${req.path}: ${err.message}`);
      return res.status(401).json({ 
        error: "Invalid token",
        message: "Authentication token is invalid"
      });
    }
    
    if (err.name === 'NotBeforeError') {
      warn(`Token not active yet for ${req.method} ${req.path}`);
      return res.status(401).json({ 
        error: "Token not active",
        message: "Authentication token is not yet valid"
      });
    }
    
    // Generic authentication error
    return res.status(401).json({ 
      error: "Authentication failed",
      message: "Unable to verify authentication token"
    });
  }
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
  warn(`Unknown endpoint accessed: ${request.method} ${request.path}`);
  response.status(404).json({ 
    error: "unknown endpoint",
    message: `Cannot ${request.method} ${request.path}`,
    path: request.path,
    method: request.method
  });
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
 * - MongoError: Database-related errors
 * - SyntaxError: JSON parsing errors
 * 
 * @param {Error} error - Error object caught by Express
 * @param {Object} request - Express request object
 * @param {Object} response - Express response object
 * @param {Function} next - Next middleware function
 * @returns {Object} Appropriate error response based on error type
 */
const errorHandler = (error, request, response, next) => {
  logError(`Error in ${request.method} ${request.path}:`, error.message);
  
  // MongoDB CastError - Invalid ObjectId format
  if (error.name === "CastError") {
    return response.status(400).json({ 
      error: "Invalid ID format",
      message: "The provided ID is not in the correct format",
      field: error.path
    });
  }
  
  // Mongoose ValidationError - Schema validation failures
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
    
    return response.status(400).json({ 
      error: "Validation failed",
      message: "One or more fields contain invalid data",
      details: errors
    });
  }
  
  // JWT TokenExpiredError
  if (error.name === "TokenExpiredError") {
    return response.status(401).json({ 
      error: "Token expired",
      message: "Your session has expired. Please log in again",
      expiredAt: error.expiredAt
    });
  }
  
  // JWT JsonWebTokenError
  if (error.name === "JsonWebTokenError") {
    return response.status(401).json({ 
      error: "Invalid token",
      message: "Authentication token is invalid or malformed"
    });
  }
  
  // MongoDB Duplicate Key Error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    const value = error.keyValue[field];
    
    return response.status(409).json({ 
      error: "Duplicate entry",
      message: `${field} '${value}' already exists`,
      field: field
    });
  }
  
  // MongoDB Network/Connection Errors
  if (error.name === "MongoNetworkError" || error.name === "MongoTimeoutError") {
    return response.status(503).json({ 
      error: "Database unavailable",
      message: "Unable to connect to the database. Please try again later"
    });
  }
  
  // JSON Syntax Error (malformed request body)
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return response.status(400).json({ 
      error: "Invalid JSON",
      message: "Request body contains invalid JSON"
    });
  }
  
  // Request Entity Too Large
  if (error.status === 413) {
    return response.status(413).json({ 
      error: "Request too large",
      message: "Request body exceeds the maximum allowed size"
    });
  }
  
  // Rate Limiting Error
  if (error.status === 429) {
    return response.status(429).json({ 
      error: "Too many requests",
      message: "Rate limit exceeded. Please slow down your requests"
    });
  }
  
  // Generic server errors
  logError('Unhandled error:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    path: request.path,
    method: request.method
  });
  
  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  response.status(500).json({ 
    error: "Internal server error",
    message: "An unexpected error occurred. Please try again later",
    ...(isDevelopment && { 
      details: error.message,
      stack: error.stack 
    })
  });
};

// Export all middleware functions for use in the main application
module.exports = {
  requestLogger,
  unknownEndpoint,
  errorHandler,
  tokenExtractor,
  userExtractor,
};
