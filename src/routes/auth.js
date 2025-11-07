/**
 * Authentication Routes
 * Defines authentication API endpoints
 */

import express from 'express';
import * as authController from '../controllers/authController.js';
import { protect } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { loginSchema, refreshTokenSchema } from '../validators/authValidators.js';

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Login user with email and password
 * @access  Public
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private (requires JWT token)
 */
router.get('/me', protect, authController.getCurrentUser);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', protect, authController.logout);

export default router;
