/**
 * User-Plant Map Controller
 * Handle HTTP requests for user-plant assignments
 */

import asyncHandler from 'express-async-handler';
import * as userPlantMapService from '../services/userPlantMapService.js';

/**
 * Assign plants to a user
 * POST /api/user-plant-map/assign
 */
const assignPlantsToUser = asyncHandler(async (req, res) => {
  const { userId, plantIds } = req.body;

  const result = await userPlantMapService.assignPlantsToUser(userId, plantIds);

  res.status(200).json({
    status: 'success',
    message: result.message,
    data: result.assignments,
  });
});

/**
 * Remove plant assignments from a user
 * POST /api/user-plant-map/remove
 */
const removePlantsFromUser = asyncHandler(async (req, res) => {
  const { userId, plantIds } = req.body;

  const result = await userPlantMapService.removePlantsFromUser(userId, plantIds);

  res.status(200).json({
    status: 'success',
    message: result.message,
    data: { count: result.count },
  });
});

/**
 * Get users assigned to a plant
 * GET /api/user-plant-map/plant/:plantId/users
 */
const getUsersForPlant = asyncHandler(async (req, res) => {
  const { plantId } = req.params;

  const result = await userPlantMapService.getUsersForPlant(parseInt(plantId));

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

/**
 * Get plants assigned to a user
 * GET /api/user-plant-map/user/:userId/plants
 */
const getPlantsForUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const result = await userPlantMapService.getPlantsForUser(parseInt(userId));

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

/**
 * Bulk assign multiple users to multiple plants
 * POST /api/user-plant-map/bulk-assign
 */
const bulkAssign = asyncHandler(async (req, res) => {
  const { assignments } = req.body;

  const result = await userPlantMapService.bulkAssign(assignments);

  res.status(200).json({
    status: 'success',
    message: result.message,
    data: result.results,
  });
});

export {
  assignPlantsToUser,
  removePlantsFromUser,
  getUsersForPlant,
  getPlantsForUser,
  bulkAssign,
};
