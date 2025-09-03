// Phase 4 Tests - Service Management API
// This file tests all Phase 4 functionality

const request = require('supertest');
const { prisma } = require('../../lib/prisma');

// Import our app
let app;

describe('Phase 4: Service Management API', () => {
  // Setup before all tests
  beforeAll(async () => {
    // Import app dynamically to avoid server startup issues
    app = require('../server');
    
    // Wait for app to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
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
    // Clean up any test data created during tests
    await global.testUtils.cleanupTestData(prisma);
  });

  describe('Category Management', () => {
    describe('POST /api/categories - Create Category', () => {
      test('Should create a new category with valid data', async () => {
        const timestamp = Date.now();
        const categoryData = {
          name: `Instagram Services ${timestamp}`,
          description: 'All Instagram-related services',
          icon: 'instagram',
          isActive: true,
          sortOrder: 1
        };

        const response = await request(app)
          .post('/api/categories')
          .send(categoryData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.name).toBe(categoryData.name);
        expect(response.body.data.description).toBe(categoryData.description);
        expect(response.body.data.icon).toBe(categoryData.icon);
        expect(response.body.data.isActive).toBe(categoryData.isActive);
        expect(response.body.data.sortOrder).toBe(categoryData.sortOrder);
      });

      test('Should return 400 for missing required fields', async () => {
        const response = await request(app)
          .post('/api/categories')
          .send({ description: 'Test description' }) // Missing name
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Missing required fields');
        expect(response.body.requiredFields).toContain('name');
      });

      test('Should return 409 for duplicate category name', async () => {
        const timestamp = Date.now();
        const categoryData = {
          name: `Duplicate Test ${timestamp}`,
          description: 'Test description'
        };

        // Create first category
        await request(app)
          .post('/api/categories')
          .send(categoryData)
          .expect(201);

        // Try to create second category with same name
        const response = await request(app)
          .post('/api/categories')
          .send(categoryData)
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Category already exists');
      });
    });

    describe('GET /api/categories - List Categories', () => {
      test('Should return all categories with pagination', async () => {
        // Create some test categories with unique names
        const timestamp = Date.now();
        const categories = [
          { name: `Instagram Services ${timestamp}`, description: 'Instagram services', sortOrder: 1 },
          { name: `TikTok Services ${timestamp}`, description: 'TikTok services', sortOrder: 2 },
          { name: `YouTube Services ${timestamp}`, description: 'YouTube services', sortOrder: 3 }
        ];

        for (const category of categories) {
          await request(app)
            .post('/api/categories')
            .send(category)
            .expect(201);
        }

        const response = await request(app)
          .get('/api/categories')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.pagination).toHaveProperty('currentPage', 1);
        expect(response.body.pagination).toHaveProperty('totalPages');
        expect(response.body.pagination).toHaveProperty('totalCount');
      });

      test('Should filter categories by active status', async () => {
        // Create a test category
        const timestamp = Date.now();
        const categoryData = { 
          name: `Active Test Category ${timestamp}`, 
          description: 'Test description',
          isActive: true
        };
        await request(app)
          .post('/api/categories')
          .send(categoryData)
          .expect(201);

        const response = await request(app)
          .get('/api/categories?isActive=true')
          .expect(200);

        expect(response.body.data.every(category => category.isActive === true)).toBe(true);
      });

      test('Should search categories by name', async () => {
        // Create a test category
        const timestamp = Date.now();
        const categoryData = { 
          name: `Instagram Search ${timestamp}`, 
          description: 'Test description'
        };
        await request(app)
          .post('/api/categories')
          .send(categoryData)
          .expect(201);

        const response = await request(app)
          .get('/api/categories?search=Instagram')
          .expect(200);

        expect(response.body.data.every(category => 
          category.name.toLowerCase().includes('instagram')
        )).toBe(true);
      });
    });

    describe('GET /api/categories/:id - Get Category by ID', () => {
      test('Should return category by valid ID', async () => {
        // Create a test category
        const timestamp = Date.now();
        const categoryData = { 
          name: `Get Test Category ${timestamp}`, 
          description: 'Test description' 
        };
        const createResponse = await request(app)
          .post('/api/categories')
          .send(categoryData)
          .expect(201);
        
        const categoryId = createResponse.body.data.id;

        const response = await request(app)
          .get(`/api/categories/${categoryId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(categoryId);
        expect(response.body.data).toHaveProperty('name');
        expect(response.body.data).toHaveProperty('description');
      });

      test('Should return 404 for invalid ID format', async () => {
        const response = await request(app)
          .get('/api/categories/invalid-id')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Category not found');
      });

      test('Should return 404 for non-existent category', async () => {
        const response = await request(app)
          .get('/api/categories/99999')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Category not found');
      });
    });

    describe('PUT /api/categories/:id - Update Category', () => {
      test('Should update category with valid data', async () => {
        // Create a test category
        const timestamp = Date.now();
        const categoryData = { 
          name: `Update Test Category ${timestamp}`, 
          description: 'Test description' 
        };
        const createResponse = await request(app)
          .post('/api/categories')
          .send(categoryData)
          .expect(201);
        
        const categoryId = createResponse.body.data.id;

        const updateTimestamp = Date.now();
        const updateData = {
          name: `Updated Category ${updateTimestamp}`,
          description: 'Updated description',
          isActive: false
        };

        const response = await request(app)
          .put(`/api/categories/${categoryId}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe(updateData.name);
        expect(response.body.data.description).toBe(updateData.description);
        expect(response.body.data.isActive).toBe(updateData.isActive);
      });

      test('Should return 409 for name conflict', async () => {
        // Create first category
        const timestamp1 = Date.now();
        const categoryData1 = { 
          name: `Conflict Category 1 ${timestamp1}`, 
          description: 'First category' 
        };
        const createResponse1 = await request(app)
          .post('/api/categories')
          .send(categoryData1)
          .expect(201);
        
        const categoryId1 = createResponse1.body.data.id;

        // Create second category
        const timestamp2 = Date.now();
        const categoryData2 = { 
          name: `Conflict Category 2 ${timestamp2}`, 
          description: 'Second category' 
        };
        const createResponse2 = await request(app)
          .post('/api/categories')
          .send(categoryData2)
          .expect(201);

        // Try to update first category with second category's name
        const response = await request(app)
          .put(`/api/categories/${categoryId1}`)
          .send({ name: createResponse2.body.data.name })
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Name already in use');
      });
    });

    describe('DELETE /api/categories/:id - Delete Category', () => {
      test('Should delete category with valid ID', async () => {
        // Create a test category
        const timestamp = Date.now();
        const categoryData = { 
          name: `Delete Test Category ${timestamp}`, 
          description: 'Test description' 
        };
        const createResponse = await request(app)
          .post('/api/categories')
          .send(categoryData)
          .expect(201);
        
        const categoryId = createResponse.body.data.id;

        const response = await request(app)
          .delete(`/api/categories/${categoryId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Category deleted successfully');
        expect(response.body.deletedCategory.id).toBe(categoryId);
      });
    });
  });

  describe('Provider Management', () => {
    describe('POST /api/providers - Create Provider', () => {
      test('Should create a new provider with valid data', async () => {
        const timestamp = Date.now();
        const providerData = {
          name: `MedanPedia ${timestamp}`,
          apiKey: 'test-api-key-12345',
          baseUrl: 'https://api.medanpedia.co.id',
          isActive: true,
          markup: 20,
          currency: 'IDR',
          config: { apiVersion: 'v2' }
        };

        const response = await request(app)
          .post('/api/providers')
          .send(providerData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.name).toBe(providerData.name);
        expect(response.body.data.baseUrl).toBe(providerData.baseUrl);
        expect(response.body.data.markup).toBe(providerData.markup);
        expect(response.body.data.currency).toBe(providerData.currency);
        expect(response.body.data.apiKey).toMatch(/^\*\*\*.*/); // Should be hidden
      });

      test('Should return 400 for missing required fields', async () => {
        const response = await request(app)
          .post('/api/providers')
          .send({ name: 'Test Provider' }) // Missing apiKey and baseUrl
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Missing required fields');
        expect(response.body.requiredFields).toContain('apiKey');
        expect(response.body.requiredFields).toContain('baseUrl');
      });

      test('Should return 400 for invalid markup percentage', async () => {
        const timestamp = Date.now();
        const providerData = {
          name: `Test Provider ${timestamp}`,
          apiKey: 'test-key',
          baseUrl: 'https://test.com',
          markup: 1500 // Invalid: > 1000
        };

        const response = await request(app)
          .post('/api/providers')
          .send(providerData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid markup percentage');
      });
    });

    describe('GET /api/providers - List Providers', () => {
      test('Should return all providers with pagination', async () => {
        // Create some test providers with unique names
        const timestamp = Date.now();
        const providers = [
          { name: `MedanPedia ${timestamp}`, apiKey: 'key1', baseUrl: 'https://medanpedia.com' },
          { name: `Test Provider ${timestamp}`, apiKey: 'key2', baseUrl: 'https://test.com' }
        ];

        for (const provider of providers) {
          await request(app)
            .post('/api/providers')
            .send(provider)
            .expect(201);
        }

        const response = await request(app)
          .get('/api/providers')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.pagination).toHaveProperty('currentPage', 1);
        
        // Check that API keys are hidden
        response.body.data.forEach(provider => {
          if (provider.apiKey) {
            expect(provider.apiKey).toMatch(/^\*\*\*.*/);
          }
        });
      });
    });
  });

  describe('Service Management', () => {
    describe('POST /api/services - Create Service', () => {
      test('Should create a new service with valid data', async () => {
        // Create test category and provider
        const timestamp = Date.now();
        const categoryData = { 
          name: `Service Test Category ${timestamp}`, 
          description: 'Test description' 
        };
        const categoryResponse = await request(app)
          .post('/api/categories')
          .send(categoryData)
          .expect(201);
        const categoryId = categoryResponse.body.data.id;

        const providerData = {
          name: `Service Test Provider ${timestamp}`,
          apiKey: 'test-key',
          baseUrl: 'https://test.com',
          markup: 15
        };
        const providerResponse = await request(app)
          .post('/api/providers')
          .send(providerData)
          .expect(201);
        const providerId = providerResponse.body.data.id;

        const serviceData = {
          name: `Instagram Followers ${timestamp}`,
          customName: 'IG Followers',
          description: 'Get Instagram followers',
          customDescription: 'High-quality Instagram followers',
          categoryId: categoryId,
          providerId: providerId,
          serviceType: 'instagram_followers',
          minQuantity: 100,
          maxQuantity: 10000,
          originalPrice: 1000,
          isActive: true,
          apiServiceId: `custom_${Date.now()}`
        };

        const response = await request(app)
          .post('/api/services')
          .send(serviceData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.name).toBe(serviceData.name);
        expect(response.body.data.customName).toBe(serviceData.customName);
        expect(response.body.data.categoryId).toBe(serviceData.categoryId);
        expect(response.body.data.providerId).toBe(serviceData.providerId);
        expect(response.body.data.originalPrice).toBe(serviceData.originalPrice);
        expect(response.body.data.price).toBeGreaterThan(serviceData.originalPrice); // Should include markup
      });

      test('Should return 400 for missing required fields', async () => {
        const response = await request(app)
          .post('/api/services')
          .send({ name: 'Test Service' }) // Missing required fields
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Missing required fields');
        expect(response.body.requiredFields).toContain('providerId');
        expect(response.body.requiredFields).toContain('serviceType');
        expect(response.body.requiredFields).toContain('minQuantity');
        expect(response.body.requiredFields).toContain('maxQuantity');
        expect(response.body.requiredFields).toContain('originalPrice');
      });

      test('Should return 400 for invalid quantity range', async () => {
        // Create test provider first
        const timestamp = Date.now();
        const providerData = {
          name: `Quantity Test Provider ${timestamp}`,
          apiKey: 'test-key',
          baseUrl: 'https://test.com',
          markup: 15
        };
        const providerResponse = await request(app)
          .post('/api/providers')
          .send(providerData)
          .expect(201);
        const providerId = providerResponse.body.data.id;

        const serviceData = {
          name: 'Test Service',
          providerId: providerId,
          serviceType: 'test_service',
          minQuantity: 1000,
          maxQuantity: 500, // Invalid: max < min
          originalPrice: 1000,
          apiServiceId: `custom_${Date.now()}`
        };

        const response = await request(app)
          .post('/api/services')
          .send(serviceData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid quantity range');
      });
    });

    describe('GET /api/services - List Services', () => {
      test('Should return all services with pagination', async () => {
        // Create test category and provider
        const timestamp = Date.now();
        const categoryData = { 
          name: `List Test Category ${timestamp}`, 
          description: 'Test description' 
        };
        const categoryResponse = await request(app)
          .post('/api/categories')
          .send(categoryData)
          .expect(201);
        const categoryId = categoryResponse.body.data.id;

        const providerData = {
          name: `List Test Provider ${timestamp}`,
          apiKey: 'list-test-key',
          baseUrl: 'https://list-test.com',
          markup: 15
        };
        const providerResponse = await request(app)
          .post('/api/providers')
          .send(providerData)
          .expect(201);
        const providerId = providerResponse.body.data.id;

        // Create some test services
        const services = [
          {
            name: `Instagram Followers ${timestamp}`,
            categoryId: categoryId,
            providerId: providerId,
            serviceType: 'instagram_followers',
            minQuantity: 100,
            maxQuantity: 1000,
            originalPrice: 1000,
            apiServiceId: `custom_${Date.now()}`
          },
          {
            name: `TikTok Views ${timestamp}`,
            categoryId: categoryId,
            providerId: providerId,
            serviceType: 'tiktok_views',
            minQuantity: 50,
            maxQuantity: 500,
            originalPrice: 500,
            apiServiceId: `custom_${Date.now() + 1}`
          }
        ];

        for (const service of services) {
          await request(app)
            .post('/api/services')
            .send(service)
            .expect(201);
        }

        const response = await request(app)
          .get('/api/services')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.pagination).toHaveProperty('currentPage', 1);
      });

      test('Should filter services by category', async () => {
        // Create test category and provider
        const timestamp = Date.now();
        const categoryData = { 
          name: `Filter Test Category ${timestamp}`, 
          description: 'Test description' 
        };
        const categoryResponse = await request(app)
          .post('/api/categories')
          .send(categoryData)
          .expect(201);
        const categoryId = categoryResponse.body.data.id;

        const providerData = {
          name: `Filter Test Provider ${timestamp}`,
          apiKey: 'filter-test-key',
          baseUrl: 'https://filter-test.com',
          markup: 15
        };
        const providerResponse = await request(app)
          .post('/api/providers')
          .send(providerData)
          .expect(201);
        const providerId = providerResponse.body.data.id;

        // Create a test service
        const serviceData = {
          name: `Filter Test Service ${timestamp}`,
          categoryId: categoryId,
          providerId: providerId,
          serviceType: 'filter_test',
          minQuantity: 100,
          maxQuantity: 1000,
          originalPrice: 1000,
          apiServiceId: `custom_${Date.now()}`
        };
        await request(app)
          .post('/api/services')
          .send(serviceData)
          .expect(201);

        const response = await request(app)
          .get(`/api/services?categoryId=${categoryId}`)
          .expect(200);

        expect(response.body.data.every(service => 
          service.categoryId === categoryId
        )).toBe(true);
      });

      test('Should filter services by price range', async () => {
        // Create test category and provider
        const timestamp = Date.now();
        const categoryData = { 
          name: `Price Filter Category ${timestamp}`, 
          description: 'Test description' 
        };
        const categoryResponse = await request(app)
          .post('/api/categories')
          .send(categoryData)
          .expect(201);
        const categoryId = categoryResponse.body.data.id;

        const providerData = {
          name: `Price Filter Provider ${timestamp}`,
          apiKey: 'price-filter-key',
          baseUrl: 'https://price-filter.com',
          markup: 15
        };
        const providerResponse = await request(app)
          .post('/api/providers')
          .send(providerData)
          .expect(201);
        const providerId = providerResponse.body.data.id;

        // Create test services with specific prices
        const services = [
          {
            name: `Price Test Service 1 ${timestamp}`,
            categoryId: categoryId,
            providerId: providerId,
            serviceType: 'price_test_1',
            minQuantity: 100,
            maxQuantity: 1000,
            originalPrice: 1000, // Will become ~1150 with markup
            apiServiceId: `custom_${Date.now()}`
          },
          {
            name: `Price Test Service 2 ${timestamp}`,
            categoryId: categoryId,
            providerId: providerId,
            serviceType: 'price_test_2',
            minQuantity: 50,
            maxQuantity: 500,
            originalPrice: 2000, // Will become ~2300 with markup
            apiServiceId: `custom_${Date.now() + 1}`
          }
        ];

        for (const service of services) {
          await request(app)
            .post('/api/services')
            .send(service)
            .expect(201);
        }

        const response = await request(app)
          .get('/api/services?minPrice=1000&maxPrice=2500')
          .expect(200);

        expect(response.body.data.every(service => 
          service.price >= 1000 && service.price <= 2500
        )).toBe(true);
      });
    });
  });

  describe('Admin Operations', () => {
    describe('PUT /api/admin/markup - Update Markup', () => {
      test('Should update provider markup successfully', async () => {
        // Create test provider
        const timestamp = Date.now();
        const providerData = {
          name: `Admin Test Provider ${timestamp}`,
          apiKey: 'admin-test-key',
          baseUrl: 'https://admin-test.com',
          markup: 25
        };
        const providerResponse = await request(app)
          .post('/api/providers')
          .send(providerData)
          .expect(201);
        const providerId = providerResponse.body.data.id;

        const updateData = {
          providerId: providerId,
          newMarkup: 30
        };

        const response = await request(app)
          .put('/api/admin/markup')
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.provider).toBeDefined();
        expect(response.body.data.provider.newMarkup).toBe(updateData.newMarkup);
        expect(response.body.data.provider.oldMarkup).toBe(25);
        expect(response.body.data.servicesUpdated).toBeGreaterThanOrEqual(0);
      });

      test('Should return 400 for invalid markup percentage', async () => {
        // Create test provider
        const timestamp = Date.now();
        const providerData = {
          name: `Invalid Markup Provider ${timestamp}`,
          apiKey: 'test-key',
          baseUrl: 'https://test.com',
          markup: 25
        };
        const providerResponse = await request(app)
          .post('/api/providers')
          .send(providerData)
          .expect(201);
        const providerId = providerResponse.body.data.id;

        const updateData = {
          providerId: providerId,
          newMarkup: 1500 // Invalid: > 1000
        };

        const response = await request(app)
          .put('/api/admin/markup')
          .send(updateData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid markup percentage');
      });
    });

    describe('GET /api/admin/dashboard - Admin Dashboard', () => {
      test('Should return admin dashboard statistics', async () => {
        const response = await request(app)
          .get('/api/admin/dashboard')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.overview).toHaveProperty('totalCategories');
        expect(response.body.data.overview).toHaveProperty('totalProviders');
        expect(response.body.data.overview).toHaveProperty('totalServices');
        expect(response.body.data).toHaveProperty('recentOrders');
        expect(response.body.data).toHaveProperty('providers');
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('POST /api/services/bulk - Bulk Service Operations', () => {
      test('Should bulk create services successfully', async () => {
        // Create test category and provider
        const timestamp = Date.now();
        const categoryData = { 
          name: `Bulk Test Category ${timestamp}`, 
          description: 'Test description' 
        };
        const categoryResponse = await request(app)
          .post('/api/categories')
          .send(categoryData)
          .expect(201);
        const categoryId = categoryResponse.body.data.id;

        const providerData = {
          name: `Bulk Test Provider ${timestamp}`,
          apiKey: 'bulk-test-key',
          baseUrl: 'https://bulk-test.com',
          markup: 20
        };
        const providerResponse = await request(app)
          .post('/api/providers')
          .send(providerData)
          .expect(201);
        const providerId = providerResponse.body.data.id;

        const bulkData = {
          operation: 'create',
          services: [
            {
              name: `Bulk Service 1 ${timestamp}`,
              categoryId: categoryId,
              providerId: providerId,
              serviceType: 'bulk_service_1',
              originalPrice: 1000,
              minQuantity: 100,
              maxQuantity: 1000,
              apiServiceId: `custom_${Date.now()}`
            },
            {
              name: `Bulk Service 2 ${timestamp}`,
              categoryId: categoryId,
              providerId: providerId,
              serviceType: 'bulk_service_2',
              originalPrice: 2000,
              minQuantity: 200,
              maxQuantity: 2000,
              apiServiceId: `custom_${Date.now() + 1}`
            }
          ]
        };

        const response = await request(app)
          .post('/api/services/bulk')
          .send(bulkData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Bulk create completed');
        expect(response.body.results.successful).toBe(2);
        expect(response.body.results.failed).toBe(0);
        expect(response.body.results.total).toBe(2);
      });

      test('Should handle bulk operations with errors gracefully', async () => {
        // Create test provider
        const timestamp = Date.now();
        const providerData = {
          name: `Error Test Provider ${timestamp}`,
          apiKey: 'error-test-key',
          baseUrl: 'https://error-test.com',
          markup: 15
        };
        const providerResponse = await request(app)
          .post('/api/providers')
          .send(providerData)
          .expect(201);
        const providerId = providerResponse.body.data.id;

        const bulkData = {
          operation: 'create',
          services: [
            {
              name: 'Valid Service',
              providerId: providerId,
              serviceType: 'valid_service',
              originalPrice: 1000,
              minQuantity: 100,
              maxQuantity: 1000,
              apiServiceId: `custom_${Date.now()}`
            },
            {
              name: 'Invalid Service' // Missing required fields
            }
          ]
        };

        const response = await request(app)
          .post('/api/services/bulk')
          .send(bulkData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.results.successful).toBe(1);
        expect(response.body.results.failed).toBe(1);
        expect(response.body.results.total).toBe(2);
        expect(response.body.errors).toBeDefined();
      });
    });
  });
});
