/**
 * User Seed Data Script
 * 
 * This script populates the MongoDB database with realistic user data for development and testing.
 * Run this script to create sample users with hashed passwords.
 * 
 * Usage:
 *   node seedUsers.js
 * 
 * Note: This will clear existing users and create fresh seed data.
 */

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./models/user");

// Load local environment for seed scripts
require("dotenv").config({ path: '.env.local' });
const config = require("./utils/config");

// Salt rounds for password hashing (same as in your controller)
const saltRounds = 10;

/**
 * Seed User Data
 * 
 * Array of realistic user data with various names and usernames.
 * All users will have the password "password123" for testing purposes.
 */
const seedUsers = [
  {
    username: "rupinder",
    name: "Rupinder Kaur",
    password: "password123"
  },
  {
    username: "prabesh",
    name: "Prabesh Magar",
    password: "password123"
  },
  {
    username: "mikebrown",
    name: "Michael Brown",
    password: "password123"
  },
  {
    username: "emilydavis",
    name: "Emily Davis",
    password: "password123"
  },
  {
    username: "davidwilson",
    name: "David Wilson",
    password: "password123"
  },
  {
    username: "jessicamoore",
    name: "Jessica Moore",
    password: "password123"
  },
  {
    username: "chrismiller",
    name: "Christopher Miller",
    password: "password123"
  },
  {
    username: "amandawhite",
    name: "Amanda White",
    password: "password123"
  },
  {
    username: "ryangarcia",
    name: "Ryan Garcia",
    password: "password123"
  },
  {
    username: "lisaanderson",
    name: "Lisa Anderson",
    password: "password123"
  },
  {
    username: "alexchen",
    name: "Alex Chen",
    password: "password123"
  },
  {
    username: "marialopez",
    name: "Maria Lopez",
    password: "password123"
  },
  {
    username: "jamestaylor",
    name: "James Taylor",
    password: "password123"
  },
  {
    username: "rachelgreen",
    name: "Rachel Green",
    password: "password123"
  },
  {
    username: "kevinlee",
    name: "Kevin Lee",
    password: "password123"
  }
];

/**
 * Hash Password Helper Function
 * 
 * Hashes a plain text password using bcrypt with the same salt rounds
 * as used in the user controller.
 * 
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
const hashPassword = async (password) => {
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Seed Database Function
 * 
 * Main function that:
 * 1. Connects to MongoDB
 * 2. Clears existing users
 * 3. Creates new users with hashed passwords
 * 4. Displays results
 * 5. Closes database connection
 */
const seedDatabase = async () => {
  try {
    console.log("🌱 Starting user seeding process...");
    
    // Debug environment configuration
    console.log("🔍 Environment Check:");
    console.log("NODE_ENV:", process.env.NODE_ENV || "undefined");
    console.log("MONGO_URL:", process.env.MONGO_URL ? "✅ Set" : "❌ Not set");
    console.log("TEST_MONGO_URL:", process.env.TEST_MONGO_URL ? "✅ Set" : "❌ Not set");
    console.log("Config mongoURL:", config.mongoURL ? "✅ Available" : "❌ Not available");
    
    // Connect to MongoDB
    console.log("📡 Connecting to MongoDB...");
    console.log("Using MongoDB URL:", config.mongoURL ? "✅ Found" : "❌ Not found");
    await mongoose.connect(config.mongoURL);
    console.log("✅ Connected to MongoDB");

    // Clear existing users
    console.log("🗑️  Clearing existing users...");
    await User.deleteMany({});
    console.log("✅ Existing users cleared");

    // Process and create users
    console.log("👥 Creating seed users...");
    const usersWithHashedPasswords = await Promise.all(
      seedUsers.map(async (userData) => {
        const passwordHash = await hashPassword(userData.password);
        return {
          username: userData.username,
          name: userData.name,
          passwordHash: passwordHash,
          blogs: [] // Empty blogs array initially
        };
      })
    );

    // Insert users into database
    const createdUsers = await User.insertMany(usersWithHashedPasswords);
    
    console.log("✅ Seed users created successfully!");
    console.log(`📊 Total users created: ${createdUsers.length}`);
    
    // Display created users (without password hashes)
    console.log("\n👤 Created Users:");
    console.log("==================");
    createdUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (@${user.username})`);
    });

    console.log("\n🔐 Default Password for all users: password123");
    console.log("\n🎉 Seeding completed successfully!");

  } catch (error) {
    console.error("❌ Error during seeding process:", error.message);
    if (error.code === 11000) {
      console.error("💡 Duplicate key error - users might already exist");
    }
  } finally {
    // Close database connection
    console.log("🔌 Closing database connection...");
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  }
};

/**
 * Alternative: Individual User Creation Functions
 * 
 * These functions can be used to create users one by one during development.
 */

/**
 * Create a single user
 * 
 * @param {string} username - Unique username
 * @param {string} name - User's display name  
 * @param {string} password - Plain text password (will be hashed)
 * @returns {Promise<Object>} - Created user object
 */
const createUser = async (username, name, password) => {
  try {
    await mongoose.connect(config.mongoURL);
    
    const passwordHash = await hashPassword(password);
    const newUser = new User({ username, name, passwordHash });
    const result = await newUser.save();
    
    console.log(`✅ User created: ${result.name} (@${result.username})`);
    await mongoose.connection.close();
    
    return result;
  } catch (error) {
    console.error("❌ Error creating user:", error.message);
    await mongoose.connection.close();
    throw error;
  }
};

// Run the seeding process if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

// Export functions for use in other files
module.exports = {
  seedDatabase,
  createUser,
  seedUsers: seedUsers.map(user => ({ 
    username: user.username, 
    name: user.name 
    // Don't export passwords
  }))
};
