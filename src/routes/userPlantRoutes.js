/**
 * User Plant Mapping Routes
 * API endpoints for managing user-plant assignments
 */

const express = require('express');
const {
  getMyPlants,
  getAccessiblePlantsForUser,
  getUsersByPlant,
  getPlantsByUser,
  assignUserToPlantController,
  removeUserFromPlantController,
  bulkAssignUsersToPlants,
  getUnassignedUsersForPlant,
  checkPlantAccess
} = require('../controllers/userPlantController');

const { protect } = require('../middlewares/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// @route   GET /api/user-plants/my-plants
// @desc    Get all plants assigned to current user
// @access  Private
router.get('/my-plants', getMyPlants);

// @route   GET /api/user-plants/accessible
// @desc    Get all accessible plants for current user (admin gets all)
// @access  Private
router.get('/accessible', getAccessiblePlantsForUser);

// @route   GET /api/user-plants/check-access/:plantId
// @desc    Check if current user has access to a plant
// @access  Private
router.get('/check-access/:plantId', checkPlantAccess);

// @route   GET /api/user-plants/plant/:plantId/users
// @desc    Get all users assigned to a plant
// @access  Private (Admin, Plant Manager of the plant)
router.get('/plant/:plantId/users', getUsersByPlant);

// @route   GET /api/user-plants/plant/:plantId/unassigned-users
// @desc    Get users not assigned to a specific plant
// @access  Private (Admin only)
router.get('/plant/:plantId/unassigned-users', getUnassignedUsersForPlant);

// @route   GET /api/user-plants/user/:userId/plants
// @desc    Get all plants assigned to a specific user
// @access  Private (Admin only, or user viewing own assignments)
router.get('/user/:userId/plants', getPlantsByUser);

// @route   POST /api/user-plants/assign
// @desc    Assign a user to a plant
// @access  Private (Admin only)
router.post('/assign', assignUserToPlantController);

// @route   DELETE /api/user-plants/remove
// @desc    Remove user assignment from a plant
// @access  Private (Admin only)
router.delete('/remove', removeUserFromPlantController);

// @route   POST /api/user-plants/bulk-assign
// @desc    Assign multiple users to multiple plants
// @access  Private (Admin only)
router.post('/bulk-assign', bulkAssignUsersToPlants);

module.exports = router;