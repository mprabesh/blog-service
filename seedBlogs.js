/**
 * Blog Seed Data Script
 * 
 * This script populates the MongoDB database with realistic blog data using the seeded users.
 * Run this script after running seedUsers.js to create sample blogs with proper user references.
 * 
 * Usage:
 *   node seedBlogs.js
 * 
 * Note: This requires users to already exist in the database.
 */

const mongoose = require("mongoose");
const Blog = require("./models/blogs");
const User = require("./models/user");
const config = require("./utils/config");

/**
 * Seed Blog Data
 * 
 * Array of realistic blog posts with various topics.
 * These will be randomly assigned to users from the seed data.
 */
const seedBlogs = [
  {
    title: "Getting Started with React Hooks",
    author: "Rupinder Kaur",
    url: "https://blog.example.com/react-hooks-guide",
    likes: 25
  },
  {
    title: "Node.js Best Practices for 2025",
    author: "Prabesh Magar", 
    url: "https://dev.to/nodejs-best-practices-2025",
    likes: 42
  },
  {
    title: "Building Scalable APIs with Express.js",
    author: "Michael Brown",
    url: "https://medium.com/scalable-apis-express",
    likes: 18
  },
  {
    title: "MongoDB Performance Optimization Tips",
    author: "Emily Davis",
    url: "https://mongodbperformance.dev/optimization-tips",
    likes: 33
  },
  {
    title: "Docker for JavaScript Developers",
    author: "David Wilson",
    url: "https://docker-js-devs.com/getting-started",
    likes: 29
  },
  {
    title: "Understanding JWT Authentication",
    author: "Jessica Moore",
    url: "https://auth-guide.com/jwt-explained",
    likes: 56
  },
  {
    title: "CSS Grid vs Flexbox: When to Use Which",
    author: "Christopher Miller",
    url: "https://css-layout-guide.com/grid-vs-flexbox",
    likes: 41
  },
  {
    title: "Vue.js 3 Composition API Deep Dive",
    author: "Amanda White",
    url: "https://vuejs-advanced.com/composition-api",
    likes: 22
  },
  {
    title: "TypeScript for Beginners",
    author: "Ryan Garcia",
    url: "https://typescript-beginners.dev/introduction",
    likes: 67
  },
  {
    title: "RESTful API Design Principles",
    author: "Lisa Anderson",
    url: "https://api-design-patterns.com/restful-principles",
    likes: 35
  },
  {
    title: "Modern JavaScript Testing with Jest",
    author: "Alex Chen",
    url: "https://testing-js.com/jest-modern-approach",
    likes: 28
  },
  {
    title: "GraphQL vs REST: A Comprehensive Comparison",
    author: "Maria Lopez",
    url: "https://api-comparison.dev/graphql-vs-rest",
    likes: 49
  },
  {
    title: "Building Progressive Web Apps with React",
    author: "James Taylor",
    url: "https://pwa-react-guide.com/building-pwas",
    likes: 38
  },
  {
    title: "Git Workflow Best Practices for Teams",
    author: "Rachel Green",
    url: "https://git-team-workflows.com/best-practices",
    likes: 44
  },
  {
    title: "Serverless Functions with AWS Lambda",
    author: "Kevin Lee",
    url: "https://serverless-aws.dev/lambda-functions",
    likes: 31
  },
  {
    title: "React State Management with Redux Toolkit",
    author: "Rupinder Kaur",
    url: "https://react-state.com/redux-toolkit-guide",
    likes: 26
  },
  {
    title: "Database Design Patterns for Web Applications",
    author: "Prabesh Magar",
    url: "https://db-patterns.dev/web-applications",
    likes: 39
  },
  {
    title: "Microservices Architecture with Node.js",
    author: "Michael Brown",
    url: "https://microservices-node.com/architecture-guide",
    likes: 52
  },
  {
    title: "Frontend Performance Optimization Techniques",
    author: "Emily Davis",
    url: "https://frontend-perf.com/optimization-techniques",
    likes: 45
  },
  {
    title: "Securing Web Applications: A Developer's Guide",
    author: "David Wilson",
    url: "https://web-security-dev.com/developers-guide",
    likes: 58
  },
  {
    title: "Introduction to Machine Learning with JavaScript",
    author: "Jessica Moore",
    url: "https://ml-js.dev/introduction-guide",
    likes: 23
  },
  {
    title: "Building Real-time Applications with Socket.IO",
    author: "Christopher Miller",
    url: "https://realtime-apps.com/socketio-guide",
    likes: 34
  },
  {
    title: "Clean Code Principles for JavaScript Developers",
    author: "Amanda White",
    url: "https://clean-code-js.com/principles",
    likes: 61
  },
  {
    title: "DevOps for Frontend Developers",
    author: "Ryan Garcia",
    url: "https://devops-frontend.dev/getting-started",
    likes: 37
  },
  {
    title: "Advanced React Patterns and Techniques",
    author: "Lisa Anderson",
    url: "https://advanced-react.com/patterns-techniques",
    likes: 48
  }
];

/**
 * Seed Database Function for Blogs
 * 
 * Main function that:
 * 1. Connects to MongoDB
 * 2. Retrieves existing users
 * 3. Clears existing blogs
 * 4. Creates new blogs with proper user references
 * 5. Updates user documents with blog references
 * 6. Displays results
 * 7. Closes database connection
 */
const seedBlogsDatabase = async () => {
  try {
    console.log("📚 Starting blog seeding process...");
    
    // Debug environment configuration
    console.log("🔍 Environment Check:");
    console.log("NODE_ENV:", process.env.NODE_ENV || "undefined");
    console.log("Config mongoURL:", config.mongoURL ? "✅ Available" : "❌ Not available");
    
    // Connect to MongoDB
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(config.mongoURL);
    console.log("✅ Connected to MongoDB");

    // Get all existing users
    console.log("👥 Fetching existing users...");
    const existingUsers = await User.find({});
    
    if (existingUsers.length === 0) {
      console.log("❌ No users found! Please run seedUsers.js first.");
      return;
    }
    
    console.log(`✅ Found ${existingUsers.length} users`);

    // Clear existing blogs
    console.log("🗑️  Clearing existing blogs...");
    await Blog.deleteMany({});
    console.log("✅ Existing blogs cleared");

    // Also clear blog references from users
    console.log("🔗 Clearing blog references from users...");
    await User.updateMany({}, { $set: { blogs: [] } });
    console.log("✅ User blog references cleared");

    // Create a mapping of author names to user objects
    const userMap = {};
    existingUsers.forEach(user => {
      userMap[user.name] = user;
    });

    // Process and create blogs
    console.log("📝 Creating seed blogs...");
    const createdBlogs = [];
    
    for (const blogData of seedBlogs) {
      // Find the user by author name
      const user = userMap[blogData.author];
      
      if (user) {
        // Create blog with user reference
        const newBlog = new Blog({
          title: blogData.title,
          author: blogData.author,
          url: blogData.url,
          likes: blogData.likes || 0,
          user: user._id
        });
        
        const savedBlog = await newBlog.save();
        createdBlogs.push(savedBlog);
        
        // Add blog reference to user
        await User.findByIdAndUpdate(
          user._id,
          { $push: { blogs: savedBlog._id } }
        );
        
        console.log(`✅ Created blog: "${savedBlog.title}" by ${savedBlog.author}`);
      } else {
        console.log(`⚠️  Skipping blog "${blogData.title}" - author "${blogData.author}" not found`);
      }
    }
    
    console.log(`✅ Seed blogs created successfully!`);
    console.log(`📊 Total blogs created: ${createdBlogs.length}`);
    
    // Display created blogs grouped by author
    console.log("\n📚 Created Blogs by Author:");
    console.log("=============================");
    
    const blogsByAuthor = {};
    createdBlogs.forEach(blog => {
      if (!blogsByAuthor[blog.author]) {
        blogsByAuthor[blog.author] = [];
      }
      blogsByAuthor[blog.author].push(blog);
    });
    
    Object.keys(blogsByAuthor).forEach(author => {
      console.log(`\n👤 ${author}:`);
      blogsByAuthor[author].forEach((blog, index) => {
        console.log(`   ${index + 1}. ${blog.title} (${blog.likes} likes)`);
      });
    });

    // Display summary statistics
    const totalLikes = createdBlogs.reduce((sum, blog) => sum + blog.likes, 0);
    const avgLikes = (totalLikes / createdBlogs.length).toFixed(1);
    
    console.log(`\n📈 Statistics:`);
    console.log(`Total likes across all blogs: ${totalLikes}`);
    console.log(`Average likes per blog: ${avgLikes}`);
    console.log(`Most liked blog: "${createdBlogs.sort((a, b) => b.likes - a.likes)[0]?.title}" (${createdBlogs.sort((a, b) => b.likes - a.likes)[0]?.likes} likes)`);

    console.log("\n🎉 Blog seeding completed successfully!");

  } catch (error) {
    console.error("❌ Error during blog seeding process:", error.message);
    if (error.code === 11000) {
      console.error("💡 Duplicate key error - blogs might already exist");
    }
  } finally {
    // Close database connection
    console.log("🔌 Closing database connection...");
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  }
};

/**
 * Create a single blog post
 * 
 * @param {string} title - Blog title
 * @param {string} author - Author name (must match existing user)
 * @param {string} url - Blog URL
 * @param {number} likes - Number of likes (default: 0)
 * @returns {Promise<Object>} - Created blog object
 */
const createBlog = async (title, author, url, likes = 0) => {
  try {
    await mongoose.connect(config.mongoURL);
    
    // Find user by name
    const user = await User.findOne({ name: author });
    if (!user) {
      throw new Error(`User with name "${author}" not found`);
    }
    
    // Create blog
    const newBlog = new Blog({ title, author, url, likes, user: user._id });
    const savedBlog = await newBlog.save();
    
    // Update user's blog references
    await User.findByIdAndUpdate(user._id, { $push: { blogs: savedBlog._id } });
    
    console.log(`✅ Blog created: "${savedBlog.title}" by ${savedBlog.author}`);
    await mongoose.connection.close();
    
    return savedBlog;
  } catch (error) {
    console.error("❌ Error creating blog:", error.message);
    await mongoose.connection.close();
    throw error;
  }
};

// Run the seeding process if this file is executed directly
if (require.main === module) {
  seedBlogsDatabase();
}

// Export functions for use in other files
module.exports = {
  seedBlogsDatabase,
  createBlog,
  blogSeedData: seedBlogs.map(blog => ({
    title: blog.title,
    author: blog.author,
    url: blog.url,
    likes: blog.likes
  }))
};
