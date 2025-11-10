/**
 * Device Controller
 * HTTP handlers for device endpoints
 */

import * as deviceService from '../services/deviceService.js';
import asyncHandler from '../middlewares/asyncHandler.js';

/**
 * @route   POST /api/devices
 * @desc    Create a new device
 * @access  Private (ADMIN, PLANT_MANAGER)
 */
const createDevice = asyncHandler(async (req, res) => {
  const device = await deviceService.createDevice(
    req.body,
    req.user.id,
    req.user.role
  );

  res.status(201).json({
    success: true,
    data: device,
    message: 'Device created successfully',
  });
});

/**
 * @route   POST /api/devices/from-template
 * @desc    Create a new device from template
 * @access  Private (ADMIN, PLANT_MANAGER)
 */
const createDeviceFromTemplate = asyncHandler(async (req, res) => {
  const device = await deviceService.createDeviceFromTemplate(
    req.body,
    req.user.id,
    req.user.role
  );

  res.status(201).json({
    success: true,
    data: device,
    message: 'Device created successfully from template',
  });
});

/**
 * @route   GET /api/devices
 * @desc    Get all devices with filters and pagination
 * @access  Private
 */
const getAllDevices = asyncHandler(async (req, res) => {
  const result = await deviceService.getAllDevices(
    req.query,
    req.user.id,
    req.user.role
  );

  res.json({
    success: true,
    data: result.devices,
    pagination: result.pagination,
  });
});

/**
 * @route   GET /api/devices/:id
 * @desc    Get device by ID
 * @access  Private
 */
const getDeviceById = asyncHandler(async (req, res) => {
  const device = await deviceService.getDeviceById(
    req.params.id,
    req.user.id,
    req.user.role
  );

  res.json({
    success: true,
    data: device,
  });
});

/**
 * @route   PUT /api/devices/:id
 * @desc    Update device
 * @access  Private (ADMIN, PLANT_MANAGER)
 */
const updateDevice = asyncHandler(async (req, res) => {
  const device = await deviceService.updateDevice(
    req.params.id,
    req.body,
    req.user.id,
    req.user.role
  );

  res.json({
    success: true,
    data: device,
    message: 'Device updated successfully',
  });
});

/**
 * @route   DELETE /api/devices/:id
 * @desc    Delete device
 * @access  Private (ADMIN)
 */
const deleteDevice = asyncHandler(async (req, res) => {
  const result = await deviceService.deleteDevice(
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
 * @route   GET /api/devices/hierarchy/:plantId
 * @desc    Get device hierarchy for a plant
 * @access  Private
 */
const getDeviceHierarchy = asyncHandler(async (req, res) => {
  const hierarchy = await deviceService.getDeviceHierarchy(
    req.params.plantId,
    req.user.id,
    req.user.role
  );

  res.json({
    success: true,
    data: hierarchy,
  });
});

/**
 * @route   GET /api/devices/:id/children
 * @desc    Get device children
 * @access  Private
 */
const getDeviceChildren = asyncHandler(async (req, res) => {
  const children = await deviceService.getDeviceChildren(
    req.params.id,
    req.user.id,
    req.user.role
  );

  res.json({
    success: true,
    data: children,
  });
});

export {
  createDevice,
  createDeviceFromTemplate,
  getAllDevices,
  getDeviceById,
  updateDevice,
  deleteDevice,
  getDeviceHierarchy,
  getDeviceChildren,
};
