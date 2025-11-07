/**
 * Authentication Middleware
 * JWT verification and user authentication
 */

import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import config from '../config/index.js';
import { prisma } from '../config/database.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import asyncHandler from './asyncHandler.js';

/**
 * Verify JWT token and attach user to request
 */
const protect = asyncHandler(async (req, res, next) => {
  // 1. Get token from header
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new UnauthorizedError('You are not logged in. Please log in to get access');
  }

  // 2. Verify token
  const decoded = await promisify(jwt.verify)(token, config.jwt.secret);

  // 3. Check if user still exists
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError('The user belonging to this token no longer exists');
  }

  // 4. Check if user is active
  if (!user.isActive) {
    throw new UnauthorizedError('Your account has been deactivated. Please contact support');
  }

  // 5. Grant access to protected route
  req.user = user;
  next();
});

/**
 * Restrict access to specific roles
 * @param {...string} roles - Allowed roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('You do not have permission to perform this action');
    }
    next();
  };
};

/**
 * Optional authentication - attach user if token is present
 * Does not throw error if token is missing
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = await promisify(jwt.verify)(token, config.jwt.secret);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
        },
      });

      if (user && user.isActive) {
        req.user = user;
      }
    }
  } catch (error) {
    // Silently fail for optional auth
  }

  next();
});

export { protect, restrictTo, optionalAuth };
