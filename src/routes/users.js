/**
 * User Routes
 * Defines user management API endpoints
 */

import express from 'express';
import * as userController from '../controllers/userController.js';
import { protect, restrictTo } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import {
  createUserSchema,
  updateUserSchema,
  getUserSchema,
  deleteUserSchema,
  listUsersSchema,
  updateUserRoleSchema,
  assignPlantsSchema,
  getUserPlantsSchema,
} from '../validators/userValidators.js';

const router = express.Router();

// All user routes require authentication
router.use(protect);

/**
 * @route   GET /api/users
 * @desc    Get all users with filters and pagination
 * @access  Private (Admin only)
 */
router.get(
  '/',
  restrictTo('ADMIN'),
  validate(listUsersSchema),
  userController.getAllUsers
);

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Private (Admin only)
 */
router.post(
  '/',
  restrictTo('ADMIN'),
  validate(createUserSchema),
  userController.createUser
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin only)
 */
router.get(
  '/:id',
  restrictTo('ADMIN'),
  validate(getUserSchema),
  userController.getUserById
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admin only)
 */
router.put(
  '/:id',
  restrictTo('ADMIN'),
  validate(updateUserSchema),
  userController.updateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete by deactivating)
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  restrictTo('ADMIN'),
  validate(deleteUserSchema),
  userController.deleteUser
);

/**
 * @route   PUT /api/users/:id/role
 * @desc    Update user role
 * @access  Private (Admin only)
 */
router.put(
  '/:id/role',
  restrictTo('ADMIN'),
  validate(updateUserRoleSchema),
  userController.updateUserRole
);

/**
 * @route   POST /api/users/:id/plants
 * @desc    Assign plants to user
 * @access  Private (Admin only)
 */
router.post(
  '/:id/plants',
  restrictTo('ADMIN'),
  validate(assignPlantsSchema),
  userController.assignPlantsToUser
);

/**
 * @route   GET /api/users/:id/plants
 * @desc    Get user's plants
 * @access  Private (Admin only - could be extended to allow users to view their own plants)
 */
router.get(
  '/:id/plants',
  restrictTo('ADMIN'),
  validate(getUserPlantsSchema),
  userController.getUserPlants
);

export default router;
