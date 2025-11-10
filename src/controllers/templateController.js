/**
 * Device Template Controller
 * HTTP handlers for device template endpoints
 */

import * as templateService from '../services/templateService.js';
import asyncHandler from '../middlewares/asyncHandler.js';

/**
 * @route   GET /api/templates
 * @desc    Get all device templates
 * @access  Private
 */
const getAllTemplates = asyncHandler(async (req, res) => {
  const result = await templateService.getAllTemplates(req.query);

  res.json({
    success: true,
    data: result.templates,
    pagination: result.pagination,
  });
});

/**
 * @route   GET /api/templates/:id
 * @desc    Get device template by ID
 * @access  Private
 */
const getTemplateById = asyncHandler(async (req, res) => {
  const template = await templateService.getTemplateById(req.params.id);

  res.json({
    success: true,
    data: template,
  });
});

/**
 * @route   GET /api/templates/shortform/:shortform
 * @desc    Get device template by shortform
 * @access  Private
 */
const getTemplateByShortform = asyncHandler(async (req, res) => {
  const template = await templateService.getTemplateByShortform(req.params.shortform);

  res.json({
    success: true,
    data: template,
  });
});

/**
 * @route   POST /api/templates
 * @desc    Create a new device template
 * @access  Private (ADMIN only)
 */
const createTemplate = asyncHandler(async (req, res) => {
  const template = await templateService.createTemplate(
    req.body,
    req.user.id,
    req.user.role
  );

  res.status(201).json({
    success: true,
    data: template,
    message: 'Device template created successfully',
  });
});

/**
 * @route   PUT /api/templates/:id
 * @desc    Update device template
 * @access  Private (ADMIN only)
 */
const updateTemplate = asyncHandler(async (req, res) => {
  const template = await templateService.updateTemplate(
    req.params.id,
    req.body,
    req.user.id,
    req.user.role
  );

  res.json({
    success: true,
    data: template,
    message: 'Device template updated successfully',
  });
});

/**
 * @route   DELETE /api/templates/:id
 * @desc    Delete device template
 * @access  Private (ADMIN only)
 */
const deleteTemplate = asyncHandler(async (req, res) => {
  const result = await templateService.deleteTemplate(
    req.params.id,
    req.user.id,
    req.user.role
  );

  res.json({
    success: true,
    message: result.message,
  });
});

/**
 * @route   POST /api/templates/:id/tags
 * @desc    Add tag to device template
 * @access  Private (ADMIN only)
 */
const addTagToTemplate = asyncHandler(async (req, res) => {
  const tag = await templateService.addTagToTemplate(
    req.params.id,
    req.body,
    req.user.id,
    req.user.role
  );

  res.status(201).json({
    success: true,
    data: tag,
    message: 'Tag added to template successfully',
  });
});

/**
 * @route   PUT /api/templates/tags/:tagId
 * @desc    Update template tag
 * @access  Private (ADMIN only)
 */
const updateTemplateTag = asyncHandler(async (req, res) => {
  const tag = await templateService.updateTemplateTag(
    req.params.tagId,
    req.body,
    req.user.id,
    req.user.role
  );

  res.json({
    success: true,
    data: tag,
    message: 'Template tag updated successfully',
  });
});

/**
 * @route   DELETE /api/templates/tags/:tagId
 * @desc    Delete template tag
 * @access  Private (ADMIN only)
 */
const deleteTemplateTag = asyncHandler(async (req, res) => {
  const result = await templateService.deleteTemplateTag(
    req.params.tagId,
    req.user.id,
    req.user.role
  );

  res.json({
    success: true,
    message: result.message,
  });
});

/**
 * @route   GET /api/templates/:id/hierarchy-rules
 * @desc    Get hierarchy rules for template
 * @access  Private
 */
const getHierarchyRules = asyncHandler(async (req, res) => {
  const rules = await templateService.getHierarchyRules(req.params.id);

  res.json({
    success: true,
    data: rules,
  });
});

/**
 * @route   POST /api/templates/hierarchy-rules
 * @desc    Create hierarchy rule
 * @access  Private (ADMIN only)
 */
const createHierarchyRule = asyncHandler(async (req, res) => {
  const rule = await templateService.createHierarchyRule(
    req.body,
    req.user.id,
    req.user.role
  );

  res.status(201).json({
    success: true,
    data: rule,
    message: 'Hierarchy rule created successfully',
  });
});

/**
 * @route   DELETE /api/templates/hierarchy-rules/:id
 * @desc    Delete hierarchy rule
 * @access  Private (ADMIN only)
 */
const deleteHierarchyRule = asyncHandler(async (req, res) => {
  const result = await templateService.deleteHierarchyRule(
    req.params.id,
    req.user.id,
    req.user.role
  );

  res.json({
    success: true,
    message: result.message,
  });
});

export {
  getAllTemplates,
  getTemplateById,
  getTemplateByShortform,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  addTagToTemplate,
  updateTemplateTag,
  deleteTemplateTag,
  getHierarchyRules,
  createHierarchyRule,
  deleteHierarchyRule,
};
