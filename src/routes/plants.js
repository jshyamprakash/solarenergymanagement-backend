/**
 * Plant Routes
 * Defines plant API endpoints
 */

import express from 'express';
import * as plantController from '../controllers/plantController.js';
import * as alarmController from '../controllers/alarmController.js';
import { protect, restrictTo } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import {
  createPlantSchema,
  updatePlantSchema,
  getPlantSchema,
  deletePlantSchema,
  listPlantsSchema,
  getPlantStatsSchema,
} from '../validators/plantValidators.js';
import { getPlantAlarmsSchema } from '../validators/alarmValidators.js';

const router = express.Router();

// All plant routes require authentication
router.use(protect);

/**
 * @route   GET /api/plants
 * @desc    Get all plants with filters and pagination
 * @access  Private
 */
router.get('/', validate(listPlantsSchema), plantController.getAllPlants);

/**
 * @route   POST /api/plants
 * @desc    Create a new plant
 * @access  Private (Admin, Plant Manager)
 */
router.post(
  '/',
  restrictTo('ADMIN', 'PLANT_MANAGER'),
  validate(createPlantSchema),
  plantController.createPlant
);

/**
 * @route   GET /api/plants/:id
 * @desc    Get plant by ID
 * @access  Private
 */
router.get('/:id', validate(getPlantSchema), plantController.getPlantById);

/**
 * @route   PUT /api/plants/:id
 * @desc    Update plant
 * @access  Private (Admin, Plant Manager - own plants only)
 */
router.put(
  '/:id',
  restrictTo('ADMIN', 'PLANT_MANAGER'),
  validate(updatePlantSchema),
  plantController.updatePlant
);

/**
 * @route   DELETE /api/plants/:id
 * @desc    Delete plant
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  restrictTo('ADMIN'),
  validate(deletePlantSchema),
  plantController.deletePlant
);

/**
 * @route   GET /api/plants/:id/stats
 * @desc    Get plant statistics
 * @access  Private
 */
router.get('/:id/stats', validate(getPlantStatsSchema), plantController.getPlantStats);

/**
 * @route   GET /api/plants/:plantId/alarms
 * @desc    Get alarms for a specific plant
 * @access  Private
 */
router.get('/:plantId/alarms', validate(getPlantAlarmsSchema), alarmController.getPlantAlarms);

export default router;
