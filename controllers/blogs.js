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

/**
 * GET /api/blogs
 * 
 * Retrieve all blog posts from the database.
 * This is a public endpoint that doesn't require authentication.
 * 
 * Features:
 * - Populates user information (username, name) for each blog
 * - Returns complete list of blogs with author details
 * - Handles database errors gracefully
 * 
 * Response: Array of blog objects with populated user data
 */
blogRoute.get("/", async (req, res, next) => {
  try {
    const response = await Blog.find({}).populate("user", {
      username: 1,  // Include username in response
      name: 1,      // Include name in response
    });
    res.status(200).json(response);
  } catch (err) {
    next(err);  // Pass error to error handling middleware
  }
});

// Route to get a specific blog post by ID
blogRoute.get("/:id", async (req, res, next) => {
  const myId = req.params.id;
  try {
    const response = await Blog.findById(myId);
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// Route to create a new blog post
blogRoute.post("/", tokenExtractor, userExtractor, async (req, res, next) => {
  const tokenUser = req.user;
  // Initialize likes to 0 if not provided
  if (!Object.keys(req.body).includes("likes")) {
    req.body["likes"] = 0;
  }
  try {
    const userFromDb = await User.findById(tokenUser);
    const newBlog = new Blog({ ...req.body, user: tokenUser });
    const result = await newBlog.save();
    const addedBlog = await Blog.findById(result._id).populate("user", {
      username: 1,
      name: 1,
    });
    res.status(200).json(addedBlog);
    // Update user's blog list
    userFromDb.blogs = userFromDb.blogs.concat(result.id);
    await userFromDb.save();
  } catch (err) {
    next(err);
  }
});

// Route to delete a blog post
blogRoute.delete(
  "/:id",
  tokenExtractor,
  userExtractor,
  async (req, res, next) => {
    const myID = req.params.id;
    const tokenUser = req.user;
    try {
      const deleteUser = await Blog.findById(myID);
      // Check if the logged-in user is the owner of the blog post
      if (deleteUser.user.toString() !== tokenUser) {
        return res
          .status(401)
          .json({ error: "Only the user who created the blog can delete it." });
      }
      const result = await Blog.findByIdAndDelete(myID);
      res.status(200).send(result);
    } catch (err) {
      next(err);
    }
  }
);

// Route to update a blog post
blogRoute.put("/:id", tokenExtractor, userExtractor, async (req, res, next) => {
  const myId = req.params.id;
  const myUpdatedObj = req.body;
  try {
    const response = await Blog.findByIdAndUpdate(myId, myUpdatedObj).populate(
      "user",
      {
        username: 1,
        name: 1,
      }
    );
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

module.exports = blogRoute;
