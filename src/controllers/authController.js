/**
 * Authentication Controller
 * Handles authentication HTTP requests
 */

import * as authService from '../services/authService.js';
import asyncHandler from '../middlewares/asyncHandler.js';

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.login(email, password);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  const result = await authService.refreshAccessToken(refreshToken);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  const result = await authService.logout();

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

export {
  login,
  getCurrentUser,
  refreshToken,
  logout,
};
