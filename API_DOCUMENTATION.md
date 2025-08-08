# Blog API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```http
Authorization: Bearer <your_jwt_token>
```

## Common Response Format

### Success Response
```json
{
  "data": "response_data",
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "error": "Error Category",
  "message": "User-friendly error message",
  "details": ["Additional error details"],
  "field": "problematic_field_name"
}
```

---

## 👤 User Endpoints

### Register User
Create a new user account.

**Endpoint:** `POST /users`

**Request Body:**
```json
{
  "username": "johndoe",
  "name": "John Doe", 
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Validation Rules:**
- `username`: Required, 3-30 characters, alphanumeric + underscore only
- `name`: Required, 2-100 characters
- `email`: Required, valid email format, unique
- `password`: Required, minimum 3 characters, maximum 128 characters

**Success Response (201):**
```json
{
  "id": "64a7b8c9d1e2f3a4b5c6d7e8",
  "username": "johndoe",
  "name": "John Doe",
  "email": "john@example.com",
  "blogs": []
}
```

**Error Responses:**
- `400`: Validation errors (missing fields, invalid format)
- `409`: Username or email already exists

---

### Get All Users
Retrieve all registered users with their blogs.

**Endpoint:** `GET /users`

**Success Response (200):**
```json
[
  {
    "id": "64a7b8c9d1e2f3a4b5c6d7e8",
    "username": "johndoe",
    "name": "John Doe",
    "email": "john@example.com",
    "blogs": [
      {
        "id": "64a7b8c9d1e2f3a4b5c6d7e9",
        "title": "My First Blog",
        "author": "John Doe",
        "url": "https://example.com/blog1",
        "likes": 5
      }
    ]
  }
]
```

---

## 🔐 Authentication Endpoints

### Login
Authenticate user and receive JWT token.

**Endpoint:** `POST /login`

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "securepassword123"
}
```

**Success Response (200):**
```json
{
  "username": "johndoe",
  "name": "John Doe",
  "email": "john@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 2700
}
```

**Error Responses:**
- `400`: Missing username or password
- `401`: Invalid credentials
- `503`: Database unavailable

**Token Details:**
- **Expires in:** 45 minutes (2700 seconds)
- **Algorithm:** HS256
- **Issuer:** blog-app

---

## 📝 Blog Endpoints

### Get All Blogs
Retrieve all blog posts with author information.

**Endpoint:** `GET /blogs`

**Caching:** Cached for 5 minutes

**Success Response (200):**
```json
[
  {
    "id": "64a7b8c9d1e2f3a4b5c6d7e9",
    "title": "Introduction to Node.js",
    "author": "John Doe",
    "url": "https://johndoe.com/nodejs-intro",
    "likes": 15,
    "user": {
      "username": "johndoe",
      "name": "John Doe"
    }
  },
  {
    "id": "64a7b8c9d1e2f3a4b5c6d7ea",
    "title": "MongoDB Best Practices",
    "author": "Jane Smith",
    "url": "https://janesmith.com/mongodb-tips",
    "likes": 8,
    "user": {
      "username": "janesmith",
      "name": "Jane Smith"
    }
  }
]
```

**Cache Headers:**
- `X-Cache`: HIT|MISS|ERROR
- `Cache-Control`: public, max-age=300

---

### Get Single Blog
Retrieve a specific blog post by ID.

**Endpoint:** `GET /blogs/:id`

**Parameters:**
- `id`: Valid MongoDB ObjectId

**Caching:** Cached for 5 minutes

**Success Response (200):**
```json
{
  "id": "64a7b8c9d1e2f3a4b5c6d7e9",
  "title": "Introduction to Node.js",
  "author": "John Doe",
  "url": "https://johndoe.com/nodejs-intro",
  "likes": 15,
  "user": {
    "username": "johndoe",
    "name": "John Doe"
  }
}
```

**Error Responses:**
- `400`: Invalid blog ID format
- `404`: Blog not found

---

### Create Blog
Create a new blog post.

**Endpoint:** `POST /blogs`

**Authentication:** Required

**Request Body:**
```json
{
  "title": "My New Blog Post",
  "author": "John Doe",
  "url": "https://johndoe.com/new-post",
  "likes": 0
}
```

**Validation Rules:**
- `title`: Required, cannot be empty
- `url`: Required, must be valid URL format
- `author`: Optional, defaults to username if not provided
- `likes`: Optional, defaults to 0, must be non-negative number

**Success Response (201):**
```json
{
  "id": "64a7b8c9d1e2f3a4b5c6d7eb",
  "title": "My New Blog Post",
  "author": "John Doe",
  "url": "https://johndoe.com/new-post",
  "likes": 0,
  "user": {
    "username": "johndoe",
    "name": "John Doe"
  }
}
```

**Error Responses:**
- `400`: Validation errors (missing title/URL, invalid URL format)
- `401`: Missing or invalid authentication token
- `404`: User not found
- `409`: Blog with same URL already exists

---

### Update Blog
Update an existing blog post.

**Endpoint:** `PUT /blogs/:id`

**Authentication:** Required (owner only)

**Parameters:**
- `id`: Valid MongoDB ObjectId

**Request Body:**
```json
{
  "title": "Updated Blog Title",
  "author": "Updated Author",
  "likes": 25
}
```

**Validation Rules:**
- `title`: If provided, cannot be empty
- `url`: If provided, must be valid URL format  
- `likes`: If provided, must be non-negative number
- Only the blog owner can update the blog

**Success Response (200):**
```json
{
  "id": "64a7b8c9d1e2f3a4b5c6d7e9",
  "title": "Updated Blog Title",
  "author": "Updated Author",
  "url": "https://johndoe.com/nodejs-intro",
  "likes": 25,
  "user": {
    "username": "johndoe",
    "name": "John Doe"
  }
}
```

**Error Responses:**
- `400`: Invalid blog ID or validation errors
- `401`: Missing or invalid authentication token
- `403`: Permission denied (not the blog owner)
- `404`: Blog not found
- `409`: URL already exists for another blog

---

### Delete Blog
Delete a blog post.

**Endpoint:** `DELETE /blogs/:id`

**Authentication:** Required (owner only)

**Parameters:**
- `id`: Valid MongoDB ObjectId

**Success Response (200):**
```json
{
  "message": "Blog deleted successfully",
  "deletedBlog": {
    "id": "64a7b8c9d1e2f3a4b5c6d7e9",
    "title": "Deleted Blog Title",
    "author": "John Doe",
    "url": "https://johndoe.com/deleted-post",
    "likes": 10
  }
}
```

**Error Responses:**
- `400`: Invalid blog ID format
- `401`: Missing or invalid authentication token
- `403`: Permission denied (not the blog owner)
- `404`: Blog not found

---

## 🏥 Health Check Endpoints

### Basic Health Check
Get basic application health status.

**Endpoint:** `GET /health`

**Success Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2025-08-02T10:30:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "services": {
    "api": "healthy",
    "redis": "healthy"
  }
}
```

---

### Detailed Health Check
Get comprehensive health information including circuit breaker status.

**Endpoint:** `GET /health/detailed`

**Success Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2025-08-02T10:30:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "memory": {
    "rss": 45678592,
    "heapTotal": 32456704,
    "heapUsed": 18234567,
    "external": 1234567,
    "arrayBuffers": 123456
  },
  "services": {
    "api": {
      "status": "healthy",
      "version": "1.4.0"
    },
    "redis": {
      "status": "healthy",
      "connected": true,
      "responseTime": 2,
      "circuitBreaker": {
        "isOpen": false,
        "failures": 0,
        "lastFailure": null
      }
    }
  }
}
```

---

### Readiness Probe
Kubernetes readiness probe endpoint.

**Endpoint:** `GET /health/ready`

**Success Response (200):**
```json
{
  "ready": true,
  "timestamp": "2025-08-02T10:30:00.000Z",
  "services": {
    "api": true,
    "redis": true
  }
}
```

---

### Liveness Probe
Kubernetes liveness probe endpoint.

**Endpoint:** `GET /health/live`

**Success Response (200):**
```json
{
  "alive": true,
  "timestamp": "2025-08-02T10:30:00.000Z",
  "uptime": 3600
}
```

---

## 🚨 Error Codes Reference

### HTTP Status Codes

| Code | Name | Description |
|------|------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required or invalid |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 408 | Request Timeout | Request took too long to process |
| 409 | Conflict | Resource already exists |
| 413 | Payload Too Large | Request body exceeds size limit |
| 422 | Unprocessable Entity | Validation failed |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | External service unavailable |

### Common Error Categories

#### Validation Errors (400)
```json
{
  "error": "Validation failed",
  "message": "One or more fields contain invalid data",
  "details": [
    {
      "field": "email",
      "message": "Please enter a valid email address",
      "value": "invalid-email"
    }
  ]
}
```

#### Authentication Errors (401)
```json
{
  "error": "Authentication failed",
  "message": "Invalid username or password"
}
```

#### Authorization Errors (403)
```json
{
  "error": "Permission denied",
  "message": "Only the user who created the blog can delete it"
}
```

#### Not Found Errors (404)
```json
{
  "error": "Blog not found",
  "message": "The requested blog post does not exist"
}
```

#### Conflict Errors (409)
```json
{
  "error": "Username already exists",
  "message": "Please choose a different username"
}
```

---

## 🔄 Rate Limiting

Currently not implemented but infrastructure is prepared. Future implementation will include:

- **Authentication endpoints**: 5 requests per minute per IP
- **Blog creation**: 10 requests per hour per user
- **General API**: 100 requests per minute per IP

## 📊 Caching Strategy

### Cache Keys
- **All blogs**: `blogs:list`
- **Single blog**: `blogs:single:{blogId}`
- **User blogs**: `user:blogs:{userId}`

### Cache Invalidation
- **Blog creation**: Invalidates `blogs:list`
- **Blog update**: Invalidates `blogs:list` and `blogs:single:{id}`
- **Blog deletion**: Invalidates `blogs:list` and `blogs:single:{id}`

### Cache Headers
All cached responses include:
- `X-Cache`: Cache status (HIT/MISS/ERROR)
- `X-Cache-Key`: Cache key used
- `Cache-Control`: Browser caching directive

---

## 🔧 Development Tools

### Testing Endpoints
Use tools like:
- **Postman**: Import the API collection
- **curl**: Command-line testing
- **HTTPie**: User-friendly HTTP client
- **Insomnia**: REST client

### Example curl Commands

**Register User:**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "name": "Test User",
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123"
  }'
```

**Create Blog:**
```bash
curl -X POST http://localhost:3000/api/blogs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "My Test Blog",
    "url": "https://example.com/test-blog"
  }'
```

---

This API documentation provides comprehensive information for developers integrating with the Blog Application Backend. For additional support, refer to the main README.md file or create an issue in the repository.
