/**
 * Device Validators
 * Zod schemas for device endpoints
 */

import { z } from 'zod';

/**
 * Create device validation schema
 */
const createDeviceSchema = {
  body: z.object({
    plantId: z.string().uuid('Invalid plant ID'),
    name: z
      .string({
        required_error: 'Device name is required',
      })
      .min(2, 'Device name must be at least 2 characters')
      .max(100, 'Device name must not exceed 100 characters'),
    deviceType: z.enum([
      'INVERTER',
      'TRANSFORMER',
      'COMBINER_BOX',
      'WEATHER_STATION',
      'METER',
      'STRING',
      'MODULE',
      'OTHER',
    ]),
    manufacturer: z.string().optional(),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    status: z.enum(['ONLINE', 'OFFLINE', 'ERROR', 'MAINTENANCE']).optional(),
    installationDate: z.string().datetime().optional(),
    parentDeviceId: z.string().uuid().optional().nullable(),
    metadata: z.record(z.any()).optional(),
  }),
};

/**
 * Update device validation schema
 */
const updateDeviceSchema = {
  params: z.object({
    id: z.string().uuid('Invalid device ID'),
  }),
  body: z.object({
    name: z
      .string()
      .min(2, 'Device name must be at least 2 characters')
      .max(100, 'Device name must not exceed 100 characters')
      .optional(),
    deviceType: z
      .enum([
        'INVERTER',
        'TRANSFORMER',
        'COMBINER_BOX',
        'WEATHER_STATION',
        'METER',
        'STRING',
        'MODULE',
        'OTHER',
      ])
      .optional(),
    manufacturer: z.string().optional(),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    status: z.enum(['ONLINE', 'OFFLINE', 'ERROR', 'MAINTENANCE']).optional(),
    installationDate: z.string().datetime().optional(),
    parentDeviceId: z.string().uuid().optional().nullable(),
    metadata: z.record(z.any()).optional(),
  }),
};

/**
 * Get device by ID validation schema
 */
const getDeviceSchema = {
  params: z.object({
    id: z.string().uuid('Invalid device ID'),
  }),
};

/**
 * Delete device validation schema
 */
const deleteDeviceSchema = {
  params: z.object({
    id: z.string().uuid('Invalid device ID'),
  }),
};

/**
 * List devices query validation schema
 */
const listDevicesSchema = {
  query: z.object({
    plantId: z.string().uuid('Invalid plant ID').optional(),
    deviceType: z
      .enum([
        'INVERTER',
        'TRANSFORMER',
        'COMBINER_BOX',
        'WEATHER_STATION',
        'METER',
        'STRING',
        'MODULE',
        'OTHER',
      ])
      .optional(),
    status: z.enum(['ONLINE', 'OFFLINE', 'ERROR', 'MAINTENANCE']).optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
    sortBy: z.enum(['name', 'deviceType', 'status', 'createdAt', 'updatedAt']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
};

/**
 * Get device hierarchy validation schema
 */
const getDeviceHierarchySchema = {
  params: z.object({
    plantId: z.string().uuid('Invalid plant ID'),
  }),
};

/**
 * Get device children validation schema
 */
const getDeviceChildrenSchema = {
  params: z.object({
    id: z.string().uuid('Invalid device ID'),
  }),
};

export {
  createDeviceSchema,
  updateDeviceSchema,
  getDeviceSchema,
  deleteDeviceSchema,
  listDevicesSchema,
  getDeviceHierarchySchema,
  getDeviceChildrenSchema,
};
