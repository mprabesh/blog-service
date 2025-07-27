# Node.js Backend API (Private Subnet)
FROM node:20-alpine

LABEL maintainer="blog-app"
LABEL service="backend-api"
LABEL tier="private"

# Install security updates and health check tools
RUN apk update && apk upgrade && apk add --no-cache curl dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

# Set working directory
WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev --silent && \
    npm cache clean --force

# Copy application code
COPY . .

# Remove unnecessary files
RUN rm -rf tests/ *.test.js cypress/ .git/ README.md

# Set proper permissions
RUN chown -R nodeuser:nodejs /usr/src/app

# Switch to non-root user
USER nodeuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PROD_PORT:-8081}/api/ping || exit 1

# Expose port
EXPOSE 8081

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "run", "start:prod"]
