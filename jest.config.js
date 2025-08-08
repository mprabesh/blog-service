/**
 * Jest Configuration for Redis Cache Tests
 * 
 * This configuration ensures proper test environment setup
 * for Redis integration tests, including timeouts and
 * test environment variables.
 */

module.exports = {
  testEnvironment: 'node',
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: false,
  restoreMocks: true,
  
  // Timeout for tests (Redis operations might need more time)
  testTimeout: 30000,
  
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Test patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  
  // Coverage settings
  collectCoverageFrom: [
    'utils/**/*.js',
    'controllers/**/*.js',
    'models/**/*.js',
    '!tests/**/*.js',
    '!node_modules/**'
  ],
  
  // Environment variables for tests
  setupFiles: ['<rootDir>/tests/env-setup.js']
};
