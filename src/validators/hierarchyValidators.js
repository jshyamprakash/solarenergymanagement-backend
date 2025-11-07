/**
 * Hierarchy Validators
 * Zod schemas for hierarchy endpoints
 */

import { z } from 'zod';

/**
 * Get plant hierarchy tree validation
 */
const getPlantHierarchyTreeSchema = {
  params: z.object({
    plantId: z.string().uuid('Invalid plant ID'),
  }),
};

/**
 * Get hierarchy stats validation
 */
const getHierarchyStatsSchema = {
  params: z.object({
    plantId: z.string().uuid('Invalid plant ID'),
  }),
};

/**
 * Move device validation
 */
const moveDeviceSchema = {
  params: z.object({
    deviceId: z.string().uuid('Invalid device ID'),
  }),
  body: z.object({
    newParentId: z
      .string()
      .uuid('Invalid parent device ID')
      .nullable()
      .optional(),
  }),
};

/**
 * Get device path validation
 */
const getDevicePathSchema = {
  params: z.object({
    deviceId: z.string().uuid('Invalid device ID'),
  }),
};

/**
 * Validate hierarchy validation
 */
const validateHierarchySchema = {
  params: z.object({
    plantId: z.string().uuid('Invalid plant ID'),
  }),
};

/**
 * Get device siblings validation
 */
const getDeviceSiblingsSchema = {
  params: z.object({
    deviceId: z.string().uuid('Invalid device ID'),
  }),
};

export {
  getPlantHierarchyTreeSchema,
  getHierarchyStatsSchema,
  moveDeviceSchema,
  getDevicePathSchema,
  validateHierarchySchema,
  getDeviceSiblingsSchema,
};
