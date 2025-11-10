/**
 * Device Service
 * Business logic for device management
 */

import { prisma } from '../config/database.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
// AUDIT LOG - COMMENTED OUT (Enable when needed)
// import { logAuditEntry } from './auditService.js';

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
 * Create device from template
 * Auto-generates deviceId and mqttTopic based on template and plant configuration
 */
const createDeviceFromTemplate = async (deviceData, userId, userRole) => {
  const { plantId, templateId, parentDeviceId, name, deviceCode, ...restData } = deviceData;

  // Check plant access
  const plant = await checkPlantAccess(plantId, userId, userRole);

  // Validate plant has required fields
  if (!plant.plantId) {
    throw new BadRequestError('Plant must have a plantId configured before adding devices');
  }

  if (!plant.mqttBaseTopic) {
    throw new BadRequestError('Plant must have an MQTT base topic configured before adding devices');
  }

  // Get template
  const template = await prisma.deviceTemplate.findUnique({
    where: { id: templateId },
    include: {
      tags: {
        orderBy: {
          displayOrder: 'asc',
        },
      },
    },
  });

  if (!template) {
    throw new NotFoundError('Device template not found');
  }

  if (!template.isActive) {
    throw new BadRequestError('Cannot create device from inactive template');
  }

  // Validate parent device if provided
  let parentDevice = null;
  if (parentDeviceId) {
    parentDevice = await prisma.device.findUnique({
      where: { id: parentDeviceId },
      include: {
        template: {
          select: {
            id: true,
            shortform: true,
            deviceType: true,
          },
        },
      },
    });

    if (!parentDevice) {
      throw new NotFoundError('Parent device not found');
    }

    if (parentDevice.plantId !== plantId) {
      throw new BadRequestError('Parent device must belong to the same plant');
    }

    // Check hierarchy rules
    const hierarchyRule = await prisma.hierarchyRule.findFirst({
      where: {
        OR: [
          // Specific rule for this parent-child combination
          {
            parentTemplateId: parentDevice.templateId,
            childTemplateId: templateId,
            isAllowed: true,
          },
          // Root-level rule (null parent)
          {
            parentTemplateId: null,
            childTemplateId: templateId,
            isAllowed: true,
          },
        ],
      },
    });

    if (!hierarchyRule) {
      throw new BadRequestError(
        `Hierarchy rule does not allow ${template.name} as a child of ${parentDevice.template?.name || 'this device'}`
      );
    }
  } else {
    // No parent - device will be at plant level (root)
    // Allow devices at plant level without hierarchy rule check
    // The plant is conceptually the parent, represented as null in the database
  }

  // Get or create device sequence
  const sequence = await prisma.deviceSequence.upsert({
    where: {
      plantId_templateId: {
        plantId,
        templateId,
      },
    },
    update: {
      lastSequence: {
        increment: 1,
      },
    },
    create: {
      plantId,
      templateId,
      shortform: template.shortform,
      lastSequence: 1,
    },
  });

  // Generate device ID and MQTT topic
  const deviceId = `${template.shortform}_${sequence.lastSequence}`;
  const mqttTopic = `${plant.mqttBaseTopic}/${deviceId}`;

  // Extract selectedTags from restData to handle separately
  const { selectedTags, ...cleanRestData } = restData;

  // Create device with transaction to ensure atomicity
  const device = await prisma.$transaction(async (tx) => {
    // Create the device
    const newDevice = await tx.device.create({
      data: {
        name: name || `${template.name} ${sequence.lastSequence}`,
        deviceId,
        deviceType: template.deviceType,
        mqttTopic,
        templateId,
        plantId,
        parentDeviceId,
        manufacturer: cleanRestData.manufacturer || template.manufacturer,
        model: cleanRestData.model || template.model,
        hierarchyVersion: 1,
        isLocked: false,
        serialNumber: cleanRestData.serialNumber,
        status: cleanRestData.status || 'OFFLINE',
        installationDate: cleanRestData.installationDate,
        metadata: cleanRestData.metadata,
      },
      include: {
        plant: {
          select: {
            id: true,
            name: true,
            plantId: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            shortform: true,
            deviceType: true,
          },
        },
        parentDevice: {
          select: {
            id: true,
            name: true,
            deviceId: true,
            deviceType: true,
          },
        },
      },
    });

    // Create tags from template
    if (template.tags && template.tags.length > 0) {
      // Filter tags based on selectedTags if provided
      const tagsToCreate = selectedTags && selectedTags.length > 0
        ? template.tags.filter((tag) => selectedTags.includes(tag.id))
        : template.tags;

      if (tagsToCreate.length > 0) {
        await tx.tag.createMany({
          data: tagsToCreate.map((templateTag) => ({
            deviceId: newDevice.id,
            templateTagId: templateTag.id,
            name: templateTag.tagName,
            unit: templateTag.unit,
            dataType: templateTag.dataType,
            minValue: templateTag.minValue,
            maxValue: templateTag.maxValue,
            description: templateTag.description,
          })),
        });
      }
    }

    // Create hierarchy history record
    await tx.deviceHierarchyHistory.create({
      data: {
        deviceId: newDevice.id,
        parentDeviceId,
        hierarchyVersion: 1,
        effectiveFrom: new Date(),
        changedBy: userId,
        changeReason: 'Initial device creation',
      },
    });

    return newDevice;
  });

  // Fetch device with all relations including tags
  const deviceWithTags = await prisma.device.findUnique({
    where: { id: device.id },
    include: {
      plant: {
        select: {
          id: true,
          name: true,
          plantId: true,
        },
      },
      template: {
        select: {
          id: true,
          name: true,
          shortform: true,
          deviceType: true,
        },
      },
      parentDevice: {
        select: {
          id: true,
          name: true,
          deviceId: true,
          deviceType: true,
        },
      },
      tags: {
        select: {
          id: true,
          name: true,
          displayName: true,
          unit: true,
          dataType: true,
          minValue: true,
          maxValue: true,
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

  // Log to audit
  await logAuditEntry({
    entityType: 'Device',
    entityId: device.id,
    action: 'CREATE',
    userId,
    changesBefore: null,
    changesAfter: {
      name: device.name,
      deviceId: device.deviceId,
      deviceType: device.deviceType,
      templateId: device.templateId,
      plantId: device.plantId,
      parentDeviceId: device.parentDeviceId,
      mqttTopic: device.mqttTopic,
      tagsCount: template.tags.length,
    },
  });

  return deviceWithTags;
};

/**
 * Create a new device (legacy method - kept for backward compatibility)
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

  // Log to audit
  await logAuditEntry({
    entityType: 'Device',
    entityId: device.id,
    action: 'CREATE',
    userId,
    changesBefore: null,
    changesAfter: {
      name: device.name,
      deviceType: device.deviceType,
      plantId: device.plantId,
      parentDeviceId: device.parentDeviceId,
      status: device.status,
      manufacturer: device.manufacturer,
      model: device.model,
      serialNumber: device.serialNumber,
      installationDate: device.installationDate,
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

  // Log to audit
  await logAuditEntry({
    entityType: 'Device',
    entityId: deviceId,
    action: 'UPDATE',
    userId,
    changesBefore: {
      name: existingDevice.name,
      deviceType: existingDevice.deviceType,
      parentDeviceId: existingDevice.parentDeviceId,
      status: existingDevice.status,
      manufacturer: existingDevice.manufacturer,
      model: existingDevice.model,
      serialNumber: existingDevice.serialNumber,
      installationDate: existingDevice.installationDate,
    },
    changesAfter: {
      name: device.name,
      deviceType: device.deviceType,
      parentDeviceId: device.parentDeviceId,
      status: device.status,
      manufacturer: device.manufacturer,
      model: device.model,
      serialNumber: device.serialNumber,
      installationDate: device.installationDate,
    },
  });

  return device;
};

/**
 * Delete device
 */
const deleteDevice = async (deviceId, userId, userRole) => {
  // Check if device exists and user has access
  const existingDevice = await getDeviceById(deviceId, userId, userRole);

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

  // Log to audit
  await logAuditEntry({
    entityType: 'Device',
    entityId: deviceId,
    action: 'DELETE',
    userId,
    changesBefore: {
      name: existingDevice.name,
      deviceType: existingDevice.deviceType,
      plantId: existingDevice.plantId,
      parentDeviceId: existingDevice.parentDeviceId,
      status: existingDevice.status,
      manufacturer: existingDevice.manufacturer,
      model: existingDevice.model,
      serialNumber: existingDevice.serialNumber,
      installationDate: existingDevice.installationDate,
    },
    changesAfter: null,
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
  createDeviceFromTemplate,
  getAllDevices,
  getDeviceById,
  updateDevice,
  deleteDevice,
  getDeviceHierarchy,
  getDeviceChildren,
};
