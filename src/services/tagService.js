/**
 * Tag Service
 * Business logic for tag management
 */

import { prisma } from '../config/database.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors.js';
// AUDIT LOG - COMMENTED OUT (Enable when needed)
// import { logAuditEntry } from './auditService.js';

/**
 * Check if user has access to device
 */
const checkDeviceAccess = async (deviceId, userId, userRole) => {
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

  if (userRole !== 'ADMIN' && device.plant.ownerId !== userId) {
    throw new ForbiddenError('You do not have access to this device');
  }

  return device;
};

/**
 * Create a new tag for a device
 */
const createTag = async (tagData, userId, userRole) => {
  const { deviceId, name, description, unit, dataType, minValue, maxValue, metadata } = tagData;

  // Check device access
  await checkDeviceAccess(deviceId, userId, userRole);

  // Check if tag with same name already exists for this device
  const existingTag = await prisma.tag.findUnique({
    where: {
      deviceId_name: {
        deviceId,
        name,
      },
    },
  });

  if (existingTag) {
    throw new BadRequestError(`Tag with name '${name}' already exists for this device`);
  }

  // Create tag
  const tag = await prisma.tag.create({
    data: {
      deviceId,
      name,
      description,
      unit,
      dataType,
      minValue,
      maxValue,
      metadata,
    },
    include: {
      device: {
        select: {
          id: true,
          name: true,
          deviceType: true,
        },
      },
    },
  });

  // Log to audit
  await logAuditEntry({
    entityType: 'Tag',
    entityId: tag.id,
    action: 'CREATE',
    userId,
    changesBefore: null,
    changesAfter: {
      deviceId: tag.deviceId,
      name: tag.name,
      description: tag.description,
      unit: tag.unit,
      dataType: tag.dataType,
      minValue: tag.minValue,
      maxValue: tag.maxValue,
    },
  });

  return tag;
};

/**
 * Get all tags with filters and pagination
 */
const getAllTags = async (filters = {}, userId, userRole) => {
  const { deviceId, plantId, dataType, page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

  const where = {};

  // Filter by device
  if (deviceId) {
    await checkDeviceAccess(deviceId, userId, userRole);
    where.deviceId = deviceId;
  }

  // Filter by plant
  if (plantId) {
    // Check plant access
    const plant = await prisma.plant.findUnique({
      where: { id: plantId },
    });

    if (!plant) {
      throw new NotFoundError('Plant not found');
    }

    if (userRole !== 'ADMIN' && plant.ownerId !== userId) {
      throw new ForbiddenError('You do not have access to this plant');
    }

    // Get devices for this plant
    const plantDevices = await prisma.device.findMany({
      where: { plantId },
      select: { id: true },
    });

    where.deviceId = { in: plantDevices.map((d) => d.id) };
  }

  // If no plant filter and not admin, filter by user's plants
  if (!plantId && userRole !== 'ADMIN') {
    const userPlants = await prisma.plant.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    const userDevices = await prisma.device.findMany({
      where: { plantId: { in: userPlants.map((p) => p.id) } },
      select: { id: true },
    });

    where.deviceId = { in: userDevices.map((d) => d.id) };
  }

  // Filter by data type
  if (dataType) {
    where.dataType = dataType;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const take = limit;

  // Get total count
  const total = await prisma.tag.count({ where });

  // Get tags
  const tags = await prisma.tag.findMany({
    where,
    skip,
    take,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      device: {
        select: {
          id: true,
          name: true,
          deviceType: true,
          plantId: true,
          plant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          processedData: true,
          alarms: true,
        },
      },
    },
  });

  return {
    tags,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get tag by ID
 */
const getTagById = async (tagId, userId, userRole) => {
  const tag = await prisma.tag.findUnique({
    where: { id: tagId },
    include: {
      device: {
        select: {
          id: true,
          name: true,
          deviceType: true,
          plantId: true,
          plant: {
            select: {
              id: true,
              name: true,
              ownerId: true,
            },
          },
        },
      },
      _count: {
        select: {
          processedData: true,
          alarms: true,
        },
      },
    },
  });

  if (!tag) {
    throw new NotFoundError('Tag not found');
  }

  // Check access
  if (userRole !== 'ADMIN' && tag.device.plant.ownerId !== userId) {
    throw new ForbiddenError('You do not have access to this tag');
  }

  return tag;
};

/**
 * Update tag
 */
const updateTag = async (tagId, updateData, userId, userRole) => {
  // Get existing tag
  const existingTag = await getTagById(tagId, userId, userRole);

  // If updating name, check for conflicts
  if (updateData.name && updateData.name !== existingTag.name) {
    const conflictTag = await prisma.tag.findUnique({
      where: {
        deviceId_name: {
          deviceId: existingTag.deviceId,
          name: updateData.name,
        },
      },
    });

    if (conflictTag) {
      throw new BadRequestError(`Tag with name '${updateData.name}' already exists for this device`);
    }
  }

  // Update tag
  const updatedTag = await prisma.tag.update({
    where: { id: tagId },
    data: {
      ...updateData,
      updatedAt: new Date(),
    },
    include: {
      device: {
        select: {
          id: true,
          name: true,
          deviceType: true,
        },
      },
    },
  });

  // Log to audit
  await logAuditEntry({
    entityType: 'Tag',
    entityId: tagId,
    action: 'UPDATE',
    userId,
    changesBefore: {
      name: existingTag.name,
      description: existingTag.description,
      unit: existingTag.unit,
      dataType: existingTag.dataType,
      minValue: existingTag.minValue,
      maxValue: existingTag.maxValue,
    },
    changesAfter: {
      name: updatedTag.name,
      description: updatedTag.description,
      unit: updatedTag.unit,
      dataType: updatedTag.dataType,
      minValue: updatedTag.minValue,
      maxValue: updatedTag.maxValue,
    },
  });

  return updatedTag;
};

/**
 * Delete tag
 */
const deleteTag = async (tagId, userId, userRole) => {
  // Get existing tag and check access
  const existingTag = await getTagById(tagId, userId, userRole);

  // Check if tag has associated data
  const dataCount = await prisma.processedData.count({
    where: { tagId },
  });

  if (dataCount > 0) {
    throw new BadRequestError(`Cannot delete tag with ${dataCount} associated data points. Consider archiving instead.`);
  }

  // Delete tag
  await prisma.tag.delete({
    where: { id: tagId },
  });

  // Log to audit
  await logAuditEntry({
    entityType: 'Tag',
    entityId: tagId,
    action: 'DELETE',
    userId,
    changesBefore: {
      deviceId: existingTag.deviceId,
      name: existingTag.name,
      description: existingTag.description,
      unit: existingTag.unit,
      dataType: existingTag.dataType,
      minValue: existingTag.minValue,
      maxValue: existingTag.maxValue,
    },
    changesAfter: null,
  });

  return { message: 'Tag deleted successfully' };
};

/**
 * Get tags for a specific device
 */
const getDeviceTags = async (deviceId, userId, userRole) => {
  // Check device access
  await checkDeviceAccess(deviceId, userId, userRole);

  const tags = await prisma.tag.findMany({
    where: { deviceId },
    include: {
      _count: {
        select: {
          processedData: true,
          alarms: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return tags;
};

/**
 * Bulk create tags for a device
 */
const bulkCreateTags = async (deviceId, tagsData, userId, userRole) => {
  // Check device access
  await checkDeviceAccess(deviceId, userId, userRole);

  // Check for duplicate names in input
  const names = tagsData.map((t) => t.name);
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
  if (duplicates.length > 0) {
    throw new BadRequestError(`Duplicate tag names in request: ${duplicates.join(', ')}`);
  }

  // Check for existing tags
  const existingTags = await prisma.tag.findMany({
    where: {
      deviceId,
      name: { in: names },
    },
  });

  if (existingTags.length > 0) {
    const existingNames = existingTags.map((t) => t.name).join(', ');
    throw new BadRequestError(`Tags already exist: ${existingNames}`);
  }

  // Create all tags
  const tags = await prisma.$transaction(
    tagsData.map((tagData) =>
      prisma.tag.create({
        data: {
          deviceId,
          name: tagData.name,
          description: tagData.description,
          unit: tagData.unit,
          dataType: tagData.dataType || 'FLOAT',
          minValue: tagData.minValue,
          maxValue: tagData.maxValue,
          metadata: tagData.metadata,
        },
      })
    )
  );

  return tags;
};

/**
 * Get tag statistics for a device
 */
const getDeviceTagStats = async (deviceId, userId, userRole) => {
  await checkDeviceAccess(deviceId, userId, userRole);

  const tags = await prisma.tag.findMany({
    where: { deviceId },
    include: {
      _count: {
        select: {
          processedData: true,
          alarms: true,
        },
      },
    },
  });

  const stats = {
    totalTags: tags.length,
    tagsByDataType: {},
    tagsWithAlarms: 0,
    tagsWithData: 0,
    totalDataPoints: 0,
    totalAlarms: 0,
  };

  tags.forEach((tag) => {
    // Count by data type
    stats.tagsByDataType[tag.dataType] = (stats.tagsByDataType[tag.dataType] || 0) + 1;

    // Count tags with data/alarms
    if (tag._count.processedData > 0) stats.tagsWithData++;
    if (tag._count.alarms > 0) stats.tagsWithAlarms++;

    // Sum totals
    stats.totalDataPoints += tag._count.processedData;
    stats.totalAlarms += tag._count.alarms;
  });

  return stats;
};

/**
 * Get recent data for a tag
 */
const getTagRecentData = async (tagId, limit = 100, userId, userRole) => {
  // Check tag access
  await getTagById(tagId, userId, userRole);

  const recentData = await prisma.processedData.findMany({
    where: { tagId },
    take: limit,
    orderBy: {
      timestamp: 'desc',
    },
    select: {
      id: true,
      timestamp: true,
      value: true,
      quality: true,
    },
  });

  return recentData;
};

/**
 * Search tags by name across all accessible devices
 */
const searchTags = async (searchTerm, userId, userRole) => {
  const where = {
    name: {
      contains: searchTerm,
      mode: 'insensitive',
    },
  };

  // If not admin, filter by user's plants
  if (userRole !== 'ADMIN') {
    const userPlants = await prisma.plant.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    const userDevices = await prisma.device.findMany({
      where: { plantId: { in: userPlants.map((p) => p.id) } },
      select: { id: true },
    });

    where.deviceId = { in: userDevices.map((d) => d.id) };
  }

  const tags = await prisma.tag.findMany({
    where,
    take: 50, // Limit search results
    include: {
      device: {
        select: {
          id: true,
          name: true,
          deviceType: true,
          plant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return tags;
};

export {
  createTag,
  getAllTags,
  getTagById,
  updateTag,
  deleteTag,
  getDeviceTags,
  bulkCreateTags,
  getDeviceTagStats,
  getTagRecentData,
  searchTags,
};
