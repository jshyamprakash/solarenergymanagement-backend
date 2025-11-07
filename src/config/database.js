/**
 * Database Configuration
 * Prisma Client instance with connection management
 */

import { PrismaClient } from '@prisma/client';
import logger from './logger.js';

// Initialize Prisma Client with logging configuration
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug('Query: ' + e.query);
    logger.debug('Duration: ' + e.duration + 'ms');
  });
}

/**
 * Test database connection
 */
async function testConnection() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
    return true;
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    return false;
  }
}

/**
 * Graceful shutdown
 */
async function disconnect() {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
  }
}

export { prisma, testConnection, disconnect };
