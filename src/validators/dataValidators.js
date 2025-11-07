import { z } from 'zod';

/**
 * Validator for getting realtime data for a plant
 */
const getPlantRealtimeDataSchema = {
  params: z.object({
    plantId: z.string().uuid('Invalid plant ID'),
  }),
};

/**
 * Validator for getting historical data for a plant
 */
const getPlantHistoricalDataSchema = {
  params: z.object({
    plantId: z.string().uuid('Invalid plant ID'),
  }),
  query: z.object({
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    tagIds: z
      .union([
        z.string().uuid(),
        z.array(z.string().uuid()),
      ])
      .optional()
      .transform((val) => {
        if (typeof val === 'string') {
          return val.split(',').map((id) => id.trim());
        }
        return val;
      }),
    aggregation: z
      .enum(['raw', 'avg', 'min', 'max', 'sum', 'count'])
      .optional()
      .default('raw'),
    interval: z
      .string()
      .regex(/^\d+[smhd]$/, 'Invalid interval format. Use format like: 5m, 1h, 1d')
      .optional(),
  }),
};

/**
 * Validator for getting realtime data for a device
 */
const getDeviceRealtimeDataSchema = {
  params: z.object({
    deviceId: z.string().uuid('Invalid device ID'),
  }),
};

/**
 * Validator for getting historical data for a device
 */
const getDeviceHistoricalDataSchema = {
  params: z.object({
    deviceId: z.string().uuid('Invalid device ID'),
  }),
  query: z.object({
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    tagIds: z
      .union([
        z.string().uuid(),
        z.array(z.string().uuid()),
      ])
      .optional()
      .transform((val) => {
        if (typeof val === 'string') {
          return val.split(',').map((id) => id.trim());
        }
        return val;
      }),
    aggregation: z
      .enum(['raw', 'avg', 'min', 'max', 'sum', 'count'])
      .optional()
      .default('raw'),
    interval: z
      .string()
      .regex(/^\d+[smhd]$/, 'Invalid interval format. Use format like: 5m, 1h, 1d')
      .optional(),
  }),
};

/**
 * Validator for getting historical data for a tag
 */
const getTagHistoricalDataSchema = {
  params: z.object({
    tagId: z.string().uuid('Invalid tag ID'),
  }),
  query: z.object({
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    aggregation: z
      .enum(['raw', 'avg', 'min', 'max', 'sum', 'count'])
      .optional()
      .default('raw'),
    interval: z
      .string()
      .regex(/^\d+[smhd]$/, 'Invalid interval format. Use format like: 5m, 1h, 1d')
      .optional(),
  }),
};

/**
 * Validator for getting data statistics for a plant
 */
const getPlantDataStatsSchema = {
  params: z.object({
    plantId: z.string().uuid('Invalid plant ID'),
  }),
};

export {
  getPlantRealtimeDataSchema,
  getPlantHistoricalDataSchema,
  getDeviceRealtimeDataSchema,
  getDeviceHistoricalDataSchema,
  getTagHistoricalDataSchema,
  getPlantDataStatsSchema,
};
