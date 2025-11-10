/**
 * Audit Service
 * Handles comprehensive audit logging for all CRUD operations
 * Tracks changes to critical entities: User, Plant, Device, Tag, Alarm
 */

import { prisma } from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Log an audit entry for entity changes
 * @param {Object} auditData - Audit log data
 * @param {string} auditData.entityType - Type of entity (User, Plant, Device, Tag, Alarm)
 * @param {string} auditData.entityId - ID of the affected entity
 * @param {string} auditData.action - Action performed (CREATE, UPDATE, DELETE)
 * @param {string} auditData.userId - ID of user performing the action
 * @param {Object} auditData.changesBefore - State before the change (null for CREATE)
 * @param {Object} auditData.changesAfter - State after the change (null for DELETE)
 * @param {Object} auditData.metadata - Additional context (optional)
 * @param {Object} prismaTransaction - Prisma transaction client (optional)
 * @returns {Promise<Object>} Created audit log entry
 */
const logAuditEntry = async ({
  entityType,
  entityId,
  action,
  userId,
  changesBefore = null,
  changesAfter = null,
  metadata = null,
  ipAddress = null,
  userAgent = null,
  prismaTransaction = null,
}) => {
  try {
    // Use provided transaction or default prisma client
    const client = prismaTransaction || prisma;

    // Build changes object with before/after snapshots
    const changes = {
      before: changesBefore,
      after: changesAfter,
    };

    // Create audit log entry
    const auditLog = await client.auditLog.create({
      data: {
        userId,
        action,
        resource: entityType,
        resourceId: entityId,
        changes,
        metadata,
        ipAddress,
        userAgent,
      },
    });

    logger.info(`Audit log created: ${action} ${entityType} ${entityId} by user ${userId}`);

    return auditLog;
  } catch (error) {
    // Log error but don't throw - audit failures shouldn't block main operations
    logger.error('Failed to create audit log:', {
      error: error.message,
      entityType,
      entityId,
      action,
      userId,
    });

    // Return null to indicate failure without throwing
    return null;
  }
};

/**
 * Get audit logs with filtering and pagination
 * @param {Object} filters - Filter criteria
 * @param {string} filters.entityType - Filter by entity type
 * @param {string} filters.entityId - Filter by specific entity ID
 * @param {string} filters.userId - Filter by user who performed action
 * @param {string} filters.action - Filter by action type
 * @param {Date} filters.startDate - Filter by start date
 * @param {Date} filters.endDate - Filter by end date
 * @param {number} filters.page - Page number (default: 1)
 * @param {number} filters.limit - Items per page (default: 20)
 * @param {string} filters.sortBy - Sort field (default: timestamp)
 * @param {string} filters.sortOrder - Sort order (default: desc)
 * @returns {Promise<Object>} Audit logs with pagination info
 */
const getAuditLogs = async (filters = {}) => {
  const {
    entityType,
    entityId,
    userId,
    action,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    sortBy = 'timestamp',
    sortOrder = 'desc',
  } = filters;

  // Build where clause
  const where = {};

  if (entityType) {
    where.resource = entityType;
  }

  if (entityId) {
    where.resourceId = entityId;
  }

  if (userId) {
    where.userId = userId;
  }

  if (action) {
    where.action = action;
  }

  // Date range filtering
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) {
      where.timestamp.gte = new Date(startDate);
    }
    if (endDate) {
      where.timestamp.lte = new Date(endDate);
    }
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const take = limit;

  // Get total count
  const total = await prisma.auditLog.count({ where });

  // Get audit logs
  const logs = await prisma.auditLog.findMany({
    where,
    skip,
    take,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
  });

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get audit log statistics
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Object>} Audit log statistics
 */
const getAuditStats = async (filters = {}) => {
  const { entityType, userId, startDate, endDate } = filters;

  // Build where clause
  const where = {};

  if (entityType) {
    where.resource = entityType;
  }

  if (userId) {
    where.userId = userId;
  }

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) {
      where.timestamp.gte = new Date(startDate);
    }
    if (endDate) {
      where.timestamp.lte = new Date(endDate);
    }
  }

  // Get statistics
  const [
    totalLogs,
    byAction,
    byResource,
    byUser,
  ] = await Promise.all([
    // Total count
    prisma.auditLog.count({ where }),

    // Group by action
    prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: true,
    }),

    // Group by resource type
    prisma.auditLog.groupBy({
      by: ['resource'],
      where,
      _count: true,
    }),

    // Top users by activity
    prisma.auditLog.groupBy({
      by: ['userId'],
      where,
      _count: true,
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
      take: 10,
    }),
  ]);

  return {
    total: totalLogs,
    byAction: byAction.reduce((acc, item) => {
      acc[item.action] = item._count;
      return acc;
    }, {}),
    byResource: byResource.reduce((acc, item) => {
      acc[item.resource] = item._count;
      return acc;
    }, {}),
    topUsers: byUser.map((item) => ({
      userId: item.userId,
      count: item._count,
    })),
  };
};

/**
 * Get audit history for a specific entity
 * @param {string} entityType - Type of entity
 * @param {string} entityId - ID of entity
 * @param {number} limit - Maximum number of entries (default: 50)
 * @returns {Promise<Array>} Audit log entries for the entity
 */
const getEntityAuditHistory = async (entityType, entityId, limit = 50) => {
  const logs = await prisma.auditLog.findMany({
    where: {
      resource: entityType,
      resourceId: entityId,
    },
    take: limit,
    orderBy: {
      timestamp: 'desc',
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
  });

  return logs;
};

/**
 * Clean up old audit logs (for maintenance)
 * @param {number} retentionDays - Number of days to retain logs (default: 90)
 * @returns {Promise<number>} Number of logs deleted
 */
const cleanupOldAuditLogs = async (retentionDays = 90) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    logger.info(`Cleaned up ${result.count} audit logs older than ${retentionDays} days`);

    return result.count;
  } catch (error) {
    logger.error('Failed to cleanup old audit logs:', error);
    throw error;
  }
};

/**
 * Export audit logs to JSON format
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>} Audit logs in exportable format
 */
const exportAuditLogs = async (filters = {}) => {
  const { logs } = await getAuditLogs({
    ...filters,
    limit: 10000, // Large limit for export
  });

  // Format logs for export
  return logs.map((log) => ({
    timestamp: log.timestamp,
    action: log.action,
    entityType: log.resource,
    entityId: log.resourceId,
    user: {
      id: log.user.id,
      name: log.user.name,
      email: log.user.email,
      role: log.user.role,
    },
    changes: log.changes,
    metadata: log.metadata,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
  }));
};

export {
  logAuditEntry,
  getAuditLogs,
  getAuditStats,
  getEntityAuditHistory,
  cleanupOldAuditLogs,
  exportAuditLogs,
};
