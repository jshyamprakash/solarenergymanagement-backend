/**
 * Tag Routes
 * Routes for tag management
 */

import express from 'express';
import * as tagController from '../controllers/tagController.js';
import { protect, restrictTo } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import {
  createTagSchema,
  updateTagSchema,
  getTagSchema,
  deleteTagSchema,
  listTagsSchema,
  getDeviceTagsSchema,
  bulkCreateTagsSchema,
  getDeviceTagStatsSchema,
  getTagRecentDataSchema,
  searchTagsSchema,
} from '../validators/tagValidators.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ============================================
// TAG CRUD ROUTES
// ============================================

/**
 * GET /api/tags
 * Get all tags with filters and pagination
 */
router.get('/', validate(listTagsSchema), tagController.getAllTags);

/**
 * POST /api/tags
 * Create a new tag (ADMIN, PLANT_MANAGER only)
 */
router.post(
  '/',
  restrictTo('ADMIN', 'PLANT_MANAGER'),
  validate(createTagSchema),
  tagController.createTag
);

/**
 * GET /api/tags/search
 * Search tags by name
 */
router.get('/search', validate(searchTagsSchema), tagController.searchTags);

/**
 * GET /api/tags/:id
 * Get tag by ID
 */
router.get('/:id', validate(getTagSchema), tagController.getTagById);

/**
 * PUT /api/tags/:id
 * Update tag (ADMIN, PLANT_MANAGER only)
 */
router.put(
  '/:id',
  restrictTo('ADMIN', 'PLANT_MANAGER'),
  validate(updateTagSchema),
  tagController.updateTag
);

/**
 * DELETE /api/tags/:id
 * Delete tag (ADMIN, PLANT_MANAGER only)
 */
router.delete(
  '/:id',
  restrictTo('ADMIN', 'PLANT_MANAGER'),
  validate(deleteTagSchema),
  tagController.deleteTag
);

/**
 * GET /api/tags/:id/data
 * Get recent data for a tag
 */
router.get('/:id/data', validate(getTagRecentDataSchema), tagController.getTagRecentData);

// ============================================
// DEVICE TAG ROUTES
// ============================================

/**
 * GET /api/devices/:deviceId/tags
 * Get all tags for a device
 */
router.get(
  '/devices/:deviceId/tags',
  validate(getDeviceTagsSchema),
  tagController.getDeviceTags
);

/**
 * POST /api/devices/:deviceId/tags/bulk
 * Bulk create tags for a device (ADMIN, PLANT_MANAGER only)
 */
router.post(
  '/devices/:deviceId/tags/bulk',
  restrictTo('ADMIN', 'PLANT_MANAGER'),
  validate(bulkCreateTagsSchema),
  tagController.bulkCreateTags
);

/**
 * GET /api/devices/:deviceId/tags/stats
 * Get tag statistics for a device
 */
router.get(
  '/devices/:deviceId/tags/stats',
  validate(getDeviceTagStatsSchema),
  tagController.getDeviceTagStats
);

export default router;
