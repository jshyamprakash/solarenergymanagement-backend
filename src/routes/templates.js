/**
 * Device Template Routes
 * API routes for device template management
 */

import express from 'express';
import { protect, restrictTo } from '../middlewares/auth.js';
import * as templateController from '../controllers/templateController.js';

const router = express.Router();

// Protect all routes - require authentication
router.use(protect);

/**
 * Template CRUD routes
 */
router
  .route('/')
  .get(templateController.getAllTemplates) // GET /api/templates
  .post(restrictTo('ADMIN'), templateController.createTemplate); // POST /api/templates (Admin only)

router
  .route('/:id')
  .get(templateController.getTemplateById) // GET /api/templates/:id
  .put(restrictTo('ADMIN'), templateController.updateTemplate) // PUT /api/templates/:id (Admin only)
  .delete(restrictTo('ADMIN'), templateController.deleteTemplate); // DELETE /api/templates/:id (Admin only)

/**
 * Get template by shortform
 */
router.get(
  '/shortform/:shortform',
  templateController.getTemplateByShortform
); // GET /api/templates/shortform/:shortform

/**
 * Template tag routes
 */
router.post(
  '/:id/tags',
  restrictTo('ADMIN'),
  templateController.addTagToTemplate
); // POST /api/templates/:id/tags (Admin only)

router.put(
  '/tags/:tagId',
  restrictTo('ADMIN'),
  templateController.updateTemplateTag
); // PUT /api/templates/tags/:tagId (Admin only)

router.delete(
  '/tags/:tagId',
  restrictTo('ADMIN'),
  templateController.deleteTemplateTag
); // DELETE /api/templates/tags/:tagId (Admin only)

/**
 * Hierarchy rules routes
 */
router.get(
  '/:id/hierarchy-rules',
  templateController.getHierarchyRules
); // GET /api/templates/:id/hierarchy-rules

router.post(
  '/hierarchy-rules',
  restrictTo('ADMIN'),
  templateController.createHierarchyRule
); // POST /api/templates/hierarchy-rules (Admin only)

router.delete(
  '/hierarchy-rules/:id',
  restrictTo('ADMIN'),
  templateController.deleteHierarchyRule
); // DELETE /api/templates/hierarchy-rules/:id (Admin only)

export default router;
