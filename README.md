# Blog Application Backend

A robust, production-ready Node.js backend API for a blog application built with Express.js, MongoDB, and Redis caching. Features comprehensive error handling, JWT authentication, and microservices architecture.

## 🚀 Features

### Core Functionality
- **RESTful API** for blog posts and user management
- **JWT Authentication** with secure token handling
- **User Registration & Login** with validation
- **CRUD Operations** for blogs with owner permissions
- **MongoDB Integration** with Mongoose ODM
- **Redis Caching** with circuit breaker pattern

### Advanced Features
- **Circuit Breaker Pattern** for Redis resilience
- **Comprehensive Error Handling** with standardized responses
- **Health Check Endpoints** for monitoring
- **Graceful Shutdown** for Docker deployments
- **Request Validation** with detailed error messages
- **Security Hardening** against common attacks

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React/Vue)   │◄──►│   (Node.js)     │◄──►│   (MongoDB)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Redis Cache   │
                       │   (Optional)    │
                       └─────────────────┘
```

## 📋 Prerequisites

- **Node.js** >= 14.x
- **MongoDB** >= 4.x (local or MongoDB Atlas)
- **Redis** >= 6.x (optional, for caching)
- **Docker** (optional, for containerized deployment)

## 🛠️ Installation

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd blog-app/blog-list
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Create a `.env` file in the root directory:
   ```env
   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/blogapp
   # Or for MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/blogapp

   # JWT Secret (generate a secure random string)
   SECRET_KEY=your-super-secret-jwt-key-here

   # Redis Configuration (optional)
   REDIS_URL=redis://localhost:6379

   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

4. **Start the development server**
   ```bash
   npm run start:dev
   ```

### Docker Setup

1. **Using Docker Compose (Recommended)**
   ```bash
   # From the project root directory
   docker-compose up -d
   ```

2. **Manual Docker Build**
   ```bash
   docker build -t blog-api .
   docker run -p 3000:3000 blog-api
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MONGODB_URI` | MongoDB connection string | - | ✅ |
| `SECRET_KEY` | JWT signing secret | - | ✅ |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` | ❌ |
| `PORT` | Server port | `3000` | ❌ |
| `NODE_ENV` | Environment mode | `development` | ❌ |

### Database Schema

#### User Model
```javascript
{
  username: String,      // Unique, 3-30 chars, alphanumeric + underscore
  name: String,          // Full name, 2-100 chars
  email: String,         // Unique, valid email format
  passwordHash: String,  // Bcrypt hashed password
  blogs: [ObjectId]      // References to user's blogs
}
```

#### Blog Model
```javascript
{
  title: String,         // Required, blog title
  author: String,        // Author name (defaults to username)
  url: String,           // Required, valid URL
  likes: Number,         // Default: 0, non-negative
  user: ObjectId         // Reference to User model
}
```

## 🛡️ API Endpoints

### Authentication

#### Register User
```http
POST /api/users
Content-Type: application/json

{
  "username": "johndoe",
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Response:**
```json
{
  "id": "user_id",
  "username": "johndoe",
  "name": "John Doe",
  "email": "john@example.com",
  "blogs": []
}
```

#### Login
```http
POST /api/login
Content-Type: application/json

{
  "username": "johndoe",
  "password": "securepass123"
}
```

**Response:**
```json
{
  "username": "johndoe",
  "name": "John Doe",
  "email": "john@example.com",
  "token": "jwt_token_here",
  "expiresIn": 2700
}
```

### Blog Operations

#### Get All Blogs
```http
GET /api/blogs
```

**Response:**
```json
[
  {
    "id": "blog_id",
    "title": "My First Blog",
    "author": "John Doe",
    "url": "https://example.com/blog1",
    "likes": 5,
    "user": {
      "username": "johndoe",
      "name": "John Doe"
    }
  }
]
```

#### Get Single Blog
```http
GET /api/blogs/:id
```

#### Create Blog
```http
POST /api/blogs
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "My New Blog Post",
  "author": "John Doe",
  "url": "https://example.com/my-new-post",
  "likes": 0
}
```

#### Update Blog
```http
PUT /api/blogs/:id
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "Updated Blog Title",
  "likes": 10
}
```

#### Delete Blog
```http
DELETE /api/blogs/:id
Authorization: Bearer <jwt_token>
```

### Health & Monitoring

#### Basic Health Check
```http
GET /health
```

**Response:**
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

#### Detailed Health Check
```http
GET /health/detailed
```

#### Kubernetes Probes
```http
GET /health/ready    # Readiness probe
GET /health/live     # Liveness probe
```

## 🔒 Security Features

### Authentication & Authorization
- **JWT Tokens** with 45-minute expiration
- **Bearer Token** authentication
- **Owner-only permissions** for blog operations
- **Password hashing** with bcrypt (10 salt rounds)

### Input Validation
- **Field validation** for all endpoints
- **Format validation** (email, URL, ObjectId)
- **Length constraints** on all text fields
- **Type validation** for numeric fields

### Security Headers & Practices
- **CORS configuration** for cross-origin requests
- **Request sanitization** (trimming, lowercasing)
- **Error message sanitization** (no sensitive data exposure)
- **Timing attack prevention** in authentication
- **Case-insensitive username lookup**

## 🚨 Error Handling

### Standardized Error Responses

All errors follow this format:
```json
{
  "error": "Error Category",
  "message": "User-friendly error message",
  "details": ["Additional details when applicable"],
  "field": "problematic_field_name"
}
```

### HTTP Status Codes

| Code | Description | Example |
|------|-------------|---------|
| `400` | Bad Request | Invalid input data |
| `401` | Unauthorized | Missing/invalid token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Duplicate username/email |
| `413` | Payload Too Large | Request body too big |
| `422` | Unprocessable Entity | Business logic validation |
| `500` | Internal Server Error | Unexpected server error |
| `503` | Service Unavailable | Database connection failed |

### Error Categories
- **Validation Errors**: Input format/constraint violations
- **Authentication Errors**: Token-related issues
- **Authorization Errors**: Permission denied
- **Database Errors**: MongoDB connection/query issues
- **Cache Errors**: Redis connection/operation failures

## 📊 Caching Strategy

### Redis Cache Implementation
- **Response caching** for GET endpoints
- **Cache invalidation** on data mutations
- **Circuit breaker pattern** for resilience
- **Automatic fallback** when Redis is unavailable

### Cache Configuration
- **Default TTL**: 5 minutes (300 seconds)
- **Blog list cache**: `blogs:list`
- **Single blog cache**: `blogs:single:{id}`
- **Circuit breaker threshold**: 5 failures
- **Circuit breaker timeout**: 30 seconds

### Cache Headers
```http
X-Cache: HIT|MISS|ERROR
X-Cache-Key: cache_key_used
Cache-Control: public, max-age=300
```

## 🧪 Testing

### Test Suite
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:redis      # Redis functionality tests
npm run test:cache      # Cache middleware tests
npm run test:all        # All tests with Redis

# Run with coverage
npm test -- --coverage
```

### Test Categories
- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Error Handling Tests**: Error scenario validation
- **Cache Tests**: Redis caching functionality
- **Authentication Tests**: JWT and security testing

### Test Environment Setup
Tests use a separate MongoDB database and Redis instance:
```env
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/blog_test
REDIS_URL=redis://localhost:6379
```

## 🚀 Deployment

### Docker Deployment

1. **Build and deploy with Docker Compose**
   ```bash
   docker-compose up -d --build
   ```

2. **Environment-specific configurations**
   ```yaml
   # docker-compose.override.yml for production
   version: '3.8'
   services:
     backend:
       environment:
         - NODE_ENV=production
         - MONGODB_URI=mongodb://mongo:27017/blogapp_prod
   ```

### Production Considerations

1. **Environment Variables**
   - Use strong, unique `SECRET_KEY`
   - Configure production MongoDB URI
   - Set `NODE_ENV=production`

2. **Security**
   - Enable HTTPS/TLS
   - Configure proper CORS origins
   - Implement rate limiting
   - Use environment-specific secrets

3. **Monitoring**
   - Health check endpoints for load balancers
   - Log aggregation and analysis
   - Performance monitoring
   - Error tracking

4. **Scaling**
   - Stateless application design
   - Redis clustering for cache
   - Database read replicas
   - Load balancer configuration

## 📁 Project Structure

```
blog-list/
├── controllers/           # Route handlers
│   ├── blogs.js          # Blog CRUD operations
│   ├── user.js           # User registration
│   ├── login.js          # Authentication
│   ├── health.js         # Health check endpoints
│   └── testing.js        # Test utilities
├── models/               # Database schemas
│   ├── blogs.js          # Blog model
│   └── user.js           # User model
├── utils/                # Utility modules
│   ├── config.js         # Environment configuration
│   ├── logger.js         # Logging utilities
│   ├── middleware.js     # Express middleware
│   ├── redis.js          # Redis client & cache
│   └── cacheMiddleware.js # Cache middleware
├── tests/                # Test suites
│   ├── setup.js          # Test configuration
│   ├── redis.test.js     # Redis functionality tests
│   ├── cache-middleware.test.js
│   ├── cached-api.test.js
│   ├── error-handling.test.js
│   └── api-error-handling.test.js
├── app.js                # Express application setup
├── index.js              # Server entry point
├── Dockerfile            # Docker configuration
├── docker-compose.yaml   # Multi-service setup
├── jest.config.js        # Test configuration
└── package.json          # Dependencies & scripts
```

## 🔍 Monitoring & Logging

### Health Monitoring
- **Basic health**: `/health`
- **Detailed health**: `/health/detailed`
- **Readiness probe**: `/health/ready`
- **Liveness probe**: `/health/live`

### Logging Levels
- **Error**: Critical errors and exceptions
- **Warn**: Authentication failures, authorization issues
- **Info**: Successful operations, user activities
- **Debug**: Detailed request/response information

### Metrics Available
- Application uptime
- Memory usage
- Redis connection status
- Circuit breaker state
- Response times
- Error rates

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines
- Follow existing code style and patterns
- Add tests for new functionality
- Update documentation for API changes
- Ensure all tests pass before submitting

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- **Issues**: Create an issue on GitHub
- **Documentation**: Check this README and code comments
- **Testing**: Run the test suite for examples

## 🔄 Version History

- **v1.0.0**: Initial release with basic CRUD operations
- **v1.1.0**: Added JWT authentication and user management
- **v1.2.0**: Implemented Redis caching with circuit breaker
- **v1.3.0**: Enhanced error handling and validation
- **v1.4.0**: Added comprehensive health checks and monitoring

---

**Built with ❤️ using Node.js, Express.js, MongoDB, and Redis**
