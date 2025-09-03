// 🧪 User Routes Tests
// This file tests all user-related API endpoints

const request = require('supertest');
const { prisma } = require('../../lib/prisma');

// Import our app (we'll need to modify server.js to export it)
let app;

// Test data
let testUserId;
let testUserData;

describe('👥 User Management API', () => {
  // Setup before all tests
  beforeAll(async () => {
    // Import app dynamically to avoid server startup issues
    app = require('../server');
    
    // Wait for app to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create test user data
    testUserData = global.testUtils.createTestUser();
  });

  // Cleanup after all tests
  afterAll(async () => {
    // Clean up test data
    await global.testUtils.cleanupTestData(prisma);
    
    // Close database connection
    await prisma.$disconnect();
  });

  // Cleanup after each test
  afterEach(async () => {
    // Clean up any test users created during tests
    await global.testUtils.cleanupTestData(prisma);
  });

  describe('🏠 Root Endpoints', () => {
    test('GET / - Should return server status', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });

    test('GET /health - Should return health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('👥 User CRUD Operations', () => {
    describe('➕ POST /api/users - Create User', () => {
      test('Should create a new user with valid data', async () => {
        const userData = global.testUtils.createTestUser();

        const response = await request(app)
          .post('/api/users')
          .send(userData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.email).toBe(userData.email);
        expect(response.body.data.name).toBe(userData.name);
        expect(response.body.data.role).toBe('CUSTOMER');
        expect(response.body.data.balance).toBe(0);
        expect(response.body.data.isActive).toBe(true);

        // Store user ID for later tests
        testUserId = response.body.data.id;
      });

      test('Should create user with custom role and balance', async () => {
        const userData = global.testUtils.createTestUser({
          role: 'ADMIN',
          balance: 1000,
          isActive: false
        });

        const response = await request(app)
          .post('/api/users')
          .send(userData)
          .expect(201);

        expect(response.body.data.role).toBe('ADMIN');
        expect(response.body.data.balance).toBe(1000);
        expect(response.body.data.isActive).toBe(false);
      });

      test('Should return 400 for missing required fields', async () => {
        const response = await request(app)
          .post('/api/users')
          .send({ email: 'test@example.com' }) // Missing name
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Missing required fields');
        expect(response.body.message).toContain('Email and name are required');
        expect(response.body.requiredFields).toContain('name');
      });

      test('Should return 400 for invalid email format', async () => {
        const response = await request(app)
          .post('/api/users')
          .send({ email: 'invalid-email', name: 'Test User' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid email format');
      });

      test('Should return 409 for duplicate email', async () => {
        const userData = global.testUtils.createTestUser();

        // Create first user
        await request(app)
          .post('/api/users')
          .send(userData)
          .expect(201);

        // Try to create second user with same email
        const response = await request(app)
          .post('/api/users')
          .send(userData)
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('User already exists');
      });
    });

    describe('🔍 GET /api/users - List Users', () => {
      beforeEach(async () => {
        // Create some test users
        const users = [
          global.testUtils.createTestUser({ role: 'CUSTOMER' }),
          global.testUtils.createTestUser({ role: 'ADMIN' }),
          global.testUtils.createTestUser({ role: 'CUSTOMER' })
        ];

        for (const user of users) {
          await request(app)
            .post('/api/users')
            .send(user);
        }
      });

      test('Should return all users with pagination', async () => {
        const response = await request(app)
          .get('/api/users')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.pagination).toHaveProperty('currentPage', 1);
        expect(response.body.pagination).toHaveProperty('totalPages');
        expect(response.body.pagination).toHaveProperty('totalCount');
        expect(response.body.pagination).toHaveProperty('limit', 10);
      });

      test('Should filter users by role', async () => {
        const response = await request(app)
          .get('/api/users?role=ADMIN')
          .expect(200);

        expect(response.body.data.every(user => user.role === 'ADMIN')).toBe(true);
      });

      test('Should filter users by active status', async () => {
        const response = await request(app)
          .get('/api/users?isActive=true')
          .expect(200);

        expect(response.body.data.every(user => user.isActive === true)).toBe(true);
      });

      test('Should handle pagination correctly', async () => {
        const response = await request(app)
          .get('/api/users?page=1&limit=2')
          .expect(200);

        expect(response.body.data.length).toBeLessThanOrEqual(2);
        expect(response.body.pagination.currentPage).toBe(1);
        expect(response.body.pagination.limit).toBe(2);
      });
    });

    describe('🔍 GET /api/users/:id - Get User by ID', () => {
      beforeEach(async () => {
        // Create a test user
        const userData = global.testUtils.createTestUser();
        const response = await request(app)
          .post('/api/users')
          .send(userData)
          .expect(201);
        testUserId = response.body.data.id;
      });

      test('Should return user by valid ID', async () => {
        const response = await request(app)
          .get(`/api/users/${testUserId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(testUserId);
        expect(response.body.data).toHaveProperty('email');
        expect(response.body.data).toHaveProperty('name');
        expect(response.body.data).toHaveProperty('role');
      });

      test('Should return 400 for invalid ID format', async () => {
        const response = await request(app)
          .get('/api/users/invalid-id')
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid user ID');
      });

      test('Should return 404 for non-existent user', async () => {
        const response = await request(app)
          .get('/api/users/99999')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('User not found');
      });
    });

    describe('✏️ PUT /api/users/:id - Update User', () => {
      beforeEach(async () => {
        // Create a test user
        const userData = global.testUtils.createTestUser();
        const response = await request(app)
          .post('/api/users')
          .send(userData)
          .expect(201);
        testUserId = response.body.data.id;
      });

      test('Should update user with valid data', async () => {
        const updateData = {
          name: 'Updated Name',
          role: 'ADMIN',
          balance: 500
        };

        const response = await request(app)
          .put(`/api/users/${testUserId}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe(updateData.name);
        expect(response.body.data.role).toBe(updateData.role);
        expect(response.body.data.balance).toBe(updateData.balance);
      });

      test('Should return 400 for invalid ID format', async () => {
        const response = await request(app)
          .put('/api/users/invalid-id')
          .send({ name: 'Updated Name' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid user ID');
      });

      test('Should return 404 for non-existent user', async () => {
        const response = await request(app)
          .put('/api/users/99999')
          .send({ name: 'Updated Name' })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('User not found');
      });

      test('Should return 409 for email conflict', async () => {
        // Create another user
        const anotherUser = global.testUtils.createTestUser();
        await request(app)
          .post('/api/users')
          .send(anotherUser);

        // Try to update first user with second user's email
        const response = await request(app)
          .put(`/api/users/${testUserId}`)
          .send({ email: anotherUser.email })
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Email already in use');
      });
    });

    describe('🗑️ DELETE /api/users/:id - Delete User', () => {
      beforeEach(async () => {
        // Create a test user
        const userData = global.testUtils.createTestUser();
        const response = await request(app)
          .post('/api/users')
          .send(userData)
          .expect(201);
        testUserId = response.body.data.id;
      });

      test('Should delete user with valid ID', async () => {
        const response = await request(app)
          .delete(`/api/users/${testUserId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('User deleted successfully');
        expect(response.body.deletedUser).toHaveProperty('id', testUserId);

        // Verify user is actually deleted
        const getResponse = await request(app)
          .get(`/api/users/${testUserId}`)
          .expect(404);
      });

      test('Should return 400 for invalid ID format', async () => {
        const response = await request(app)
          .delete('/api/users/invalid-id')
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid user ID');
      });

      test('Should return 404 for non-existent user', async () => {
        const response = await request(app)
          .delete('/api/users/99999')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('User not found');
      });
    });
  });

  describe('🚫 Error Handling', () => {
    test('Should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body.error).toBe('Route not found');
      expect(response.body.availableRoutes).toBeInstanceOf(Array);
    });
  });
});
