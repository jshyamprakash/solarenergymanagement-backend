/**
 * Configuration Index
 * Centralized configuration exports
 */

import dotenv from 'dotenv';
dotenv.config();

export default {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL,
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },

  // Mock Data Configuration
  mockData: {
    enabled: process.env.USE_MOCK_DATA === 'true',
    generateRealtime: process.env.GENERATE_MOCK_REALTIME === 'true',
  },

  // AWS Configuration
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accountId: process.env.AWS_ACCOUNT_ID,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    iot: {
      endpoint: process.env.AWS_IOT_ENDPOINT,
      roleArn: process.env.AWS_IOT_ROLE_ARN,
    },
    sqs: {
      queueUrl: process.env.AWS_SQS_QUEUE_URL,
      queueArn: process.env.AWS_SQS_QUEUE_ARN,
    },
  },

  // WebSocket Configuration
  websocket: {
    enabled: process.env.ENABLE_WEBSOCKET === 'true',
    port: process.env.WEBSOCKET_PORT || 3001,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
