const express = require('express');
const { prisma } = require('../../lib/prisma');
const router = express.Router();

// Middleware to validate transaction data
const validateTransactionData = (req, res, next) => {
  const { type, amount, paymentMethod, description } = req.body;
  
  if (!type || !amount) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'Transaction type and amount are required'
    });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid amount',
      message: 'Amount must be a positive number'
    });
  }

  // Remove WITHDRAWAL from valid types for users - only admins can initiate withdrawals
  const validTypes = ['DEPOSIT', 'ORDER_PAYMENT', 'REFUND', 'SERVICE_FAILED_REFUND'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid transaction type',
      message: `Type must be one of: ${validTypes.join(', ')}`
    });
  }

  if (type === 'DEPOSIT' && !paymentMethod) {
    return res.status(400).json({
      success: false,
      error: 'Missing payment method',
      message: 'Payment method is required for deposits'
    });
  }

  next();
};

// Create deposit transaction
router.post('/deposit', async (req, res) => {
  try {
    const { amount, paymentMethod, description, metadata } = req.body;
    const userId = req.user?.id || req.body.userId; // For testing purposes

    // Validate required fields
    if (!amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Amount and payment method are required'
      });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount',
        message: 'Amount must be a positive number'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID is required'
      });
    }

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, isActive: true, balance: true }
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

    // Validate payment method
    const validPaymentMethods = ['MIDTRANS', 'XENDIT', 'BANK_TRANSFER', 'E_WALLET', 'CREDIT_CARD', 'DEBIT_CARD'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment method',
        message: `Payment method must be one of: ${validPaymentMethods.join(', ')}`
      });
    }

    // Create pending deposit transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT',
        amount,
        status: 'PENDING',
        paymentMethod,
        description: description || `Deposit via ${paymentMethod}`,
        metadata: {
          ...metadata,
          paymentMethod,
          requestedAt: new Date().toISOString()
        }
      }
    });

    // Generate payment instructions based on payment method
    const paymentInstructions = generatePaymentInstructions(amount, paymentMethod, transaction.id);

    res.status(201).json({
      success: true,
      message: 'Deposit transaction created successfully',
      data: {
        transaction: {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          status: transaction.status,
          paymentMethod: transaction.paymentMethod,
          createdAt: transaction.createdAt
        },
        paymentInstructions
      }
    });

  } catch (error) {
    console.error('Error creating deposit transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create deposit transaction'
    });
  }
});

// Confirm payment (admin only)
router.patch('/:id/confirm-payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentId, gatewayResponse } = req.body;

    // Validate required fields
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Status is required'
      });
    }

    const validStatuses = ['SUCCESS', 'FAILED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Find transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { user: { select: { id: true, balance: true } } }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
        message: 'Transaction does not exist'
      });
    }

    if (transaction.type !== 'DEPOSIT') {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction type',
        message: 'Can only confirm deposit transactions'
      });
    }

    if (transaction.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction status',
        message: 'Can only confirm pending transactions'
      });
    }

    // Update transaction status
    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        status,
        paymentId: paymentId || null,
        metadata: {
          ...transaction.metadata,
          gatewayResponse,
          confirmedAt: new Date().toISOString()
        }
      }
    });

    // If payment successful, credit user balance
    if (status === 'SUCCESS') {
      await prisma.user.update({
        where: { id: transaction.userId },
        data: { balance: { increment: transaction.amount } }
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: transaction.userId,
          title: 'Deposit Successful',
          message: `Your deposit of ${transaction.amount} IDR has been credited to your account`,
          type: 'SUCCESS',
          actionUrl: '/dashboard/transactions'
        }
      });
    }

    res.json({
      success: true,
      message: `Payment ${status.toLowerCase()} successfully`,
      data: {
        transaction: updatedTransaction,
        balanceUpdated: status === 'SUCCESS',
        newBalance: status === 'SUCCESS' ? transaction.user.balance + transaction.amount : transaction.user.balance
      }
    });

  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to confirm payment'
    });
  }
});

// Admin-initiated withdrawal (admin only - for business purposes)
router.post('/admin/withdrawal', async (req, res) => {
  try {
    const { userId, amount, description, adminNotes, bankDetails } = req.body;
    
    // TODO: Add admin authentication middleware
    // const isAdmin = req.user?.role === 'ADMIN';
    // if (!isAdmin) {
    //   return res.status(403).json({
    //     success: false,
    //     error: 'Forbidden',
    //     message: 'Only admins can initiate withdrawals'
    //   });
    // }

    // Validate required fields
    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'User ID and amount are required'
      });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount',
        message: 'Amount must be a positive number'
      });
    }

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, isActive: true, balance: true }
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
        message: 'User account is currently suspended'
      });
    }

    // Check if user has sufficient balance
    if (user.balance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        message: `User balance (${user.balance}) is insufficient for withdrawal (${amount})`
      });
    }

    // Create withdrawal transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'WITHDRAWAL',
        amount: -amount, // Negative amount for withdrawals
        status: 'PENDING',
        paymentMethod: 'BANK_TRANSFER', // Use valid enum value
        description: description || 'Admin-initiated withdrawal',
        metadata: {
          adminNotes,
          bankDetails,
          initiatedAt: new Date().toISOString(),
          initiatedBy: 'ADMIN' // TODO: Add actual admin ID
        }
      }
    });

    // Deduct balance immediately
    await prisma.user.update({
      where: { id: userId },
      data: { balance: { decrement: amount } }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        title: 'Withdrawal Initiated',
        message: `A withdrawal of ${amount} IDR has been initiated by admin`,
        type: 'INFO',
        actionUrl: '/dashboard/transactions'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Admin withdrawal initiated successfully',
      data: {
        transaction: {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          status: transaction.status,
          description: transaction.description,
          createdAt: transaction.createdAt
        },
        balanceDeducted: true,
        newBalance: user.balance - amount
      }
    });

  } catch (error) {
    console.error('Error creating admin withdrawal:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create admin withdrawal'
    });
  }
});

// Process admin withdrawal (admin only)
router.patch('/admin/withdrawal/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, processingFee = 0 } = req.body;
    
    // TODO: Add admin authentication middleware
    // const isAdmin = req.user?.role === 'ADMIN';
    // if (!isAdmin) {
    //   return res.status(403).json({
    //     success: false,
    //     error: 'Forbidden',
    //     message: 'Only admins can process withdrawals'
    //   });
    // }

    // Validate required fields
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Status is required'
      });
    }

    const validStatuses = ['SUCCESS', 'FAILED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Find transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { user: { select: { id: true, balance: true } } }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
        message: 'Transaction does not exist'
      });
    }

    if (transaction.type !== 'WITHDRAWAL') {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction type',
        message: 'Can only process withdrawal transactions'
      });
    }

    if (transaction.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction status',
        message: 'Can only process pending withdrawals'
      });
    }

    // Update transaction status
    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        status,
        metadata: {
          ...transaction.metadata,
          processedAt: new Date().toISOString(),
          processingFee,
          finalAdminNotes: adminNotes
        }
      }
    });

    // If withdrawal failed or cancelled, refund the balance
    if (status === 'FAILED' || status === 'CANCELLED') {
      const refundAmount = Math.abs(transaction.amount); // Convert negative to positive
      await prisma.user.update({
        where: { id: transaction.userId },
        data: { balance: { increment: refundAmount } }
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: transaction.userId,
          title: 'Withdrawal Failed',
          message: `Your withdrawal of ${refundAmount} IDR has been refunded to your account`,
          type: 'WARNING',
          actionUrl: '/dashboard/transactions'
        }
      });

      res.json({
        success: true,
        message: `Withdrawal ${status.toLowerCase()} successfully`,
        data: {
          transaction: updatedTransaction,
          balanceRefunded: true,
          refundAmount
        }
      });
    } else {
      // Withdrawal successful
      res.json({
        success: true,
        message: 'Withdrawal processed successfully',
        data: {
          transaction: updatedTransaction,
          processingFee,
          netAmount: Math.abs(transaction.amount) - processingFee
        }
      });
    }

  } catch (error) {
    console.error('Error processing admin withdrawal:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to process admin withdrawal'
    });
  }
});

// Get all transactions with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status, userId } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (userId) where.userId = userId;

    // Get transactions with pagination
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limitNum
      }),
      prisma.transaction.count({ where })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: totalPages
        }
      }
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch transactions'
    });
  }
});

// Get transaction by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
        message: 'Transaction does not exist'
      });
    }

    res.json({
      success: true,
      data: { transaction }
    });

  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch transaction'
    });
  }
});

// Get transaction statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const [
      totalTransactions,
      totalDeposits,
      totalWithdrawals,
      typeBreakdown,
      statusBreakdown
    ] = await Promise.all([
      prisma.transaction.count(),
      prisma.transaction.aggregate({
        where: { type: 'DEPOSIT', status: 'SUCCESS' },
        _sum: { amount: true }
      }),
      prisma.transaction.aggregate({
        where: { type: 'WITHDRAWAL', status: 'SUCCESS' },
        _sum: { amount: true }
      }),
      prisma.transaction.groupBy({
        by: ['type'],
        _count: { id: true },
        _sum: { amount: true }
      }),
      prisma.transaction.groupBy({
        by: ['status'],
        _count: { id: true }
      })
    ]);

    // Format type breakdown
    const formattedTypeBreakdown = {};
    typeBreakdown.forEach(item => {
      formattedTypeBreakdown[item.type] = {
        count: item._count.id,
        total: item._sum.amount || 0
      };
    });

    // Format status breakdown
    const formattedStatusBreakdown = {};
    statusBreakdown.forEach(item => {
      formattedStatusBreakdown[item.status] = item._count.id;
    });

    res.json({
      success: true,
      data: {
        totalTransactions,
        totalDeposits: totalDeposits._sum.amount || 0,
        totalWithdrawals: Math.abs(totalWithdrawals._sum.amount || 0), // Convert negative to positive
        typeBreakdown: formattedTypeBreakdown,
        statusBreakdown: formattedStatusBreakdown
      }
    });

  } catch (error) {
    console.error('Error fetching transaction statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch transaction statistics'
    });
  }
});

// Helper function to generate payment instructions
function generatePaymentInstructions(amount, paymentMethod, transactionId) {
  const instructions = [];
  
  switch (paymentMethod) {
    case 'MIDTRANS':
      instructions.push(`Please transfer ${amount} IDR to account: 1234-5678-9012`);
      instructions.push(`Use reference: DEP-${transactionId}`);
      instructions.push(`Payment gateway: Midtrans`);
      break;
      
    case 'XENDIT':
      instructions.push(`Please transfer ${amount} IDR to account: 1234-5678-9012`);
      instructions.push(`Use reference: DEP-${transactionId}`);
      instructions.push(`Payment gateway: Xendit`);
      break;
      
    case 'BANK_TRANSFER':
      instructions.push(`Please transfer ${amount} IDR to account: 1234-5678-9012`);
      instructions.push(`Bank: BCA (Bank Central Asia)`);
      instructions.push(`Use reference: DEP-${transactionId}`);
      break;
      
    case 'E_WALLET':
      instructions.push(`Please transfer ${amount} IDR to e-wallet: 0812-3456-7890`);
      instructions.push(`Use reference: DEP-${transactionId}`);
      break;
      
    case 'CREDIT_CARD':
    case 'DEBIT_CARD':
      instructions.push(`Please use your ${paymentMethod.replace('_', ' ')} to pay ${amount} IDR`);
      instructions.push(`Use reference: DEP-${transactionId}`);
      break;
      
    default:
      instructions.push(`Please contact support for payment instructions`);
  }
  
  return instructions;
}

module.exports = router;
