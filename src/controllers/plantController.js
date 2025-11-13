/**
 * Plant Controller
 * Handles plant HTTP requests
 */

import * as plantService from '../services/plantService.js';
import asyncHandler from '../middlewares/asyncHandler.js';

/**
 * @route   POST /api/plants
 * @desc    Create a new plant
 * @access  Private (Admin, Plant Manager)
 */
const createPlant = asyncHandler(async (req, res) => {
  const plant = await plantService.createPlant(req.body, req.user.id);

  res.status(201).json({
    status: 'success',
    data: { plant },
  });
});

/**
 * @route   GET /api/plants
 * @desc    Get all plants with filters and pagination
 * @access  Private
 */
const getAllPlants = asyncHandler(async (req, res) => {
  const result = await plantService.getAllPlants(req.query, req.user.id, req.user.role);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

/**
 * @route   GET /api/plants/:id
 * @desc    Get plant by ID
 * @access  Private
 */
const getPlantById = asyncHandler(async (req, res) => {
  const includeDevices = req.query.includeDevices === true || req.query.includeDevices === 'true';
  const plant = await plantService.getPlantById(req.params.id, req.user.id, req.user.role, includeDevices);

  res.status(200).json({
    status: 'success',
    data: { plant },
  });
});

/**
 * @route   PUT /api/plants/:id
 * @desc    Update plant
 * @access  Private (Admin, Plant Manager - own plants only)
 */
const updatePlant = asyncHandler(async (req, res) => {
  const plant = await plantService.updatePlant(
    req.params.id,
    req.body,
    req.user.id,
    req.user.role
  );

  res.status(200).json({
    status: 'success',
    data: { plant },
  });
});

/**
 * @route   DELETE /api/plants/:id
 * @desc    Delete plant
 * @access  Private (Admin only)
 */
const deletePlant = asyncHandler(async (req, res) => {
  const result = await plantService.deletePlant(req.params.id, req.user.id, req.user.role);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

/**
 * @route   GET /api/plants/:id/stats
 * @desc    Get plant statistics
 * @access  Private
 */
const getPlantStats = asyncHandler(async (req, res) => {
  const stats = await plantService.getPlantStats(req.params.id, req.user.id, req.user.role);

  res.status(200).json({
    status: 'success',
    data: { stats },
  });
});

export {
  createPlant,
  getAllPlants,
  getPlantById,
  updatePlant,
  deletePlant,
  getPlantStats,
};
