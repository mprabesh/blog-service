/**
 * Cached API Integration Tests
 * 
 * This test suite verifies that the blog API endpoints work correctly
 * with Redis caching enabled, ensuring data consistency and proper
 * cache behavior in real-world scenarios.
 * 
 * Test Categories:
 * - Blog CRUD operations with caching
 * - Cache consistency across operations
 * - Performance and reliability
 * - Error handling with cache failures
 */

const mongoose = require('mongoose');
const supertest = require('supertest');
const app = require('../app');
const Blog = require('../models/blogs');
const User = require('../models/user');
const { cache, redisClient } = require('../utils/redis');
const { initialTestFunc, blogsInDb } = require('./helper_func');
const api = supertest(app);

describe('Cached API Integration Tests', () => {
  let token, testUserId, initialBlogCount;

  beforeAll(async () => {
    // Ensure Redis is connected
    if (!redisClient.isReady()) {
      await redisClient.connect();
    }
  });

  beforeEach(async () => {
    // Initialize test data
    const initData = await initialTestFunc();
    token = initData.token;
    testUserId = initData.newBlogId.user;
    
    // Clear all cache
    await cache.clearPattern('*');
    
    // Get initial blog count
    const blogs = await blogsInDb();
    initialBlogCount = blogs.length;
  });

  afterAll(async () => {
    await cache.clearPattern('*');
  });

  describe('GET /api/blogs (Cached)', () => {
    test('Should return all blogs and cache the response', async () => {
      const response = await api
        .get('/api/blogs')
        .expect(200)
        .expect('Content-Type', /application\/json/);

      expect(response.body).toHaveLength(initialBlogCount);
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('author');
      expect(response.body[0]).toHaveProperty('user');

      // Verify cache was set
      const cacheKey = 'blogs:/api/blogs';
      const cachedData = await cache.get(cacheKey);
      expect(cachedData).toBeDefined();
      expect(cachedData).toHaveLength(initialBlogCount);
    });

    test('Should serve subsequent requests from cache', async () => {
      // First request
      const response1 = await api
        .get('/api/blogs')
        .expect(200);

      // Modify database directly (simulating external change)
      const newDirectBlog = new Blog({
        title: 'Direct DB Blog',
        author: 'Direct Author',
        url: 'https://direct.com',
        likes: 0,
        user: testUserId
      });
      await newDirectBlog.save();

      // Second request should still return cached data (without direct blog)
      const response2 = await api
        .get('/api/blogs')
        .expect(200);

      expect(response2.body).toEqual(response1.body);
      expect(response2.body).toHaveLength(initialBlogCount); // Should not include direct blog

      // Clean up
      await Blog.findByIdAndDelete(newDirectBlog._id);
    });

    test('Should refresh cache after TTL expires', async () => {
      // This test would require waiting for TTL, so we'll simulate it
      // by manually clearing cache and making new request
      
      const response1 = await api
        .get('/api/blogs')
        .expect(200);

      // Clear cache (simulating TTL expiry)
      await cache.clearPattern('blogs:*');

      // Add new blog
      const newBlog = {
        title: 'TTL Test Blog',
        author: 'TTL Author',
        url: 'https://ttl-test.com'
      };

      await api
        .post('/api/blogs')
        .set('authorization', `Bearer ${token}`)
        .send(newBlog)
        .expect(200);

      // Next GET should reflect the new blog
      const response2 = await api
        .get('/api/blogs')
        .expect(200);

      expect(response2.body.length).toBe(response1.body.length + 1);
      expect(response2.body.some(blog => blog.title === 'TTL Test Blog')).toBe(true);
    });
  });

  describe('GET /api/blogs/:id (Cached)', () => {
    test('Should return specific blog and cache it', async () => {
      // Get all blogs first to get an ID
      const blogsResponse = await api.get('/api/blogs').expect(200);
      const blogId = blogsResponse.body[0].id;

      const response = await api
        .get(`/api/blogs/${blogId}`)
        .expect(200);

      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('author');
      expect(response.body.id).toBe(blogId);

      // Verify cache
      const cacheKey = `blog:/api/blogs/${blogId}`;
      const cachedData = await cache.get(cacheKey);
      expect(cachedData).toBeDefined();
      expect(cachedData.id).toBe(blogId);
    });

    test('Should serve individual blog from cache', async () => {
      const blogsResponse = await api.get('/api/blogs').expect(200);
      const blogId = blogsResponse.body[0].id;

      // First request
      const response1 = await api
        .get(`/api/blogs/${blogId}`)
        .expect(200);

      // Modify blog directly in database
      await Blog.findByIdAndUpdate(blogId, { 
        title: 'Modified Title Direct' 
      });

      // Second request should return cached version
      const response2 = await api
        .get(`/api/blogs/${blogId}`)
        .expect(200);

      expect(response2.body.title).toBe(response1.body.title);
      expect(response2.body.title).not.toBe('Modified Title Direct');

      // Restore original
      await Blog.findByIdAndUpdate(blogId, { 
        title: response1.body.title 
      });
    });
  });

  describe('POST /api/blogs (Cache Invalidation)', () => {
    test('Should create blog and invalidate cache', async () => {
      // Populate cache first
      await api.get('/api/blogs').expect(200);
      
      // Verify cache exists
      const cacheKey = 'blogs:/api/blogs';
      expect(await cache.get(cacheKey)).toBeDefined();

      const newBlog = {
        title: 'Cache Invalidation Test',
        author: 'Test Author',
        url: 'https://cache-test.com'
      };

      const response = await api
        .post('/api/blogs')
        .set('authorization', `Bearer ${token}`)
        .send(newBlog)
        .expect(200);

      expect(response.body.title).toBe(newBlog.title);

      // Cache should be invalidated
      expect(await cache.get(cacheKey)).toBeNull();

      // Verify new blog is in database
      const blogs = await blogsInDb();
      expect(blogs.length).toBe(initialBlogCount + 1);
      expect(blogs.some(blog => blog.title === newBlog.title)).toBe(true);
    });

    test('Should work correctly when cache is already empty', async () => {
      const newBlog = {
        title: 'Empty Cache Test',
        author: 'Empty Author',
        url: 'https://empty-cache-test.com'
      };

      const response = await api
        .post('/api/blogs')
        .set('authorization', `Bearer ${token}`)
        .send(newBlog)
        .expect(200);

      expect(response.body.title).toBe(newBlog.title);

      // Verify blog was created
      const blogs = await blogsInDb();
      expect(blogs.length).toBe(initialBlogCount + 1);
    });
  });

  describe('PUT /api/blogs/:id (Cache Invalidation)', () => {
    test('Should update blog and invalidate relevant caches', async () => {
      // Get a blog to update
      const blogsResponse = await api.get('/api/blogs').expect(200);
      const blogToUpdate = blogsResponse.body[0];
      const blogId = blogToUpdate.id;

      // Populate caches
      await api.get('/api/blogs').expect(200);
      await api.get(`/api/blogs/${blogId}`).expect(200);

      // Verify caches exist
      const listCacheKey = 'blogs:/api/blogs';
      const singleCacheKey = `blog:/api/blogs/${blogId}`;
      expect(await cache.get(listCacheKey)).toBeDefined();
      expect(await cache.get(singleCacheKey)).toBeDefined();

      const updatedData = {
        title: 'Updated Title',
        author: 'Updated Author',
        url: 'https://updated.com',
        likes: 99
      };

      const response = await api
        .put(`/api/blogs/${blogId}`)
        .set('authorization', `Bearer ${token}`)
        .send(updatedData)
        .expect(200);

      // Both caches should be invalidated
      expect(await cache.get(listCacheKey)).toBeNull();
      expect(await cache.get(singleCacheKey)).toBeNull();

      // Verify update in database
      const updatedBlog = await Blog.findById(blogId);
      expect(updatedBlog.title).toBe(updatedData.title);
      expect(updatedBlog.likes).toBe(updatedData.likes);
    });
  });

  describe('DELETE /api/blogs/:id (Cache Invalidation)', () => {
    test('Should delete blog and invalidate caches', async () => {
      // Create a blog to delete
      const newBlog = {
        title: 'Blog to Delete',
        author: 'Delete Author',
        url: 'https://delete-test.com'
      };

      const createResponse = await api
        .post('/api/blogs')
        .set('authorization', `Bearer ${token}`)
        .send(newBlog)
        .expect(200);

      const blogId = createResponse.body.id;

      // Populate caches
      await api.get('/api/blogs').expect(200);
      await api.get(`/api/blogs/${blogId}`).expect(200);

      // Verify caches exist
      const listCacheKey = 'blogs:/api/blogs';
      const singleCacheKey = `blog:/api/blogs/${blogId}`;
      expect(await cache.get(listCacheKey)).toBeDefined();
      expect(await cache.get(singleCacheKey)).toBeDefined();

      // Delete blog
      await api
        .delete(`/api/blogs/${blogId}`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      // Caches should be invalidated
      expect(await cache.get(listCacheKey)).toBeNull();
      expect(await cache.get(singleCacheKey)).toBeNull();

      // Verify deletion
      const deletedBlog = await Blog.findById(blogId);
      expect(deletedBlog).toBeNull();
    });
  });

  describe('Error Handling with Cache', () => {
    test('Should work when Redis is unavailable', async () => {
      // Mock Redis as unavailable
      const originalIsReady = redisClient.isReady;
      redisClient.isReady = jest.fn().mockReturnValue(false);

      // API should still work
      const response = await api
        .get('/api/blogs')
        .expect(200);

      expect(response.body).toHaveLength(initialBlogCount);

      // Restore
      redisClient.isReady = originalIsReady;
    });

    test('Should handle cache errors gracefully', async () => {
      // Mock cache.get to throw error
      const originalGet = cache.get;
      cache.get = jest.fn().mockRejectedValue(new Error('Cache error'));

      // API should still work, falling back to database
      const response = await api
        .get('/api/blogs')
        .expect(200);

      expect(response.body).toHaveLength(initialBlogCount);

      // Restore
      cache.get = originalGet;
    });
  });

  describe('Cache Consistency', () => {
    test('Should maintain consistency across multiple operations', async () => {
      // Create initial state
      const newBlog1 = {
        title: 'Consistency Test 1',
        author: 'Consistency Author',
        url: 'https://consistency1.com'
      };

      // Create blog
      const createResponse = await api
        .post('/api/blogs')
        .set('authorization', `Bearer ${token}`)
        .send(newBlog1)
        .expect(200);

      const blogId = createResponse.body.id;

      // Get all blogs (should be cached)
      const allBlogsResponse = await api
        .get('/api/blogs')
        .expect(200);

      expect(allBlogsResponse.body.some(blog => blog.title === newBlog1.title)).toBe(true);

      // Update the blog
      const updateData = {
        title: 'Updated Consistency Test',
        author: 'Updated Author',
        url: 'https://updated-consistency.com',
        likes: 5
      };

      await api
        .put(`/api/blogs/${blogId}`)
        .set('authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      // Get all blogs again (cache should be invalidated)
      const updatedAllBlogsResponse = await api
        .get('/api/blogs')
        .expect(200);

      const updatedBlog = updatedAllBlogsResponse.body.find(blog => blog.id === blogId);
      expect(updatedBlog.title).toBe(updateData.title);
      expect(updatedBlog.likes).toBe(updateData.likes);

      // Get specific blog
      const specificBlogResponse = await api
        .get(`/api/blogs/${blogId}`)
        .expect(200);

      expect(specificBlogResponse.body.title).toBe(updateData.title);
    });
  });
});
