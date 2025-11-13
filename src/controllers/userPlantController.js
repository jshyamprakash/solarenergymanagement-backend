/**
 * User Plant Mapping Controller
 * Handles HTTP requests for user-plant assignments
 */

import asyncHandler from '../middlewares/asyncHandler.js';
import {
  getUserPlants,
  getPlantUsers,
  assignUserToPlant,
  removeUserFromPlant,
  assignMultipleUsersToPlants,
  checkUserPlantAccess,
  getAccessiblePlants,
  getUnassignedUsers
} from '../services/userPlantService.js';

/**
 * @desc    Get all plants assigned to current user
 * @route   GET /api/user-plants/my-plants
 * @access  Private
 */
const getMyPlants = asyncHandler(async (req, res) => {
  const plants = await getUserPlants(req.user.id);
  
  res.status(200).json({
    success: true,
    data: plants,
    message: 'User plants retrieved successfully'
  });
});

/**
 * @desc    Get all accessible plants for current user (admin gets all)
 * @route   GET /api/user-plants/accessible
 * @access  Private
 */
const getAccessiblePlantsForUser = asyncHandler(async (req, res) => {
  const plants = await getAccessiblePlants(req.user.id);
  
  res.status(200).json({
    success: true,
    data: plants,
    message: 'Accessible plants retrieved successfully'
  });
});

/**
 * @desc    Get all users assigned to a plant
 * @route   GET /api/user-plants/plant/:plantId/users
 * @access  Private (Admin, Plant Manager of the plant)
 */
const getUsersByPlant = asyncHandler(async (req, res) => {
  const { plantId } = req.params;

  // Check if user has access to this plant
  const hasAccess = await checkUserPlantAccess(req.user.id, parseInt(plantId));
  if (!hasAccess && req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this plant'
    });
  }

  const users = await getPlantUsers(parseInt(plantId));
  
  res.status(200).json({
    success: true,
    data: users,
    message: 'Plant users retrieved successfully'
  });
});

/**
 * @desc    Get all plants assigned to a specific user
 * @route   GET /api/user-plants/user/:userId/plants
 * @access  Private (Admin only)
 */
const getPlantsByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Only admin can view other users' plant assignments
  if (req.user.role !== 'ADMIN' && req.user.id !== parseInt(userId)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  const plants = await getUserPlants(parseInt(userId));
  
  res.status(200).json({
    success: true,
    data: plants,
    message: 'User plants retrieved successfully'
  });
});

/**
 * @desc    Assign a user to a plant
 * @route   POST /api/user-plants/assign
 * @access  Private (Admin only)
 */
const assignUserToPlantController = asyncHandler(async (req, res) => {
  const { userId, plantId } = req.body;

  if (!userId || !plantId) {
    return res.status(400).json({
      success: false,
      message: 'User ID and Plant ID are required'
    });
  }

  const assignment = await assignUserToPlant(parseInt(userId), parseInt(plantId));
  
  res.status(201).json({
    success: true,
    data: assignment,
    message: 'User assigned to plant successfully'
  });
});

/**
 * @desc    Remove user assignment from a plant
 * @route   DELETE /api/user-plants/remove
 * @access  Private (Admin only)
 */
const removeUserFromPlantController = asyncHandler(async (req, res) => {
  const { userId, plantId } = req.body;

  if (!userId || !plantId) {
    return res.status(400).json({
      success: false,
      message: 'User ID and Plant ID are required'
    });
  }

  await removeUserFromPlant(parseInt(userId), parseInt(plantId));
  
  res.status(200).json({
    success: true,
    message: 'User removed from plant successfully'
  });
});

/**
 * @desc    Assign multiple users to multiple plants
 * @route   POST /api/user-plants/bulk-assign
 * @access  Private (Admin only)
 */
const bulkAssignUsersToPlants = asyncHandler(async (req, res) => {
  const { assignments } = req.body;

  if (!assignments || !Array.isArray(assignments)) {
    return res.status(400).json({
      success: false,
      message: 'Assignments array is required'
    });
  }

  // Validate assignment format
  const isValid = assignments.every(a => a.userId && a.plantId);
  if (!isValid) {
    return res.status(400).json({
      success: false,
      message: 'Each assignment must contain userId and plantId'
    });
  }

  const results = await assignMultipleUsersToPlants(
    assignments.map(a => ({
      userId: parseInt(a.userId),
      plantId: parseInt(a.plantId)
    }))
  );
  
  res.status(201).json({
    success: true,
    data: results,
    message: 'Users assigned to plants successfully'
  });
});

/**
 * @desc    Get users not assigned to a specific plant
 * @route   GET /api/user-plants/plant/:plantId/unassigned-users
 * @access  Private (Admin only)
 */
const getUnassignedUsersForPlant = asyncHandler(async (req, res) => {
  const { plantId } = req.params;

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  const users = await getUnassignedUsers(parseInt(plantId));
  
  res.status(200).json({
    success: true,
    data: users,
    message: 'Unassigned users retrieved successfully'
  });
});

/**
 * @desc    Check if current user has access to a plant
 * @route   GET /api/user-plants/check-access/:plantId
 * @access  Private
 */
const checkPlantAccess = asyncHandler(async (req, res) => {
  const { plantId } = req.params;

  const hasAccess = await checkUserPlantAccess(req.user.id, parseInt(plantId));
  
  res.status(200).json({
    success: true,
    data: { hasAccess },
    message: 'Plant access check completed'
  });
});

export {
  getMyPlants,
  getAccessiblePlantsForUser,
  getUsersByPlant,
  getPlantsByUser,
  assignUserToPlantController,
  removeUserFromPlantController,
  bulkAssignUsersToPlants,
  getUnassignedUsersForPlant,
  checkPlantAccess
};