/**
 * Authentication Validators
 * Zod schemas for authentication endpoints
 */

import { z } from 'zod';

/**
 * Login validation schema
 */
const loginSchema = {
  body: z.object({
    email: z
      .string({
        required_error: 'Email is required',
      })
      .email('Invalid email address'),
    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(1, 'Password is required'),
  }),
};

/**
 * Refresh token validation schema
 */
const refreshTokenSchema = {
  body: z.object({
    refreshToken: z
      .string({
        required_error: 'Refresh token is required',
      })
      .min(1, 'Refresh token is required'),
  }),
};

export {
  loginSchema,
  refreshTokenSchema,
};
