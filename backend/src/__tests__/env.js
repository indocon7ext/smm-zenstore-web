// 🌍 Test Environment Setup
// This file sets up environment variables for testing

// Set test environment
process.env.NODE_ENV = 'test';

// Set test database URL (use same database for now - we'll set up test DB later)
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:Zenstore123%21%40%23@localhost:5432/smm_platform?schema=public';

// Set test port
process.env.PORT = 5001;

// Set frontend URL for testing
process.env.FRONTEND_URL = 'http://localhost:3000';

// Disable logging during tests for cleaner output
process.env.LOG_LEVEL = 'error';
