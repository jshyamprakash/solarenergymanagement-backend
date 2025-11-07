/**
 * Hierarchy Service
 * Advanced hierarchy management and operations
 */

import { prisma } from '../config/database.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors.js';

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

  if (userRole !== 'ADMIN' && plant.ownerId !== userId) {
    throw new ForbiddenError('You do not have access to this plant');
  }

  return plant;
};

/**
 * Build complete hierarchy tree for a plant
 * Returns nested structure with all devices
 */
const getPlantHierarchyTree = async (plantId, userId, userRole) => {
  // Check plant access
  await checkPlantAccess(plantId, userId, userRole);

  // Get all devices for the plant
  const devices = await prisma.device.findMany({
    where: { plantId },
    include: {
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
          processedData: true,
          alarms: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Build device map for quick lookup
  const deviceMap = new Map();
  devices.forEach((device) => {
    deviceMap.set(device.id, {
      ...device,
      children: [],
    });
  });

  // Build tree structure
  const rootDevices = [];

  devices.forEach((device) => {
    const deviceNode = deviceMap.get(device.id);

    if (device.parentDeviceId) {
      const parent = deviceMap.get(device.parentDeviceId);
      if (parent) {
        parent.children.push(deviceNode);
      } else {
        // Parent not found, treat as root
        rootDevices.push(deviceNode);
      }
    } else {
      // Root device (no parent)
      rootDevices.push(deviceNode);
    }
  });

  return {
    plantId,
    totalDevices: devices.length,
    rootDevices,
    devices: Array.from(deviceMap.values()),
  };
};

/**
 * Get hierarchy statistics for a plant
 */
const getHierarchyStats = async (plantId, userId, userRole) => {
  await checkPlantAccess(plantId, userId, userRole);

  const devices = await prisma.device.findMany({
    where: { plantId },
    select: {
      id: true,
      deviceType: true,
      status: true,
      parentDeviceId: true,
      _count: {
        select: {
          childDevices: true,
          tags: true,
        },
      },
    },
  });

  // Calculate stats
  const stats = {
    totalDevices: devices.length,
    rootDevices: devices.filter((d) => !d.parentDeviceId).length,
    devicesByType: {},
    devicesByStatus: {},
    maxDepth: 0,
    avgChildrenPerDevice: 0,
  };

  // Count by type
  devices.forEach((device) => {
    stats.devicesByType[device.deviceType] = (stats.devicesByType[device.deviceType] || 0) + 1;
    stats.devicesByStatus[device.status] = (stats.devicesByStatus[device.status] || 0) + 1;
  });

  // Calculate max depth
  const calculateDepth = (deviceId, currentDepth = 0) => {
    const children = devices.filter((d) => d.parentDeviceId === deviceId);
    if (children.length === 0) return currentDepth;

    return Math.max(...children.map((child) => calculateDepth(child.id, currentDepth + 1)));
  };

  const rootDeviceIds = devices.filter((d) => !d.parentDeviceId).map((d) => d.id);
  stats.maxDepth = Math.max(...rootDeviceIds.map((id) => calculateDepth(id)));

  // Calculate average children per device
  const totalChildren = devices.reduce((sum, d) => sum + d._count.childDevices, 0);
  stats.avgChildrenPerDevice =
    devices.length > 0 ? (totalChildren / devices.length).toFixed(2) : 0;

  return stats;
};

/**
 * Move device to new parent
 * Validates circular references and updates hierarchy
 */
const moveDevice = async (deviceId, newParentId, userId, userRole) => {
  // Get device
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: {
      plant: {
        select: {
          id: true,
          ownerId: true,
        },
      },
    },
  });

  if (!device) {
    throw new NotFoundError('Device not found');
  }

  // Check access
  if (userRole !== 'ADMIN' && device.plant.ownerId !== userId) {
    throw new ForbiddenError('You do not have permission to move this device');
  }

  // If moving to root (no parent), newParentId will be null
  if (newParentId) {
    // Validate new parent exists
    const newParent = await prisma.device.findUnique({
      where: { id: newParentId },
    });

    if (!newParent) {
      throw new NotFoundError('New parent device not found');
    }

    // Validate both devices belong to same plant
    if (device.plantId !== newParent.plantId) {
      throw new BadRequestError('Devices must belong to the same plant');
    }

    // Check for circular reference
    const wouldCreateCycle = await checkCircularReference(deviceId, newParentId);
    if (wouldCreateCycle) {
      throw new BadRequestError('Cannot move device: would create circular reference');
    }
  }

  // Update device parent
  const updatedDevice = await prisma.device.update({
    where: { id: deviceId },
    data: {
      parentDeviceId: newParentId,
      updatedAt: new Date(),
    },
    include: {
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
        },
      },
    },
  });

  return updatedDevice;
};

/**
 * Check if moving device would create circular reference
 */
const checkCircularReference = async (deviceId, newParentId) => {
  if (deviceId === newParentId) {
    return true; // Device cannot be its own parent
  }

  // Get all descendants of the device
  const descendants = await getDescendants(deviceId);
  const descendantIds = descendants.map((d) => d.id);

  // If new parent is a descendant, it would create a cycle
  return descendantIds.includes(newParentId);
};

/**
 * Get all descendants of a device (recursively)
 */
const getDescendants = async (deviceId) => {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: {
      childDevices: {
        include: {
          childDevices: {
            include: {
              childDevices: {
                include: {
                  childDevices: true, // 4 levels deep
                },
              },
            },
          },
        },
      },
    },
  });

  if (!device) return [];

  const descendants = [];

  const collectDescendants = (dev) => {
    if (dev.childDevices && dev.childDevices.length > 0) {
      dev.childDevices.forEach((child) => {
        descendants.push(child);
        collectDescendants(child);
      });
    }
  };

  collectDescendants(device);
  return descendants;
};

/**
 * Get device path from root to device (breadcrumb)
 */
const getDevicePath = async (deviceId, userId, userRole) => {
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
    },
  });

  if (!device) {
    throw new NotFoundError('Device not found');
  }

  // Check access
  if (userRole !== 'ADMIN' && device.plant.ownerId !== userId) {
    throw new ForbiddenError('You do not have access to this device');
  }

  const path = [];
  let currentDevice = device;

  // Build path from device to root
  while (currentDevice) {
    path.unshift({
      id: currentDevice.id,
      name: currentDevice.name,
      deviceType: currentDevice.deviceType,
      parentDeviceId: currentDevice.parentDeviceId,
    });

    if (currentDevice.parentDeviceId) {
      currentDevice = await prisma.device.findUnique({
        where: { id: currentDevice.parentDeviceId },
      });
    } else {
      currentDevice = null;
    }
  }

  return {
    deviceId,
    plantId: device.plantId,
    plantName: device.plant.name,
    depth: path.length - 1,
    path,
  };
};

/**
 * Validate entire plant hierarchy for issues
 */
const validateHierarchy = async (plantId, userId, userRole) => {
  await checkPlantAccess(plantId, userId, userRole);

  const devices = await prisma.device.findMany({
    where: { plantId },
    select: {
      id: true,
      name: true,
      deviceType: true,
      parentDeviceId: true,
    },
  });

  const issues = [];

  // Check for orphaned devices (parent doesn't exist)
  devices.forEach((device) => {
    if (device.parentDeviceId) {
      const parentExists = devices.some((d) => d.id === device.parentDeviceId);
      if (!parentExists) {
        issues.push({
          deviceId: device.id,
          deviceName: device.name,
          type: 'ORPHANED',
          message: `Device has parent ID ${device.parentDeviceId} which doesn't exist`,
        });
      }
    }
  });

  // Check for potential circular references (shouldn't exist but good to validate)
  for (const device of devices) {
    if (device.parentDeviceId) {
      const visited = new Set();
      let current = device;
      let hasCircle = false;

      while (current && current.parentDeviceId) {
        if (visited.has(current.id)) {
          hasCircle = true;
          break;
        }
        visited.add(current.id);
        current = devices.find((d) => d.id === current.parentDeviceId);
      }

      if (hasCircle) {
        issues.push({
          deviceId: device.id,
          deviceName: device.name,
          type: 'CIRCULAR_REFERENCE',
          message: 'Device is part of a circular reference',
        });
      }
    }
  }

  return {
    plantId,
    isValid: issues.length === 0,
    totalDevices: devices.length,
    issuesFound: issues.length,
    issues,
  };
};

/**
 * Get siblings of a device (devices with same parent)
 */
const getDeviceSiblings = async (deviceId, userId, userRole) => {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: {
      plant: {
        select: {
          ownerId: true,
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

  const siblings = await prisma.device.findMany({
    where: {
      plantId: device.plantId,
      parentDeviceId: device.parentDeviceId,
      id: { not: deviceId }, // Exclude the device itself
    },
    include: {
      _count: {
        select: {
          childDevices: true,
          tags: true,
        },
      },
    },
  });

  return siblings;
};

export {
  getPlantHierarchyTree,
  getHierarchyStats,
  moveDevice,
  getDevicePath,
  validateHierarchy,
  getDeviceSiblings,
  checkCircularReference,
  getDescendants,
};
