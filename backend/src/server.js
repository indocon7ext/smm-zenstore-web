// 🚀 SMM Platform - Express.js Backend Server
// This file sets up our complete backend server with all necessary middleware and routes

// Import required packages
const express = require('express');           // Web framework for building APIs
const cors = require('cors');                 // Cross-Origin Resource Sharing - allows frontend to talk to backend
const helmet = require('helmet');             // Security middleware - adds security headers
const morgan = require('morgan');             // HTTP request logger - helps with debugging
require('dotenv').config();                   // Load environment variables from .env file

// Import our database connection
const { prisma } = require('../lib/prisma');  // Our shared Prisma client

// Import route files (we'll create these next)
const userRoutes = require('./routes/users'); // User management routes

// Create Express application instance
const app = express();

// Set the port - use environment variable or default to 5000
const PORT = process.env.PORT || 5000;

// 🔒 SECURITY MIDDLEWARE (Applied first for security)
app.use(helmet());                           // Adds security headers to prevent common attacks

// 🌐 CORS CONFIGURATION (Allows frontend to communicate with backend)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Allow frontend domain
  credentials: true,                          // Allow cookies and authentication headers
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'] // Allowed request headers
}));

// 📝 REQUEST PARSING MIDDLEWARE (Process incoming request data)
app.use(express.json({ limit: '10mb' }));    // Parse JSON requests (max 10MB)
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded requests

// 📊 LOGGING MIDDLEWARE (Log all HTTP requests for debugging)
app.use(morgan('combined'));                 // Log format: combined (IP, date, method, URL, status, size)

// 🏠 ROOT ROUTE (Health check endpoint)
app.get('/', (req, res) => {
  res.json({
    message: '🚀 SMM Platform Backend API is running!',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 🔍 HEALTH CHECK ENDPOINT (For monitoring and testing)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: 'connected', // We'll update this to check actual DB status
    timestamp: new Date().toISOString()
  });
});

// 🛣️ API ROUTES (Organize routes by feature)
app.use('/api/users', userRoutes);           // All user-related routes start with /api/users

// 🚫 404 HANDLER (Route not found)
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.originalUrl} does not exist`,
    availableRoutes: [
      'GET /',
      'GET /health',
      'GET /api/users',
      'POST /api/users',
      'GET /api/users/:id',
      'PUT /api/users/:id',
      'DELETE /api/users/:id'
    ]
  });
});

// ⚠️ ERROR HANDLING MIDDLEWARE (Catches all errors)
app.use((error, req, res, next) => {
  console.error('🚨 Server Error:', error);
  
  // Send appropriate error response
  res.status(error.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// 🚀 START THE SERVER
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Start listening for requests
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
      console.log(`📊 API Base: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1); // Exit with error code
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the server only if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app; // Export for testing purposes
