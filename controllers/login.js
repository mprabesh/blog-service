const loginRoute = require("express").Router();
const BlogUser = require("../models/user");
const bcrypt = require("bcrypt");
const { SECRET_KEY } = require("../utils/config");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

loginRoute.post("/", async (req, res, next) => {
  const { username, password } = req.body;
  
  try {
    // Input validation
    if (!username || username.trim().length === 0) {
      return res.status(400).json({ 
        error: "Username is required",
        message: "Please provide your username"
      });
    }
    
    if (!password) {
      return res.status(400).json({ 
        error: "Password is required",
        message: "Please provide your password"
      });
    }
    
    const trimmedUsername = username.trim();
    
    // Rate limiting simulation - in production, use actual rate limiting middleware
    const maxAttempts = 5;
    const lockoutTime = 15 * 60 * 1000; // 15 minutes
    
    logger.debug(`Login attempt for username: ${trimmedUsername}`);
    
    // Find user by username (case-insensitive)
    const user = await BlogUser.findOne({ 
      username: { $regex: new RegExp(`^${trimmedUsername}$`, 'i') }
    });
    
    if (!user) {
      logger.warn(`Login failed: user not found - ${trimmedUsername}`);
      
      // Consistent response time to prevent username enumeration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return res.status(401).json({ 
        error: "Authentication failed",
        message: "Invalid username or password"
      });
    }
    
    // Check password
    const passwordCorrect = await bcrypt.compare(password, user.passwordHash);
    
    if (!passwordCorrect) {
      logger.warn(`Login failed: incorrect password for user ${trimmedUsername}`);
      
      // Consistent response time
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return res.status(401).json({ 
        error: "Authentication failed",
        message: "Invalid username or password"
      });
    }
    
    // Validate JWT secret
    if (!SECRET_KEY) {
      logger.error('JWT secret key not configured');
      return res.status(500).json({ 
        error: "Authentication service unavailable",
        message: "Please contact administrator"
      });
    }
    
    // Create token payload
    const tokenForUser = {
      username: user.username,
      userId: user._id.toString(),
      name: user.name
    };
    
    // Generate JWT token
    const token = jwt.sign(tokenForUser, SECRET_KEY, { 
      expiresIn: "45m",
      issuer: "blog-app",
      subject: user._id.toString()
    });
    
    // Successful login response
    const loginResponse = {
      username: user.username,
      name: user.name,
      email: user.email,
      token,
      expiresIn: 45 * 60 // 45 minutes in seconds
    };
    
    logger.info(`Successful login for user: ${user.username}`);
    res.status(200).json(loginResponse);
    
  } catch (err) {
    logger.error('Login error:', err.message);
    
    // Handle bcrypt errors
    if (err.message.includes('bcrypt')) {
      return res.status(500).json({ 
        error: 'Authentication processing error',
        message: 'Unable to process login. Please try again'
      });
    }
    
    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
      return res.status(500).json({ 
        error: 'Token generation error',
        message: 'Unable to generate authentication token'
      });
    }
    
    // Handle database errors
    if (err.name === 'MongoNetworkError') {
      return res.status(503).json({ 
        error: 'Authentication service unavailable',
        message: 'Please try again later'
      });
    }
    
    if (err.name === 'MongoTimeoutError') {
      return res.status(408).json({ 
        error: 'Authentication timeout',
        message: 'Login request took too long to process'
      });
    }
    
    next(err);
  }
});

module.exports = loginRoute;
