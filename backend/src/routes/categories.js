// 🏷️ Category Management Routes - Organize SMM Services by Platform
// This file handles all category-related API endpoints

const express = require('express');
const { prisma } = require('../../lib/prisma');

// Create router instance
const router = express.Router();

// 🔍 GET /api/categories - Get all categories (with pagination and filtering)
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
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Execute database query with Prisma
    const [categories, totalCount] = await Promise.all([
      prisma.serviceCategory.findMany({
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
        orderBy: [
          { sortOrder: 'asc' },
          { name: 'asc' }
        ]
      }),
      prisma.serviceCategory.count({ where })
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    
    // Send successful response with pagination metadata
    res.json({
      success: true,
      data: categories,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPreviousPage
      },
      message: `Retrieved ${categories.length} categories successfully`
    });
    
  } catch (error) {
    next(error);
  }
});

// 🔍 GET /api/categories/:id - Get category by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID',
        message: 'Category ID must be a valid string'
      });
    }
    
    // Find category in database
    const category = await prisma.serviceCategory.findUnique({
      where: { id: id.trim() },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    });
    
    // Check if category exists
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
        message: `Category with ID ${id} does not exist`
      });
    }
    
    // Send successful response
    res.json({
      success: true,
      data: category,
      message: 'Category retrieved successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// ➕ POST /api/categories - Create new category
router.post('/', async (req, res, next) => {
  try {
    const { name, description, icon, isActive, sortOrder } = req.body;
    
    // Basic validation
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Name is required',
        requiredFields: ['name'],
        receivedFields: Object.keys(req.body)
      });
    }
    
    // Check if category with this name already exists
    const existingCategory = await prisma.serviceCategory.findUnique({
      where: { name }
    });
    
    if (existingCategory) {
      return res.status(409).json({
        success: false,
        error: 'Category already exists',
        message: 'A category with this name already exists'
      });
    }
    
    // Create new category
    const newCategory = await prisma.serviceCategory.create({
      data: {
        name,
        description: description || null,
        icon: icon || null,
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder || 0
      }
    });
    
    // Send successful response
    res.status(201).json({
      success: true,
      data: newCategory,
      message: 'Category created successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// ✏️ PUT /api/categories/:id - Update category
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, icon, isActive, sortOrder } = req.body;
    
    // Validate ID format
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID',
        message: 'Category ID must be a valid string'
      });
    }
    
    // Check if category exists
    const existingCategory = await prisma.serviceCategory.findUnique({
      where: { id: id.trim() }
    });
    
    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
        message: `Category with ID ${id} does not exist`
      });
    }
    
    // Check if name conflicts with existing category (if changing)
    if (name && name !== existingCategory.name) {
      const nameConflict = await prisma.serviceCategory.findUnique({
        where: { name }
      });
      
      if (nameConflict) {
        return res.status(409).json({
          success: false,
          error: 'Name already in use',
          message: 'Another category is already using this name'
        });
      }
    }
    
    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    
    // Update category
    const updatedCategory = await prisma.serviceCategory.update({
      where: { id: id.trim() },
      data: updateData
    });
    
    // Send successful response
    res.json({
      success: true,
      data: updatedCategory,
      message: 'Category updated successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// 🗑️ DELETE /api/categories/:id - Delete category
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID',
        message: 'Category ID must be a valid string'
      });
    }
    
    // Check if category exists
    const existingCategory = await prisma.serviceCategory.findUnique({
      where: { id: id.trim() },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    });
    
    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
        message: `Category with ID ${id} does not exist`
      });
    }
    
    // Check if category has services
    if (existingCategory._count.products > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category',
        message: `Category has ${existingCategory._count.products} services and cannot be deleted`
      });
    }
    
    // Delete category
    await prisma.serviceCategory.delete({
      where: { id: id.trim() }
    });
    
    // Send successful response
    res.json({
      success: true,
      message: 'Category deleted successfully',
      deletedCategory: {
        id: existingCategory.id,
        name: existingCategory.name
      }
    });
    
  } catch (error) {
    next(error);
  }
});

// Export the router
module.exports = router;
