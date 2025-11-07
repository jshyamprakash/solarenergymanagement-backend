/**
 * Tag Validators
 * Zod schemas for tag endpoints
 */

import { z } from 'zod';

/**
 * Create tag validation schema
 */
const createTagSchema = {
  body: z.object({
    deviceId: z.string().uuid('Invalid device ID'),
    name: z
      .string({
        required_error: 'Tag name is required',
      })
      .min(2, 'Tag name must be at least 2 characters')
      .max(100, 'Tag name must not exceed 100 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Tag name can only contain letters, numbers, and underscores'),
    description: z.string().max(500, 'Description must not exceed 500 characters').optional(),
    unit: z.string().max(20, 'Unit must not exceed 20 characters').optional(),
    dataType: z.enum(['INTEGER', 'FLOAT', 'BOOLEAN', 'STRING']).optional(),
    minValue: z.number().optional(),
    maxValue: z.number().optional(),
    metadata: z.record(z.any()).optional(),
  }),
};

/**
 * Update tag validation schema
 */
const updateTagSchema = {
  params: z.object({
    id: z.string().uuid('Invalid tag ID'),
  }),
  body: z.object({
    name: z
      .string()
      .min(2, 'Tag name must be at least 2 characters')
      .max(100, 'Tag name must not exceed 100 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Tag name can only contain letters, numbers, and underscores')
      .optional(),
    description: z.string().max(500, 'Description must not exceed 500 characters').optional(),
    unit: z.string().max(20, 'Unit must not exceed 20 characters').optional(),
    dataType: z.enum(['INTEGER', 'FLOAT', 'BOOLEAN', 'STRING']).optional(),
    minValue: z.number().optional(),
    maxValue: z.number().optional(),
    metadata: z.record(z.any()).optional(),
  }),
};

/**
 * Get tag by ID validation schema
 */
const getTagSchema = {
  params: z.object({
    id: z.string().uuid('Invalid tag ID'),
  }),
};

/**
 * Delete tag validation schema
 */
const deleteTagSchema = {
  params: z.object({
    id: z.string().uuid('Invalid tag ID'),
  }),
};

/**
 * List tags query validation schema
 */
const listTagsSchema = {
  query: z.object({
    deviceId: z.string().uuid('Invalid device ID').optional(),
    plantId: z.string().uuid('Invalid plant ID').optional(),
    dataType: z.enum(['INTEGER', 'FLOAT', 'BOOLEAN', 'STRING']).optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('50'),
    sortBy: z.enum(['name', 'dataType', 'createdAt', 'updatedAt']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
};

/**
 * Get device tags validation schema
 */
const getDeviceTagsSchema = {
  params: z.object({
    deviceId: z.string().uuid('Invalid device ID'),
  }),
};

/**
 * Bulk create tags validation schema
 */
const bulkCreateTagsSchema = {
  params: z.object({
    deviceId: z.string().uuid('Invalid device ID'),
  }),
  body: z.object({
    tags: z
      .array(
        z.object({
          name: z
            .string()
            .min(2, 'Tag name must be at least 2 characters')
            .max(100, 'Tag name must not exceed 100 characters')
            .regex(/^[a-zA-Z0-9_]+$/, 'Tag name can only contain letters, numbers, and underscores'),
          description: z.string().max(500).optional(),
          unit: z.string().max(20).optional(),
          dataType: z.enum(['INTEGER', 'FLOAT', 'BOOLEAN', 'STRING']).optional(),
          minValue: z.number().optional(),
          maxValue: z.number().optional(),
          metadata: z.record(z.any()).optional(),
        })
      )
      .min(1, 'At least one tag is required')
      .max(50, 'Cannot create more than 50 tags at once'),
  }),
};

/**
 * Get device tag stats validation schema
 */
const getDeviceTagStatsSchema = {
  params: z.object({
    deviceId: z.string().uuid('Invalid device ID'),
  }),
};

/**
 * Get tag recent data validation schema
 */
const getTagRecentDataSchema = {
  params: z.object({
    id: z.string().uuid('Invalid tag ID'),
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('100'),
  }),
};

/**
 * Search tags validation schema
 */
const searchTagsSchema = {
  query: z.object({
    q: z
      .string({
        required_error: 'Search query is required',
      })
      .min(2, 'Search query must be at least 2 characters')
      .max(100, 'Search query must not exceed 100 characters'),
  }),
};

export {
  createTagSchema,
  updateTagSchema,
  getTagSchema,
  deleteTagSchema,
  listTagsSchema,
  getDeviceTagsSchema,
  bulkCreateTagsSchema,
  getDeviceTagStatsSchema,
  getTagRecentDataSchema,
  searchTagsSchema,
};
