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
      // Clean up in reverse order of dependencies to avoid foreign key constraints
      
      // 1. Clean up services (depend on categories and providers)
      await prisma.product.deleteMany({
        where: {
          OR: [
            { name: { contains: 'Test' } },
            { name: { contains: 'Instagram' } },
            { name: { contains: 'TikTok' } },
            { name: { contains: 'YouTube' } },
            { name: { contains: 'Bulk' } },
            { name: { contains: 'Filter' } },
            { name: { contains: 'Price' } },
            { name: { contains: 'List' } },
            { name: { contains: 'Service' } },
            { name: { contains: 'Category' } },
            { name: { contains: 'Provider' } },
            { name: { contains: 'Admin' } },
            { name: { contains: 'Error' } },
            { name: { contains: 'Quantity' } },
            { name: { contains: 'Conflict' } },
            { name: { contains: 'Duplicate' } },
            { name: { contains: 'Update' } },
            { name: { contains: 'Delete' } },
            { name: { contains: 'Search' } },
            { name: { contains: 'Active' } },
            { name: { contains: 'Imported' } },
            { name: { contains: 'Custom' } }
          ]
        }
      });
      
      // 2. Clean up providers
      await prisma.provider.deleteMany({
        where: {
          OR: [
            { name: { contains: 'Test' } },
            { name: { contains: 'Instagram' } },
            { name: { contains: 'TikTok' } },
            { name: { contains: 'YouTube' } },
            { name: { contains: 'Bulk' } },
            { name: { contains: 'Filter' } },
            { name: { contains: 'Price' } },
            { name: { contains: 'List' } },
            { name: { contains: 'Service' } },
            { name: { contains: 'Category' } },
            { name: { contains: 'Provider' } },
            { name: { contains: 'Admin' } },
            { name: { contains: 'Error' } },
            { name: { contains: 'Quantity' } },
            { name: { contains: 'Conflict' } },
            { name: { contains: 'Duplicate' } },
            { name: { contains: 'Update' } },
            { name: { contains: 'Delete' } },
            { name: { contains: 'Search' } },
            { name: { contains: 'Active' } },
            { name: { contains: 'Imported' } },
            { name: { contains: 'Custom' } },
            { name: { contains: 'MedanPedia' } }
          ]
        }
      });
      
      // 3. Clean up categories
      await prisma.serviceCategory.deleteMany({
        where: {
          OR: [
            { name: { contains: 'Test' } },
            { name: { contains: 'Instagram' } },
            { name: { contains: 'TikTok' } },
            { name: { contains: 'YouTube' } },
            { name: { contains: 'Bulk' } },
            { name: { contains: 'Filter' } },
            { name: { contains: 'Price' } },
            { name: { contains: 'List' } },
            { name: { contains: 'Service' } },
            { name: { contains: 'Category' } },
            { name: { contains: 'Provider' } },
            { name: { contains: 'Admin' } },
            { name: { contains: 'Error' } },
            { name: { contains: 'Quantity' } },
            { name: { contains: 'Conflict' } },
            { name: { contains: 'Duplicate' } },
            { name: { contains: 'Update' } },
            { name: { contains: 'Delete' } },
            { name: { contains: 'Search' } },
            { name: { contains: 'Active' } },
            { name: { contains: 'Imported' } },
            { name: { contains: 'Custom' } }
          ]
        }
      });
      
      // 4. Clean up test users
      await prisma.user.deleteMany({
        where: {
          email: {
            contains: 'test'
          }
        }
      });
      
      // 5. Clean up markup history
      await prisma.markupHistory.deleteMany({
        where: {
          OR: [
            { providerId: { contains: 'test' } },
            { markupPercentage: { gte: 100 } } // Test markup values
          ]
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
