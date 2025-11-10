/**
 * User Validators
 * Zod schemas for user management endpoints
 */

import { z } from 'zod';

/**
 * User role enum schema
 */
const userRoleSchema = z.enum(['ADMIN', 'PLANT_MANAGER', 'VIEWER']);

/**
 * Create user validation schema
 */
const createUserSchema = {
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
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    name: z
      .string({
        required_error: 'Name is required',
      })
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters'),
    role: userRoleSchema.optional().default('VIEWER'),
    isActive: z.boolean().optional().default(true),
  }),
};

/**
 * Update user validation schema
 */
const updateUserSchema = {
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
  body: z.object({
    email: z.string().email('Invalid email address').optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .optional(),
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters')
      .optional(),
    isActive: z.boolean().optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  }),
};

/**
 * Get user by ID validation schema
 */
const getUserSchema = {
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
};

/**
 * Delete user validation schema
 */
const deleteUserSchema = {
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
};

/**
 * List users query validation schema
 */
const listUsersSchema = {
  query: z.object({
    role: userRoleSchema.optional(),
    isActive: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
    sortBy: z.enum(['name', 'email', 'role', 'createdAt', 'updatedAt', 'lastLogin']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    search: z.string().optional(),
  }),
};

/**
 * Update user role validation schema
 */
const updateUserRoleSchema = {
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
  body: z.object({
    role: userRoleSchema,
  }),
};

/**
 * Assign plants to user validation schema
 */
const assignPlantsSchema = {
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
  body: z.object({
    plantIds: z
      .array(z.string().uuid('Invalid plant ID'))
      .min(1, 'At least one plant ID is required'),
  }),
};

/**
 * Get user plants validation schema
 */
const getUserPlantsSchema = {
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
  }),
};

export {
  createUserSchema,
  updateUserSchema,
  getUserSchema,
  deleteUserSchema,
  listUsersSchema,
  updateUserRoleSchema,
  assignPlantsSchema,
  getUserPlantsSchema,
};
