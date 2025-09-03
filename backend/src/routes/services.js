// 🛍️ Service Management Routes - Complete SMM Service Catalog
// This file handles all service-related API endpoints

const express = require('express');
const { prisma } = require('../../lib/prisma');

// Create router instance
const router = express.Router();

// 🔍 GET /api/services - Get all services (with pagination and filtering)
router.get('/', async (req, res, next) => {
  try {
    // Extract query parameters for pagination and filtering
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const categoryId = req.query.categoryId;
    const platform = req.query.platform;
    const isActive = req.query.isActive;
    const search = req.query.search;
    const minPrice = req.query.minPrice ? parseInt(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice) : undefined;
    
    // Calculate pagination values
    const skip = (page - 1) * limit;
    
    // Build where clause for filtering
    const where = {};
    
    if (categoryId) where.categoryId = categoryId;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { customName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }
    
    // Execute database query with Prisma
    const [services, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          provider: {
            select: {
              id: true,
              name: true,
              markup: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    
    // Send successful response with pagination metadata
    res.json({
      success: true,
      data: services,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPreviousPage
      },
      message: `Retrieved ${services.length} services successfully`
    });
    
  } catch (error) {
    next(error);
  }
});

// 🔍 GET /api/services/:id - Get service by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Invalid service ID',
        message: 'Service ID must be a valid string'
      });
    }
    
    // Find service in database
    const service = await prisma.product.findUnique({
      where: { id: id.trim() },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        provider: {
          select: {
            id: true,
            name: true,
            markup: true
          }
        }
      }
    });
    
    // Check if service exists
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
        message: `Service with ID ${id} does not exist`
      });
    }
    
    // Send successful response
    res.json({
      success: true,
      data: service,
      message: 'Service retrieved successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// ➕ POST /api/services - Create new service
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      customName,
      description,
      customDescription,
      categoryId,
      providerId,
      serviceType,
      minQuantity,
      maxQuantity,
      originalPrice,
      isActive,
      apiServiceId
    } = req.body;
    
    // Basic validation
    if (!name || !providerId || !serviceType || !minQuantity || !maxQuantity || !originalPrice) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Name, providerId, serviceType, minQuantity, maxQuantity, and originalPrice are required',
        requiredFields: ['name', 'providerId', 'serviceType', 'minQuantity', 'maxQuantity', 'originalPrice'],
        receivedFields: Object.keys(req.body)
      });
    }
    
    // Validate quantities
    if (minQuantity < 1 || maxQuantity < minQuantity) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quantity range',
        message: 'minQuantity must be >= 1 and maxQuantity must be >= minQuantity'
      });
    }
    
    // Validate price
    if (originalPrice < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid price',
        message: 'Price must be non-negative'
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
    
    // Check if category exists (if provided)
    if (categoryId) {
      const category = await prisma.serviceCategory.findUnique({
        where: { id: categoryId }
      });
      
      if (!category) {
        return res.status(404).json({
          success: false,
          error: 'Category not found',
          message: `Category with ID ${categoryId} does not exist`
        });
      }
    }
    
    // Calculate final price with markup
    const markup = provider.markup || 0;
    const finalPrice = Math.round(originalPrice * (1 + markup / 100));
    
    // Create new service
    const newService = await prisma.product.create({
      data: {
        name,
        customName: customName || name,
        description,
        customDescription: customDescription || description,
        categoryId,
        providerId,
        serviceType,
        minQuantity,
        maxQuantity,
        originalPrice,
        price: finalPrice,
        isActive: isActive !== undefined ? isActive : true,
        apiServiceId: apiServiceId || `custom_${Date.now()}`,
        isImported: false,
        isCustom: true
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        provider: {
          select: {
            id: true,
            name: true,
            markup: true
          }
        }
      }
    });
    
    // Send successful response
    res.status(201).json({
      success: true,
      data: newService,
      message: 'Service created successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// ✏️ PUT /api/services/:id - Update service
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      customName,
      description,
      customDescription,
      categoryId,
      providerId,
      serviceType,
      minQuantity,
      maxQuantity,
      originalPrice,
      isActive
    } = req.body;
    
    // Validate ID format
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Invalid service ID',
        message: 'Service ID must be a valid string'
      });
    }
    
    // Check if service exists
    const existingService = await prisma.product.findUnique({
      where: { id: id.trim() },
      include: { provider: true }
    });
    
    if (!existingService) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
        message: `Service with ID ${id} does not exist`
      });
    }
    
    // Validate quantities if provided
    if (minQuantity !== undefined || maxQuantity !== undefined) {
      const newMinQuantity = minQuantity !== undefined ? minQuantity : existingService.minQuantity;
      const newMaxQuantity = maxQuantity !== undefined ? maxQuantity : existingService.maxQuantity;
      
      if (newMinQuantity < 1 || newMaxQuantity < newMinQuantity) {
        return res.status(400).json({
          success: false,
          error: 'Invalid quantity range',
          message: 'minQuantity must be >= 1 and maxQuantity must be >= minQuantity'
        });
      }
    }
    
    // Validate price if provided
    if (originalPrice !== undefined && originalPrice < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid price',
        message: 'Price must be non-negative'
      });
    }
    
    // Check if provider exists (if changing)
    if (providerId && providerId !== existingService.providerId) {
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
    }
    
    // Check if category exists (if changing)
    if (categoryId && categoryId !== existingService.categoryId) {
      const category = await prisma.serviceCategory.findUnique({
        where: { id: categoryId }
      });
      
      if (!category) {
        return res.status(404).json({
          success: false,
          error: 'Category not found',
          message: `Category with ID ${categoryId} does not exist`
        });
      }
    }
    
    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (customName !== undefined) updateData.customName = customName;
    if (description !== undefined) updateData.description = description;
    if (customDescription !== undefined) updateData.customDescription = customDescription;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (providerId !== undefined) updateData.providerId = providerId;
    if (serviceType !== undefined) updateData.serviceType = serviceType;
    if (minQuantity !== undefined) updateData.minQuantity = minQuantity;
    if (maxQuantity !== undefined) updateData.maxQuantity = maxQuantity;
    if (originalPrice !== undefined) updateData.originalPrice = originalPrice;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Recalculate price if originalPrice or provider changed
    if (originalPrice !== undefined || providerId !== undefined) {
      const newProviderId = providerId || existingService.providerId;
      const newOriginalPrice = originalPrice !== undefined ? originalPrice : existingService.originalPrice;
      
      const provider = await prisma.provider.findUnique({
        where: { id: newProviderId }
      });
      
      const markup = provider.markup || 0;
      updateData.price = Math.round(newOriginalPrice * (1 + markup / 100));
    }
    
    // Update service
    const updatedService = await prisma.product.update({
      where: { id: id.trim() },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        provider: {
          select: {
            id: true,
            name: true,
            markup: true
          }
        }
      }
    });
    
    // Send successful response
    res.json({
      success: true,
      data: updatedService,
      message: 'Service updated successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// 🗑️ DELETE /api/services/:id - Delete service
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Invalid service ID',
        message: 'Service ID must be a valid string'
      });
    }
    
    // Check if service exists
    const existingService = await prisma.product.findUnique({
      where: { id: id.trim() }
    });
    
    if (!existingService) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
        message: `Service with ID ${id} does not exist`
      });
    }
    
    // Check if service has active orders
    const activeOrders = await prisma.order.findFirst({
      where: {
        productId: id.trim(),
        status: {
          in: ['PENDING', 'PROCESSING', 'IN_PROGRESS']
        }
      }
    });
    
    if (activeOrders) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete service',
        message: 'Service has active orders and cannot be deleted'
      });
    }
    
    // Delete service
    await prisma.product.delete({
      where: { id: id.trim() }
    });
    
    // Send successful response
    res.json({
      success: true,
      message: 'Service deleted successfully',
      deletedService: {
        id: existingService.id,
        name: existingService.name,
        customName: existingService.customName
      }
    });
    
  } catch (error) {
    next(error);
  }
});

// 🔄 POST /api/services/bulk - Bulk create/update services
router.post('/bulk', async (req, res, next) => {
  try {
    const { services, operation } = req.body; // operation: 'create' or 'update'
    
    if (!services || !Array.isArray(services) || services.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid services data',
        message: 'Services must be a non-empty array'
      });
    }
    
    if (!operation || !['create', 'update'].includes(operation)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid operation',
        message: 'Operation must be either "create" or "update"'
      });
    }
    
    const results = [];
    const errors = [];
    
    if (operation === 'create') {
      // Bulk create services
      for (const serviceData of services) {
        try {
          const {
            name,
            customName,
            description,
            customDescription,
            categoryId,
            providerId,
            serviceType,
            minQuantity,
            maxQuantity,
            originalPrice,
            isActive,
            apiServiceId
          } = serviceData;
          
          // Basic validation
          if (!name || !providerId || !serviceType || !minQuantity || !maxQuantity || !originalPrice) {
            errors.push({
              service: serviceData,
              error: 'Missing required fields'
            });
            continue;
          }
          
          // Get provider for markup calculation
          const provider = await prisma.provider.findUnique({
            where: { id: providerId }
          });
          
          if (!provider) {
            errors.push({
              service: serviceData,
              error: 'Provider not found'
            });
            continue;
          }
          
          // Calculate final price with markup
          const markup = provider.markup || 0;
          const finalPrice = Math.round(originalPrice * (1 + markup / 100));
          
          // Create service
          const newService = await prisma.product.create({
            data: {
              name,
              customName: customName || name,
              description,
              customDescription: customDescription || description,
              categoryId,
              providerId,
              serviceType,
              minQuantity,
              maxQuantity,
              originalPrice,
              price: finalPrice,
              isActive: isActive !== undefined ? isActive : true,
              apiServiceId: apiServiceId || `custom_${Date.now()}`,
              isImported: false,
              isCustom: true
            }
          });
          
          results.push({
            operation: 'created',
            service: newService
          });
          
        } catch (error) {
          errors.push({
            service: serviceData,
            error: error.message
          });
        }
      }
    } else {
      // Bulk update services
      for (const serviceData of services) {
        try {
          const { id, ...updateData } = serviceData;
          
          if (!id) {
            errors.push({
              service: serviceData,
              error: 'Service ID is required for updates'
            });
            continue;
          }
          
          // Check if service exists
          const existingService = await prisma.product.findUnique({
            where: { id },
            include: { provider: true }
          });
          
          if (!existingService) {
            errors.push({
              service: serviceData,
              error: 'Service not found'
            });
            continue;
          }
          
          // Recalculate price if originalPrice changed
          if (updateData.originalPrice !== undefined) {
            const provider = await prisma.provider.findUnique({
              where: { id: existingService.providerId }
            });
            
            const markup = provider.markup || 0;
            updateData.price = Math.round(updateData.originalPrice * (1 + markup / 100));
          }
          
          // Update service
          const updatedService = await prisma.product.update({
            where: { id },
            data: updateData
          });
          
          results.push({
            operation: 'updated',
            service: updatedService
          });
          
        } catch (error) {
          errors.push({
            service: serviceData,
            error: error.message
          });
        }
      }
    }
    
    // Send response
    res.json({
      success: true,
      message: `Bulk ${operation} completed`,
      results: {
        successful: results.length,
        failed: errors.length,
        total: services.length
      },
      data: results,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    next(error);
  }
});

// 🔄 POST /api/services/import - Import services from external API
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
      results: {
        successful: results.length,
        failed: errors.length,
        total: services.length
      },
      data: results,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    next(error);
  }
});

// Export the router
module.exports = router;
