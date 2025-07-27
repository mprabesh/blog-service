/**
 * Master Seed Script
 * 
 * This script seeds both users and blogs in the correct order.
 * It ensures users are created first, then blogs with proper user references.
 * 
 * Usage:
 *   node seedAll.js
 * 
 * This will:
 * 1. Clear and seed users
 * 2. Clear and seed blogs with user references
 * 3. Display comprehensive results
 */

const { seedDatabase: seedUsers } = require('./seedUsers');
const { seedBlogsDatabase: seedBlogs } = require('./seedBlogs');

/**
 * Master seeding function
 * 
 * Runs both user and blog seeding in sequence
 */
const seedAll = async () => {
  try {
    console.log("🚀 Starting complete database seeding...");
    console.log("=====================================\n");
    
    // Seed users first
    console.log("STEP 1: Seeding Users");
    console.log("---------------------");
    await seedUsers();
    
    console.log("\n" + "=".repeat(50) + "\n");
    
    // Wait a moment to ensure users are properly saved
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Seed blogs with user references
    console.log("STEP 2: Seeding Blogs");
    console.log("---------------------");
    await seedBlogs();
    
    console.log("\n" + "=".repeat(50));
    console.log("🎉 COMPLETE DATABASE SEEDING FINISHED!");
    console.log("=====================================");
    console.log("✅ Users and blogs created successfully");
    console.log("✅ All relationships established");
    console.log("\n💡 You can now:");
    console.log("   - Login with any username and password 'password123'");
    console.log("   - View blogs created by different users");
    console.log("   - Test the complete blog application");
    
  } catch (error) {
    console.error("❌ Master seeding failed:", error.message);
    process.exit(1);
  }
};

// Run if executed directly
if (require.main === module) {
  seedAll();
}

module.exports = { seedAll };
