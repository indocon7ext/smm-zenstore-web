// 🧪 Jest Configuration for SMM Platform Backend
// This file configures Jest testing framework for our Express.js API

module.exports = {
  // Test environment - Node.js (not browser)
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.js',     // Files in __tests__ folders
    '**/?(*.)+(spec|test).js'   // Files ending with .spec.js or .test.js
  ],
  
  // Folders to ignore during testing
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  
  // Collect coverage from these files
  collectCoverageFrom: [
    'src/**/*.js',               // All JavaScript files in src
    '!src/**/*.test.js',         // Exclude test files
    '!src/**/*.spec.js',         // Exclude spec files
    '!src/scripts/**',           // Exclude script files
    '!src/index.js'              // Exclude old index file
  ],
  
  // Coverage thresholds (minimum coverage required)
  coverageThreshold: {
    global: {
      branches: 70,              // 70% branch coverage
      functions: 70,             // 70% function coverage
      lines: 70,                 // 70% line coverage
      statements: 70             // 70% statement coverage
    }
  },
  
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
  
  // Test timeout (5 seconds)
  testTimeout: 5000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Reset modules between tests
  resetModules: true,
  
  // Restore mocks between tests
  restoreMocks: true,
  
  // Environment variables for testing
  setupFiles: ['<rootDir>/src/__tests__/env.js']
};
