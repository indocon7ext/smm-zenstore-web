// 🗄️ Prisma Client for Backend
// This file creates a shared Prisma client instance for the backend

const { PrismaClient } = require('@prisma/client');

// Create global Prisma instance to prevent multiple instances during hot reload
const globalForPrisma = globalThis;

// Check if we already have a Prisma instance
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    errorFormat: 'pretty',
  });
}

// Export the Prisma client
const prisma = globalForPrisma.prisma;

// Test database connection
prisma.$connect().catch((error) => {
  console.error('❌ Failed to connect to database:', error);
});

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = { prisma };
