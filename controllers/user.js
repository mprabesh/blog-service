const userRoute = require("express").Router();
const User = require("../models/user");
const bcrypt = require("bcrypt");
const logger = require("../utils/logger");
const mongoose = require("mongoose");

userRoute.get("/", async (req, res, next) => {
  try {
    logger.debug('Fetching all users from database');
    
    const result = await User.find({}).populate("blogs", {
      title: 1,
      author: 1,
      url: 1,
      likes: 1
    });
    
    // Remove sensitive information (passwordHash) from response
    const sanitizedUsers = result.map(user => ({
      id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      blogs: user.blogs
    }));
    
    logger.debug(`Successfully retrieved ${sanitizedUsers.length} users`);
    res.status(200).json(sanitizedUsers);
  } catch (err) {
    logger.error('Error fetching users:', err.message);
    
    // Handle specific database errors
    if (err.name === 'MongoNetworkError') {
      return res.status(503).json({ 
        error: 'Database temporarily unavailable',
        message: 'Please try again later'
      });
    }
    
    if (err.name === 'MongoTimeoutError') {
      return res.status(408).json({ 
        error: 'Database query timeout',
        message: 'Request took too long to process'
      });
    }
    
    next(err);
  }
});

userRoute.post("/", async (req, res, next) => {
  const { username, name, email, password } = req.body;
  
  try {
    // Comprehensive input validation
    if (!username || username.trim().length === 0) {
      return res.status(400).json({
        error: "Username is required",
        message: "Please provide a username"
      });
    }
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: "Name is required",
        message: "Please provide your full name"
      });
    }
    
    if (!email || email.trim().length === 0) {
      return res.status(400).json({
        error: "Email is required",
        message: "Please provide an email address"
      });
    }
    
    if (!password) {
      return res.status(400).json({
        error: "Password is required",
        message: "Please provide a password"
      });
    }
    
    // Validate username format and length
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      return res.status(400).json({
        error: "Username too short",
        message: "Username must be at least 3 characters long"
      });
    }
    
    if (trimmedUsername.length > 30) {
      return res.status(400).json({
        error: "Username too long",
        message: "Username must be no more than 30 characters long"
      });
    }
    
    // Validate username contains only alphanumeric characters and underscores
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      return res.status(400).json({
        error: "Invalid username format",
        message: "Username can only contain letters, numbers, and underscores"
      });
    }
    
    // Validate password length and strength
    if (password.length < 3) {
      return res.status(400).json({
        error: "Password too short",
        message: "Password must be at least 3 characters long"
      });
    }
    
    if (password.length > 128) {
      return res.status(400).json({
        error: "Password too long",
        message: "Password must be no more than 128 characters long"
      });
    }
    
    // Validate email format
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        error: "Invalid email format",
        message: "Please enter a valid email address"
      });
    }
    
    // Validate name length
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return res.status(400).json({
        error: "Name too short",
        message: "Name must be at least 2 characters long"
      });
    }
    
    if (trimmedName.length > 100) {
      return res.status(400).json({
        error: "Name too long",
        message: "Name must be no more than 100 characters long"
      });
    }
    
    // Check if username already exists
    const existingUsername = await User.findOne({ username: trimmedUsername });
    if (existingUsername) {
      return res.status(409).json({
        error: "Username already exists",
        message: "Please choose a different username"
      });
    }
    
    // Check if email already exists
    const existingEmail = await User.findOne({ email: trimmedEmail });
    if (existingEmail) {
      return res.status(409).json({
        error: "Email already registered",
        message: "This email address is already associated with another account"
      });
    }
    
    logger.debug(`Creating new user: ${trimmedUsername}`);
    
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    const newUser = new User({ 
      username: trimmedUsername, 
      name: trimmedName, 
      email: trimmedEmail,
      passwordHash 
    });
    
    const result = await newUser.save();
    
    // Return user without password hash
    const userResponse = {
      id: result._id,
      username: result.username,
      name: result.name,
      email: result.email,
      blogs: result.blogs || []
    };
    
    logger.info(`New user created: ${result.username}`);
    res.status(201).json(userResponse);
  } catch (err) {
    logger.error('Error creating user:', err.message);
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Please check your input data',
        details: errors
      });
    }
    
    // Handle duplicate key errors (in case unique constraints change)
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(409).json({ 
        error: `${field} already exists`,
        message: `This ${field} is already registered`
      });
    }
    
    // Handle bcrypt errors
    if (err.message.includes('bcrypt')) {
      return res.status(500).json({ 
        error: 'Password processing error',
        message: 'Unable to process password. Please try again'
      });
    }
    
    next(err);
  }
});

module.exports = userRoute;
