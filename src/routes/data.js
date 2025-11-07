import express from 'express';
import * as dataController from '../controllers/dataController.js';
import { protect } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import {
  getPlantRealtimeDataSchema,
  getPlantHistoricalDataSchema,
  getDeviceRealtimeDataSchema,
  getDeviceHistoricalDataSchema,
  getTagHistoricalDataSchema,
  getPlantDataStatsSchema,
} from '../validators/dataValidators.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Plant data routes
router.get(
  '/plants/:plantId/realtime',
  validate(getPlantRealtimeDataSchema),
  dataController.getPlantRealtimeData
);

router.get(
  '/plants/:plantId/historical',
  validate(getPlantHistoricalDataSchema),
  dataController.getPlantHistoricalData
);

router.get(
  '/plants/:plantId/stats',
  validate(getPlantDataStatsSchema),
  dataController.getPlantDataStats
);

// Device data routes
router.get(
  '/devices/:deviceId/realtime',
  validate(getDeviceRealtimeDataSchema),
  dataController.getDeviceRealtimeData
);

router.get(
  '/devices/:deviceId/historical',
  validate(getDeviceHistoricalDataSchema),
  dataController.getDeviceHistoricalData
);

// Tag data routes
router.get(
  '/tags/:tagId/historical',
  validate(getTagHistoricalDataSchema),
  dataController.getTagHistoricalData
);

export default router;
