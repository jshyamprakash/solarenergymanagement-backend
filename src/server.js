/**
 * Solar Energy Monitoring System - Backend Server
 * Main entry point for the application
 */

import app from './app.js';
import config from './config/index.js';
import logger from './config/logger.js';
import { testConnection, disconnect } from './config/database.js';

const PORT = config.server.port;
const HOST = config.server.host;

// ============================================
// SERVER STARTUP
// ============================================

async function startServer() {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      logger.warn('⚠️  Database connection failed. Server will start but some features may not work.');
      logger.warn('⚠️  Make sure PostgreSQL is running and DATABASE_URL is configured correctly.');
    }

    // Start Express server
    const server = app.listen(PORT, HOST, () => {
      logger.info('='.repeat(60));
      logger.info('🚀 Solar Energy Monitoring System - Backend API');
      logger.info('='.repeat(60));
      logger.info(`📡 Server running at http://${HOST}:${PORT}`);
      logger.info(`🌍 Environment: ${config.server.nodeEnv}`);
      logger.info(`🎭 Mock Data: ${config.mockData.enabled ? 'ENABLED' : 'DISABLED'}`);
      logger.info(`📊 Health check: http://${HOST}:${PORT}/health`);
      logger.info('='.repeat(60));

      if (config.mockData.enabled) {
        logger.info('ℹ️  Running in MOCK DATA mode for development');
        logger.info('ℹ️  Set USE_MOCK_DATA=false in .env for production');
      }

      if (!dbConnected) {
        logger.warn('');
        logger.warn('⚠️  DATABASE NOT CONNECTED');
        logger.warn('⚠️  To connect the database:');
        logger.warn('   1. Ensure PostgreSQL is running');
        logger.warn('   2. Configure DATABASE_URL in .env file');
        logger.warn('   3. Run: npm run prisma:migrate');
        logger.warn('   4. Run: npm run prisma:seed');
        logger.warn('');
      }
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        // Disconnect from database
        await disconnect();

        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();
