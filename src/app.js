/**
 * Express Application Configuration
 * Main application setup with middleware and routes
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/index.js';
import logger from './config/logger.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import plantRoutes from './routes/plants.js';
import deviceRoutes from './routes/devices.js';
import templateRoutes from './routes/templates.js';
import alarmRoutes from './routes/alarms.js';
import hierarchyRoutes from './routes/hierarchy.js';
import tagRoutes from './routes/tags.js';
import dataRoutes from './routes/data.js';
// AUDIT LOG - COMMENTED OUT (Enable when needed)
// import auditRoutes from './routes/audit.js';
import reportRoutes from './routes/reports.js';
import userPlantMapRoutes from './routes/userPlantMapRoutes.js';
import errorHandler from './middlewares/errorHandler.js';

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet());

// CORS
app.use(cors(config.cors));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
if (config.server.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
}

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
    version: '1.0.0',
    mockData: config.mockData.enabled,
  });
});

// ============================================
// API ROUTES
// ============================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Solar Energy Monitoring System API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api/docs',
    health: '/health',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/plants', plantRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/alarms', alarmRoutes);
app.use('/api/hierarchy', hierarchyRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/data', dataRoutes);
// AUDIT LOG - COMMENTED OUT (Enable when needed)
// app.use('/api/audit', auditRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/user-plant-map', userPlantMapRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;
