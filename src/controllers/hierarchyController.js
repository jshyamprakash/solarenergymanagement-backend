/**
 * Hierarchy Controller
 * HTTP handlers for hierarchy management endpoints
 */

import * as hierarchyService from '../services/hierarchyService.js';
import asyncHandler from '../middlewares/asyncHandler.js';

/**
 * @route   GET /api/plants/:plantId/hierarchy/tree
 * @desc    Get complete hierarchy tree for a plant
 * @access  Private
 */
const getPlantHierarchyTree = asyncHandler(async (req, res) => {
  const { plantId } = req.params;
  const tree = await hierarchyService.getPlantHierarchyTree(
    plantId,
    req.user.id,
    req.user.role
  );

  res.json({
    success: true,
    data: tree,
  });
});

/**
 * @route   GET /api/plants/:plantId/hierarchy/stats
 * @desc    Get hierarchy statistics
 * @access  Private
 */
const getHierarchyStats = asyncHandler(async (req, res) => {
  const { plantId } = req.params;
  const stats = await hierarchyService.getHierarchyStats(
    plantId,
    req.user.id,
    req.user.role
  );

  res.json({
    success: true,
    data: stats,
  });
});

/**
 * @route   PUT /api/devices/:deviceId/move
 * @desc    Move device to new parent
 * @access  Private (ADMIN, PLANT_MANAGER)
 */
const moveDevice = asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  const { newParentId } = req.body;

  const device = await hierarchyService.moveDevice(
    deviceId,
    newParentId,
    req.user.id,
    req.user.role
  );

  res.json({
    success: true,
    data: device,
    message: 'Device moved successfully',
  });
});

/**
 * @route   GET /api/devices/:deviceId/path
 * @desc    Get device path (breadcrumb from root)
 * @access  Private
 */
const getDevicePath = asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  const path = await hierarchyService.getDevicePath(
    deviceId,
    req.user.id,
    req.user.role
  );

  res.json({
    success: true,
    data: path,
  });
});

/**
 * @route   GET /api/plants/:plantId/hierarchy/validate
 * @desc    Validate plant hierarchy for issues
 * @access  Private
 */
const validateHierarchy = asyncHandler(async (req, res) => {
  const { plantId } = req.params;
  const validation = await hierarchyService.validateHierarchy(
    plantId,
    req.user.id,
    req.user.role
  );

  res.json({
    success: true,
    data: validation,
  });
});

/**
 * @route   GET /api/devices/:deviceId/siblings
 * @desc    Get device siblings (devices with same parent)
 * @access  Private
 */
const getDeviceSiblings = asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  const siblings = await hierarchyService.getDeviceSiblings(
    deviceId,
    req.user.id,
    req.user.role
  );

  res.json({
    success: true,
    data: siblings,
  });
});

export {
  getPlantHierarchyTree,
  getHierarchyStats,
  moveDevice,
  getDevicePath,
  validateHierarchy,
  getDeviceSiblings,
};
