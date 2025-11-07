/**
 * Alarm Controller
 * Handles HTTP requests for alarm management
 */

import * as alarmService from '../services/alarmService.js';
import asyncHandler from '../middlewares/asyncHandler.js';

/**
 * Get all alarms with filters and pagination
 * GET /api/alarms
 */
const getAllAlarms = asyncHandler(async (req, res) => {
  const { id: userId, role: userRole } = req.user;

  const filters = {
    plantId: req.query.plantId,
    deviceId: req.query.deviceId,
    severity: req.query.severity,
    status: req.query.status,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  };

  const pagination = {
    page: req.query.page || 1,
    limit: req.query.limit || 20,
    sortBy: req.query.sortBy || 'triggeredAt',
    sortOrder: req.query.sortOrder || 'desc',
  };

  const result = await alarmService.getAllAlarms(userId, userRole, filters, pagination);

  res.status(200).json({
    success: true,
    data: result.alarms,
    pagination: result.pagination,
    message: 'Alarms retrieved successfully',
  });
});

/**
 * Get alarm by ID
 * GET /api/alarms/:id
 */
const getAlarmById = asyncHandler(async (req, res) => {
  const { id: userId, role: userRole } = req.user;
  const { id } = req.params;

  const alarm = await alarmService.getAlarmById(id, userId, userRole);

  res.status(200).json({
    success: true,
    data: alarm,
    message: 'Alarm retrieved successfully',
  });
});

/**
 * Create a new alarm
 * POST /api/alarms
 * Note: This is typically called by system processes, not end users
 */
const createAlarm = asyncHandler(async (req, res) => {
  const { id: userId } = req.user;

  const alarm = await alarmService.createAlarm(req.body, userId);

  res.status(201).json({
    success: true,
    data: alarm,
    message: 'Alarm created successfully',
  });
});

/**
 * Acknowledge an alarm
 * PUT /api/alarms/:id/acknowledge
 */
const acknowledgeAlarm = asyncHandler(async (req, res) => {
  const { id: userId, role: userRole } = req.user;
  const { id } = req.params;

  const alarm = await alarmService.acknowledgeAlarm(id, userId, userRole, req.body);

  res.status(200).json({
    success: true,
    data: alarm,
    message: 'Alarm acknowledged successfully',
  });
});

/**
 * Resolve an alarm
 * PUT /api/alarms/:id/resolve
 */
const resolveAlarm = asyncHandler(async (req, res) => {
  const { id: userId, role: userRole } = req.user;
  const { id } = req.params;

  const alarm = await alarmService.resolveAlarm(id, userId, userRole, req.body);

  res.status(200).json({
    success: true,
    data: alarm,
    message: 'Alarm resolved successfully',
  });
});

/**
 * Get alarms for a specific plant
 * GET /api/plants/:plantId/alarms
 */
const getPlantAlarms = asyncHandler(async (req, res) => {
  const { id: userId, role: userRole } = req.user;
  const { plantId } = req.params;

  const filters = {
    severity: req.query.severity,
    status: req.query.status,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  };

  const pagination = {
    page: req.query.page || 1,
    limit: req.query.limit || 20,
    sortBy: req.query.sortBy || 'triggeredAt',
    sortOrder: req.query.sortOrder || 'desc',
  };

  const result = await alarmService.getPlantAlarms(plantId, userId, userRole, filters, pagination);

  res.status(200).json({
    success: true,
    data: result.alarms,
    pagination: result.pagination,
    message: 'Plant alarms retrieved successfully',
  });
});

/**
 * Get alarms for a specific device
 * GET /api/devices/:deviceId/alarms
 */
const getDeviceAlarms = asyncHandler(async (req, res) => {
  const { id: userId, role: userRole } = req.user;
  const { deviceId } = req.params;

  const filters = {
    severity: req.query.severity,
    status: req.query.status,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  };

  const pagination = {
    page: req.query.page || 1,
    limit: req.query.limit || 20,
    sortBy: req.query.sortBy || 'triggeredAt',
    sortOrder: req.query.sortOrder || 'desc',
  };

  const result = await alarmService.getDeviceAlarms(deviceId, userId, userRole, filters, pagination);

  res.status(200).json({
    success: true,
    data: result.alarms,
    pagination: result.pagination,
    message: 'Device alarms retrieved successfully',
  });
});

/**
 * Get alarm statistics
 * GET /api/alarms/statistics
 */
const getAlarmStatistics = asyncHandler(async (req, res) => {
  const { id: userId, role: userRole } = req.user;
  const { plantId } = req.query;

  const statistics = await alarmService.getAlarmStatistics(userId, userRole, plantId);

  res.status(200).json({
    success: true,
    data: statistics,
    message: 'Alarm statistics retrieved successfully',
  });
});

export {
  getAllAlarms,
  getAlarmById,
  createAlarm,
  acknowledgeAlarm,
  resolveAlarm,
  getPlantAlarms,
  getDeviceAlarms,
  getAlarmStatistics,
};
