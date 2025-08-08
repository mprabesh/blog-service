/**
 * Blog Controller - RESTful API Routes
 *
 * This controller handles all HTTP routes related to blog operations.
 * It provides a complete CRUD (Create, Read, Update, Delete) interface
 * for blog posts with user authentication and authorization.
 *
 * Features:
 * - GET /blogs: Retrieve all blog posts with user population
 * - GET /blogs/:id: Retrieve specific blog post by ID
 * - POST /blogs: Create new blog post (authentication required)
 * - PUT /blogs/:id: Update existing blog post (authentication required)
 * - DELETE /blogs/:id: Delete blog post (owner authorization required)
 *
 * Security:
 * - JWT token validation for protected routes
 * - User extraction from tokens
 * - Owner-only delete permissions
 * - Input validation and error handling
 *
 * Database Operations:
 * - Mongoose ODM for MongoDB interactions
 * - Population of user references in responses
 * - Proper error handling with try-catch blocks
 */

const blogRoute = require("express").Router();
const Blog = require("../models/blogs");
const User = require("../models/user");
const { userExtractor, tokenExtractor } = require("../utils/middleware");
const { blogCache, blogInvalidation } = require("../utils/cacheMiddleware");
const logger = require("../utils/logger");
const mongoose = require("mongoose");

/**
 * GET /api/blogs
 * 
 * Retrieve all blog posts from the database.
 * This is a public endpoint that doesn't require authentication.
 * 
 * Features:
 * - Cached for 5 minutes to improve performance
 * - Populates user information (username, name) for each blog
 * - Returns complete list of blogs with author details
 * - Handles database errors gracefully
 * 
 * Response: Array of blog objects with populated user data
 */
blogRoute.get("/", blogCache.list, async (req, res, next) => {
  try {
    logger.debug('Fetching all blogs from database');
    
    const response = await Blog.find({}).populate("user", {
      username: 1,  // Include username in response
      name: 1,      // Include name in response
    });
    
    logger.debug(`Successfully retrieved ${response.length} blogs`);
    res.status(200).json(response);
  } catch (err) {
    logger.error('Error fetching blogs:', err.message);
    
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
    
    next(err);  // Pass other errors to error handling middleware
  }
});

// Route to get a specific blog post by ID
blogRoute.get("/:id", blogCache.single, async (req, res, next) => {
  const myId = req.params.id;
  
  try {
    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(myId)) {
      return res.status(400).json({ 
        error: 'Invalid blog ID format',
        message: 'Please provide a valid blog ID'
      });
    }
    
    logger.debug(`Fetching blog with ID: ${myId}`);
    
    const response = await Blog.findById(myId).populate("user", {
      username: 1,
      name: 1,
    });
    
    // Handle blog not found
    if (!response) {
      logger.warn(`Blog not found with ID: ${myId}`);
      return res.status(404).json({ 
        error: 'Blog not found',
        message: 'The requested blog post does not exist'
      });
    }
    
    logger.debug(`Successfully retrieved blog: ${response.title}`);
    res.status(200).json(response);
  } catch (err) {
    logger.error(`Error fetching blog ${myId}:`, err.message);
    
    // Handle cast errors (invalid ObjectId)
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        error: 'Invalid blog ID',
        message: 'Please provide a valid blog ID'
      });
    }
    
    next(err);
  }
});

// Route to create a new blog post
blogRoute.post("/", tokenExtractor, userExtractor, blogInvalidation.all, async (req, res, next) => {
  const tokenUser = req.user;
  const { title, author, url, likes } = req.body;
  
  try {
    // Validate required fields
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Title is required',
        message: 'Blog title cannot be empty'
      });
    }
    
    if (!url || url.trim().length === 0) {
      return res.status(400).json({ 
        error: 'URL is required',
        message: 'Blog URL cannot be empty'
      });
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch (urlError) {
      return res.status(400).json({ 
        error: 'Invalid URL format',
        message: 'Please provide a valid URL'
      });
    }
    
    // Validate user exists
    if (!mongoose.Types.ObjectId.isValid(tokenUser)) {
      return res.status(400).json({ 
        error: 'Invalid user ID',
        message: 'Invalid authentication token'
      });
    }
    
    logger.debug(`Creating new blog for user: ${tokenUser}`);
    
    const userFromDb = await User.findById(tokenUser);
    if (!userFromDb) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'The authenticated user no longer exists'
      });
    }
    
    // Initialize likes to 0 if not provided or invalid
    const validLikes = (typeof likes === 'number' && likes >= 0) ? likes : 0;
    
    const newBlog = new Blog({ 
      title: title.trim(),
      author: author ? author.trim() : userFromDb.username,
      url: url.trim(),
      likes: validLikes,
      user: tokenUser 
    });
    
    const result = await newBlog.save();
    const addedBlog = await Blog.findById(result._id).populate("user", {
      username: 1,
      name: 1,
    });
    
    logger.info(`New blog created: ${addedBlog.title} by ${userFromDb.username}`);
    
    // Update user's blog list
    userFromDb.blogs = userFromDb.blogs.concat(result.id);
    await userFromDb.save();
    
    res.status(201).json(addedBlog);
  } catch (err) {
    logger.error('Error creating blog:', err.message);
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Please check your input data',
        details: errors
      });
    }
    
    // Handle duplicate key errors
    if (err.code === 11000) {
      return res.status(409).json({ 
        error: 'Duplicate blog',
        message: 'A blog with this URL already exists'
      });
    }
    
    next(err);
  }
});

// Route to delete a blog post
blogRoute.delete(
  "/:id",
  tokenExtractor,
  userExtractor,
  blogInvalidation.all,
  async (req, res, next) => {
    const myID = req.params.id;
    const tokenUser = req.user;
    
    try {
      // Validate MongoDB ObjectId format
      if (!mongoose.Types.ObjectId.isValid(myID)) {
        return res.status(400).json({ 
          error: 'Invalid blog ID format',
          message: 'Please provide a valid blog ID'
        });
      }
      
      if (!mongoose.Types.ObjectId.isValid(tokenUser)) {
        return res.status(400).json({ 
          error: 'Invalid user ID',
          message: 'Invalid authentication token'
        });
      }
      
      logger.debug(`Attempting to delete blog ${myID} by user ${tokenUser}`);
      
      const deleteUser = await Blog.findById(myID);
      
      // Check if blog exists
      if (!deleteUser) {
        return res.status(404).json({ 
          error: 'Blog not found',
          message: 'The blog post you are trying to delete does not exist'
        });
      }
      
      // Check if the logged-in user is the owner of the blog post
      if (deleteUser.user.toString() !== tokenUser) {
        logger.warn(`Unauthorized delete attempt: user ${tokenUser} tried to delete blog ${myID} owned by ${deleteUser.user}`);
        return res.status(403).json({ 
          error: 'Permission denied',
          message: 'Only the user who created the blog can delete it'
        });
      }
      
      const result = await Blog.findByIdAndDelete(myID);
      
      // Also remove blog from user's blog list
      await User.findByIdAndUpdate(tokenUser, {
        $pull: { blogs: myID }
      });
      
      logger.info(`Blog deleted: ${result.title} by user ${tokenUser}`);
      res.status(200).json({ 
        message: 'Blog deleted successfully',
        deletedBlog: result
      });
    } catch (err) {
      logger.error(`Error deleting blog ${myID}:`, err.message);
      
      // Handle cast errors
      if (err.name === 'CastError') {
        return res.status(400).json({ 
          error: 'Invalid blog ID',
          message: 'Please provide a valid blog ID'
        });
      }
      
      next(err);
    }
  }
);

// Route to update a blog post
blogRoute.put("/:id", tokenExtractor, userExtractor, blogInvalidation.all, async (req, res, next) => {
  const myId = req.params.id;
  const myUpdatedObj = req.body;
  const tokenUser = req.user;
  
  try {
    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(myId)) {
      return res.status(400).json({ 
        error: 'Invalid blog ID format',
        message: 'Please provide a valid blog ID'
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(tokenUser)) {
      return res.status(400).json({ 
        error: 'Invalid user ID',
        message: 'Invalid authentication token'
      });
    }
    
    // Check if blog exists and user has permission
    const existingBlog = await Blog.findById(myId);
    if (!existingBlog) {
      return res.status(404).json({ 
        error: 'Blog not found',
        message: 'The blog post you are trying to update does not exist'
      });
    }
    
    // Check ownership
    if (existingBlog.user.toString() !== tokenUser) {
      logger.warn(`Unauthorized update attempt: user ${tokenUser} tried to update blog ${myId} owned by ${existingBlog.user}`);
      return res.status(403).json({ 
        error: 'Permission denied',
        message: 'Only the user who created the blog can update it'
      });
    }
    
    // Validate update fields
    const allowedFields = ['title', 'author', 'url', 'likes'];
    const updateFields = {};
    
    Object.keys(myUpdatedObj).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields[key] = myUpdatedObj[key];
      }
    });
    
    // Validate specific fields if provided
    if (updateFields.title !== undefined) {
      if (!updateFields.title || updateFields.title.trim().length === 0) {
        return res.status(400).json({ 
          error: 'Invalid title',
          message: 'Blog title cannot be empty'
        });
      }
      updateFields.title = updateFields.title.trim();
    }
    
    if (updateFields.url !== undefined) {
      if (!updateFields.url || updateFields.url.trim().length === 0) {
        return res.status(400).json({ 
          error: 'Invalid URL',
          message: 'Blog URL cannot be empty'
        });
      }
      
      try {
        new URL(updateFields.url);
        updateFields.url = updateFields.url.trim();
      } catch (urlError) {
        return res.status(400).json({ 
          error: 'Invalid URL format',
          message: 'Please provide a valid URL'
        });
      }
    }
    
    if (updateFields.likes !== undefined) {
      if (typeof updateFields.likes !== 'number' || updateFields.likes < 0) {
        return res.status(400).json({ 
          error: 'Invalid likes value',
          message: 'Likes must be a non-negative number'
        });
      }
    }
    
    if (updateFields.author !== undefined && updateFields.author) {
      updateFields.author = updateFields.author.trim();
    }
    
    logger.debug(`Updating blog ${myId} with fields:`, Object.keys(updateFields));
    
    const response = await Blog.findByIdAndUpdate(
      myId, 
      updateFields, 
      { new: true, runValidators: true }
    ).populate("user", {
      username: 1,
      name: 1,
    });
    
    logger.info(`Blog updated: ${response.title} by user ${tokenUser}`);
    res.status(200).json(response);
  } catch (err) {
    logger.error(`Error updating blog ${myId}:`, err.message);
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Please check your input data',
        details: errors
      });
    }
    
    // Handle cast errors
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        error: 'Invalid blog ID',
        message: 'Please provide a valid blog ID'
      });
    }
    
    // Handle duplicate key errors
    if (err.code === 11000) {
      return res.status(409).json({ 
        error: 'Duplicate blog',
        message: 'A blog with this URL already exists'
      });
    }
    
    next(err);
  }
});

module.exports = blogRoute;
