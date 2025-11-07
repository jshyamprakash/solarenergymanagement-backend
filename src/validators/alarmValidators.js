/**
 * Alarm Validators
 * Zod validation schemas for alarm endpoints
 */

import { z } from 'zod';

// Enum values
const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const statuses = ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED'];

/**
 * Create alarm validation schema
 */
const createAlarmSchema = {
  body: z.object({
    plantId: z.string().uuid('Invalid plant ID'),
    deviceId: z.string().uuid('Invalid device ID').optional().nullable(),
    tagId: z.string().uuid('Invalid tag ID').optional().nullable(),
    severity: z.enum(severities, { errorMap: () => ({ message: 'Invalid severity level' }) }),
    message: z.string().min(1, 'Message is required').max(500, 'Message too long'),
    description: z.string().max(2000, 'Description too long').optional().nullable(),
    value: z.number().optional().nullable(),
    threshold: z.number().optional().nullable(),
    metadata: z.record(z.any()).optional().nullable(),
  }),
};

/**
 * Acknowledge alarm validation schema
 */
const acknowledgeAlarmSchema = {
  params: z.object({
    id: z.string().uuid('Invalid alarm ID'),
  }),
  body: z.object({
    note: z.string().max(1000, 'Note too long').optional().nullable(),
  }),
};

/**
 * Resolve alarm validation schema
 */
const resolveAlarmSchema = {
  params: z.object({
    id: z.string().uuid('Invalid alarm ID'),
  }),
  body: z.object({
    note: z.string().max(1000, 'Note too long').optional().nullable(),
  }),
};

/**
 * Get alarm by ID validation schema
 */
const getAlarmByIdSchema = {
  params: z.object({
    id: z.string().uuid('Invalid alarm ID'),
  }),
};

/**
 * Get all alarms validation schema (query parameters)
 */
const getAllAlarmsSchema = {
  query: z.object({
    plantId: z.string().uuid('Invalid plant ID').optional(),
    deviceId: z.string().uuid('Invalid device ID').optional(),
    severity: z.enum(severities).optional(),
    status: z.enum(statuses).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.string().regex(/^\d+$/, 'Page must be a number').optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional(),
    sortBy: z.enum(['triggeredAt', 'severity', 'status', 'plantId', 'deviceId']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
};

/**
 * Get plant alarms validation schema
 */
const getPlantAlarmsSchema = {
  params: z.object({
    plantId: z.string().uuid('Invalid plant ID'),
  }),
  query: z.object({
    severity: z.enum(severities).optional(),
    status: z.enum(statuses).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.string().regex(/^\d+$/, 'Page must be a number').optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional(),
    sortBy: z.enum(['triggeredAt', 'severity', 'status']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
};

/**
 * Get device alarms validation schema
 */
const getDeviceAlarmsSchema = {
  params: z.object({
    deviceId: z.string().uuid('Invalid device ID'),
  }),
  query: z.object({
    severity: z.enum(severities).optional(),
    status: z.enum(statuses).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.string().regex(/^\d+$/, 'Page must be a number').optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional(),
    sortBy: z.enum(['triggeredAt', 'severity', 'status']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
};

/**
 * Get alarm statistics validation schema
 */
const getAlarmStatisticsSchema = {
  query: z.object({
    plantId: z.string().uuid('Invalid plant ID').optional(),
  }),
};

export {
  createAlarmSchema,
  acknowledgeAlarmSchema,
  resolveAlarmSchema,
  getAlarmByIdSchema,
  getAllAlarmsSchema,
  getPlantAlarmsSchema,
  getDeviceAlarmsSchema,
  getAlarmStatisticsSchema,
};
