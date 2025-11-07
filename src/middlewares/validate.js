/**
 * Validation Middleware
 * Uses Zod for request validation
 */

import { ValidationError } from '../utils/errors.js';

/**
 * Validate request using Zod schema
 * @param {Object} schema - Zod schema object with body, query, params
 */
const validate = (schema) => {
  return async (req, res, next) => {
    try {
      // Validate body
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }

      // Validate query
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }

      // Validate params
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }

      next();
    } catch (error) {
      if (error.name === 'ZodError') {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        next(new ValidationError('Validation failed', errors));
      } else {
        next(error);
      }
    }
  };
};

export default validate;
