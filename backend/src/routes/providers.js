// 🔌 Provider Management Routes - MedanPedia Integration
// This file handles all provider-related API endpoints

const express = require('express');
const { prisma } = require('../../lib/prisma');

// Create router instance
const router = express.Router();

// 🔍 GET /api/providers - Get all providers (with pagination and filtering)
router.get('/', async (req, res, next) => {
  try {
    // Extract query parameters for pagination and filtering
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const isActive = req.query.isActive;
    const search = req.query.search;
    
    // Calculate pagination values
    const skip = (page - 1) * limit;
    
    // Build where clause for filtering
    const where = {};
    
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { baseUrl: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Execute database query with Prisma
    const [providers, totalCount] = await Promise.all([
      prisma.provider.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              products: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.provider.count({ where })
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    
    // Send successful response with pagination metadata
    res.json({
      success: true,
      data: providers.map(provider => ({
        ...provider,
        apiKey: provider.apiKey ? '***' + provider.apiKey.slice(-4) : null // Hide full API key
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPreviousPage
      },
      message: `Retrieved ${providers.length} providers successfully`
    });
    
  } catch (error) {
    next(error);
  }
});

// 🔍 GET /api/providers/:id - Get provider by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider ID',
        message: 'Provider ID must be a valid string'
      });
    }
    
    // Find provider in database
    const provider = await prisma.provider.findUnique({
      where: { id: id.trim() },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    });
    
    // Check if provider exists
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found',
        message: `Provider with ID ${id} does not exist`
      });
    }
    
    // Hide full API key for security
    const safeProvider = {
      ...provider,
      apiKey: provider.apiKey ? '***' + provider.apiKey.slice(-4) : null
    };
    
    // Send successful response
    res.json({
      success: true,
      data: safeProvider,
      message: 'Provider retrieved successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// ➕ POST /api/providers - Create new provider
router.post('/', async (req, res, next) => {
  try {
    const { name, apiKey, baseUrl, isActive, markup, currency, config } = req.body;
    
    // Basic validation
    if (!name || !apiKey || !baseUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Name, apiKey, and baseUrl are required',
        requiredFields: ['name', 'apiKey', 'baseUrl'],
        receivedFields: Object.keys(req.body)
      });
    }
    
    // Validate markup percentage
    if (markup !== undefined && (markup < 0 || markup > 1000)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid markup percentage',
        message: 'Markup must be between 0 and 1000 percent'
      });
    }
    
    // Check if provider with this name already exists
    const existingProvider = await prisma.provider.findFirst({
      where: {
        OR: [
          { name },
          { baseUrl }
        ]
      }
    });
    
    if (existingProvider) {
      return res.status(409).json({
        success: false,
        error: 'Provider already exists',
        message: 'A provider with this name or base URL already exists'
      });
    }
    
    // Create new provider
    const newProvider = await prisma.provider.create({
      data: {
        name,
        apiKey,
        baseUrl,
        isActive: isActive !== undefined ? isActive : true,
        markup: markup || 10,
        currency: currency || 'IDR',
        config: config || {}
      }
    });
    
    // Hide full API key for security
    const safeProvider = {
      ...newProvider,
      apiKey: '***' + newProvider.apiKey.slice(-4)
    };
    
    // Send successful response
    res.status(201).json({
      success: true,
      data: safeProvider,
      message: 'Provider created successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// ✏️ PUT /api/providers/:id - Update provider
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, apiKey, baseUrl, isActive, markup, currency, config } = req.body;
    
    // Validate ID format
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider ID',
        message: 'Provider ID must be a valid string'
      });
    }
    
    // Check if provider exists
    const existingProvider = await prisma.provider.findUnique({
      where: { id: id.trim() }
    });
    
    if (!existingProvider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found',
        message: `Provider with ID ${id} does not exist`
      });
    }
    
    // Validate markup percentage if changing
    if (markup !== undefined && (markup < 0 || markup > 1000)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid markup percentage',
        message: 'Markup must be between 0 and 1000 percent'
      });
    }
    
    // Check for conflicts if changing name or baseUrl
    if ((name && name !== existingProvider.name) || (baseUrl && baseUrl !== existingProvider.baseUrl)) {
      const conflict = await prisma.provider.findFirst({
        where: {
          OR: [
            { name: name || existingProvider.name },
            { baseUrl: baseUrl || existingProvider.baseUrl }
          ],
          NOT: { id: id.trim() }
        }
      });
      
      if (conflict) {
        return res.status(409).json({
          success: false,
          error: 'Provider conflict',
          message: 'Another provider is already using this name or base URL'
        });
      }
    }
    
    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (apiKey !== undefined) updateData.apiKey = apiKey;
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (markup !== undefined) updateData.markup = markup;
    if (currency !== undefined) updateData.currency = currency;
    if (config !== undefined) updateData.config = config;
    
    // Update provider
    const updatedProvider = await prisma.provider.update({
      where: { id: id.trim() },
      data: updateData
    });
    
    // Hide full API key for security
    const safeProvider = {
      ...updatedProvider,
      apiKey: '***' + updatedProvider.apiKey.slice(-4)
    };
    
    // Send successful response
    res.json({
      success: true,
      data: safeProvider,
      message: 'Provider updated successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// 🗑️ DELETE /api/providers/:id - Delete provider
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider ID',
        message: 'Provider ID must be a valid string'
      });
    }
    
    // Check if provider exists
    const existingProvider = await prisma.provider.findUnique({
      where: { id: id.trim() },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    });
    
    if (!existingProvider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found',
        message: `Provider with ID ${id} does not exist`
      });
    }
    
    // Check if provider has services
    if (existingProvider._count.products > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete provider',
        message: `Provider has ${existingProvider._count.products} services and cannot be deleted`
      });
    }
    
    // Delete provider
    await prisma.provider.delete({
      where: { id: id.trim() }
    });
    
    // Send successful response
    res.json({
      success: true,
      message: 'Provider deleted successfully',
      deletedProvider: {
        id: existingProvider.id,
        name: existingProvider.name
      }
    });
    
  } catch (error) {
    next(error);
  }
});

// 🔄 POST /api/providers/:id/sync - Sync services from provider
router.post('/:id/sync', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider ID',
        message: 'Provider ID must be a valid string'
      });
    }
    
    // Check if provider exists
    const provider = await prisma.provider.findUnique({
      where: { id: id.trim() }
    });
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found',
        message: `Provider with ID ${id} does not exist`
      });
    }
    
    // For now, return a placeholder response
    // In the future, this will call the actual MedanPedia API
    res.json({
      success: true,
      message: 'Provider sync initiated',
      provider: {
        id: provider.id,
        name: provider.name,
        baseUrl: provider.baseUrl
      },
      note: 'This endpoint will be implemented to call MedanPedia API and sync services'
    });
    
  } catch (error) {
    next(error);
  }
});

// 📊 GET /api/providers/:id/stats - Get provider statistics
router.get('/:id/stats', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider ID',
        message: 'Provider ID must be a valid string'
      });
    }
    
    // Check if provider exists
    const provider = await prisma.provider.findUnique({
      where: { id: id.trim() }
    });
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found',
        message: `Provider with ID ${id} does not exist`
      });
    }
    
    // Get provider statistics
    const [totalServices, activeServices, totalOrders] = await Promise.all([
      prisma.product.count({
        where: { providerId: id.trim() }
      }),
      prisma.product.count({
        where: { 
          providerId: id.trim(),
          isActive: true
        }
      }),
      prisma.order.count({
        where: {
          product: {
            providerId: id.trim()
          }
        }
      })
    ]);
    
    // Send successful response
    res.json({
      success: true,
      data: {
        provider: {
          id: provider.id,
          name: provider.name,
          markup: provider.markup,
          currency: provider.currency
        },
        statistics: {
          totalServices,
          activeServices,
          totalOrders,
          markupPercentage: provider.markup
        }
      },
      message: 'Provider statistics retrieved successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// Export the router
module.exports = router;
