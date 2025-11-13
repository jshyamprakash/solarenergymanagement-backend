/**
 * Plant Service
 * Business logic for plant management
 */

import { prisma } from '../config/database.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
// AUDIT LOG - COMMENTED OUT (Enable when needed)
// import { logAuditEntry } from './auditService.js';
import {
  provisionPlantIoT,
  deprovisionPlantIoT,
  isAwsIotEnabled,
  storeCertificateSecurely,
  generateMqttTopic,
  generateRuleName,
} from '../modules/aws-iot/index.js';
import logger from '../config/logger.js';

/**
 * Validate plantId format
 */
const validatePlantId = (plantId) => {
  const plantIdRegex = /^[A-Z0-9_-]{3,20}$/;
  if (!plantIdRegex.test(plantId)) {
    throw new BadRequestError(
      'Plant ID must be 3-20 characters, containing only uppercase letters, numbers, underscores, and hyphens'
    );
  }
};

/**
 * Create a new plant
 */
const createPlant = async (plantData, userId) => {
  console.log('=== PLANT SERVICE CREATE DEBUG ===');
  console.log('Received plantData:', plantData);
  console.log('Received userId:', userId);
  console.log('Type of userId:', typeof userId);
  const { location, plantId, mqttBaseTopic, devices = [], ...restData } = plantData;

  // Validate required fields
  if (!plantId) {
    throw new BadRequestError('Plant ID is required');
  }

  if (!mqttBaseTopic) {
    throw new BadRequestError('MQTT base topic is required');
  }

  // Validate plantId format
  validatePlantId(plantId);

  // Check if plantId already exists (must be unique across application)
  const existingPlant = await prisma.plant.findUnique({
    where: { plantId },
  });

  if (existingPlant) {
    throw new BadRequestError(`Plant ID "${plantId}" already exists. Please choose a different Plant ID.`);
  }

  // Generate coordinates string for indexing
  const coordinates = `${location.lat},${location.lng}`;

  // Step 1: Create plant and devices in a transaction
  let plant = await prisma.$transaction(async (tx) => {
    // Create the plant
    const createdPlant = await tx.plant.create({
      data: {
        ...restData,
        plantId,
        mqttBaseTopic,
        location,
        coordinates,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create user-plant mapping (assign plant to creator)
    await tx.userPlantMap.create({
      data: {
        userId,
        plantId: createdPlant.id,
      },
    });

    // Create devices if provided
    if (devices && devices.length > 0) {
      const deviceIdMap = {}; // Maps device index to created device ID

      for (let i = 0; i < devices.length; i++) {
        const deviceData = devices[i];

        // Get template
        const template = await tx.deviceTemplate.findUnique({
          where: { id: deviceData.templateId },
          include: {
            tags: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        });

        if (!template) {
          throw new BadRequestError(`Device template not found: ${deviceData.templateId}`);
        }

        if (!template.isActive) {
          throw new BadRequestError(`Device template "${template.name}" is not active`);
        }

        // Get or create device sequence
        const sequence = await tx.deviceSequence.upsert({
          where: {
            plantId_templateId: {
              plantId: createdPlant.id,
              templateId: template.id,
            },
          },
          update: {
            lastSequence: {
              increment: 1,
            },
          },
          create: {
            plantId: createdPlant.id,
            templateId: template.id,
            shortform: template.shortform,
            lastSequence: 1,
          },
        });

        // Generate device ID and MQTT topic
        const deviceId = `${template.shortform}_${sequence.lastSequence}`;
        const mqttTopic = `${createdPlant.mqttBaseTopic}/${deviceId}`;

        // Determine parent device ID
        let parentDeviceId = null;
        if (deviceData.parentDeviceId === 'PLANT' || deviceData.parentDeviceId === null || deviceData.parentDeviceId === undefined) {
          parentDeviceId = null; // Parent is the plant
        } else {
          // Parent is another device - look up in deviceIdMap
          const parentIndex = typeof deviceData.parentDeviceId === 'number'
            ? deviceData.parentDeviceId
            : parseInt(deviceData.parentDeviceId);
          parentDeviceId = deviceIdMap[parentIndex] || null;
        }

        // Create the device
        const createdDevice = await tx.device.create({
          data: {
            name: deviceData.name || `${template.name} ${sequence.lastSequence}`,
            deviceId,
            deviceType: template.deviceType,
            mqttTopic,
            templateId: template.id,
            plantId: createdPlant.id,
            parentDeviceId,
            manufacturer: deviceData.manufacturer || template.manufacturer,
            model: deviceData.model || template.modelNumber,
            hierarchyVersion: 1,
            isLocked: false,
            serialNumber: deviceData.serialNumber,
            status: deviceData.status || 'OFFLINE',
            installationDate: deviceData.installationDate,
            metadata: deviceData.metadata,
          },
        });

        // Store the created device ID for parent references
        deviceIdMap[i] = createdDevice.id;

        // Create tags from template
        if (template.tags && template.tags.length > 0) {
          const selectedTags = deviceData.selectedTags || [];
          const tagsToCreate = selectedTags.length > 0
            ? template.tags.filter((tag) => selectedTags.includes(tag.id))
            : template.tags;

          if (tagsToCreate.length > 0) {
            await tx.tag.createMany({
              data: tagsToCreate.map((templateTag) => ({
                deviceId: createdDevice.id,
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
      }
    }

    return createdPlant;
  });

  // Step 2: Provision AWS IoT resources if enabled
  if (isAwsIotEnabled()) {
    try {
      logger.info('Provisioning AWS IoT resources for plant', {
        plantId: plant.id,
        plantName: plant.name,
      });

      const iotResources = await provisionPlantIoT(plant.id, plant.name);

      // Encrypt and store certificate data securely
      const { encryptedCertificate, encryptedPrivateKey } = await storeCertificateSecurely(
        plant.id,
        iotResources.certificatePem,
        iotResources.privateKey
      );

      // Update plant with IoT resource information
      plant = await prisma.plant.update({
        where: { id: plant.id },
        data: {
          iotThingName: iotResources.thingName,
          iotThingArn: iotResources.thingArn,
          iotCertificateId: iotResources.certificateId,
          iotCertificateArn: iotResources.certificateArn,
          iotPolicyName: iotResources.policyName,
          mqttTopic: generateMqttTopic(plant.id),
          // Store encrypted certificate data in metadata
          metadata: {
            ...plant.metadata,
            encryptedCertificate,
            encryptedPrivateKey,
            iotRuleName: iotResources.ruleName,
          },
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      logger.info('AWS IoT resources provisioned successfully', {
        plantId: plant.id,
        thingName: iotResources.thingName,
      });
    } catch (error) {
      logger.error('Failed to provision AWS IoT resources - plant created without IoT', {
        error: error.message,
        plantId: plant.id,
      });

      // Plant is created but IoT provisioning failed
      // Depending on requirements, you could:
      // 1. Delete the plant and throw error (strict)
      // 2. Keep plant without IoT (graceful degradation) - current approach
      // For now, we keep the plant and log the error
    }
  }

  // AUDIT LOG - COMMENTED OUT (Enable when needed)
  // Log to audit
  // await logAuditEntry({
  //   entityType: 'Plant',
  //   entityId: plant.id,
  //   action: 'CREATE',
  //   userId,
  //   changesBefore: null,
  //   changesAfter: {
  //     name: plant.name,
  //     plantId: plant.plantId,
  //     mqttBaseTopic: plant.mqttBaseTopic,
  //     location: plant.location,
  //     capacity: plant.capacity,
  //     status: plant.status,
  //     installationDate: plant.installationDate,
  //     createdById: plant.createdById,
  //     iotThingName: plant.iotThingName,
  //     iotPolicyName: plant.iotPolicyName,
  //   },
  // });

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

  // Non-admin users can only see plants assigned to them
  if (userRole !== 'ADMIN') {
    where.userMaps = {
      some: {
        userId: userId,
      },
    };
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
      createdBy: {
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
          userMaps: true,
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
const getPlantById = async (plantId, userId, userRole, includeDevices = false) => {
  console.log('getPlantById called with includeDevices:', includeDevices);
  console.log('getPlantById called with plantId:', plantId, 'type:', typeof plantId);

  const includeClause = {
    createdBy: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    userMaps: {
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    },
    _count: {
      select: {
        devices: true,
        alarms: true,
      },
    },
  };

  if (includeDevices) {
    console.log('Including devices in query');
    includeClause.devices = {
      include: {
        template: {
          select: {
            id: true,
            name: true,
            deviceType: true,
            shortform: true,
          },
        },
        parentDevice: {
          select: {
            id: true,
            name: true,
            deviceId: true,
          },
        },
        tags: {
          include: {
            templateTag: {
              select: {
                id: true,
                tagName: true,
                displayName: true,
                description: true,
              },
            },
          },
        },
      },
    };
  }

  // Convert plantId to integer if it's a string
  const id = typeof plantId === 'string' ? parseInt(plantId, 10) : plantId;

  const plant = await prisma.plant.findUnique({
    where: { id },
    include: includeClause,
  });

  console.log('Found plant:', plant?.name, 'devices count:', plant?.devices?.length);

  if (!plant) {
    throw new NotFoundError('Plant not found');
  }

  // Check access - non-admin users can only access plants assigned to them
  if (userRole !== 'ADMIN') {
    const hasAccess = plant.userMaps.some((map) => map.userId === userId);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this plant');
    }
  }

  return plant;
};

/**
 * Update plant
 */
const updatePlant = async (plantId, updateData, userId, userRole) => {
  // Check if plant exists and user has access
  const existingPlant = await getPlantById(plantId, userId, userRole);

  const { devices, ...plantUpdateData } = updateData;

  console.log('Update Plant - Received data:', {
    hasDevices: devices !== undefined,
    devicesCount: devices?.length,
    devices: devices
  });

  // If plantId is being changed, validate and check for constraints
  if (plantUpdateData.plantId && plantUpdateData.plantId !== existingPlant.plantId) {
    // Validate new plantId format
    validatePlantId(plantUpdateData.plantId);

    // Check if new plantId already exists
    const conflictingPlant = await prisma.plant.findUnique({
      where: { plantId: plantUpdateData.plantId },
    });

    if (conflictingPlant) {
      throw new BadRequestError(
        `Plant ID "${plantUpdateData.plantId}" already exists. Please choose a different Plant ID.`
      );
    }

    // Check if plant has devices
    const deviceCount = await prisma.device.count({
      where: { plantId },
    });

    if (deviceCount > 0) {
      throw new BadRequestError(
        `Cannot change Plant ID - plant has ${deviceCount} devices. ` +
          `Device IDs are based on the Plant ID and will not be updated automatically.`
      );
    }
  }

  // Update coordinates if location changed
  let coordinates = existingPlant.coordinates;
  if (plantUpdateData.location) {
    coordinates = `${plantUpdateData.location.lat},${plantUpdateData.location.lng}`;
  }

  // Update plant and handle devices in a transaction
  const plant = await prisma.$transaction(async (tx) => {
    // Update the plant
    const updatedPlant = await tx.plant.update({
      where: { id: plantId },
      data: {
        ...plantUpdateData,
        ...(plantUpdateData.location && { coordinates }),
      },
      include: {
        createdBy: {
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

    // Handle devices if provided (delete existing and create new)
    if (devices !== undefined) {
      // Delete all existing devices for this plant first
      await tx.device.deleteMany({
        where: { plantId: updatedPlant.id },
      });

      // Create new devices if any
      if (devices.length > 0) {
        const deviceIdMap = {}; // Maps device index to created device ID

        for (let i = 0; i < devices.length; i++) {
          const deviceData = devices[i];

        // Get template
        const template = await tx.deviceTemplate.findUnique({
          where: { id: deviceData.templateId },
          include: {
            tags: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        });

        if (!template) {
          throw new BadRequestError(`Device template not found: ${deviceData.templateId}`);
        }

        if (!template.isActive) {
          throw new BadRequestError(`Device template "${template.name}" is not active`);
        }

        // Get or create device sequence
        const sequence = await tx.deviceSequence.upsert({
          where: {
            plantId_templateId: {
              plantId: updatedPlant.id,
              templateId: template.id,
            },
          },
          update: {
            lastSequence: {
              increment: 1,
            },
          },
          create: {
            plantId: updatedPlant.id,
            templateId: template.id,
            shortform: template.shortform,
            lastSequence: 1,
          },
        });

        // Generate device ID and MQTT topic
        const deviceId = `${template.shortform}_${sequence.lastSequence}`;
        const mqttTopic = `${updatedPlant.mqttBaseTopic}/${deviceId}`;

        // Determine parent device ID
        let parentDeviceId = null;
        if (deviceData.parentDeviceId === 'PLANT' || deviceData.parentDeviceId === null || deviceData.parentDeviceId === undefined) {
          parentDeviceId = null; // Parent is the plant
        } else {
          // Parent is another device - look up in deviceIdMap
          const parentIndex = typeof deviceData.parentDeviceId === 'number'
            ? deviceData.parentDeviceId
            : parseInt(deviceData.parentDeviceId);
          parentDeviceId = deviceIdMap[parentIndex] || null;
        }

        // Create the device
        const createdDevice = await tx.device.create({
          data: {
            name: deviceData.name || `${template.name} ${sequence.lastSequence}`,
            deviceId,
            deviceType: template.deviceType,
            mqttTopic,
            templateId: template.id,
            plantId: updatedPlant.id,
            parentDeviceId,
            manufacturer: deviceData.manufacturer || template.manufacturer,
            model: deviceData.model || template.modelNumber,
            hierarchyVersion: 1,
            isLocked: false,
            serialNumber: deviceData.serialNumber,
            status: deviceData.status || 'OFFLINE',
            installationDate: deviceData.installationDate,
            metadata: deviceData.metadata,
          },
        });

        // Store the created device ID for parent references
        deviceIdMap[i] = createdDevice.id;

        // Create tags from template
        if (template.tags && template.tags.length > 0) {
          const selectedTags = deviceData.selectedTags || [];
          const tagsToCreate = selectedTags.length > 0
            ? template.tags.filter((tag) => selectedTags.includes(tag.id))
            : template.tags;

          if (tagsToCreate.length > 0) {
            await tx.tag.createMany({
              data: tagsToCreate.map((templateTag) => ({
                deviceId: createdDevice.id,
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
      }
      }
    }

    return updatedPlant;
  });

  // AUDIT LOG - COMMENTED OUT (Enable when needed)
  // Log to audit
  // await logAuditEntry({
  //   entityType: 'Plant',
  //   entityId: plantId,
  //   action: 'UPDATE',
  //   userId,
  //   changesBefore: {
  //     name: existingPlant.name,
  //     plantId: existingPlant.plantId,
  //     mqttBaseTopic: existingPlant.mqttBaseTopic,
  //     location: existingPlant.location,
  //     capacity: existingPlant.capacity,
  //     status: existingPlant.status,
  //     installationDate: existingPlant.installationDate,
  //   },
  //   changesAfter: {
  //     name: plant.name,
  //     plantId: plant.plantId,
  //     mqttBaseTopic: plant.mqttBaseTopic,
  //     location: plant.location,
  //     capacity: plant.capacity,
  //     status: plant.status,
  //     installationDate: plant.installationDate,
  //   },
  // });

  return plant;
};

/**
 * Delete plant
 */
const deletePlant = async (plantId, userId, userRole) => {
  // Check if plant exists and user has access
  const existingPlant = await getPlantById(plantId, userId, userRole);

  // Step 1: Deprovision AWS IoT resources if they exist
  if (isAwsIotEnabled() && existingPlant.iotThingName) {
    try {
      logger.info('Deprovisioning AWS IoT resources for plant', {
        plantId,
        thingName: existingPlant.iotThingName,
      });

      // Extract IoT rule name from metadata
      const iotRuleName = existingPlant.metadata?.iotRuleName || generateRuleName(plantId);

      await deprovisionPlantIoT(plantId, {
        iotThingName: existingPlant.iotThingName,
        iotCertificateId: existingPlant.iotCertificateId,
        iotCertificateArn: existingPlant.iotCertificateArn,
        iotPolicyName: existingPlant.iotPolicyName,
        iotRuleName,
      });

      logger.info('AWS IoT resources deprovisioned successfully', {
        plantId,
        thingName: existingPlant.iotThingName,
      });
    } catch (error) {
      logger.error('Failed to deprovision AWS IoT resources', {
        error: error.message,
        plantId,
        thingName: existingPlant.iotThingName,
      });

      // Log error but continue with plant deletion
      // Manual cleanup may be required in AWS console
    }
  }

  // Step 2: Delete plant (cascade will handle devices, data, etc.)
  await prisma.plant.delete({
    where: { id: plantId },
  });

  // AUDIT LOG - COMMENTED OUT (Enable when needed)
  // Log to audit
  // await logAuditEntry({
  //   entityType: 'Plant',
  //   entityId: plantId,
  //   action: 'DELETE',
  //   userId,
  //   changesBefore: {
  //     name: existingPlant.name,
  //     location: existingPlant.location,
  //     capacity: existingPlant.capacity,
  //     status: existingPlant.status,
  //     installationDate: existingPlant.installationDate,
  //     createdById: existingPlant.createdById,
  //     iotThingName: existingPlant.iotThingName,
  //     iotPolicyName: existingPlant.iotPolicyName,
  //   },
  //   changesAfter: null,
  // });

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
