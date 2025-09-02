// 👥 User Management Routes - Complete CRUD Operations
// This file handles all user-related API endpoints

const express = require('express');
const { prisma } = require('../../lib/prisma'); // Our shared Prisma client

// Create router instance
const router = express.Router();

// 🔍 GET /api/users - Get all users (with pagination and filtering)
router.get('/', async (req, res, next) => {
  try {
    // Extract query parameters for pagination and filtering
    const page = parseInt(req.query.page) || 1;        // Page number (default: 1)
    const limit = parseInt(req.query.limit) || 10;     // Items per page (default: 10)
    const role = req.query.role;                       // Filter by role (ADMIN, CUSTOMER, etc.)
    const isActive = req.query.isActive;               // Filter by active status
    
    // Calculate pagination values
    const skip = (page - 1) * limit;                   // How many items to skip
    
    // Build where clause for filtering
    const where = {};
    if (role) where.role = role;                       // Add role filter if provided
    if (isActive !== undefined) where.isActive = isActive === 'true'; // Add active filter if provided
    
    // Execute database query with Prisma
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,                                           // Apply filters
        skip,                                           // Skip items for pagination
        take: limit,                                    // Take only limit items
        select: {                                       // Select only necessary fields (security)
          id: true,
          email: true,
          name: true,
          role: true,
          balance: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' }                  // Sort by newest first
      }),
      prisma.user.count({ where })                      // Count total matching users
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    
    // Send successful response with pagination metadata
    res.json({
      success: true,
      data: users,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPreviousPage
      },
      message: `Retrieved ${users.length} users successfully`
    });
    
  } catch (error) {
    next(error); // Pass error to error handling middleware
  }
});

// 🔍 GET /api/users/:id - Get user by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;                         // Extract user ID from URL
    
    // Validate ID format (basic validation)
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        message: 'User ID must be a valid string'
      });
    }
    
    // Check if ID looks like a valid database ID (basic format check)
    // Allow alphanumeric IDs of reasonable length (including test IDs like "99999")
    // But reject obviously invalid formats like "invalid-id"
    const idRegex = /^[a-z0-9]{1,}$/i; // Must be alphanumeric, any length
    if (!idRegex.test(id.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        message: 'User ID must be in valid format'
      });
    }
    
    // Find user in database
    const user = await prisma.user.findUnique({
      where: { id: id.trim() },
      select: {                                         // Select only necessary fields
        id: true,
        email: true,
        name: true,
        role: true,
        balance: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Check if user exists
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: `User with ID ${id} does not exist`
      });
    }
    
    // Send successful response
    res.json({
      success: true,
      data: user,
      message: 'User retrieved successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// ➕ POST /api/users - Create new user
router.post('/', async (req, res, next) => {
  try {
    const { email, name, role, balance, isActive } = req.body; // Extract data from request body
    
    // Basic validation
    if (!email || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Email and name are required',
        requiredFields: ['email', 'name'],
        receivedFields: Object.keys(req.body)
      });
    }
    
    // Email format validation (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        message: 'Please provide a valid email address'
      });
    }
    
    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        message: 'A user with this email already exists'
      });
    }
    
    // Create new user with Prisma
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        role: role || 'CUSTOMER',                       // Default role if not provided
        balance: balance || 0,                          // Default balance if not provided
        isActive: isActive !== undefined ? isActive : true // Default active status
      },
      select: {                                         // Select only necessary fields
        id: true,
        email: true,
        name: true,
        role: true,
        balance: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Send successful response
    res.status(201).json({
      success: true,
      data: newUser,
      message: 'User created successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// ✏️ PUT /api/users/:id - Update user
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;                         // Extract user ID from URL
    const { email, name, role, balance, isActive } = req.body; // Extract update data
    
    // Validate ID format
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        message: 'User ID must be a valid string'
      });
    }
    
    // Check if ID looks like a valid database ID (basic format check)
    // Allow alphanumeric IDs of reasonable length (including test IDs like "99999")
    // But reject obviously invalid formats like "invalid-id"
    const idRegex = /^[a-z0-9]{1,}$/i; // Must be alphanumeric, any length
    if (!idRegex.test(id.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        message: 'User ID must be in valid format'
      });
    }
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: id.trim() }
    });
    
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: `User with ID ${id} does not exist`
      });
    }
    
    // Email validation if email is being updated
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format',
          message: 'Please provide a valid email address'
        });
      }
      
      // Check if new email conflicts with existing user
      if (email !== existingUser.email) {
        const emailConflict = await prisma.user.findUnique({
          where: { email }
        });
        
        if (emailConflict) {
          return res.status(409).json({
            success: false,
            error: 'Email already in use',
            message: 'Another user is already using this email'
          });
        }
      }
    }
    
    // Prepare update data (only include fields that are provided)
    const updateData = {};
    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (balance !== undefined) updateData.balance = balance;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Update user with Prisma
    const updatedUser = await prisma.user.update({
      where: { id: id.trim() },
      data: updateData,
      select: {                                         // Select only necessary fields
        id: true,
        email: true,
        name: true,
        role: true,
        balance: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Send successful response
    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// 🗑️ DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;                         // Extract user ID from URL
    
    // Validate ID format
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        message: 'User ID must be a valid string'
      });
    }
    
    // Check if ID looks like a valid database ID (basic format check)
    // Allow alphanumeric IDs of reasonable length (including test IDs like "99999")
    // But reject obviously invalid formats like "invalid-id"
    const idRegex = /^[a-z0-9]{1,}$/i; // Must be alphanumeric, any length
    if (!idRegex.test(id.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        message: 'User ID must be in valid format'
      });
    }
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: id.trim() }
    });
    
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: `User with ID ${id} does not exist`
      });
    }
    
    // Delete user with Prisma
    await prisma.user.delete({
      where: { id: id.trim() }
    });
    
    // Send successful response
    res.json({
      success: true,
      message: 'User deleted successfully',
      deletedUser: {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name
      }
    });
    
  } catch (error) {
    next(error);
  }
});

// Export the router
module.exports = router;
