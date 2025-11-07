/**
 * Authentication Service
 * Business logic for user authentication
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import config from '../config/index.js';
import { UnauthorizedError, NotFoundError } from '../utils/errors.js';

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
};

/**
 * Login user with email and password
 */
const login = async (email, password) => {
  // 1. Check if user exists
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // 2. Check if user is active
  if (!user.isActive) {
    throw new UnauthorizedError('Your account has been deactivated. Please contact support');
  }

  // 3. Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // 4. Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  // 5. Generate tokens
  const token = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // 6. Remove password from output
  const { passwordHash, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token,
    refreshToken,
  };
};

/**
 * Get current user by ID
 */
const getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
};

/**
 * Refresh access token
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    // 1. Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

    // 2. Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account deactivated');
    }

    // 3. Generate new access token
    const newToken = generateToken(user.id);

    return { token: newToken };
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
    throw error;
  }
};

/**
 * Logout user (client-side token removal)
 * Server-side logout is stateless with JWT
 */
const logout = async () => {
  // With JWT, logout is handled client-side by removing the token
  // This function exists for consistency and future enhancements
  // (e.g., token blacklisting, refresh token invalidation)
  return { message: 'Logged out successfully' };
};

export {
  login,
  getCurrentUser,
  refreshAccessToken,
  logout,
};
