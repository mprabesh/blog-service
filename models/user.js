/**
 * User Model Schema
 * 
 * Defines the MongoDB schema for user documents using Mongoose ODM.
 * This model handles user authentication, profile data, and relationships with blog posts.
 * 
 * Features:
 * - Unique username validation
 * - Password hashing (handled in controllers)
 * - One-to-many relationship with blogs
 * - JSON transformation for API responses
 * - Input validation and length requirements
 */

const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

/**
 * User Schema Definition
 * 
 * Defines the structure and validation rules for user documents in MongoDB.
 * 
 * Fields:
 * - username: Unique identifier for login (min 3 characters, unique across users)
 * - name: User's display name (min 3 characters)
 * - passwordHash: Bcrypt hashed password (never store plain text passwords)
 * - blogs: Array of ObjectId references to Blog documents (one-to-many relationship)
 */
const userSchema = new mongoose.Schema({
  // Username field with validation rules
  username: { 
    type: String, 
    required: true,      // Must be provided during user creation
    minLength: 3,        // Minimum 3 characters for security
    unique: true         // Must be unique across all users
  },
  
  // User's display name
  name: { 
    type: String, 
    required: true,      // Must be provided during user creation
    minLength: 3         // Minimum 3 characters
  },
  
  // Hashed password (never store plain text)
  passwordHash: { 
    type: String, 
    required: true       // Must be provided (hashed in controller)
  },
  
  // References to blog posts created by this user
  blogs: [
    {
      type: mongoose.Schema.Types.ObjectId,  // MongoDB ObjectId reference
      ref: "Blog",                           // References the Blog model
    },
  ],
});

/**
 * JSON Transformation
 * 
 * Customize how user documents are converted to JSON for API responses.
 * This transformation:
 * - Converts MongoDB _id to id field
 * - Removes internal MongoDB fields (__v, _id)
 * - Removes sensitive passwordHash field for security
 * 
 * Security Note: passwordHash is never sent to clients
 */
userSchema.set("toJSON", {
  transform: (document, returnObj) => {
    returnObj.id = returnObj._id.toString();  // Convert ObjectId to string
    delete returnObj._id;                     // Remove MongoDB internal field
    delete returnObj.__v;                     // Remove version key
    delete returnObj.passwordHash;            // Remove sensitive password data
  },
});

/**
 * Unique Validation Plugin
 * 
 * Add the mongoose-unique-validator plugin to provide better error messages
 * when unique constraints are violated (e.g., duplicate username).
 * 
 * Without this plugin, MongoDB returns generic duplicate key errors.
 * With this plugin, we get more user-friendly validation error messages.
 */
userSchema.plugin(uniqueValidator);

// Export the User model for use throughout the application
module.exports = mongoose.model("User", userSchema);
