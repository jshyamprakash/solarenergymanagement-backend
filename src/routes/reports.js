/**
 * Report Routes
 * API routes for report generation (Plant Performance, Device Performance, Alarms, Energy Production)
 * Supports JSON, PDF, and Excel formats
 */

import express from 'express';
const router = express.Router();
import * as reportController from '../controllers/reportController.js';
import { protect } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import {
  plantPerformanceReportSchema,
  devicePerformanceReportSchema,
  alarmReportSchema,
  energyProductionReportSchema,
} from '../validators/reportValidators.js';

// All report routes require authentication
router.use(protect);

/**
 * @route   POST /api/reports/plant-performance
 * @desc    Generate plant performance report
 * @access  Private (Based on user role and plant ownership)
 * @body    {string} plantId - Plant UUID (required)
 * @body    {string} startDate - Start date in ISO 8601 format (required)
 * @body    {string} endDate - End date in ISO 8601 format (required)
 * @body    {string} format - Report format: 'json', 'pdf', or 'excel' (default: 'json')
 *
 * @returns {object} JSON - Report data with plant info, energy generation, uptime, and alarms
 * @returns {Buffer} PDF - Binary PDF file for download
 * @returns {Buffer} Excel - Binary Excel file for download
 *
 * @example
 * // JSON request
 * POST /api/reports/plant-performance
 * {
 *   "plantId": "550e8400-e29b-41d4-a716-446655440000",
 *   "startDate": "2024-01-01",
 *   "endDate": "2024-01-31",
 *   "format": "json"
 * }
 *
 * @example
 * // PDF request
 * POST /api/reports/plant-performance
 * {
 *   "plantId": "550e8400-e29b-41d4-a716-446655440000",
 *   "startDate": "2024-01-01",
 *   "endDate": "2024-01-31",
 *   "format": "pdf"
 * }
 */
router.post(
  '/plant-performance',
  validate(plantPerformanceReportSchema),
  reportController.generatePlantPerformanceReport
);

/**
 * @route   POST /api/reports/device-performance
 * @desc    Generate device performance report
 * @access  Private (Based on user role and plant ownership)
 * @body    {string} deviceId - Device UUID (required)
 * @body    {string} startDate - Start date in ISO 8601 format (required)
 * @body    {string} endDate - End date in ISO 8601 format (required)
 * @body    {string} format - Report format: 'json', 'pdf', or 'excel' (default: 'json')
 *
 * @returns {object} JSON - Report data with device info, performance metrics, and downtime
 * @returns {Buffer} PDF - Binary PDF file for download
 * @returns {Buffer} Excel - Binary Excel file for download
 *
 * @example
 * POST /api/reports/device-performance
 * {
 *   "deviceId": "650e8400-e29b-41d4-a716-446655440001",
 *   "startDate": "2024-01-01",
 *   "endDate": "2024-01-31",
 *   "format": "excel"
 * }
 */
router.post(
  '/device-performance',
  validate(devicePerformanceReportSchema),
  reportController.generateDevicePerformanceReport
);

/**
 * @route   POST /api/reports/alarms
 * @desc    Generate alarm report with filtering options
 * @access  Private (Based on user role and plant ownership)
 * @body    {string} plantId - Plant UUID (optional - filter by plant)
 * @body    {string} deviceId - Device UUID (optional - filter by device)
 * @body    {string} severity - Alarm severity: CRITICAL, HIGH, MEDIUM, LOW, INFO (optional)
 * @body    {string} status - Alarm status: ACTIVE, ACKNOWLEDGED, RESOLVED (optional)
 * @body    {string} startDate - Start date in ISO 8601 format (required)
 * @body    {string} endDate - End date in ISO 8601 format (required)
 * @body    {string} format - Report format: 'json', 'pdf', or 'excel' (default: 'json')
 *
 * @returns {object} JSON - Report data with alarm summary, resolution times, and detailed list
 * @returns {Buffer} PDF - Binary PDF file for download
 * @returns {Buffer} Excel - Binary Excel file for download
 *
 * @example
 * POST /api/reports/alarms
 * {
 *   "plantId": "550e8400-e29b-41d4-a716-446655440000",
 *   "severity": "CRITICAL",
 *   "status": "ACTIVE",
 *   "startDate": "2024-01-01",
 *   "endDate": "2024-01-31",
 *   "format": "pdf"
 * }
 */
router.post(
  '/alarms',
  validate(alarmReportSchema),
  reportController.generateAlarmReport
);

/**
 * @route   POST /api/reports/energy-production
 * @desc    Generate energy production report
 * @access  Private (Based on user role and plant ownership)
 * @body    {string} plantId - Plant UUID (optional - filter by specific plant)
 * @body    {string} deviceId - Device UUID (optional - filter by specific device)
 * @body    {string} startDate - Start date in ISO 8601 format (required)
 * @body    {string} endDate - End date in ISO 8601 format (required)
 * @body    {string} format - Report format: 'json', 'pdf', or 'excel' (default: 'json')
 *
 * @returns {object} JSON - Report data with overall stats, daily production, and breakdowns
 * @returns {Buffer} PDF - Binary PDF file for download
 * @returns {Buffer} Excel - Binary Excel file for download
 *
 * @example
 * POST /api/reports/energy-production
 * {
 *   "startDate": "2024-01-01",
 *   "endDate": "2024-01-31",
 *   "format": "json"
 * }
 *
 * @example
 * // Filter by plant
 * POST /api/reports/energy-production
 * {
 *   "plantId": "550e8400-e29b-41d4-a716-446655440000",
 *   "startDate": "2024-01-01",
 *   "endDate": "2024-01-31",
 *   "format": "excel"
 * }
 */
router.post(
  '/energy-production',
  validate(energyProductionReportSchema),
  reportController.generateEnergyProductionReport
);

export default router;
