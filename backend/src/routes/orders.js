const express = require('express');
const { prisma } = require('../../lib/prisma');
const router = express.Router();

// Middleware to validate order data
const validateOrderData = (req, res, next) => {
  const { productId, quantity, link, notes } = req.body;
  
  if (!productId || !quantity || !link) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'Product ID, quantity, and link are required'
    });
  }

  if (quantity <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid quantity',
      message: 'Quantity must be greater than 0'
    });
  }

  if (typeof link !== 'string' || link.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Invalid link',
      message: 'Link must be a valid string'
    });
  }

  next();
};

// Create new order with balance and availability validation
router.post('/', validateOrderData, async (req, res) => {
  try {
    const { productId, quantity, link, notes } = req.body;
    const userId = req.user?.id || req.body.userId; // For testing purposes

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID is required'
      });
    }

    // Check if user exists and get balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, balance: true, isActive: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account suspended',
        message: 'Your account is currently suspended'
      });
    }

    // Check if product exists and is available
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { 
        id: true, 
        name: true, 
        price: true, 
        minQuantity: true, 
        maxQuantity: true, 
        isActive: true,
        provider: { select: { isActive: true } }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: 'Service does not exist'
      });
    }

    if (!product.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Service unavailable',
        message: 'This service is currently unavailable'
      });
    }

    if (!product.provider.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Provider unavailable',
        message: 'Service provider is currently unavailable'
      });
    }

    // Calculate total price first
    const totalPrice = product.price * quantity;

    // Check if user has sufficient balance
    if (user.balance < totalPrice) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        message: `Insufficient balance. Required: ${totalPrice} IDR, Available: ${user.balance} IDR`
      });
    }

    // Validate quantity range after balance check
    if (quantity < product.minQuantity || quantity > product.maxQuantity) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quantity',
        message: `Quantity must be between ${product.minQuantity} and ${product.maxQuantity}`
      });
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        userId,
        productId,
        quantity,
        link: link.trim(),
        notes: notes?.trim() || null,
        totalPrice,
        status: 'PENDING'
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        product: { 
          select: { 
            id: true, 
            name: true, 
            customName: true,
            price: true,
            serviceType: true,
            category: { select: { name: true } }
          } 
        },
        transactions: { select: { id: true, status: true, amount: true } }
      }
    });

    // Deduct balance from user
    await prisma.user.update({
      where: { id: userId },
      data: { balance: { decrement: totalPrice } }
    });

    // Create transaction record
    await prisma.transaction.create({
      data: {
        userId,
        orderId: order.id,
        type: 'ORDER_PAYMENT',
        amount: -totalPrice, // Negative for deduction
        status: 'SUCCESS',
        description: `Order payment for ${product.customName || product.name}`,
        metadata: { orderId: order.id, productId, quantity }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order,
        balanceDeducted: totalPrice,
        newBalance: user.balance - totalPrice
      }
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create order'
    });
  }
});

// Get all orders with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      userId, 
      productId,
      startDate,
      endDate,
      search
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    if (productId) {
      where.productId = productId;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get orders with relations
    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, name: true } },
        product: { 
          select: { 
            id: true, 
            name: true, 
            customName: true,
            serviceType: true,
            category: { select: { name: true } }
          } 
        },
        transactions: { select: { id: true, status: true, amount: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });

    // Get total count for pagination
    const total = await prisma.order.count({ where });

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch orders'
    });
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID',
        message: 'Order ID must be a valid string'
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: id.trim() },
      include: {
        user: { select: { id: true, email: true, name: true, phone: true } },
        product: { 
          select: { 
            id: true, 
            name: true, 
            customName: true,
            description: true,
            serviceType: true,
            price: true,
            category: { select: { name: true } },
            provider: { select: { name: true, markup: true } }
          } 
        },
        transactions: { select: { id: true, status: true, amount: true, createdAt: true } }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: 'Order does not exist'
      });
    }

    res.json({
      success: true,
      data: { order }
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch order'
    });
  }
});

// Update order status (admin only)
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, providerOrderId, providerResponse } = req.body;

    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID',
        message: 'Order ID must be a valid string'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Missing status',
        message: 'Status is required'
      });
    }

    // Validate status
    const validStatuses = ['PENDING', 'PROCESSING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FAILED', 'PARTIAL'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id: id.trim() },
      include: { user: { select: { id: true, email: true } } }
    });

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: 'Order does not exist'
      });
    }

    // Prepare update data
    const updateData = { status };
    
    if (notes) updateData.notes = notes;
    if (providerOrderId) updateData.providerOrderId = providerOrderId;
    if (providerResponse) updateData.providerResponse = providerResponse;

    // Set timestamps based on status
    if ((status === 'PROCESSING' || status === 'IN_PROGRESS') && !existingOrder.startedAt) {
      updateData.startedAt = new Date();
    }
    
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(status)) {
      updateData.completedAt = new Date();
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: id.trim() },
      data: updateData,
      include: {
        user: { select: { id: true, email: true, name: true } },
        product: { select: { id: true, name: true, customName: true } }
      }
    });

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: { order: updatedOrder }
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update order status'
    });
  }
});

// Cancel order (user can cancel pending orders)
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, userId } = req.body;
    const currentUserId = req.user?.id || userId; // For testing purposes

    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID',
        message: 'Order ID must be a valid string'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID is required'
      });
    }

    // Check if order exists and belongs to user
    const order = await prisma.order.findUnique({
      where: { id: id.trim() },
      include: { 
        user: { select: { id: true, balance: true } },
        product: { select: { name: true, customName: true } }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: 'Order does not exist'
      });
    }

    if (order.userId !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only cancel your own orders'
      });
    }

    // Check if order can be cancelled
    if (!['PENDING', 'PROCESSING'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel order',
        message: `Cannot cancel order with status: ${order.status}`
      });
    }

    // Cancel order
    const cancelledOrder = await prisma.order.update({
      where: { id: id.trim() },
      data: { 
        status: 'CANCELLED',
        completedAt: new Date(),
        notes: reason ? `${order.notes || ''}\n[CANCELLED] ${reason}`.trim() : order.notes
      }
    });

    // Refund user balance
    await prisma.user.update({
      where: { id: currentUserId },
      data: { balance: { increment: order.totalPrice } }
    });

    // Get updated user to calculate new balance
    const updatedUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { balance: true }
    });

    // Create refund transaction
    await prisma.transaction.create({
      data: {
        userId: currentUserId,
        orderId: order.id,
        type: 'REFUND',
        amount: order.totalPrice, // Positive for refund
        status: 'SUCCESS',
        description: `Order cancellation refund for ${order.product.customName || order.product.name}`,
        metadata: { orderId: order.id, reason: reason || 'User cancellation' }
      }
    });

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        order: cancelledOrder,
        balanceRefunded: true,
        refundAmount: order.totalPrice,
        newBalance: updatedUser.balance
      }
    });

  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to cancel order'
    });
  }
});

// Get order statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get order counts by status
    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      where,
      _count: { status: true }
    });

    // Get total orders and revenue
    const totalOrders = await prisma.order.count({ where });
    const totalRevenue = await prisma.order.aggregate({
      where, // Include all orders, not just completed
      _sum: { totalPrice: true }
    });

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { customName: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const stats = {
      totalOrders,
      totalRevenue: totalRevenue._sum.totalPrice || 0,
      statusBreakdown: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
      recentOrders
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch order statistics'
    });
  }
});

module.exports = router;
