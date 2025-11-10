/**
 * User Controller
 * Handles user management HTTP requests
 */

import * as userService from '../services/userService.js';
import asyncHandler from '../middlewares/asyncHandler.js';

/**
 * @route   GET /api/users
 * @desc    Get all users with filters and pagination
 * @access  Private (Admin only)
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const filters = req.query;

  const result = await userService.getAllUsers(filters);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin only)
 */
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await userService.getUserById(id);

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Private (Admin only)
 */
const createUser = asyncHandler(async (req, res) => {
  const userData = req.body;
  const createdById = req.user.id;

  const user = await userService.createUser(userData, createdById);

  res.status(201).json({
    status: 'success',
    data: { user },
    message: 'User created successfully',
  });
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admin only)
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const updatedById = req.user.id;

  const user = await userService.updateUser(id, updateData, updatedById);

  res.status(200).json({
    status: 'success',
    data: { user },
    message: 'User updated successfully',
  });
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete)
 * @access  Private (Admin only)
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deletedById = req.user.id;

  const result = await userService.deleteUser(id, deletedById);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

/**
 * @route   PUT /api/users/:id/role
 * @desc    Update user role
 * @access  Private (Admin only)
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const updatedById = req.user.id;

  const user = await userService.updateUserRole(id, role, updatedById);

  res.status(200).json({
    status: 'success',
    data: { user },
    message: 'User role updated successfully',
  });
});

/**
 * @route   POST /api/users/:id/plants
 * @desc    Assign plants to user
 * @access  Private (Admin only)
 */
const assignPlantsToUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { plantIds } = req.body;
  const assignedById = req.user.id;

  const result = await userService.assignPlantsToUser(id, plantIds, assignedById);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

/**
 * @route   GET /api/users/:id/plants
 * @desc    Get user's plants
 * @access  Private (Admin or own user)
 */
const getUserPlants = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const pagination = req.query;

  const result = await userService.getUserPlants(id, pagination);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

export {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserRole,
  assignPlantsToUser,
  getUserPlants,
};
