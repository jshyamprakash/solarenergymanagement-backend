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
 * Device schema for plant creation/update
 */
const deviceSchema = z.object({
  templateId: z.union([
    z.string().regex(/^\d+$/, 'Invalid template ID').transform(Number),
    z.number()
  ]),
  name: z.string().min(1, 'Device name is required'),
  parentDeviceId: z.union([z.string(), z.number(), z.null()]).optional(), // Can be 'PLANT', device index (string or number), or null
  serialNumber: z.string().optional(),
  status: z.enum(['ONLINE', 'OFFLINE', 'ERROR', 'MAINTENANCE']).optional(),
  selectedTags: z.array(z.union([
    z.string().regex(/^\d+$/, 'Invalid tag ID').transform(Number),
    z.number()
  ])).optional(),
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
    plantId: z
      .string({
        required_error: 'Plant ID is required',
      })
      .regex(/^[A-Z0-9_-]{3,20}$/, 'Plant ID must be 3-20 characters (uppercase letters, numbers, underscores, hyphens only)'),
    mqttBaseTopic: z
      .string({
        required_error: 'MQTT Base Topic is required',
      })
      .min(1, 'MQTT Base Topic cannot be empty'),
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
    devices: z.array(deviceSchema).optional().default([]),
  }),
};

/**
 * Update plant validation schema
 */
const updatePlantSchema = {
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid plant ID').transform(Number),
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
    devices: z.array(deviceSchema).optional(),
  }),
};

/**
 * Get plant by ID validation schema
 */
const getPlantSchema = {
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid plant ID').transform(Number),
  }),
  query: z.object({
    includeDevices: z.string().regex(/^(true|false)$/).transform(val => val === 'true').optional(),
  }).optional(),
};

/**
 * Delete plant validation schema
 */
const deletePlantSchema = {
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid plant ID').transform(Number),
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
    id: z.string().regex(/^\d+$/, 'Invalid plant ID').transform(Number),
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
