/**
 * Device Service
 * Business logic for device management
 */

import { prisma } from '../config/database.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';

/**
 * Check if user has access to plant
 */
const checkPlantAccess = async (plantId, userId, userRole) => {
  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
  });

  if (!plant) {
    throw new NotFoundError('Plant not found');
  }

  // Non-admin users can only access their own plants
  if (userRole !== 'ADMIN' && plant.ownerId !== userId) {
    throw new ForbiddenError('You do not have access to this plant');
  }

  return plant;
};

/**
 * Create a new device
 */
const createDevice = async (deviceData, userId, userRole) => {
  const { plantId, parentDeviceId, ...restData } = deviceData;

  // Check plant access
  await checkPlantAccess(plantId, userId, userRole);

  // Validate parent device if provided
  if (parentDeviceId) {
    const parentDevice = await prisma.device.findUnique({
      where: { id: parentDeviceId },
    });

    if (!parentDevice) {
      throw new NotFoundError('Parent device not found');
    }

    if (parentDevice.plantId !== plantId) {
      throw new BadRequestError('Parent device must belong to the same plant');
    }
  }

  const device = await prisma.device.create({
    data: {
      ...restData,
      plantId,
      parentDeviceId,
    },
    include: {
      plant: {
        select: {
          id: true,
          name: true,
        },
      },
      parentDevice: {
        select: {
          id: true,
          name: true,
          deviceType: true,
        },
      },
      _count: {
        select: {
          childDevices: true,
          tags: true,
        },
      },
    },
  });

  return device;
};

/**
 * Get all devices with filters and pagination
 */
const getAllDevices = async (filters = {}, userId, userRole) => {
  const { plantId, deviceType, status, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

  // Build where clause
  const where = {};

  // Filter by plant
  if (plantId) {
    await checkPlantAccess(plantId, userId, userRole);
    where.plantId = plantId;
  } else if (userRole !== 'ADMIN') {
    // Non-admin users can only see devices from their own plants
    const userPlants = await prisma.plant.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    where.plantId = { in: userPlants.map((p) => p.id) };
  }

  // Filter by device type
  if (deviceType) {
    where.deviceType = deviceType;
  }

  // Filter by status
  if (status) {
    where.status = status;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const take = limit;

  // Get total count
  const total = await prisma.device.count({ where });

  // Get devices
  const devices = await prisma.device.findMany({
    where,
    skip,
    take,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      plant: {
        select: {
          id: true,
          name: true,
        },
      },
      parentDevice: {
        select: {
          id: true,
          name: true,
          deviceType: true,
        },
      },
      _count: {
        select: {
          childDevices: true,
          tags: true,
        },
      },
    },
  });

  return {
    devices,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get device by ID
 */
const getDeviceById = async (deviceId, userId, userRole) => {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: {
      plant: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
      parentDevice: {
        select: {
          id: true,
          name: true,
          deviceType: true,
        },
      },
      childDevices: {
        select: {
          id: true,
          name: true,
          deviceType: true,
          status: true,
        },
      },
      tags: {
        select: {
          id: true,
          name: true,
          unit: true,
          dataType: true,
        },
      },
      _count: {
        select: {
          childDevices: true,
          tags: true,
          alarms: true,
        },
      },
    },
  });

  if (!device) {
    throw new NotFoundError('Device not found');
  }

  // Check access
  if (userRole !== 'ADMIN' && device.plant.ownerId !== userId) {
    throw new ForbiddenError('You do not have access to this device');
  }

  return device;
};

/**
 * Update device
 */
const updateDevice = async (deviceId, updateData, userId, userRole) => {
  // Check if device exists and user has access
  const existingDevice = await getDeviceById(deviceId, userId, userRole);

  // Validate parent device if being updated
  if (updateData.parentDeviceId !== undefined) {
    if (updateData.parentDeviceId) {
      const parentDevice = await prisma.device.findUnique({
        where: { id: updateData.parentDeviceId },
      });

      if (!parentDevice) {
        throw new NotFoundError('Parent device not found');
      }

      if (parentDevice.plantId !== existingDevice.plantId) {
        throw new BadRequestError('Parent device must belong to the same plant');
      }

      // Prevent circular hierarchy
      if (updateData.parentDeviceId === deviceId) {
        throw new BadRequestError('Device cannot be its own parent');
      }
    }
  }

  const device = await prisma.device.update({
    where: { id: deviceId },
    data: updateData,
    include: {
      plant: {
        select: {
          id: true,
          name: true,
        },
      },
      parentDevice: {
        select: {
          id: true,
          name: true,
          deviceType: true,
        },
      },
      _count: {
        select: {
          childDevices: true,
          tags: true,
        },
      },
    },
  });

  return device;
};

/**
 * Delete device
 */
const deleteDevice = async (deviceId, userId, userRole) => {
  // Check if device exists and user has access
  await getDeviceById(deviceId, userId, userRole);

  // Check if device has child devices
  const childCount = await prisma.device.count({
    where: { parentDeviceId: deviceId },
  });

  if (childCount > 0) {
    throw new BadRequestError('Cannot delete device with child devices. Delete or reassign child devices first.');
  }

  // Delete device (cascade will handle tags, data, etc.)
  await prisma.device.delete({
    where: { id: deviceId },
  });

  return { message: 'Device deleted successfully' };
};

/**
 * Get device hierarchy for a plant
 */
const getDeviceHierarchy = async (plantId, userId, userRole) => {
  // Check plant access
  await checkPlantAccess(plantId, userId, userRole);

  // Get all devices for the plant
  const devices = await prisma.device.findMany({
    where: { plantId },
    include: {
      childDevices: {
        include: {
          childDevices: true, // Get two levels deep
        },
      },
      _count: {
        select: {
          tags: true,
        },
      },
    },
  });

  // Build hierarchy tree (root devices are those without parents)
  const rootDevices = devices.filter((d) => !d.parentDeviceId);

  return rootDevices;
};

/**
 * Get device children
 */
const getDeviceChildren = async (deviceId, userId, userRole) => {
  // Check if device exists and user has access
  await getDeviceById(deviceId, userId, userRole);

  const children = await prisma.device.findMany({
    where: { parentDeviceId: deviceId },
    include: {
      _count: {
        select: {
          childDevices: true,
          tags: true,
        },
      },
    },
  });

  return children;
};

export {
  createDevice,
  getAllDevices,
  getDeviceById,
  updateDevice,
  deleteDevice,
  getDeviceHierarchy,
  getDeviceChildren,
};
