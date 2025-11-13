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
      .number({
        required_error: 'Plant ID is required',
        invalid_type_error: 'Plant ID must be a number',
      })
      .int('Plant ID must be an integer')
      .positive('Plant ID must be positive'),
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
      .number({
        required_error: 'Device ID is required',
        invalid_type_error: 'Device ID must be a number',
      })
      .int('Device ID must be an integer')
      .positive('Device ID must be positive'),
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
    plantId: z.number().int('Plant ID must be an integer').positive('Plant ID must be positive').optional(),
    deviceId: z.number().int('Device ID must be an integer').positive('Device ID must be positive').optional(),
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
    plantId: z.number().int('Plant ID must be an integer').positive('Plant ID must be positive').optional(),
    deviceId: z.number().int('Device ID must be an integer').positive('Device ID must be positive').optional(),
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
