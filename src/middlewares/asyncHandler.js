/**
 * Async Handler Middleware
 * Wraps async route handlers to catch errors and pass them to error handler
 */

/**
 * Wraps async functions to catch rejected promises
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
