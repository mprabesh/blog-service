const express = require('express');
const healthRouter = express.Router();
const { 
  healthCheck, 
  detailedHealthCheck, 
  readinessCheck, 
  livenessCheck 
} = require('../controllers/health');

/**
 * Health Check Routes
 * 
 * Provides endpoints for monitoring service health and status.
 * Used by Docker health checks, Kubernetes probes, and load balancers.
 */

// Basic health check
healthRouter.get('/', healthCheck);

// Detailed health check with service status
healthRouter.get('/detailed', detailedHealthCheck);

// Kubernetes/Docker readiness probe
healthRouter.get('/ready', readinessCheck);

// Kubernetes/Docker liveness probe
healthRouter.get('/live', livenessCheck);

module.exports = healthRouter;
