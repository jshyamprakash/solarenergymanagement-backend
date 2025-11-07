/**
 * Alarm Routes
 * API routes for alarm management
 */

import express from 'express';
const router = express.Router();
import * as alarmController from '../controllers/alarmController.js';
import { protect, restrictTo } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import {
  createAlarmSchema,
  acknowledgeAlarmSchema,
  resolveAlarmSchema,
  getAlarmByIdSchema,
  getAllAlarmsSchema,
  getAlarmStatisticsSchema,
} from '../validators/alarmValidators.js';

// All alarm routes require authentication
router.use(protect);

/**
 * @route   GET /api/alarms
 * @desc    Get all alarms with filters and pagination
 * @access  Private (All authenticated users)
 */
router.get(
  '/',
  validate(getAllAlarmsSchema),
  alarmController.getAllAlarms
);

/**
 * @route   GET /api/alarms/statistics
 * @desc    Get alarm statistics
 * @access  Private (All authenticated users)
 */
router.get(
  '/statistics',
  validate(getAlarmStatisticsSchema),
  alarmController.getAlarmStatistics
);

/**
 * @route   GET /api/alarms/:id
 * @desc    Get alarm by ID
 * @access  Private (All authenticated users)
 */
router.get(
  '/:id',
  validate(getAlarmByIdSchema),
  alarmController.getAlarmById
);

/**
 * @route   POST /api/alarms
 * @desc    Create a new alarm (typically called by system)
 * @access  Private (Admin, Plant Manager)
 */
router.post(
  '/',
  restrictTo('ADMIN', 'PLANT_MANAGER'),
  validate(createAlarmSchema),
  alarmController.createAlarm
);

/**
 * @route   PUT /api/alarms/:id/acknowledge
 * @desc    Acknowledge an alarm
 * @access  Private (Admin, Plant Manager)
 */
router.put(
  '/:id/acknowledge',
  restrictTo('ADMIN', 'PLANT_MANAGER'),
  validate(acknowledgeAlarmSchema),
  alarmController.acknowledgeAlarm
);

/**
 * @route   PUT /api/alarms/:id/resolve
 * @desc    Resolve an alarm
 * @access  Private (Admin, Plant Manager)
 */
router.put(
  '/:id/resolve',
  restrictTo('ADMIN', 'PLANT_MANAGER'),
  validate(resolveAlarmSchema),
  alarmController.resolveAlarm
);

export default router;
