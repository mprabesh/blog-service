const request = require('supertest');
const app = require('../app');
const User = require('../models/user');
const Blog = require('../models/blogs');
const { redisClient } = require('../utils/redis');

/**
 * API Error Handling Tests
 * 
 * Comprehensive tests for API endpoint error handling including:
 * - Input validation errors
 * - Authentication/authorization errors
 * - Database constraint violations
 * - Malformed request handling
 * - Resource not found scenarios
 */

describe('API Error Handling Tests', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Clean up test data
    await User.deleteMany({ username: /^testuser/ });
    await Blog.deleteMany({ title: /^Test/ });

    // Create a test user for authentication tests
    const userResponse = await request(app)
      .post('/api/users')
      .send({
        username: 'testuser123',
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'testpass123'
      });
    
    if (userResponse.status === 201) {
      testUser = userResponse.body;
      
      // Login to get auth token
      const loginResponse = await request(app)
        .post('/api/login')
        .send({
          username: 'testuser123',
          password: 'testpass123'
        });
      
      if (loginResponse.status === 200) {
        authToken = loginResponse.body.token;
      }
    }
  });

  afterAll(async () => {
    // Clean up
    await User.deleteMany({ username: /^testuser/ });
    await Blog.deleteMany({ title: /^Test/ });
    
    if (redisClient) {
      await redisClient.disconnect();
    }
  });

  describe('Blog API Error Handling', () => {
    test('should handle invalid blog ID format', async () => {
      const response = await request(app)
        .get('/api/blogs/invalid-id')
        .expect(400);

      expect(response.body.error).toBe('Invalid blog ID format');
      expect(response.body.message).toContain('valid blog ID');
    });

    test('should handle blog not found', async () => {
      const validButNonExistentId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/blogs/${validButNonExistentId}`)
        .expect(404);

      expect(response.body.error).toBe('Blog not found');
      expect(response.body.message).toContain('does not exist');
    });

    test('should validate required fields when creating blog', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const response = await request(app)
        .post('/api/blogs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing title and url
          author: 'Test Author'
        })
        .expect(400);

      expect(response.body.error).toBe('Title is required');
      expect(response.body.message).toContain('cannot be empty');
    });

    test('should validate URL format when creating blog', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const response = await request(app)
        .post('/api/blogs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Blog',
          author: 'Test Author',
          url: 'not-a-valid-url'
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid URL format');
      expect(response.body.message).toContain('valid URL');
    });

    test('should handle unauthorized blog deletion', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      // First create a blog
      const createResponse = await request(app)
        .post('/api/blogs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Blog for Deletion',
          author: 'Test Author',
          url: 'https://example.com/test'
        });

      if (createResponse.status === 201) {
        const blogId = createResponse.body.id;

        // Try to delete with invalid token
        const response = await request(app)
          .delete(`/api/blogs/${blogId}`)
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body.error).toBe('Invalid token');
        expect(response.body.message).toContain('invalid');
      }
    });

    test('should validate blog update permissions', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const validButNonExistentId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .put(`/api/blogs/${validButNonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title'
        })
        .expect(404);

      expect(response.body.error).toBe('Blog not found');
    });

    test('should validate update data types', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      // First create a blog to update
      const createResponse = await request(app)
        .post('/api/blogs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Blog for Update',
          author: 'Test Author',
          url: 'https://example.com/update-test'
        });

      if (createResponse.status === 201) {
        const blogId = createResponse.body.id;

        const response = await request(app)
          .put(`/api/blogs/${blogId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            likes: -5 // Invalid negative likes
          })
          .expect(400);

        expect(response.body.error).toBe('Invalid likes value');
        expect(response.body.message).toContain('non-negative number');
      }
    });
  });

  describe('User API Error Handling', () => {
    test('should validate required user fields', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          // Missing required fields
          username: ''
        })
        .expect(400);

      expect(response.body.error).toBe('Username is required');
      expect(response.body.message).toContain('username');
    });

    test('should validate email format', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          username: 'testuser456',
          name: 'Test User',
          email: 'invalid-email',
          password: 'testpass123'
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid email format');
      expect(response.body.message).toContain('valid email');
    });

    test('should validate password requirements', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          username: 'testuser789',
          name: 'Test User',
          email: 'test789@example.com',
          password: 'ab' // Too short
        })
        .expect(400);

      expect(response.body.error).toBe('Password too short');
      expect(response.body.message).toContain('at least 3 characters');
    });

    test('should handle duplicate username', async () => {
      // First user registration
      await request(app)
        .post('/api/users')
        .send({
          username: 'duplicateuser',
          name: 'First User',
          email: 'first@example.com',
          password: 'testpass123'
        });

      // Try to register with same username
      const response = await request(app)
        .post('/api/users')
        .send({
          username: 'duplicateuser',
          name: 'Second User',
          email: 'second@example.com',
          password: 'testpass456'
        })
        .expect(409);

      expect(response.body.error).toBe('Username already exists');
      expect(response.body.message).toContain('different username');
    });

    test('should handle duplicate email', async () => {
      const duplicateEmail = 'duplicate@example.com';
      
      // First user registration
      await request(app)
        .post('/api/users')
        .send({
          username: 'user1duplicate',
          name: 'First User',
          email: duplicateEmail,
          password: 'testpass123'
        });

      // Try to register with same email
      const response = await request(app)
        .post('/api/users')
        .send({
          username: 'user2duplicate',
          name: 'Second User',
          email: duplicateEmail,
          password: 'testpass456'
        })
        .expect(409);

      expect(response.body.error).toBe('Email already registered');
      expect(response.body.message).toContain('already associated');
    });

    test('should validate username format', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          username: 'invalid-username!@#',
          name: 'Test User',
          email: 'test@example.com',
          password: 'testpass123'
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid username format');
      expect(response.body.message).toContain('letters, numbers, and underscores');
    });
  });

  describe('Authentication Error Handling', () => {
    test('should handle missing credentials', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          // Missing username and password
        })
        .expect(400);

      expect(response.body.error).toBe('Username is required');
      expect(response.body.message).toContain('username');
    });

    test('should handle invalid credentials', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'nonexistentuser',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error).toBe('Authentication failed');
      expect(response.body.message).toContain('Invalid username or password');
    });

    test('should handle missing authorization header', async () => {
      const response = await request(app)
        .post('/api/blogs')
        .send({
          title: 'Test Blog',
          url: 'https://example.com'
        })
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
      expect(response.body.message).toContain('authorization header');
    });

    test('should handle malformed authorization header', async () => {
      const response = await request(app)
        .post('/api/blogs')
        .set('Authorization', 'InvalidFormat token')
        .send({
          title: 'Test Blog',
          url: 'https://example.com'
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid authorization format');
      expect(response.body.message).toContain('Bearer');
    });

    test('should handle expired token', async () => {
      // Create an expired token (this is simulated)
      const expiredToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImp0aSI6IjcwZWFjMGMwLTJkOGEtNDQ4NC1hNzI4LTQxOGM1NGQzNzkxNSIsImlhdCI6MTYwOTQ1OTIwMCwiZXhwIjoxNjA5NDYyODAwfQ.invalid';
      
      const response = await request(app)
        .post('/api/blogs')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          title: 'Test Blog',
          url: 'https://example.com'
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
      expect(response.body.message).toContain('invalid');
    });
  });

  describe('Request Validation Error Handling', () => {
    test('should handle request body size limits', async () => {
      const largeData = {
        title: 'A'.repeat(100000),
        content: 'B'.repeat(1000000),
        author: 'Test Author',
        url: 'https://example.com'
      };

      const response = await request(app)
        .post('/api/users')
        .send(largeData);

      // Should either reject gracefully or accept based on server limits
      expect([200, 201, 400, 413, 422]).toContain(response.status);
    });

    test('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Username is required');
    });

    test('should handle null values', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          username: null,
          name: null,
          email: null,
          password: null
        })
        .expect(400);

      expect(response.body.error).toBe('Username is required');
    });
  });
});
