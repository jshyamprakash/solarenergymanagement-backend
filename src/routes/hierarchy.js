/**
 * Hierarchy Routes
 * Routes for device hierarchy management
 */

import express from 'express';
import * as hierarchyController from '../controllers/hierarchyController.js';
import { protect, restrictTo } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import {
  getPlantHierarchyTreeSchema,
  getHierarchyStatsSchema,
  moveDeviceSchema,
  getDevicePathSchema,
  validateHierarchySchema,
  getDeviceSiblingsSchema,
} from '../validators/hierarchyValidators.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ============================================
// PLANT HIERARCHY ROUTES
// ============================================

/**
 * GET /api/hierarchy/plants/:plantId/tree
 * Get complete hierarchy tree for a plant
 */
router.get(
  '/plants/:plantId/tree',
  validate(getPlantHierarchyTreeSchema),
  hierarchyController.getPlantHierarchyTree
);

/**
 * GET /api/hierarchy/plants/:plantId/stats
 * Get hierarchy statistics
 */
router.get(
  '/plants/:plantId/stats',
  validate(getHierarchyStatsSchema),
  hierarchyController.getHierarchyStats
);

/**
 * GET /api/hierarchy/plants/:plantId/validate
 * Validate plant hierarchy for issues
 */
router.get(
  '/plants/:plantId/validate',
  validate(validateHierarchySchema),
  hierarchyController.validateHierarchy
);

// ============================================
// DEVICE HIERARCHY ROUTES
// ============================================

/**
 * PUT /api/hierarchy/devices/:deviceId/move
 * Move device to new parent (ADMIN, PLANT_MANAGER only)
 */
router.put(
  '/devices/:deviceId/move',
  restrictTo('ADMIN', 'PLANT_MANAGER'),
  validate(moveDeviceSchema),
  hierarchyController.moveDevice
);

/**
 * GET /api/hierarchy/devices/:deviceId/path
 * Get device path (breadcrumb)
 */
router.get(
  '/devices/:deviceId/path',
  validate(getDevicePathSchema),
  hierarchyController.getDevicePath
);

/**
 * GET /api/hierarchy/devices/:deviceId/siblings
 * Get device siblings
 */
router.get(
  '/devices/:deviceId/siblings',
  validate(getDeviceSiblingsSchema),
  hierarchyController.getDeviceSiblings
);

export default router;
