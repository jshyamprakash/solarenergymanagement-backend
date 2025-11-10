/**
 * Audit Routes
 * API routes for audit log management
 * Phase 14 Implementation
 */

import express from 'express';
const router = express.Router();
import * as auditController from '../controllers/auditController.js';
import { protect, restrictTo } from '../middlewares/auth.js';

// All audit routes require authentication and admin role
router.use(protect);
router.use(restrictTo('ADMIN'));

/**
 * @route   GET /api/audit
 * @desc    Get all audit logs with filters and pagination
 * @access  Private (Admin only)
 * @query   {string} entityType - Filter by entity type (User, Plant, Device, Tag, Alarm)
 * @query   {string} entityId - Filter by specific entity ID
 * @query   {string} userId - Filter by user who performed action
 * @query   {string} action - Filter by action type (CREATE, UPDATE, DELETE, etc.)
 * @query   {string} startDate - Filter by start date (ISO format)
 * @query   {string} endDate - Filter by end date (ISO format)
 * @query   {number} page - Page number (default: 1)
 * @query   {number} limit - Items per page (default: 20)
 * @query   {string} sortBy - Sort field (default: timestamp)
 * @query   {string} sortOrder - Sort order: asc/desc (default: desc)
 */
router.get('/', auditController.getAuditLogs);

/**
 * @route   GET /api/audit/stats
 * @desc    Get audit log statistics
 * @access  Private (Admin only)
 * @query   {string} entityType - Filter by entity type
 * @query   {string} userId - Filter by user
 * @query   {string} startDate - Start date for statistics
 * @query   {string} endDate - End date for statistics
 */
router.get('/stats', auditController.getAuditStats);

/**
 * @route   GET /api/audit/entity/:entityType/:entityId
 * @desc    Get audit history for a specific entity
 * @access  Private (Admin only)
 * @param   {string} entityType - Type of entity (User, Plant, Device, Tag, Alarm)
 * @param   {string} entityId - ID of the entity
 * @query   {number} limit - Maximum number of entries to return (default: 50)
 */
router.get('/entity/:entityType/:entityId', auditController.getEntityAuditHistory);

/**
 * @route   POST /api/audit/export
 * @desc    Export audit logs in JSON or CSV format
 * @access  Private (Admin only)
 * @body    {string} format - Export format: 'json' or 'csv' (default: json)
 * @body    {string} entityType - Filter by entity type (optional)
 * @body    {string} entityId - Filter by entity ID (optional)
 * @body    {string} userId - Filter by user (optional)
 * @body    {string} action - Filter by action (optional)
 * @body    {string} startDate - Filter by start date (optional)
 * @body    {string} endDate - Filter by end date (optional)
 */
router.post('/export', auditController.exportAuditLogs);

/**
 * @route   DELETE /api/audit/cleanup
 * @desc    Clean up old audit logs (maintenance operation)
 * @access  Private (Admin only)
 * @body    {number} retentionDays - Number of days to retain logs (default: 90)
 */
router.delete('/cleanup', auditController.cleanupOldAuditLogs);

export default router;
