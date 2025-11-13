/**
 * Alarm Service
 * Handles alarm management business logic
 */

import { PrismaClient } from '@prisma/client';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
// AUDIT LOG - COMMENTED OUT (Enable when needed)
// import { logAuditEntry } from './auditService.js';

const prisma = new PrismaClient();

/**
 * Check if user has access to an alarm's plant
 */
const checkAlarmAccess = async (alarmId, userId, userRole) => {
  const alarm = await prisma.alarm.findUnique({
    where: { id: alarmId },
    include: { plant: true },
  });

  if (!alarm) {
    throw new NotFoundError('Alarm not found');
  }

  // Admin has access to all alarms
  if (userRole === 'ADMIN') {
    return alarm;
  }

  // Check if user has access to the plant
  if (userRole === 'PLANT_MANAGER') {
    const hasAccess = await prisma.userPlantAccess.findFirst({
      where: {
        userId,
        plantId: alarm.plantId,
      },
    });

    if (!hasAccess && alarm.plant.ownerId !== userId) {
      throw new ForbiddenError('You do not have access to this alarm');
    }
  } else if (userRole === 'VIEWER') {
    const hasAccess = await prisma.userPlantAccess.findFirst({
      where: {
        userId,
        plantId: alarm.plantId,
      },
    });

    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this alarm');
    }
  }

  return alarm;
};

/**
 * Get all alarms with filters and pagination
 */
const getAllAlarms = async (userId, userRole, filters = {}, pagination = {}) => {
  const {
    plantId,
    deviceId,
    severity,
    status,
    startDate,
    endDate,
  } = filters;

  const {
    page = 1,
    limit = 20,
    sortBy = 'triggeredAt',
    sortOrder = 'desc',
  } = pagination;

  const skip = (page - 1) * limit;

  // Build where clause
  const where = {};

  // Role-based filtering
  if (userRole !== 'ADMIN') {
    // Get accessible plants
    if (userRole === 'PLANT_MANAGER') {
      const accessiblePlants = await prisma.plant.findMany({
        where: {
          OR: [
            { ownerId: userId },
            { userPlantAccess: { some: { userId } } },
          ],
        },
        select: { id: true },
      });
      where.plantId = { in: accessiblePlants.map(p => p.id) };
    } else if (userRole === 'VIEWER') {
      const accessiblePlants = await prisma.userPlantAccess.findMany({
        where: { userId },
        select: { plantId: true },
      });
      where.plantId = { in: accessiblePlants.map(a => a.plantId) };
    }
  }

  // Apply filters
  if (plantId) where.plantId = plantId;
  if (deviceId) where.deviceId = deviceId;
  if (severity) where.severity = severity;
  if (status) where.status = status;

  if (startDate || endDate) {
    where.triggeredAt = {};
    if (startDate) where.triggeredAt.gte = new Date(startDate);
    if (endDate) where.triggeredAt.lte = new Date(endDate);
  }

  // Get alarms with pagination
  const [alarms, total] = await Promise.all([
    prisma.alarm.findMany({
      where,
      include: {
        plant: {
          select: { id: true, name: true },
        },
        device: {
          select: { id: true, name: true, deviceType: true },
        },
        tag: {
          select: { id: true, name: true, unit: true },
        },
        acknowledger: {
          select: { id: true, name: true, email: true },
        },
      },
      skip,
      take: parseInt(limit),
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.alarm.count({ where }),
  ]);

  return {
    alarms,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get alarm by ID
 */
const getAlarmById = async (alarmId, userId, userRole) => {
  const alarm = await checkAlarmAccess(alarmId, userId, userRole);

  // Include all related data
  const fullAlarm = await prisma.alarm.findUnique({
    where: { id: alarmId },
    include: {
      plant: {
        select: { id: true, name: true, location: true },
      },
      device: {
        select: { id: true, name: true, deviceType: true, serialNumber: true },
      },
      tag: {
        select: { id: true, name: true, unit: true, dataType: true },
      },
      creator: {
        select: { id: true, name: true, email: true },
      },
      acknowledger: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return fullAlarm;
};

/**
 * Create a new alarm (typically called by system, not users)
 */
const createAlarm = async (alarmData, createdBy) => {
  const {
    plantId,
    deviceId,
    tagId,
    severity,
    message,
    description,
    value,
    threshold,
    metadata,
  } = alarmData;

  // Validate plant exists
  const plant = await prisma.plant.findUnique({ where: { id: plantId } });
  if (!plant) {
    throw new NotFoundError('Plant not found');
  }

  // Validate device if provided
  if (deviceId) {
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundError('Device not found');
    }
    if (device.plantId !== plantId) {
      throw new BadRequestError('Device does not belong to specified plant');
    }
  }

  // Validate tag if provided
  if (tagId) {
    const tag = await prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag) {
      throw new NotFoundError('Tag not found');
    }
  }

  // Create alarm
  const alarm = await prisma.alarm.create({
    data: {
      plantId,
      deviceId,
      tagId,
      severity,
      message,
      description,
      value,
      threshold,
      metadata,
      createdBy,
      status: 'ACTIVE',
    },
    include: {
      plant: {
        select: { id: true, name: true },
      },
      device: {
        select: { id: true, name: true },
      },
      tag: {
        select: { id: true, name: true },
      },
    },
  });

  // Log to audit
  //   // await logAuditEntry({
  //     entityType: 'Alarm',
  //     entityId: alarm.id,
  //     action: 'CREATE',
  //     userId: createdBy,
  //     changesBefore: null,
  //     changesAfter: {
  //       plantId: alarm.plantId,
  //       deviceId: alarm.deviceId,
  //       tagId: alarm.tagId,
  //       severity: alarm.severity,
  //       status: alarm.status,
  //       message: alarm.message,
  //       description: alarm.description,
  //       value: alarm.value,
  //       threshold: alarm.threshold,
  //     },
  //   });

  return alarm;
};

/**
 * Acknowledge an alarm
 */
const acknowledgeAlarm = async (alarmId, userId, userRole, acknowledgeData = {}) => {
  const alarm = await checkAlarmAccess(alarmId, userId, userRole);

  // Check if alarm can be acknowledged
  if (alarm.status === 'RESOLVED') {
    throw new BadRequestError('Cannot acknowledge a resolved alarm');
  }

  if (alarm.status === 'ACKNOWLEDGED') {
    throw new BadRequestError('Alarm is already acknowledged');
  }

  // Update alarm
  const updatedAlarm = await prisma.alarm.update({
    where: { id: alarmId },
    data: {
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date(),
      acknowledgedBy: userId,
      metadata: {
        ...(alarm.metadata || {}),
        acknowledgmentNote: acknowledgeData.note || null,
      },
    },
    include: {
      plant: {
        select: { id: true, name: true },
      },
      device: {
        select: { id: true, name: true },
      },
      acknowledger: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // Log to audit
  //   // await logAuditEntry({
  //     entityType: 'Alarm',
  //     entityId: alarmId,
  //     action: 'ACKNOWLEDGE',
  //     userId,
  //     changesBefore: {
  //       status: alarm.status,
  //       acknowledgedAt: alarm.acknowledgedAt,
  //       acknowledgedBy: alarm.acknowledgedBy,
  //     },
  //     changesAfter: {
  //       status: 'ACKNOWLEDGED',
  //       acknowledgedAt: updatedAlarm.acknowledgedAt,
  //       acknowledgedBy: userId,
  //     },
  //     metadata: {
  //       note: acknowledgeData.note,
  //     },
  //   });

  return updatedAlarm;
};

/**
 * Resolve an alarm
 */
const resolveAlarm = async (alarmId, userId, userRole, resolveData = {}) => {
  const alarm = await checkAlarmAccess(alarmId, userId, userRole);

  // Check if alarm can be resolved
  if (alarm.status === 'RESOLVED') {
    throw new BadRequestError('Alarm is already resolved');
  }

  // Update alarm
  const updatedAlarm = await prisma.alarm.update({
    where: { id: alarmId },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      metadata: {
        ...(alarm.metadata || {}),
        resolutionNote: resolveData.note || null,
        resolvedBy: userId,
      },
    },
    include: {
      plant: {
        select: { id: true, name: true },
      },
      device: {
        select: { id: true, name: true },
      },
    },
  });

  // Log to audit
  //   // await logAuditEntry({
  //     entityType: 'Alarm',
  //     entityId: alarmId,
  //     action: 'UPDATE',
  //     userId,
  //     changesBefore: {
  //       status: alarm.status,
  //       resolvedAt: alarm.resolvedAt,
  //     },
  //     changesAfter: {
  //       status: 'RESOLVED',
  //       resolvedAt: updatedAlarm.resolvedAt,
  //     },
  //     metadata: {
  //       action: 'resolve',
  //       note: resolveData.note,
  //     },
  //   });

  return updatedAlarm;
};

/**
 * Get alarms for a specific plant
 */
const getPlantAlarms = async (plantId, userId, userRole, filters = {}, pagination = {}) => {
  // Check plant access
  const plant = await prisma.plant.findUnique({ where: { id: plantId } });
  if (!plant) {
    throw new NotFoundError('Plant not found');
  }

  // Check access for non-admin users
  if (userRole !== 'ADMIN') {
    if (userRole === 'PLANT_MANAGER') {
      const hasAccess = plant.ownerId === userId || await prisma.userPlantAccess.findFirst({
        where: { userId, plantId },
      });
      if (!hasAccess) {
        throw new ForbiddenError('You do not have access to this plant');
      }
    } else if (userRole === 'VIEWER') {
      const hasAccess = await prisma.userPlantAccess.findFirst({
        where: { userId, plantId },
      });
      if (!hasAccess) {
        throw new ForbiddenError('You do not have access to this plant');
      }
    }
  }

  // Get alarms for this plant
  return getAllAlarms(userId, userRole, { ...filters, plantId }, pagination);
};

/**
 * Get alarms for a specific device
 */
const getDeviceAlarms = async (deviceId, userId, userRole, filters = {}, pagination = {}) => {
  // Check device access
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: { plant: true },
  });

  if (!device) {
    throw new NotFoundError('Device not found');
  }

  // Check access for non-admin users
  if (userRole !== 'ADMIN') {
    if (userRole === 'PLANT_MANAGER') {
      const hasAccess = device.plant.ownerId === userId || await prisma.userPlantAccess.findFirst({
        where: { userId, plantId: device.plantId },
      });
      if (!hasAccess) {
        throw new ForbiddenError('You do not have access to this device');
      }
    } else if (userRole === 'VIEWER') {
      const hasAccess = await prisma.userPlantAccess.findFirst({
        where: { userId, plantId: device.plantId },
      });
      if (!hasAccess) {
        throw new ForbiddenError('You do not have access to this device');
      }
    }
  }

  // Get alarms for this device
  return getAllAlarms(userId, userRole, { ...filters, deviceId }, pagination);
};

/**
 * Get alarm statistics
 */
const getAlarmStatistics = async (userId, userRole, plantId = null) => {
  // Build where clause based on user role
  const where = {};

  if (userRole !== 'ADMIN') {
    if (userRole === 'PLANT_MANAGER') {
      const accessiblePlants = await prisma.plant.findMany({
        where: {
          OR: [
            { ownerId: userId },
            { userPlantAccess: { some: { userId } } },
          ],
        },
        select: { id: true },
      });
      where.plantId = { in: accessiblePlants.map(p => p.id) };
    } else if (userRole === 'VIEWER') {
      const accessiblePlants = await prisma.userPlantAccess.findMany({
        where: { userId },
        select: { plantId: true },
      });
      where.plantId = { in: accessiblePlants.map(a => a.plantId) };
    }
  }

  if (plantId) {
    where.plantId = plantId;
  }

  // Get statistics
  const [
    totalAlarms,
    activeAlarms,
    acknowledgedAlarms,
    resolvedAlarms,
    bySeverity,
  ] = await Promise.all([
    prisma.alarm.count({ where }),
    prisma.alarm.count({ where: { ...where, status: 'ACTIVE' } }),
    prisma.alarm.count({ where: { ...where, status: 'ACKNOWLEDGED' } }),
    prisma.alarm.count({ where: { ...where, status: 'RESOLVED' } }),
    prisma.alarm.groupBy({
      by: ['severity'],
      where,
      _count: true,
    }),
  ]);

  return {
    total: totalAlarms,
    byStatus: {
      active: activeAlarms,
      acknowledged: acknowledgedAlarms,
      resolved: resolvedAlarms,
    },
    bySeverity: bySeverity.reduce((acc, item) => {
      acc[item.severity.toLowerCase()] = item._count;
      return acc;
    }, {}),
  };
};

export {
  getAllAlarms,
  getAlarmById,
  createAlarm,
  acknowledgeAlarm,
  resolveAlarm,
  getPlantAlarms,
  getDeviceAlarms,
  getAlarmStatistics,
};
