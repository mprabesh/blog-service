# Blog Backend Deployment Guide

This guide covers various deployment strategies for the Blog Application Backend, from local development to production environments.

## 🚀 Quick Start (Docker Compose)

The fastest way to get the entire stack running:

```bash
# Clone and navigate to project
git clone <repository-url>
cd blog-app

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
```

**Services Started:**
- Backend API (Node.js) - `http://localhost:3000`
- Frontend (React/Vue) - `http://localhost:3001` 
- MongoDB Database - `localhost:27017`
- Redis Cache - `localhost:6379`

## 🔧 Environment Configurations

### Development Environment

**File:** `.env.development`
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/blogapp_dev
REDIS_URL=redis://localhost:6379
SECRET_KEY=development-secret-key-change-in-production
```

### Testing Environment

**File:** `.env.test`
```env
NODE_ENV=test
PORT=3001
MONGODB_URI=mongodb://localhost:27017/blogapp_test
REDIS_URL=redis://localhost:6379
SECRET_KEY=test-secret-key
```

### Production Environment

**File:** `.env.production`
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/blogapp_prod
REDIS_URL=redis://redis-server:6379
SECRET_KEY=super-secure-production-key-generate-random
```

## 🐳 Docker Deployment Options

### Option 1: Docker Compose (Recommended)

**Complete stack deployment:**

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./blog-list
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/blogapp
      - REDIS_URL=redis://redis:6379
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      - mongo
      - redis
    restart: unless-stopped

  mongo:
    image: mongo:6-alpine
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  mongodb_data:
  redis_data:
```

**Commands:**
```bash
# Production deployment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View service status
docker-compose ps

# Scale backend service
docker-compose up -d --scale backend=3

# Update services
docker-compose pull && docker-compose up -d
```

### Option 2: Standalone Docker Container

**Build and run backend only:**

```bash
# Build image
docker build -t blog-backend ./blog-list

# Run with external MongoDB and Redis
docker run -d \
  --name blog-backend \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e MONGODB_URI=mongodb://your-mongo-host:27017/blogapp \
  -e REDIS_URL=redis://your-redis-host:6379 \
  -e SECRET_KEY=your-secret-key \
  --restart unless-stopped \
  blog-backend
```

### Option 3: Multi-stage Docker Build

**Dockerfile with build optimization:**

```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
USER node
CMD ["npm", "start"]
```

## ☁️ Cloud Deployment

### AWS Deployment

#### AWS ECS (Elastic Container Service)

**1. Create Task Definition:**
```json
{
  "family": "blog-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "blog-backend",
      "image": "your-account.dkr.ecr.region.amazonaws.com/blog-backend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "MONGODB_URI",
          "value": "mongodb+srv://user:pass@cluster.mongodb.net/blogapp"
        }
      ],
      "secrets": [
        {
          "name": "SECRET_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:blog-secret-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/blog-backend",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

**2. Create ECS Service:**
```bash
aws ecs create-service \
  --cluster blog-cluster \
  --service-name blog-backend-service \
  --task-definition blog-backend:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
```

#### AWS Elastic Beanstalk

**1. Create Dockerrun.aws.json:**
```json
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "your-account.dkr.ecr.region.amazonaws.com/blog-backend:latest"
  },
  "Ports": [
    {
      "ContainerPort": "3000"
    }
  ],
  "Environment": [
    {
      "Name": "NODE_ENV",
      "Value": "production"
    }
  ]
}
```

**2. Deploy:**
```bash
# Initialize EB application
eb init blog-backend

# Create environment
eb create production

# Deploy updates
eb deploy
```

### Google Cloud Platform (GCP)

#### Google Cloud Run

**1. Build and push image:**
```bash
# Build for Cloud Run
docker build -t gcr.io/your-project/blog-backend ./blog-list

# Push to Container Registry
docker push gcr.io/your-project/blog-backend
```

**2. Deploy to Cloud Run:**
```bash
gcloud run deploy blog-backend \
  --image gcr.io/your-project/blog-backend \
  --platform managed \
  --region us-central1 \
  --set-env-vars NODE_ENV=production \
  --set-env-vars MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/blogapp \
  --set-env-vars SECRET_KEY=your-secret-key \
  --allow-unauthenticated
```

#### Google Kubernetes Engine (GKE)

**deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blog-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: blog-backend
  template:
    metadata:
      labels:
        app: blog-backend
    spec:
      containers:
      - name: blog-backend
        image: gcr.io/your-project/blog-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: blog-secrets
              key: mongodb-uri
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: blog-secrets
              key: jwt-secret
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: blog-backend-service
spec:
  selector:
    app: blog-backend
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Azure Deployment

#### Azure Container Instances

```bash
az container create \
  --resource-group blog-rg \
  --name blog-backend \
  --image your-registry.azurecr.io/blog-backend:latest \
  --cpu 1 \
  --memory 2 \
  --ports 3000 \
  --environment-variables \
    NODE_ENV=production \
    MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/blogapp \
  --secure-environment-variables \
    SECRET_KEY=your-secret-key
```

#### Azure App Service

**1. Create App Service:**
```bash
az webapp create \
  --resource-group blog-rg \
  --plan blog-plan \
  --name blog-backend-app \
  --deployment-container-image-name your-registry.azurecr.io/blog-backend:latest
```

**2. Configure settings:**
```bash
az webapp config appsettings set \
  --resource-group blog-rg \
  --name blog-backend-app \
  --settings \
    NODE_ENV=production \
    MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/blogapp \
    SECRET_KEY=your-secret-key
```

## 🔒 Security Considerations

### Production Security Checklist

#### Environment Security
- [ ] Use strong, unique `SECRET_KEY` (minimum 32 characters)
- [ ] Store secrets in secure secret management systems
- [ ] Enable HTTPS/TLS for all communications
- [ ] Configure proper CORS origins (no wildcards in production)
- [ ] Use environment-specific database credentials
- [ ] Enable database authentication and encryption

#### Container Security
- [ ] Use non-root user in Docker containers
- [ ] Scan images for vulnerabilities
- [ ] Use minimal base images (Alpine Linux)
- [ ] Keep base images updated
- [ ] Remove development dependencies in production builds

#### Network Security
- [ ] Configure security groups/firewalls
- [ ] Use private networks for database connections
- [ ] Implement rate limiting (nginx, cloudflare, etc.)
- [ ] Enable request logging and monitoring
- [ ] Configure proper health check endpoints

### Secrets Management

#### AWS Secrets Manager
```bash
# Store JWT secret
aws secretsmanager create-secret \
  --name "blog-app/jwt-secret" \
  --description "JWT signing key for blog application" \
  --secret-string "your-super-secure-secret-key"

# Store MongoDB URI
aws secretsmanager create-secret \
  --name "blog-app/mongodb-uri" \
  --description "MongoDB connection string" \
  --secret-string "mongodb+srv://user:password@cluster.mongodb.net/blogapp"
```

#### Azure Key Vault
```bash
# Create Key Vault
az keyvault create \
  --name blog-keyvault \
  --resource-group blog-rg

# Store secrets
az keyvault secret set \
  --vault-name blog-keyvault \
  --name jwt-secret \
  --value "your-super-secure-secret-key"
```

#### Google Secret Manager
```bash
# Store JWT secret
gcloud secrets create jwt-secret --data-file=jwt-secret.txt

# Grant access to service account
gcloud secrets add-iam-policy-binding jwt-secret \
  --member="serviceAccount:blog-backend@your-project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## 📊 Monitoring & Logging

### Application Monitoring

#### Health Check Configuration
```yaml
# For load balancers/orchestrators
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

#### Prometheus Metrics (Optional)
```javascript
// Add to app.js for metrics collection
const promClient = require('prom-client');
const register = new promClient.Registry();

// Custom metrics
const httpDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

register.registerMetric(httpDuration);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Centralized Logging

#### ELK Stack Integration
```json
{
  "logConfiguration": {
    "logDriver": "awslogs",
    "options": {
      "awslogs-group": "/aws/ecs/blog-backend",
      "awslogs-region": "us-west-2",
      "awslogs-stream-prefix": "blog"
    }
  }
}
```

#### Structured Logging
```javascript
// Enhanced logger for production
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'blog-backend' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example

**.github/workflows/deploy.yml:**
```yaml
name: Deploy Blog Backend

on:
  push:
    branches: [main]
    paths: ['blog-list/**']

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: blog-list/package-lock.json
    
    - name: Install dependencies
      run: |
        cd blog-list
        npm ci
    
    - name: Run tests
      run: |
        cd blog-list
        npm test
      env:
        NODE_ENV: test
        MONGODB_URI: mongodb://localhost:27017/blog_test
        REDIS_URL: redis://localhost:6379
        SECRET_KEY: test-secret-key

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v1
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-west-2
    
    - name: Build and push Docker image
      run: |
        aws ecr get-login-password | docker login --username AWS --password-stdin ${{ secrets.ECR_REPOSITORY }}
        docker build -t blog-backend ./blog-list
        docker tag blog-backend:latest ${{ secrets.ECR_REPOSITORY }}/blog-backend:latest
        docker push ${{ secrets.ECR_REPOSITORY }}/blog-backend:latest
    
    - name: Deploy to ECS
      run: |
        aws ecs update-service \
          --cluster blog-cluster \
          --service blog-backend-service \
          --force-new-deployment
```

## 🚨 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Issues
```bash
# Check MongoDB connectivity
docker run --rm mongo:6 mongosh "mongodb://your-mongodb-uri" --eval "db.runCommand('ping')"

# Check network connectivity
telnet mongodb-host 27017
```

#### 2. Redis Connection Issues
```bash
# Test Redis connection
docker run --rm redis:7 redis-cli -h redis-host -p 6379 ping

# Check Redis status
redis-cli info replication
```

#### 3. JWT Token Issues
```bash
# Verify JWT secret is set
echo $SECRET_KEY

# Check token expiration
node -e "console.log(JSON.parse(Buffer.from('jwt-payload-part', 'base64')))"
```

#### 4. Docker Build Issues
```bash
# Clear Docker cache
docker builder prune -a

# Build with no cache
docker build --no-cache -t blog-backend ./blog-list

# Check disk space
docker system df
```

### Debug Mode Deployment

**For debugging production issues:**
```yaml
version: '3.8'
services:
  backend:
    build: ./blog-list
    environment:
      - NODE_ENV=production
      - DEBUG=app:*
      - LOG_LEVEL=debug
    volumes:
      - ./logs:/app/logs
    ports:
      - "3000:3000"
      - "9229:9229"  # Node.js debug port
    command: node --inspect=0.0.0.0:9229 index.js
```

### Performance Optimization

#### Production Optimizations
```javascript
// Add to app.js for production
if (process.env.NODE_ENV === 'production') {
  // Enable gzip compression
  app.use(require('compression')());
  
  // Security headers
  app.use(require('helmet')());
  
  // Rate limiting
  const rateLimit = require('express-rate-limit');
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  }));
}
```

## 📈 Scaling Considerations

### Horizontal Scaling
- Use stateless application design
- Implement session storage in Redis
- Configure load balancer health checks
- Use database read replicas
- Implement Redis clustering

### Vertical Scaling
- Monitor CPU and memory usage
- Adjust container resource limits
- Optimize database queries
- Implement connection pooling

---

This deployment guide provides comprehensive coverage for deploying the Blog Backend in various environments. Choose the deployment strategy that best fits your infrastructure and requirements.
