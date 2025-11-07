/**
 * Global Error Handler Middleware
 * Catches all errors and returns consistent error responses
 */

import logger from '../config/logger.js';
import { AppError } from '../utils/errors.js';

/**
 * Handle Prisma errors
 */
const handlePrismaError = (error) => {
  // Prisma unique constraint violation
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'field';
    return new AppError(`A record with this ${field} already exists`, 409);
  }

  // Prisma record not found
  if (error.code === 'P2025') {
    return new AppError('Record not found', 404);
  }

  // Prisma foreign key constraint violation
  if (error.code === 'P2003') {
    return new AppError('Related record not found', 400);
  }

  // Generic Prisma error
  return new AppError('Database error occurred', 500);
};

/**
 * Handle JWT errors
 */
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again', 401);
};

const handleJWTExpiredError = () => {
  return new AppError('Your token has expired. Please log in again', 401);
};

/**
 * Development error response
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

/**
 * Production error response
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(err.errors && { errors: err.errors }), // Include validation errors if present
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR 💥', err);

    res.status(500).json({
      status: 'error',
      message: 'Something went wrong',
    });
  }
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (err.code && err.code.startsWith('P')) error = handlePrismaError(err);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

export default errorHandler;
