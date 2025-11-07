/**
 * Plant Validators
 * Zod schemas for plant endpoints
 */

import { z } from 'zod';

/**
 * Location schema
 */
const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().optional(),
});

/**
 * Create plant validation schema
 */
const createPlantSchema = {
  body: z.object({
    name: z
      .string({
        required_error: 'Plant name is required',
      })
      .min(3, 'Plant name must be at least 3 characters')
      .max(100, 'Plant name must not exceed 100 characters'),
    location: locationSchema,
    capacity: z
      .number({
        required_error: 'Capacity is required',
      })
      .positive('Capacity must be a positive number'),
    status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'OFFLINE']).optional(),
    installationDate: z.string().datetime().optional(),
    timezone: z.string().optional().default('UTC'),
    metadata: z.record(z.any()).optional(),
  }),
};

/**
 * Update plant validation schema
 */
const updatePlantSchema = {
  params: z.object({
    id: z.string().uuid('Invalid plant ID'),
  }),
  body: z.object({
    name: z
      .string()
      .min(3, 'Plant name must be at least 3 characters')
      .max(100, 'Plant name must not exceed 100 characters')
      .optional(),
    location: locationSchema.optional(),
    capacity: z.number().positive('Capacity must be a positive number').optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'OFFLINE']).optional(),
    installationDate: z.string().datetime().optional(),
    timezone: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }),
};

/**
 * Get plant by ID validation schema
 */
const getPlantSchema = {
  params: z.object({
    id: z.string().uuid('Invalid plant ID'),
  }),
};

/**
 * Delete plant validation schema
 */
const deletePlantSchema = {
  params: z.object({
    id: z.string().uuid('Invalid plant ID'),
  }),
};

/**
 * List plants query validation schema
 */
const listPlantsSchema = {
  query: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'OFFLINE']).optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
    sortBy: z.enum(['name', 'capacity', 'createdAt', 'updatedAt']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
};

/**
 * Get plant statistics validation schema
 */
const getPlantStatsSchema = {
  params: z.object({
    id: z.string().uuid('Invalid plant ID'),
  }),
};

export {
  createPlantSchema,
  updatePlantSchema,
  getPlantSchema,
  deletePlantSchema,
  listPlantsSchema,
  getPlantStatsSchema,
};
