// 👨‍💼 Admin Management Routes - Markup & Service Import
// This file handles admin-specific operations

const express = require('express');
const { prisma } = require('../../lib/prisma');

// Create router instance
const router = express.Router();

// 🔒 ADMIN MIDDLEWARE - Check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    // For now, we'll skip authentication check
    // In production, this would verify JWT token and user role
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Admin access required'
    });
  }
};

// Apply admin middleware to all routes
router.use(requireAdmin);

// 💰 PUT /api/admin/markup - Update provider markup percentage
router.put('/markup', async (req, res, next) => {
  try {
    const { providerId, newMarkup, reason } = req.body;
    
    // Basic validation
    if (!providerId || newMarkup === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Provider ID and new markup are required',
        requiredFields: ['providerId', 'newMarkup'],
        receivedFields: Object.keys(req.body)
      });
    }
    
    // Validate markup percentage
    if (newMarkup < 0 || newMarkup > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid markup percentage',
        message: 'Markup must be between 0 and 1000 percent'
      });
    }
    
    // Check if provider exists
    const provider = await prisma.provider.findUnique({
      where: { id: providerId }
    });
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found',
        message: `Provider with ID ${providerId} does not exist`
      });
    }
    
    const oldMarkup = provider.markup;
    
    // Update provider markup
    const updatedProvider = await prisma.provider.update({
      where: { id: providerId },
      data: { markup: newMarkup }
    });
    
    // Record markup change in history
    await prisma.markupHistory.create({
      data: {
        providerId,
        oldMarkup,
        newMarkup,
        changedBy: 'admin', // In production, this would be the actual user ID
        reason: reason || 'Markup updated by admin'
      }
    });
    
    // Recalculate prices for all services from this provider
    const services = await prisma.product.findMany({
      where: { providerId }
    });
    
    const updatePromises = services.map(service => {
      const newPrice = Math.round(service.originalPrice * (1 + newMarkup / 100));
      return prisma.product.update({
        where: { id: service.id },
        data: { price: newPrice }
      });
    });
    
    await Promise.all(updatePromises);
    
    // Send successful response
    res.json({
      success: true,
      data: {
        provider: {
          id: updatedProvider.id,
          name: updatedProvider.name,
          oldMarkup,
          newMarkup
        },
        servicesUpdated: services.length,
        message: `Markup updated from ${oldMarkup}% to ${newMarkup}%`
      },
      message: 'Provider markup updated successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// 🔄 POST /api/admin/import - Import services from external provider
router.post('/import', async (req, res, next) => {
  try {
    const { providerId, services } = req.body;
    
    if (!providerId) {
      return res.status(400).json({
        success: false,
        error: 'Missing provider ID',
        message: 'Provider ID is required for import'
      });
    }
    
    if (!services || !Array.isArray(services) || services.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid services data',
        message: 'Services must be a non-empty array'
      });
    }
    
    // Check if provider exists
    const provider = await prisma.provider.findUnique({
      where: { id: providerId }
    });
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found',
        message: `Provider with ID ${providerId} does not exist`
      });
    }
    
    const results = [];
    const errors = [];
    
    for (const serviceData of services) {
      try {
        const {
          name,
          description,
          categoryId,
          serviceType,
          minQuantity,
          maxQuantity,
          originalPrice,
          apiServiceId
        } = serviceData;
        
        // Basic validation
        if (!name || !serviceType || !minQuantity || !maxQuantity || !originalPrice || !apiServiceId) {
          errors.push({
            service: serviceData,
            error: 'Missing required fields'
          });
          continue;
        }
        
        // Check if service already exists
        const existingService = await prisma.product.findFirst({
          where: {
            apiServiceId,
            providerId
          }
        });
        
        if (existingService) {
          // Update existing service
          const markup = provider.markup || 0;
          const finalPrice = Math.round(originalPrice * (1 + markup / 100));
          
          const updatedService = await prisma.product.update({
            where: { id: existingService.id },
            data: {
              name,
              description,
              categoryId,
              serviceType,
              minQuantity,
              maxQuantity,
              originalPrice,
              price: finalPrice
            }
          });
          
          results.push({
            operation: 'updated',
            service: updatedService
          });
        } else {
          // Create new service
          const markup = provider.markup || 0;
          const finalPrice = Math.round(originalPrice * (1 + markup / 100));
          
          const newService = await prisma.product.create({
            data: {
              name,
              customName: name,
              description,
              customDescription: description,
              categoryId,
              providerId,
              serviceType,
              minQuantity,
              maxQuantity,
              originalPrice,
              price: finalPrice,
              isActive: true,
              apiServiceId,
              isImported: true,
              isCustom: false
            }
          });
          
          results.push({
            operation: 'created',
            service: newService
          });
        }
        
      } catch (error) {
        errors.push({
          service: serviceData,
          error: error.message
        });
      }
    }
    
    // Send response
    res.json({
      success: true,
      message: 'Services import completed',
      data: {
        provider: {
          id: provider.id,
          name: provider.name,
          markup: provider.markup
        },
        results: {
          successful: results.length,
          failed: errors.length,
          total: services.length
        },
        services: results,
        errors: errors.length > 0 ? errors : undefined
      }
    });
    
  } catch (error) {
    next(error);
  }
});

// 📊 GET /api/admin/dashboard - Get admin dashboard statistics
router.get('/dashboard', async (req, res, next) => {
  try {
    // Get comprehensive statistics
    const [
      totalUsers,
      activeUsers,
      totalServices,
      activeServices,
      totalOrders,
      pendingOrders,
      totalProviders,
      totalCategories
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.order.count({ 
        where: { 
          status: { in: ['PENDING', 'PROCESSING'] } 
        } 
      }),
      prisma.provider.count(),
      prisma.serviceCategory.count()
    ]);
    
    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        },
        product: {
          select: { name: true, customName: true }
        }
      }
    });
    
    // Get provider statistics
    const providers = await prisma.provider.findMany({
      select: {
        id: true,
        name: true,
        markup: true,
        isActive: true,
        _count: {
          select: { products: true }
        }
      }
    });
    
    // Send successful response
    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          totalServices,
          activeServices,
          totalOrders,
          pendingOrders,
          totalProviders,
          totalCategories
        },
        recentOrders,
        providers
      },
      message: 'Dashboard statistics retrieved successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// 🔍 GET /api/admin/markup-history - Get markup change history
router.get('/markup-history', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const providerId = req.query.providerId;
    
    const skip = (page - 1) * limit;
    
    const where = {};
    if (providerId) where.providerId = providerId;
    
    const [history, totalCount] = await Promise.all([
      prisma.markupHistory.findMany({
        where,
        skip,
        take: limit,
        include: {
          provider: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.markupHistory.count({ where })
    ]);
    
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    
    res.json({
      success: true,
      data: history,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPreviousPage
      },
      message: 'Markup history retrieved successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// Export the router
module.exports = router;
