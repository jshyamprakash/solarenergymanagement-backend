/**
 * Plant Service
 * Business logic for plant management
 */

import { prisma } from '../config/database.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

/**
 * Create a new plant
 */
const createPlant = async (plantData, userId) => {
  const { location, ...restData } = plantData;

  // Generate coordinates string for indexing
  const coordinates = `${location.lat},${location.lng}`;

  const plant = await prisma.plant.create({
    data: {
      ...restData,
      location,
      coordinates,
      ownerId: userId,
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return plant;
};

/**
 * Get all plants with filters and pagination
 */
const getAllPlants = async (filters = {}, userId, userRole) => {
  const { status, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

  // Build where clause
  const where = {};

  // Filter by status if provided
  if (status) {
    where.status = status;
  }

  // Non-admin users can only see their own plants
  if (userRole !== 'ADMIN') {
    where.ownerId = userId;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const take = limit;

  // Get total count
  const total = await prisma.plant.count({ where });

  // Get plants
  const plants = await prisma.plant.findMany({
    where,
    skip,
    take,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          devices: true,
          alarms: true,
        },
      },
    },
  });

  return {
    plants,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get plant by ID
 */
const getPlantById = async (plantId, userId, userRole) => {
  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          devices: true,
          alarms: true,
        },
      },
    },
  });

  if (!plant) {
    throw new NotFoundError('Plant not found');
  }

  // Check access - non-admin users can only access their own plants
  if (userRole !== 'ADMIN' && plant.ownerId !== userId) {
    throw new ForbiddenError('You do not have access to this plant');
  }

  return plant;
};

/**
 * Update plant
 */
const updatePlant = async (plantId, updateData, userId, userRole) => {
  // Check if plant exists and user has access
  const existingPlant = await getPlantById(plantId, userId, userRole);

  // Update coordinates if location changed
  let coordinates = existingPlant.coordinates;
  if (updateData.location) {
    coordinates = `${updateData.location.lat},${updateData.location.lng}`;
  }

  const plant = await prisma.plant.update({
    where: { id: plantId },
    data: {
      ...updateData,
      ...(updateData.location && { coordinates }),
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          devices: true,
          alarms: true,
        },
      },
    },
  });

  return plant;
};

/**
 * Delete plant
 */
const deletePlant = async (plantId, userId, userRole) => {
  // Check if plant exists and user has access
  await getPlantById(plantId, userId, userRole);

  // Delete plant (cascade will handle devices, data, etc.)
  await prisma.plant.delete({
    where: { id: plantId },
  });

  return { message: 'Plant deleted successfully' };
};

/**
 * Get plant statistics
 */
const getPlantStats = async (plantId, userId, userRole) => {
  // Check if plant exists and user has access
  await getPlantById(plantId, userId, userRole);

  // Get device counts by type
  const devicesByType = await prisma.device.groupBy({
    by: ['deviceType', 'status'],
    where: { plantId },
    _count: true,
  });

  // Get total devices
  const totalDevices = await prisma.device.count({
    where: { plantId },
  });

  // Get online devices
  const onlineDevices = await prisma.device.count({
    where: {
      plantId,
      status: 'ONLINE',
    },
  });

  // Get active alarms
  const activeAlarms = await prisma.alarm.count({
    where: {
      plantId,
      status: 'ACTIVE',
    },
  });

  // Get latest data points (last 24 hours)
  const last24Hours = new Date();
  last24Hours.setHours(last24Hours.getHours() - 24);

  const recentDataPoints = await prisma.processedData.count({
    where: {
      plantId,
      timestamp: {
        gte: last24Hours,
      },
    },
  });

  // Get total energy generated (sum of all energy tags)
  const energyData = await prisma.processedData.aggregate({
    where: {
      plantId,
      tag: {
        name: {
          contains: 'energy',
        },
      },
    },
    _sum: {
      value: true,
    },
  });

  return {
    deviceStats: {
      total: totalDevices,
      online: onlineDevices,
      offline: totalDevices - onlineDevices,
      byType: devicesByType,
    },
    alarmStats: {
      active: activeAlarms,
    },
    dataStats: {
      last24Hours: recentDataPoints,
    },
    energyStats: {
      totalGenerated: energyData._sum.value || 0,
    },
  };
};

export {
  createPlant,
  getAllPlants,
  getPlantById,
  updatePlant,
  deletePlant,
  getPlantStats,
};
