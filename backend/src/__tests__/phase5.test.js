const request = require('supertest');
const { prisma } = require('../../lib/prisma');

describe('Phase 5: Order Management System', () => {
  let testUser, testProduct, testCategory, testProvider;

  beforeAll(async () => {
    await global.testUtils.cleanupTestData(prisma);
  });

  beforeEach(async () => {
    await global.testUtils.cleanupTestData(prisma);
    
    // Create test data
    testCategory = await prisma.serviceCategory.create({
      data: {
        name: 'Test Category',
        description: 'Test category for Phase 5'
      }
    });

    testProvider = await prisma.provider.create({
      data: {
        name: 'Test Provider',
        baseUrl: 'https://test-provider.com/api',
        apiKey: 'test-api-key',
        markup: 20,
        isActive: true,
        config: { test: true, apiVersion: 'v2' }
      }
    });

    testProduct = await prisma.product.create({
      data: {
        name: 'Test Service',
        customName: 'Test Instagram Followers',
        description: 'Test service for Phase 5',
        serviceType: 'instagram_followers',
        price: 5000,
        originalPrice: 4167, // Price before markup
        minQuantity: 100,
        maxQuantity: 10000,
        categoryId: testCategory.id,
        providerId: testProvider.id,
        apiServiceId: `test_${Date.now()}`,
        isActive: true
      }
    });

    testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
        password: 'hashedpassword',
        role: 'CUSTOMER',
        balance: 100000000, // 100 million IDR
        isActive: true
      }
    });
  });

  afterEach(async () => {
    await global.testUtils.cleanupTestData(prisma);
  });

  describe('Order Management', () => {
    test('POST /api/orders - Create order successfully', async () => {
      const orderData = {
        userId: testUser.id,
        productId: testProduct.id,
        quantity: 1000,
        link: 'https://instagram.com/test-post',
        notes: 'Test order for Phase 5'
      };

      const response = await request(global.app)
        .post('/api/orders')
        .send(orderData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order.status).toBe('PENDING');
      expect(response.body.data.order.totalPrice).toBe(5000000); // 1000 * 5000
      expect(response.body.data.balanceDeducted).toBe(5000000);
      expect(response.body.data.newBalance).toBe(95000000); // 100M - 5M

      // Verify order in database
      const order = await prisma.order.findUnique({
        where: { id: response.body.data.order.id }
      });
      expect(order).toBeTruthy();
      expect(order.status).toBe('PENDING');

      // Verify user balance updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      expect(updatedUser.balance).toBe(95000000);
    });

    test('POST /api/orders - Insufficient balance', async () => {
      // Create a user with low balance
      const lowBalanceUser = await prisma.user.create({
        data: {
          email: `low-balance-${Date.now()}@example.com`,
          name: 'Low Balance User',
          password: 'hashedpassword',
          role: 'CUSTOMER',
          balance: 100000, // Only 100k IDR
          isActive: true
        }
      });

      const orderData = {
        userId: lowBalanceUser.id,
        productId: testProduct.id,
        quantity: 10000, // This would cost 50M IDR
        link: 'https://instagram.com/test-post'
      };

      const response = await request(global.app)
        .post('/api/orders')
        .send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient balance');
    });

    test('POST /api/orders - Invalid quantity', async () => {
      const orderData = {
        userId: testUser.id,
        productId: testProduct.id,
        quantity: 50, // Below minimum
        link: 'https://instagram.com/test-post'
      };

      const response = await request(global.app)
        .post('/api/orders')
        .send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid quantity');
    });

    test('GET /api/orders - Get orders with pagination', async () => {
      // Create multiple test orders
      for (let i = 0; i < 15; i++) {
        await prisma.order.create({
          data: {
            userId: testUser.id,
            productId: testProduct.id,
            quantity: 100 + (i * 10),
            link: `https://instagram.com/pagination-test-${Date.now()}-${i}`,
            totalPrice: (100 + (i * 10)) * 5000,
            status: 'PENDING'
          }
        });
      }

      const response = await request(global.app)
        .get('/api/orders?page=1&limit=5');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toHaveLength(5);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
      expect(response.body.data.pagination.total).toBe(15);
    });

    test('GET /api/orders - Filter by status', async () => {
      // Create orders with different statuses
      await prisma.order.create({
        data: {
          userId: testUser.id,
          productId: testProduct.id,
          quantity: 1000,
          link: `https://instagram.com/status-test-${Date.now()}`,
          totalPrice: 5000000,
          status: 'PENDING'
        }
      });

      await prisma.order.create({
        data: {
          userId: testUser.id,
          productId: testProduct.id,
          quantity: 1000,
          link: `https://instagram.com/status-test-${Date.now()}-2`,
          totalPrice: 5000000,
          status: 'COMPLETED'
        }
      });

      const response = await request(global.app)
        .get('/api/orders?status=PENDING');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toHaveLength(1);
      expect(response.body.data.orders[0].status).toBe('PENDING');
    });

    test('GET /api/orders/:id - Get order by ID', async () => {
      const order = await prisma.order.create({
        data: {
          userId: testUser.id,
          productId: testProduct.id,
          quantity: 1000,
          link: 'https://instagram.com/test-post',
          totalPrice: 5000000,
          status: 'PENDING'
        }
      });

      const response = await request(global.app)
        .get(`/api/orders/${order.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order.id).toBe(order.id);
      expect(response.body.data.order.user.id).toBe(testUser.id);
      expect(response.body.data.order.product.id).toBe(testProduct.id);
    });

    test('PATCH /api/orders/:id/status - Update order status', async () => {
      const order = await prisma.order.create({
        data: {
          userId: testUser.id,
          productId: testProduct.id,
          quantity: 1000,
          link: 'https://instagram.com/test-post',
          totalPrice: 5000000,
          status: 'PENDING'
        }
      });

      const response = await request(global.app)
        .patch(`/api/orders/${order.id}/status`)
        .send({
          status: 'IN_PROGRESS',
          adminNotes: 'Order processing started'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order.status).toBe('IN_PROGRESS');
      expect(response.body.data.order.startedAt).toBeTruthy();
    });

    test('PATCH /api/orders/:id/cancel - Cancel order successfully', async () => {
      // Create order through API to properly deduct balance
      const orderData = {
        userId: testUser.id,
        productId: testProduct.id,
        quantity: 1000,
        link: 'https://instagram.com/test-post',
        notes: 'Test order for cancellation'
      };

      const createResponse = await request(global.app)
        .post('/api/orders')
        .send(orderData);

      expect(createResponse.status).toBe(201);
      const orderId = createResponse.body.data.order.id;

      // Verify balance was deducted
      const userAfterOrder = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      expect(userAfterOrder.balance).toBe(95000000); // 100M - 5M

      // Now cancel the order
      const response = await request(global.app)
        .patch(`/api/orders/${orderId}/cancel`)
        .send({
          userId: testUser.id,
          reason: 'Customer request'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order.status).toBe('CANCELLED');
      expect(response.body.data.balanceRefunded).toBe(true);
      expect(response.body.data.refundAmount).toBe(5000000);

      // Verify balance is refunded back to original
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      expect(updatedUser.balance).toBe(100000000); // Back to original balance
    });

    test('GET /api/orders/stats/summary - Get order statistics', async () => {
      // Create orders with different statuses
      await prisma.order.create({
        data: {
          userId: testUser.id,
          productId: testProduct.id,
          quantity: 1000,
          link: `https://instagram.com/stats-test-${Date.now()}`,
          totalPrice: 5000000,
          status: 'PENDING'
        }
      });

      await prisma.order.create({
        data: {
          userId: testUser.id,
          productId: testProduct.id,
          quantity: 1000,
          link: `https://instagram.com/stats-test-${Date.now()}-2`,
          totalPrice: 5000000,
          status: 'COMPLETED'
        }
      });

      const response = await request(global.app)
        .get('/api/orders/stats/summary');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalOrders).toBe(2);
      expect(response.body.data.totalRevenue).toBe(10000000);
      expect(response.body.data.statusBreakdown.PENDING).toBe(1);
      expect(response.body.data.statusBreakdown.COMPLETED).toBe(1);
    });
  });

  describe('Transaction Management', () => {
    test('POST /api/transactions/deposit - Create deposit successfully', async () => {
      const depositData = {
        userId: testUser.id,
        amount: 100000,
        paymentMethod: 'MIDTRANS',
        description: 'Test deposit for Phase 5'
      };

      const response = await request(global.app)
        .post('/api/transactions/deposit')
        .send(depositData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction.type).toBe('DEPOSIT');
      expect(response.body.data.transaction.status).toBe('PENDING');
      expect(response.body.data.transaction.amount).toBe(100000);
      expect(response.body.data.paymentInstructions).toBeTruthy();
      expect(response.body.data.paymentInstructions).toHaveLength(3);
    });

    test('POST /api/transactions/deposit - Missing payment method', async () => {
      const depositData = {
        userId: testUser.id,
        amount: 100000,
        description: 'Test deposit'
      };

      const response = await request(global.app)
        .post('/api/transactions/deposit')
        .send(depositData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing required fields');
      expect(response.body.message).toBe('Amount and payment method are required');
    });

    test('PATCH /api/transactions/:id/confirm-payment - Confirm payment successfully', async () => {
      // Create deposit transaction
      const transaction = await prisma.transaction.create({
        data: {
          userId: testUser.id,
          type: 'DEPOSIT',
          amount: 100000,
          status: 'PENDING',
          paymentMethod: 'MIDTRANS',
          description: 'Test deposit'
        }
      });

      const response = await request(global.app)
        .patch(`/api/transactions/${transaction.id}/confirm-payment`)
        .send({
          status: 'SUCCESS',
          paymentId: 'pay_123456789',
          gatewayResponse: {
            success: true,
            transactionId: 'txn_987654321'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction.status).toBe('SUCCESS');
      expect(response.body.data.balanceUpdated).toBe(true);
      expect(response.body.data.newBalance).toBe(100100000); // 100M + 100K

      // Verify balance is credited
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      expect(updatedUser.balance).toBe(100100000);
    });

    test('POST /api/transactions/admin/withdrawal - Admin initiate withdrawal', async () => {
      const withdrawalData = {
        userId: testUser.id,
        amount: 50000,
        description: 'Admin withdrawal test',
        adminNotes: 'Business withdrawal',
        bankDetails: {
          accountNumber: '1234-5678-9012',
          bankName: 'BCA'
        }
      };

      const response = await request(global.app)
        .post('/api/transactions/admin/withdrawal')
        .send(withdrawalData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction.type).toBe('WITHDRAWAL');
      expect(response.body.data.transaction.status).toBe('PENDING');
      expect(response.body.data.transaction.amount).toBe(-50000); // Negative for withdrawals
      expect(response.body.data.balanceDeducted).toBe(true);
      expect(response.body.data.newBalance).toBe(99950000); // 100M - 50K

      // Verify balance is deducted
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      expect(updatedUser.balance).toBe(99950000);
    });

    test('POST /api/transactions/admin/withdrawal - Insufficient balance for admin withdrawal', async () => {
      const withdrawalData = {
        userId: testUser.id,
        amount: 1000000000, // 1 billion IDR
        description: 'Large withdrawal'
      };

      const response = await request(global.app)
        .post('/api/transactions/admin/withdrawal')
        .send(withdrawalData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient balance');
    });

    test('PATCH /api/transactions/admin/withdrawal/:id/process - Process withdrawal successfully', async () => {
      // Create withdrawal transaction
      const transaction = await prisma.transaction.create({
        data: {
          userId: testUser.id,
          type: 'WITHDRAWAL',
          amount: -50000,
          status: 'PENDING',
          paymentMethod: 'BANK_TRANSFER',
          description: 'Admin withdrawal'
        }
      });

      const response = await request(global.app)
        .patch(`/api/transactions/admin/withdrawal/${transaction.id}/process`)
        .send({
          status: 'SUCCESS',
          adminNotes: 'Withdrawal processed successfully',
          processingFee: 2500
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction.status).toBe('SUCCESS');
      expect(response.body.data.processingFee).toBe(2500);
      expect(response.body.data.netAmount).toBe(47500); // 50K - 2.5K
    });

    test('PATCH /api/transactions/admin/withdrawal/:id/process - Reject withdrawal with refund', async () => {
      // Create withdrawal transaction
      const transaction = await prisma.transaction.create({
        data: {
          userId: testUser.id,
          type: 'WITHDRAWAL',
          amount: -50000,
          status: 'PENDING',
          paymentMethod: 'BANK_TRANSFER',
          description: 'Admin withdrawal'
        }
      });

      // Deduct balance for withdrawal
      await prisma.user.update({
        where: { id: testUser.id },
        data: { balance: { decrement: 50000 } }
      });

      const response = await request(global.app)
        .patch(`/api/transactions/admin/withdrawal/${transaction.id}/process`)
        .send({
          status: 'FAILED',
          adminNotes: 'Insufficient funds in our account'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction.status).toBe('FAILED');
      expect(response.body.data.balanceRefunded).toBe(true);
      expect(response.body.data.refundAmount).toBe(50000);

      // Verify balance is refunded
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      expect(updatedUser.balance).toBe(100000000); // Back to original balance
    });

    test('GET /api/transactions - Get transactions with pagination', async () => {
      // Create multiple test transactions
      for (let i = 0; i < 25; i++) {
        await prisma.transaction.create({
          data: {
            userId: testUser.id,
            type: 'DEPOSIT',
            amount: 10000 + (i * 1000),
            status: 'PENDING',
            paymentMethod: 'MIDTRANS',
            description: `Pagination test transaction ${Date.now()}-${i}`
          }
        });
      }

      const response = await request(global.app)
        .get('/api/transactions?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(10);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
      expect(response.body.data.pagination.total).toBe(25);
    });

    test('GET /api/transactions - Filter by type', async () => {
      // Create transactions of different types
      await prisma.transaction.create({
        data: {
          userId: testUser.id,
          type: 'DEPOSIT',
          amount: 100000,
          status: 'PENDING',
          paymentMethod: 'MIDTRANS',
          description: 'Test deposit'
        }
      });

      await prisma.transaction.create({
        data: {
          userId: testUser.id,
          type: 'WITHDRAWAL',
          amount: -50000,
          status: 'PENDING',
          paymentMethod: 'BANK_TRANSFER',
          description: 'Test withdrawal'
        }
      });

      const response = await request(global.app)
        .get('/api/transactions?type=DEPOSIT');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.transactions[0].type).toBe('DEPOSIT');
    });

    test('GET /api/transactions/stats/summary - Get transaction statistics', async () => {
      // Create transactions for statistics
      await prisma.transaction.create({
        data: {
          userId: testUser.id,
          type: 'DEPOSIT',
          amount: 100000,
          status: 'SUCCESS',
          paymentMethod: 'MIDTRANS',
          description: 'Stats test deposit'
        }
      });

      await prisma.transaction.create({
        data: {
          userId: testUser.id,
          type: 'WITHDRAWAL',
          amount: -50000,
          status: 'SUCCESS',
          paymentMethod: 'BANK_TRANSFER',
          description: 'Stats test withdrawal'
        }
      });

      const response = await request(global.app)
        .get('/api/transactions/stats/summary');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalTransactions).toBe(2);
      expect(response.body.data.totalDeposits).toBe(100000);
      expect(response.body.data.totalWithdrawals).toBe(50000);
      expect(response.body.data.typeBreakdown.DEPOSIT.count).toBe(1);
      expect(response.body.data.typeBreakdown.WITHDRAWAL.count).toBe(1);
    });
  });

  describe('WebSocket Integration', () => {
    test('WebSocket server is initialized', () => {
      // Skip WebSocket tests if server not available
      if (!global.wsServer) {
        console.log('WebSocket server not available, skipping WebSocket tests');
        return;
      }
      
      expect(global.wsServer).toBeTruthy();
      expect(typeof global.wsServer.broadcastToUser).toBe('function');
      expect(typeof global.wsServer.broadcastToAll).toBe('function');
    });

    test('WebSocket can broadcast order updates', () => {
      // Skip WebSocket tests if server not available
      if (!global.wsServer) {
        console.log('WebSocket server not available, skipping WebSocket tests');
        return;
      }

      const mockOrderUpdate = {
        type: 'ORDER_UPDATE',
        data: {
          orderId: 'test-order-id',
          status: 'IN_PROGRESS',
          updatedAt: new Date().toISOString()
        }
      };

      // Mock WebSocket client
      const mockClient = {
        send: jest.fn(),
        userId: testUser.id
      };

      global.wsServer.clients = new Set([mockClient]);
      global.wsServer.broadcastToUser(testUser.id, mockOrderUpdate);

      expect(mockClient.send).toHaveBeenCalledWith(JSON.stringify(mockOrderUpdate));
    });

    test('WebSocket can broadcast notifications', () => {
      // Skip WebSocket tests if server not available
      if (!global.wsServer) {
        console.log('WebSocket server not available, skipping WebSocket tests');
        return;
      }

      const mockNotification = {
        type: 'NOTIFICATION',
        data: {
          id: 'test-notification-id',
          title: 'Test Notification',
          message: 'Test message for Phase 5',
          type: 'INFO',
          createdAt: new Date().toISOString()
        }
      };

      // Mock WebSocket client
      const mockClient = {
        send: jest.fn(),
        userId: testUser.id
      };

      global.wsServer.clients = new Set([mockClient]);
      global.wsServer.broadcastToUser(testUser.id, mockNotification);

      expect(mockClient.send).toHaveBeenCalledWith(JSON.stringify(mockNotification));
    });
  });
});
