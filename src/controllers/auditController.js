/**
 * Audit Controller
 * Handles HTTP requests for audit log management
 * Phase 14 Implementation
 */

import * as auditService from '../services/auditService.js';
import asyncHandler from '../middlewares/asyncHandler.js';

/**
 * Get all audit logs with filters and pagination
 * GET /api/audit
 * @access Private (Admin only)
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const filters = {
    entityType: req.query.entityType,
    entityId: req.query.entityId,
    userId: req.query.userId,
    action: req.query.action,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    sortBy: req.query.sortBy || 'timestamp',
    sortOrder: req.query.sortOrder || 'desc',
  };

  const result = await auditService.getAuditLogs(filters);

  res.status(200).json({
    success: true,
    data: result.logs,
    pagination: result.pagination,
    message: 'Audit logs retrieved successfully',
  });
});

/**
 * Get audit log statistics
 * GET /api/audit/stats
 * @access Private (Admin only)
 */
const getAuditStats = asyncHandler(async (req, res) => {
  const filters = {
    entityType: req.query.entityType,
    userId: req.query.userId,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  };

  const statistics = await auditService.getAuditStats(filters);

  res.status(200).json({
    success: true,
    data: statistics,
    message: 'Audit statistics retrieved successfully',
  });
});

/**
 * Get audit history for a specific entity
 * GET /api/audit/entity/:entityType/:entityId
 * @access Private (Admin only)
 */
const getEntityAuditHistory = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;
  const limit = parseInt(req.query.limit) || 50;

  const history = await auditService.getEntityAuditHistory(entityType, entityId, limit);

  res.status(200).json({
    success: true,
    data: history,
    message: `Audit history for ${entityType} ${entityId} retrieved successfully`,
  });
});

/**
 * Export audit logs
 * POST /api/audit/export
 * @access Private (Admin only)
 */
const exportAuditLogs = asyncHandler(async (req, res) => {
  const filters = {
    entityType: req.body.entityType,
    entityId: req.body.entityId,
    userId: req.body.userId,
    action: req.body.action,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
  };

  const format = req.body.format || 'json'; // json or csv

  const logs = await auditService.exportAuditLogs(filters);

  if (format === 'csv') {
    // Convert to CSV format
    const csvRows = [];

    // Header row
    csvRows.push([
      'Timestamp',
      'Action',
      'Entity Type',
      'Entity ID',
      'User Name',
      'User Email',
      'User Role',
      'IP Address',
      'User Agent',
    ].join(','));

    // Data rows
    logs.forEach(log => {
      csvRows.push([
        log.timestamp,
        log.action,
        log.entityType,
        log.entityId,
        `"${log.user.name}"`,
        log.user.email,
        log.user.role,
        log.ipAddress || '',
        `"${(log.userAgent || '').replace(/"/g, '""')}"`, // Escape quotes
      ].join(','));
    });

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`
    );
    res.status(200).send(csvContent);
  } else {
    // JSON format
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.json`
    );
    res.status(200).json({
      success: true,
      data: logs,
      count: logs.length,
      exportedAt: new Date().toISOString(),
    });
  }
});

/**
 * Clean up old audit logs (maintenance operation)
 * DELETE /api/audit/cleanup
 * @access Private (Admin only)
 */
const cleanupOldAuditLogs = asyncHandler(async (req, res) => {
  const retentionDays = parseInt(req.body.retentionDays) || 90;

  const deletedCount = await auditService.cleanupOldAuditLogs(retentionDays);

  res.status(200).json({
    success: true,
    data: {
      deletedCount,
      retentionDays,
    },
    message: `Cleaned up ${deletedCount} audit logs older than ${retentionDays} days`,
  });
});

export {
  getAuditLogs,
  getAuditStats,
  getEntityAuditHistory,
  exportAuditLogs,
  cleanupOldAuditLogs,
};
