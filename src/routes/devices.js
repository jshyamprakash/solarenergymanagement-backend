/**
 * Device Routes
 * Routes for device management
 */

import express from 'express';
import * as deviceController from '../controllers/deviceController.js';
import * as alarmController from '../controllers/alarmController.js';
import { protect, restrictTo } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import {
  createDeviceSchema,
  createDeviceFromTemplateSchema,
  updateDeviceSchema,
  getDeviceSchema,
  deleteDeviceSchema,
  listDevicesSchema,
  getDeviceHierarchySchema,
  getDeviceChildrenSchema,
} from '../validators/deviceValidators.js';
import { getDeviceAlarmsSchema } from '../validators/alarmValidators.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/devices/hierarchy/:plantId
 * @desc    Get device hierarchy for a plant
 * @access  Private
 */
router.get(
  '/hierarchy/:plantId',
  validate(getDeviceHierarchySchema),
  deviceController.getDeviceHierarchy
);

/**
 * @route   GET /api/devices/:id/children
 * @desc    Get device children
 * @access  Private
 */
router.get(
  '/:id/children',
  validate(getDeviceChildrenSchema),
  deviceController.getDeviceChildren
);

/**
 * @route   POST /api/devices/from-template
 * @desc    Create a new device from template
 * @access  Private (ADMIN, PLANT_MANAGER)
 */
router.post(
  '/from-template',
  restrictTo('ADMIN', 'PLANT_MANAGER'),
  validate(createDeviceFromTemplateSchema),
  deviceController.createDeviceFromTemplate
);

/**
 * @route   POST /api/devices
 * @desc    Create a new device
 * @access  Private (ADMIN, PLANT_MANAGER)
 */
router.post(
  '/',
  restrictTo('ADMIN', 'PLANT_MANAGER'),
  validate(createDeviceSchema),
  deviceController.createDevice
);

/**
 * @route   GET /api/devices
 * @desc    Get all devices with filters and pagination
 * @access  Private
 */
router.get(
  '/',
  validate(listDevicesSchema),
  deviceController.getAllDevices
);

/**
 * @route   GET /api/devices/:id
 * @desc    Get device by ID
 * @access  Private
 */
router.get(
  '/:id',
  validate(getDeviceSchema),
  deviceController.getDeviceById
);

/**
 * @route   PUT /api/devices/:id
 * @desc    Update device
 * @access  Private (ADMIN, PLANT_MANAGER)
 */
router.put(
  '/:id',
  restrictTo('ADMIN', 'PLANT_MANAGER'),
  validate(updateDeviceSchema),
  deviceController.updateDevice
);

/**
 * @route   DELETE /api/devices/:id
 * @desc    Delete device
 * @access  Private (ADMIN)
 */
router.delete(
  '/:id',
  restrictTo('ADMIN'),
  validate(deleteDeviceSchema),
  deviceController.deleteDevice
);

/**
 * @route   GET /api/devices/:deviceId/alarms
 * @desc    Get alarms for a specific device
 * @access  Private
 */
router.get('/:deviceId/alarms', validate(getDeviceAlarmsSchema), alarmController.getDeviceAlarms);

export default router;
