/**
 * Report Validators
 * Zod schemas for report generation endpoints
 */

import { z } from 'zod';

/**
 * Report format enum schema
 */
const reportFormatSchema = z.enum(['json', 'pdf', 'excel']);

/**
 * Alarm severity enum schema
 */
const alarmSeveritySchema = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']);

/**
 * Alarm status enum schema
 */
const alarmStatusSchema = z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED']);

/**
 * Date validation helper
 */
const dateStringSchema = z
  .string()
  .refine((date) => !isNaN(Date.parse(date)), 'Invalid date format (use ISO 8601)');

/**
 * Plant Performance Report validation schema
 * POST /api/reports/plant-performance
 */
export const plantPerformanceReportSchema = {
  body: z.object({
    plantId: z
      .string({
        required_error: 'Plant ID is required',
      })
      .uuid('Invalid plant ID format'),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    format: reportFormatSchema.default('json'),
  }).refine(
    (data) => new Date(data.endDate) >= new Date(data.startDate),
    {
      message: 'End date must be after or equal to start date',
      path: ['endDate'],
    }
  ),
};

/**
 * Device Performance Report validation schema
 * POST /api/reports/device-performance
 */
export const devicePerformanceReportSchema = {
  body: z.object({
    deviceId: z
      .string({
        required_error: 'Device ID is required',
      })
      .uuid('Invalid device ID format'),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    format: reportFormatSchema.default('json'),
  }).refine(
    (data) => new Date(data.endDate) >= new Date(data.startDate),
    {
      message: 'End date must be after or equal to start date',
      path: ['endDate'],
    }
  ),
};

/**
 * Alarm Report validation schema
 * POST /api/reports/alarms
 */
export const alarmReportSchema = {
  body: z.object({
    plantId: z.string().uuid('Invalid plant ID format').optional(),
    deviceId: z.string().uuid('Invalid device ID format').optional(),
    severity: alarmSeveritySchema.optional(),
    status: alarmStatusSchema.optional(),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    format: reportFormatSchema.default('json'),
  }).refine(
    (data) => new Date(data.endDate) >= new Date(data.startDate),
    {
      message: 'End date must be after or equal to start date',
      path: ['endDate'],
    }
  ),
};

/**
 * Energy Production Report validation schema
 * POST /api/reports/energy-production
 */
export const energyProductionReportSchema = {
  body: z.object({
    plantId: z.string().uuid('Invalid plant ID format').optional(),
    deviceId: z.string().uuid('Invalid device ID format').optional(),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    format: reportFormatSchema.default('json'),
  }).refine(
    (data) => new Date(data.endDate) >= new Date(data.startDate),
    {
      message: 'End date must be after or equal to start date',
      path: ['endDate'],
    }
  ),
};
