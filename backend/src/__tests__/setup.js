// 🧪 Test Setup Configuration
// This file runs before all tests to set up the testing environment

// Increase timeout for database operations
jest.setTimeout(10000);

// Global test utilities
global.testUtils = {
  // Helper to create test user data
  createTestUser: (overrides = {}) => ({
    email: `test${Date.now()}@example.com`,
    name: 'Test User',
    role: 'CUSTOMER',
    balance: 0,
    isActive: true,
    ...overrides
  }),
  
  // Helper to clean up test data
  cleanupTestData: async (prisma) => {
    try {
      // Clean up test users (you can add more cleanup here)
      await prisma.user.deleteMany({
        where: {
          email: {
            contains: 'test'
          }
        }
      });
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  }
};

// Console log suppression during tests (unless there's an error)
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;

console.log = (...args) => {
  if (process.env.VERBOSE_TESTS) {
    originalConsoleLog(...args);
  }
};

console.info = (...args) => {
  if (process.env.VERBOSE_TESTS) {
    originalConsoleInfo(...args);
  }
};

console.warn = (...args) => {
  if (process.env.VERBOSE_TESTS) {
    originalConsoleWarn(...args);
  }
};
