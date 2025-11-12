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
    plantId: z.union([
      z.string().regex(/^\d+$/, 'Invalid plant ID').transform(Number),
      z.number()
    ]),
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
    parentDeviceId: z.union([
      z.string().regex(/^\d+$/, 'Invalid parent device ID').transform(Number),
      z.number(),
      z.null()
    ]).optional().nullable(),
    metadata: z.record(z.any()).optional(),
  }),
};

/**
 * Update device validation schema
 */
const updateDeviceSchema = {
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid device ID').transform(Number),
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
    parentDeviceId: z.union([
      z.string().regex(/^\d+$/, 'Invalid parent device ID').transform(Number),
      z.number(),
      z.null()
    ]).optional().nullable(),
    metadata: z.record(z.any()).optional(),
  }),
};

/**
 * Get device by ID validation schema
 */
const getDeviceSchema = {
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid device ID').transform(Number),
  }),
};

/**
 * Delete device validation schema
 */
const deleteDeviceSchema = {
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid device ID').transform(Number),
  }),
};

/**
 * List devices query validation schema
 */
const listDevicesSchema = {
  query: z.object({
    plantId: z.string().regex(/^\d+$/, 'Invalid plant ID').transform(Number).optional(),
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
    plantId: z.string().regex(/^\d+$/, 'Invalid plant ID').transform(Number),
  }),
};

/**
 * Get device children validation schema
 */
const getDeviceChildrenSchema = {
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid device ID').transform(Number),
  }),
};

/**
 * Create device from template validation schema
 */
const createDeviceFromTemplateSchema = {
  body: z.object({
    plantId: z.union([
      z.string().regex(/^\d+$/, 'Invalid plant ID').transform(Number),
      z.number()
    ]),
    templateId: z.union([
      z.string().regex(/^\d+$/, 'Invalid template ID').transform(Number),
      z.number()
    ]),
    name: z.string().min(2).max(100).optional(),
    deviceCode: z.string().optional(),
    parentDeviceId: z.union([
      z.string().regex(/^\d+$/, 'Invalid parent device ID').transform(Number),
      z.number(),
      z.null()
    ]).optional().nullable(),
    selectedTags: z.array(z.union([
      z.string().regex(/^\d+$/, 'Invalid tag ID').transform(Number),
      z.number()
    ])).optional(),
    manufacturer: z.string().optional(),
    model: z.string().optional(),
    description: z.string().optional(),
    serialNumber: z.string().optional(),
    status: z.enum(['ONLINE', 'OFFLINE', 'ERROR', 'MAINTENANCE']).optional(),
    installationDate: z.string().datetime().optional(),
    metadata: z.record(z.any()).optional(),
  }),
};

export {
  createDeviceSchema,
  createDeviceFromTemplateSchema,
  updateDeviceSchema,
  getDeviceSchema,
  deleteDeviceSchema,
  listDevicesSchema,
  getDeviceHierarchySchema,
  getDeviceChildrenSchema,
};
