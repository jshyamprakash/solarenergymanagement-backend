/**
 * Tag Controller
 * HTTP handlers for tag management endpoints
 */

import * as tagService from '../services/tagService.js';
import asyncHandler from '../middlewares/asyncHandler.js';

/**
 * @route   POST /api/tags
 * @desc    Create a new tag
 * @access  Private (ADMIN, PLANT_MANAGER)
 */
const createTag = asyncHandler(async (req, res) => {
  const tag = await tagService.createTag(req.body, req.user.id, req.user.role);

  res.status(201).json({
    success: true,
    data: tag,
    message: 'Tag created successfully',
  });
});

/**
 * @route   GET /api/tags
 * @desc    Get all tags with filters and pagination
 * @access  Private
 */
const getAllTags = asyncHandler(async (req, res) => {
  const result = await tagService.getAllTags(req.query, req.user.id, req.user.role);

  res.json({
    success: true,
    data: result.tags,
    pagination: result.pagination,
  });
});

/**
 * @route   GET /api/tags/:id
 * @desc    Get tag by ID
 * @access  Private
 */
const getTagById = asyncHandler(async (req, res) => {
  const tag = await tagService.getTagById(req.params.id, req.user.id, req.user.role);

  res.json({
    success: true,
    data: tag,
  });
});

/**
 * @route   PUT /api/tags/:id
 * @desc    Update tag
 * @access  Private (ADMIN, PLANT_MANAGER)
 */
const updateTag = asyncHandler(async (req, res) => {
  const tag = await tagService.updateTag(req.params.id, req.body, req.user.id, req.user.role);

  res.json({
    success: true,
    data: tag,
    message: 'Tag updated successfully',
  });
});

/**
 * @route   DELETE /api/tags/:id
 * @desc    Delete tag
 * @access  Private (ADMIN, PLANT_MANAGER)
 */
const deleteTag = asyncHandler(async (req, res) => {
  const result = await tagService.deleteTag(req.params.id, req.user.id, req.user.role);

  res.json({
    success: true,
    message: result.message,
  });
});

/**
 * @route   GET /api/devices/:deviceId/tags
 * @desc    Get all tags for a device
 * @access  Private
 */
const getDeviceTags = asyncHandler(async (req, res) => {
  const tags = await tagService.getDeviceTags(
    req.params.deviceId,
    req.user.id,
    req.user.role
  );

  res.json({
    success: true,
    data: tags,
  });
});

/**
 * @route   POST /api/devices/:deviceId/tags/bulk
 * @desc    Bulk create tags for a device
 * @access  Private (ADMIN, PLANT_MANAGER)
 */
const bulkCreateTags = asyncHandler(async (req, res) => {
  const tags = await tagService.bulkCreateTags(
    req.params.deviceId,
    req.body.tags,
    req.user.id,
    req.user.role
  );

  res.status(201).json({
    success: true,
    data: tags,
    message: `${tags.length} tags created successfully`,
  });
});

/**
 * @route   GET /api/devices/:deviceId/tags/stats
 * @desc    Get tag statistics for a device
 * @access  Private
 */
const getDeviceTagStats = asyncHandler(async (req, res) => {
  const stats = await tagService.getDeviceTagStats(
    req.params.deviceId,
    req.user.id,
    req.user.role
  );

  res.json({
    success: true,
    data: stats,
  });
});

/**
 * @route   GET /api/tags/:id/data
 * @desc    Get recent data for a tag
 * @access  Private
 */
const getTagRecentData = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const data = await tagService.getTagRecentData(
    req.params.id,
    limit,
    req.user.id,
    req.user.role
  );

  res.json({
    success: true,
    data,
  });
});

/**
 * @route   GET /api/tags/search
 * @desc    Search tags by name
 * @access  Private
 */
const searchTags = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Search term must be at least 2 characters',
    });
  }

  const tags = await tagService.searchTags(q, req.user.id, req.user.role);

  res.json({
    success: true,
    data: tags,
  });
});

export {
  createTag,
  getAllTags,
  getTagById,
  updateTag,
  deleteTag,
  getDeviceTags,
  bulkCreateTags,
  getDeviceTagStats,
  getTagRecentData,
  searchTags,
};
