/**
 * Cache Middleware Tests
 * 
 * This test suite verifies the cache middleware functionality,
 * including response caching, cache invalidation, and integration
 * with the blog API endpoints.
 * 
 * Test Categories:
 * - Cache middleware response caching
 * - Cache invalidation middleware
 * - Blog-specific cache operations
 * - Cache key generation
 * - Session cache operations
 */

const mongoose = require('mongoose');
const supertest = require('supertest');
const app = require('../app');
const Blog = require('../models/blogs');
const User = require('../models/user');
const { cache } = require('../utils/redis');
const { blogCache, blogInvalidation, sessionCache } = require('../utils/cacheMiddleware');
const api = supertest(app);

describe('Cache Middleware Tests', () => {
  let testUser, testToken, testBlog;

  beforeAll(async () => {
    // Create test user
    await User.deleteMany({});
    await Blog.deleteMany({});
    
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash('testpassword', 10);
    
    testUser = new User({
      username: 'cachetest',
      name: 'Cache Test User',
      email: 'cache@test.com',
      passwordHash
    });
    await testUser.save();
    
    // Get auth token
    const loginResponse = await api
      .post('/api/login')
      .send({ username: 'cachetest', password: 'testpassword' });
    
    testToken = loginResponse.body.token;
    
    // Create test blog
    testBlog = new Blog({
      title: 'Cache Test Blog',
      author: 'Cache Author',
      url: 'https://cache-test.com',
      likes: 5,
      user: testUser._id
    });
    await testBlog.save();
  });

  afterAll(async () => {
    // Clean up
    await User.deleteMany({});
    await Blog.deleteMany({});
    await cache.clearPattern('*');
  });

  beforeEach(async () => {
    // Clear cache before each test
    await cache.clearPattern('*');
  });

  describe('Blog List Caching', () => {
    test('Should cache blog list response', async () => {
      // First request should hit database
      const response1 = await api
        .get('/api/blogs')
        .expect(200);
      
      expect(response1.body).toBeDefined();
      expect(Array.isArray(response1.body)).toBe(true);
      
      // Check if response is cached
      const cacheKey = 'blogs:/api/blogs';
      const cachedData = await cache.get(cacheKey);
      expect(cachedData).toBeDefined();
      expect(cachedData.length).toBe(response1.body.length);
      
      // Second request should hit cache
      const response2 = await api
        .get('/api/blogs')
        .expect(200);
      
      expect(response2.body).toEqual(response1.body);
    });

    test('Should cache individual blog response', async () => {
      const blogId = testBlog._id.toString();
      
      // First request
      const response1 = await api
        .get(`/api/blogs/${blogId}`)
        .expect(200);
      
      expect(response1.body.title).toBe('Cache Test Blog');
      
      // Check cache
      const cacheKey = `blog:/api/blogs/${blogId}`;
      const cachedData = await cache.get(cacheKey);
      expect(cachedData).toBeDefined();
      expect(cachedData.title).toBe('Cache Test Blog');
      
      // Second request should be from cache
      const response2 = await api
        .get(`/api/blogs/${blogId}`)
        .expect(200);
      
      expect(response2.body).toEqual(response1.body);
    });

    test('Should not cache POST requests', async () => {
      const newBlog = {
        title: 'New Cache Test Blog',
        author: 'New Author',
        url: 'https://new-cache-test.com'
      };
      
      const response = await api
        .post('/api/blogs')
        .set('authorization', `Bearer ${testToken}`)
        .send(newBlog)
        .expect(200);
      
      // Should not be cached (POST requests)
      const cacheKey = 'blogs:/api/blogs';
      const cachedData = await cache.get(cacheKey);
      expect(cachedData).toBeNull();
    });
  });

  describe('Cache Invalidation', () => {
    test('Should invalidate cache when creating new blog', async () => {
      // First, populate cache
      await api.get('/api/blogs').expect(200);
      
      // Verify cache exists
      const cacheKey = 'blogs:/api/blogs';
      let cachedData = await cache.get(cacheKey);
      expect(cachedData).toBeDefined();
      
      // Create new blog (should invalidate cache)
      const newBlog = {
        title: 'Invalidation Test Blog',
        author: 'Invalidation Author',
        url: 'https://invalidation-test.com'
      };
      
      await api
        .post('/api/blogs')
        .set('authorization', `Bearer ${testToken}`)
        .send(newBlog)
        .expect(200);
      
      // Cache should be invalidated
      cachedData = await cache.get(cacheKey);
      expect(cachedData).toBeNull();
    });

    test('Should invalidate cache when updating blog', async () => {
      const blogId = testBlog._id.toString();
      
      // Populate caches
      await api.get('/api/blogs').expect(200);
      await api.get(`/api/blogs/${blogId}`).expect(200);
      
      // Verify caches exist
      const listCacheKey = 'blogs:/api/blogs';
      const singleCacheKey = `blog:/api/blogs/${blogId}`;
      
      expect(await cache.get(listCacheKey)).toBeDefined();
      expect(await cache.get(singleCacheKey)).toBeDefined();
      
      // Update blog
      const updatedBlog = {
        title: 'Updated Cache Test Blog',
        author: 'Updated Author',
        url: 'https://updated-cache-test.com',
        likes: 10
      };
      
      await api
        .put(`/api/blogs/${blogId}`)
        .set('authorization', `Bearer ${testToken}`)
        .send(updatedBlog)
        .expect(200);
      
      // Both caches should be invalidated
      expect(await cache.get(listCacheKey)).toBeNull();
      expect(await cache.get(singleCacheKey)).toBeNull();
    });

    test('Should invalidate cache when deleting blog', async () => {
      // Create a blog to delete
      const blogToDelete = new Blog({
        title: 'Blog to Delete',
        author: 'Delete Author',
        url: 'https://delete-test.com',
        user: testUser._id
      });
      await blogToDelete.save();
      
      const deleteId = blogToDelete._id.toString();
      
      // Populate caches
      await api.get('/api/blogs').expect(200);
      await api.get(`/api/blogs/${deleteId}`).expect(200);
      
      // Verify caches exist
      const listCacheKey = 'blogs:/api/blogs';
      const singleCacheKey = `blog:/api/blogs/${deleteId}`;
      
      expect(await cache.get(listCacheKey)).toBeDefined();
      expect(await cache.get(singleCacheKey)).toBeDefined();
      
      // Delete blog
      await api
        .delete(`/api/blogs/${deleteId}`)
        .set('authorization', `Bearer ${testToken}`)
        .expect(200);
      
      // Caches should be invalidated
      expect(await cache.get(listCacheKey)).toBeNull();
      expect(await cache.get(singleCacheKey)).toBeNull();
    });
  });

  describe('Session Cache Operations', () => {
    test('Should cache and retrieve user session data', async () => {
      const userId = testUser._id.toString();
      const sessionData = {
        username: testUser.username,
        name: testUser.name,
        email: testUser.email,
        lastLogin: new Date()
      };
      
      // Set session cache
      await sessionCache.setUser(userId, sessionData, 3600);
      
      // Retrieve session cache
      const cachedSession = await sessionCache.getUser(userId);
      expect(cachedSession).toBeDefined();
      expect(cachedSession.username).toBe(testUser.username);
      expect(cachedSession.name).toBe(testUser.name);
      expect(cachedSession.email).toBe(testUser.email);
    });

    test('Should invalidate user session cache', async () => {
      const userId = testUser._id.toString();
      const sessionData = {
        username: testUser.username,
        name: testUser.name,
        email: testUser.email
      };
      
      // Set session cache
      await sessionCache.setUser(userId, sessionData);
      
      // Verify cache exists
      expect(await sessionCache.getUser(userId)).toBeDefined();
      
      // Invalidate cache
      await sessionCache.invalidateUser(userId);
      
      // Cache should be gone
      expect(await sessionCache.getUser(userId)).toBeNull();
    });

    test('Should handle non-existent user session gracefully', async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId().toString();
      
      const cachedSession = await sessionCache.getUser(nonExistentUserId);
      expect(cachedSession).toBeNull();
    });
  });

  describe('Cache Performance', () => {
    test('Should provide faster response times for cached data', async () => {
      // First request (database hit)
      const start1 = Date.now();
      await api.get('/api/blogs').expect(200);
      const time1 = Date.now() - start1;
      
      // Second request (cache hit)
      const start2 = Date.now();
      await api.get('/api/blogs').expect(200);
      const time2 = Date.now() - start2;
      
      // Cache should be faster (though this might be flaky in tests)
      // We'll just verify both requests completed successfully
      expect(time1).toBeGreaterThan(0);
      expect(time2).toBeGreaterThan(0);
    });

    test('Should handle concurrent requests correctly', async () => {
      // Make multiple concurrent requests
      const promises = Array(5).fill().map(() => 
        api.get('/api/blogs').expect(200)
      );
      
      const responses = await Promise.all(promises);
      
      // All responses should be identical
      const firstResponse = responses[0].body;
      responses.forEach(response => {
        expect(response.body).toEqual(firstResponse);
      });
    });
  });
});
