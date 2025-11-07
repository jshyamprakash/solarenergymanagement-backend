/**
 * Data Service
 * Business logic for querying time-series data
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

  if (userRole !== 'ADMIN' && plant.ownerId !== userId) {
    throw new ForbiddenError('You do not have access to this plant');
  }

  return plant;
};

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
 * Parse and validate time range
 */
const parseTimeRange = (startTime, endTime) => {
  const start = startTime ? new Date(startTime) : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: 24 hours ago
  const end = endTime ? new Date(endTime) : new Date(); // Default: now

  if (isNaN(start.getTime())) {
    throw new BadRequestError('Invalid start time format');
  }

  if (isNaN(end.getTime())) {
    throw new BadRequestError('Invalid end time format');
  }

  if (start >= end) {
    throw new BadRequestError('Start time must be before end time');
  }

  // Limit query range to 90 days
  const maxRange = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
  if (end - start > maxRange) {
    throw new BadRequestError('Time range cannot exceed 90 days');
  }

  return { start, end };
};

/**
 * Get real-time data for a plant (latest values for all devices)
 */
const getPlantRealtimeData = async (plantId, userId, userRole) => {
  await checkPlantAccess(plantId, userId, userRole);

  // Get all devices for the plant
  const devices = await prisma.device.findMany({
    where: { plantId },
    select: {
      id: true,
      name: true,
      deviceType: true,
      status: true,
    },
  });

  const deviceIds = devices.map((d) => d.id);

  // Get latest data point for each tag
  const latestData = await prisma.processedData.findMany({
    where: {
      plantId,
      deviceId: { in: deviceIds },
    },
    orderBy: {
      timestamp: 'desc',
    },
    distinct: ['tagId'], // Get most recent for each tag
    include: {
      tag: {
        select: {
          name: true,
          unit: true,
          dataType: true,
        },
      },
      device: {
        select: {
          name: true,
          deviceType: true,
        },
      },
    },
    take: 500, // Limit to prevent huge responses
  });

  // Group by device
  const deviceData = {};
  latestData.forEach((point) => {
    if (!deviceData[point.deviceId]) {
      deviceData[point.deviceId] = {
        deviceId: point.deviceId,
        deviceName: point.device.name,
        deviceType: point.device.deviceType,
        timestamp: point.timestamp,
        tags: {},
      };
    }

    deviceData[point.deviceId].tags[point.tag.name] = {
      value: point.value,
      unit: point.tag.unit,
      quality: point.quality,
      timestamp: point.timestamp,
    };

    // Update device timestamp to latest
    if (point.timestamp > deviceData[point.deviceId].timestamp) {
      deviceData[point.deviceId].timestamp = point.timestamp;
    }
  });

  return {
    plantId,
    timestamp: new Date(),
    deviceCount: devices.length,
    devices: Object.values(deviceData),
  };
};

/**
 * Get historical data for a plant
 */
const getPlantHistoricalData = async (plantId, userId, userRole, filters = {}) => {
  await checkPlantAccess(plantId, userId, userRole);

  const { startTime, endTime, deviceIds, tagNames, aggregation = 'raw', interval } = filters;

  const { start, end } = parseTimeRange(startTime, endTime);

  const where = {
    plantId,
    timestamp: {
      gte: start,
      lte: end,
    },
  };

  // Filter by specific devices
  if (deviceIds && deviceIds.length > 0) {
    where.deviceId = { in: deviceIds };
  }

  // Filter by specific tags
  if (tagNames && tagNames.length > 0) {
    const tags = await prisma.tag.findMany({
      where: {
        name: { in: tagNames },
        device: {
          plantId,
        },
      },
      select: { id: true },
    });
    where.tagId = { in: tags.map((t) => t.id) };
  }

  if (aggregation === 'raw') {
    // Return raw data points
    const data = await prisma.processedData.findMany({
      where,
      include: {
        tag: {
          select: {
            name: true,
            unit: true,
          },
        },
        device: {
          select: {
            name: true,
            deviceType: true,
          },
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
      take: 10000, // Limit to prevent huge responses
    });

    return {
      plantId,
      startTime: start,
      endTime: end,
      aggregation: 'raw',
      dataPoints: data.length,
      data,
    };
  } else {
    // Aggregated data (avg, min, max, sum per interval)
    // For simplicity, we'll do basic grouping by time buckets
    const data = await prisma.processedData.findMany({
      where,
      include: {
        tag: {
          select: {
            name: true,
            unit: true,
          },
        },
        device: {
          select: {
            name: true,
            deviceType: true,
          },
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
      take: 10000,
    });

    // Group and aggregate data
    const aggregated = aggregateData(data, interval || '1h', aggregation);

    return {
      plantId,
      startTime: start,
      endTime: end,
      aggregation,
      interval: interval || '1h',
      dataPoints: aggregated.length,
      data: aggregated,
    };
  }
};

/**
 * Get real-time data for a device
 */
const getDeviceRealtimeData = async (deviceId, userId, userRole) => {
  const device = await checkDeviceAccess(deviceId, userId, userRole);

  // Get latest data point for each tag
  const latestData = await prisma.processedData.findMany({
    where: { deviceId },
    orderBy: {
      timestamp: 'desc',
    },
    distinct: ['tagId'],
    include: {
      tag: {
        select: {
          name: true,
          unit: true,
          dataType: true,
        },
      },
    },
  });

  const tags = {};
  let latestTimestamp = null;

  latestData.forEach((point) => {
    tags[point.tag.name] = {
      tagId: point.tagId,
      value: point.value,
      unit: point.tag.unit,
      dataType: point.tag.dataType,
      quality: point.quality,
      timestamp: point.timestamp,
    };

    if (!latestTimestamp || point.timestamp > latestTimestamp) {
      latestTimestamp = point.timestamp;
    }
  });

  return {
    deviceId: device.id,
    deviceName: device.name,
    deviceType: device.deviceType,
    plantId: device.plantId,
    status: device.status,
    timestamp: latestTimestamp,
    tagCount: Object.keys(tags).length,
    tags,
  };
};

/**
 * Get historical data for a device
 */
const getDeviceHistoricalData = async (deviceId, userId, userRole, filters = {}) => {
  await checkDeviceAccess(deviceId, userId, userRole);

  const { startTime, endTime, tagNames, aggregation = 'raw', interval } = filters;

  const { start, end } = parseTimeRange(startTime, endTime);

  const where = {
    deviceId,
    timestamp: {
      gte: start,
      lte: end,
    },
  };

  // Filter by specific tags
  if (tagNames && tagNames.length > 0) {
    const tags = await prisma.tag.findMany({
      where: {
        deviceId,
        name: { in: tagNames },
      },
      select: { id: true },
    });
    where.tagId = { in: tags.map((t) => t.id) };
  }

  const data = await prisma.processedData.findMany({
    where,
    include: {
      tag: {
        select: {
          name: true,
          unit: true,
          dataType: true,
        },
      },
    },
    orderBy: {
      timestamp: 'asc',
    },
    take: 10000,
  });

  if (aggregation === 'raw') {
    return {
      deviceId,
      startTime: start,
      endTime: end,
      aggregation: 'raw',
      dataPoints: data.length,
      data,
    };
  } else {
    const aggregated = aggregateData(data, interval || '1h', aggregation);
    return {
      deviceId,
      startTime: start,
      endTime: end,
      aggregation,
      interval: interval || '1h',
      dataPoints: aggregated.length,
      data: aggregated,
    };
  }
};

/**
 * Get historical data for a specific tag
 */
const getTagHistoricalData = async (tagId, userId, userRole, filters = {}) => {
  // Get tag and check access
  const tag = await prisma.tag.findUnique({
    where: { id: tagId },
    include: {
      device: {
        include: {
          plant: {
            select: {
              ownerId: true,
            },
          },
        },
      },
    },
  });

  if (!tag) {
    throw new NotFoundError('Tag not found');
  }

  if (userRole !== 'ADMIN' && tag.device.plant.ownerId !== userId) {
    throw new ForbiddenError('You do not have access to this tag');
  }

  const { startTime, endTime, aggregation = 'raw', interval } = filters;

  const { start, end } = parseTimeRange(startTime, endTime);

  const where = {
    tagId,
    timestamp: {
      gte: start,
      lte: end,
    },
  };

  const data = await prisma.processedData.findMany({
    where,
    orderBy: {
      timestamp: 'asc',
    },
    take: 10000,
  });

  if (aggregation === 'raw') {
    return {
      tagId,
      tagName: tag.name,
      unit: tag.unit,
      startTime: start,
      endTime: end,
      aggregation: 'raw',
      dataPoints: data.length,
      data: data.map((d) => ({
        timestamp: d.timestamp,
        value: d.value,
        quality: d.quality,
      })),
    };
  } else {
    const aggregated = aggregateTagData(data, interval || '1h', aggregation);
    return {
      tagId,
      tagName: tag.name,
      unit: tag.unit,
      startTime: start,
      endTime: end,
      aggregation,
      interval: interval || '1h',
      dataPoints: aggregated.length,
      data: aggregated,
    };
  }
};

/**
 * Get data statistics for a plant
 */
const getPlantDataStats = async (plantId, userId, userRole) => {
  await checkPlantAccess(plantId, userId, userRole);

  const [totalDataPoints, deviceCount, tagCount, oldestData, newestData] = await Promise.all([
    prisma.processedData.count({ where: { plantId } }),
    prisma.device.count({ where: { plantId } }),
    prisma.tag.count({
      where: {
        device: {
          plantId,
        },
      },
    }),
    prisma.processedData.findFirst({
      where: { plantId },
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true },
    }),
    prisma.processedData.findFirst({
      where: { plantId },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    }),
  ]);

  return {
    plantId,
    totalDataPoints,
    deviceCount,
    tagCount,
    oldestDataPoint: oldestData?.timestamp || null,
    newestDataPoint: newestData?.timestamp || null,
    dataTimeRange: oldestData && newestData
      ? Math.round((newestData.timestamp - oldestData.timestamp) / (1000 * 60 * 60 * 24)) // days
      : 0,
  };
};

/**
 * Helper function to aggregate data
 */
function aggregateData(data, interval, aggregation) {
  // Group data by time buckets and tag
  const intervalMs = parseInterval(interval);
  const buckets = {};

  data.forEach((point) => {
    const bucketTime = Math.floor(point.timestamp.getTime() / intervalMs) * intervalMs;
    const key = `${bucketTime}-${point.tagId}`;

    if (!buckets[key]) {
      buckets[key] = {
        timestamp: new Date(bucketTime),
        tagId: point.tagId,
        tagName: point.tag.name,
        unit: point.tag.unit,
        deviceId: point.deviceId,
        deviceName: point.device.name,
        values: [],
      };
    }

    buckets[key].values.push(point.value);
  });

  // Calculate aggregated values
  return Object.values(buckets).map((bucket) => {
    const { values, ...rest } = bucket;
    const result = { ...rest };

    if (aggregation === 'avg' || aggregation === 'average') {
      result.value = values.reduce((a, b) => a + b, 0) / values.length;
    } else if (aggregation === 'min') {
      result.value = Math.min(...values);
    } else if (aggregation === 'max') {
      result.value = Math.max(...values);
    } else if (aggregation === 'sum') {
      result.value = values.reduce((a, b) => a + b, 0);
    } else if (aggregation === 'count') {
      result.value = values.length;
    }

    result.count = values.length;
    return result;
  });
}

/**
 * Helper function to aggregate tag data
 */
function aggregateTagData(data, interval, aggregation) {
  const intervalMs = parseInterval(interval);
  const buckets = {};

  data.forEach((point) => {
    const bucketTime = Math.floor(point.timestamp.getTime() / intervalMs) * intervalMs;

    if (!buckets[bucketTime]) {
      buckets[bucketTime] = {
        timestamp: new Date(bucketTime),
        values: [],
      };
    }

    buckets[bucketTime].values.push(point.value);
  });

  return Object.values(buckets).map((bucket) => {
    const { values, ...rest } = bucket;
    const result = { ...rest };

    if (aggregation === 'avg' || aggregation === 'average') {
      result.value = values.reduce((a, b) => a + b, 0) / values.length;
    } else if (aggregation === 'min') {
      result.value = Math.min(...values);
    } else if (aggregation === 'max') {
      result.value = Math.max(...values);
    } else if (aggregation === 'sum') {
      result.value = values.reduce((a, b) => a + b, 0);
    } else if (aggregation === 'count') {
      result.value = values.length;
    }

    result.count = values.length;
    return result;
  });
}

/**
 * Parse interval string to milliseconds
 */
function parseInterval(interval) {
  const match = interval.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new BadRequestError('Invalid interval format. Use format like: 5m, 1h, 1d');
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

export {
  getPlantRealtimeData,
  getPlantHistoricalData,
  getDeviceRealtimeData,
  getDeviceHistoricalData,
  getTagHistoricalData,
  getPlantDataStats,
};
