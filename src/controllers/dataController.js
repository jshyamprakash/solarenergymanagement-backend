import * as dataService from '../services/dataService.js';
import asyncHandler from '../middlewares/asyncHandler.js';

/**
 * @desc    Get realtime data for all devices in a plant
 * @route   GET /api/data/plants/:plantId/realtime
 * @access  Private
 */
const getPlantRealtimeData = asyncHandler(async (req, res) => {
  const { plantId } = req.params;
  const data = await dataService.getPlantRealtimeData(
    plantId,
    req.user.id,
    req.user.role
  );

  res.json({
    success: true,
    data,
  });
});

/**
 * @desc    Get historical data for a plant with optional aggregation
 * @route   GET /api/data/plants/:plantId/historical
 * @access  Private
 */
const getPlantHistoricalData = asyncHandler(async (req, res) => {
  const { plantId } = req.params;
  const { startTime, endTime, tagIds, aggregation, interval } = req.query;

  const data = await dataService.getPlantHistoricalData(
    plantId,
    req.user.id,
    req.user.role,
    { startTime, endTime, tagIds, aggregation, interval }
  );

  res.json({
    success: true,
    data,
  });
});

/**
 * @desc    Get realtime data for a specific device
 * @route   GET /api/data/devices/:deviceId/realtime
 * @access  Private
 */
const getDeviceRealtimeData = asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  const data = await dataService.getDeviceRealtimeData(
    deviceId,
    req.user.id,
    req.user.role
  );

  res.json({
    success: true,
    data,
  });
});

/**
 * @desc    Get historical data for a specific device
 * @route   GET /api/data/devices/:deviceId/historical
 * @access  Private
 */
const getDeviceHistoricalData = asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  const { startTime, endTime, tagIds, aggregation, interval } = req.query;

  const data = await dataService.getDeviceHistoricalData(
    deviceId,
    req.user.id,
    req.user.role,
    { startTime, endTime, tagIds, aggregation, interval }
  );

  res.json({
    success: true,
    data,
  });
});

/**
 * @desc    Get historical data for a specific tag
 * @route   GET /api/data/tags/:tagId/historical
 * @access  Private
 */
const getTagHistoricalData = asyncHandler(async (req, res) => {
  const { tagId } = req.params;
  const { startTime, endTime, aggregation, interval } = req.query;

  const data = await dataService.getTagHistoricalData(
    tagId,
    req.user.id,
    req.user.role,
    { startTime, endTime, aggregation, interval }
  );

  res.json({
    success: true,
    data,
  });
});

/**
 * @desc    Get data statistics for a plant
 * @route   GET /api/data/plants/:plantId/stats
 * @access  Private
 */
const getPlantDataStats = asyncHandler(async (req, res) => {
  const { plantId } = req.params;
  const stats = await dataService.getPlantDataStats(
    plantId,
    req.user.id,
    req.user.role
  );

  res.json({
    success: true,
    data: stats,
  });
});

export {
  getPlantRealtimeData,
  getPlantHistoricalData,
  getDeviceRealtimeData,
  getDeviceHistoricalData,
  getTagHistoricalData,
  getPlantDataStats,
};
