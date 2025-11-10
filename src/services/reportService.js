/**
 * Report Generation Service
 * Handles generation of various reports in PDF and Excel formats
 * Phase 13 Implementation
 */

import { prisma } from '../config/database.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import logger from '../config/logger.js';

/**
 * Helper: Format date for reports
 */
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Helper: Format date and time for reports
 */
const formatDateTime = (date) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Helper: Calculate statistics for numeric values
 */
const calculateStats = (values) => {
  if (!values || values.length === 0) {
    return { min: 0, max: 0, avg: 0, sum: 0, count: 0 };
  }

  const numericValues = values.filter(v => v !== null && !isNaN(v));

  if (numericValues.length === 0) {
    return { min: 0, max: 0, avg: 0, sum: 0, count: 0 };
  }

  const sum = numericValues.reduce((acc, val) => acc + parseFloat(val), 0);
  const avg = sum / numericValues.length;
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);

  return {
    min: parseFloat(min.toFixed(2)),
    max: parseFloat(max.toFixed(2)),
    avg: parseFloat(avg.toFixed(2)),
    sum: parseFloat(sum.toFixed(2)),
    count: numericValues.length,
  };
};

// ============================================
// PLANT PERFORMANCE REPORT
// ============================================

/**
 * Generate Plant Performance Report Data
 * @param {Object} params - Report parameters
 * @param {string} params.plantId - Plant ID
 * @param {Date} params.startDate - Start date for report
 * @param {Date} params.endDate - End date for report
 * @param {string} params.userId - User requesting the report
 * @param {string} params.userRole - User role
 * @returns {Promise<Object>} Report data
 */
const getPlantPerformanceData = async ({ plantId, startDate, endDate, userId, userRole }) => {
  // Validate plant exists and user has access
  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      devices: {
        select: {
          id: true,
          name: true,
          deviceType: true,
          status: true,
        },
      },
    },
  });

  if (!plant) {
    throw new NotFoundError('Plant not found');
  }

  // Check access for non-admin users
  if (userRole !== 'ADMIN' && plant.ownerId !== userId) {
    const hasAccess = await prisma.userPlantAccess.findFirst({
      where: { userId, plantId },
    });
    if (!hasAccess) {
      throw new BadRequestError('You do not have access to this plant');
    }
  }

  // Date range for queries
  const dateFilter = {
    timestamp: {
      gte: new Date(startDate),
      lte: new Date(endDate),
    },
  };

  // Get energy generation data
  const energyData = await prisma.processedData.findMany({
    where: {
      plantId,
      ...dateFilter,
      tag: {
        name: {
          in: ['Energy', 'Power', 'TotalEnergy', 'ActivePower'],
        },
      },
    },
    include: {
      tag: {
        select: { name: true, unit: true },
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  // Calculate energy statistics
  const energyValues = energyData.map(d => parseFloat(d.value));
  const energyStats = calculateStats(energyValues);

  // Get device uptime statistics
  const deviceStats = plant.devices.reduce((acc, device) => {
    acc[device.status] = (acc[device.status] || 0) + 1;
    return acc;
  }, {});

  const totalDevices = plant.devices.length;
  const onlineDevices = deviceStats.ONLINE || 0;
  const uptimePercentage = totalDevices > 0
    ? ((onlineDevices / totalDevices) * 100).toFixed(2)
    : 0;

  // Get alarm summary
  const alarmSummary = await prisma.alarm.groupBy({
    by: ['severity', 'status'],
    where: {
      plantId,
      triggeredAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    _count: true,
  });

  // Format alarm summary
  const alarmStats = {
    total: alarmSummary.reduce((sum, item) => sum + item._count, 0),
    bySeverity: {},
    byStatus: {},
  };

  alarmSummary.forEach(item => {
    alarmStats.bySeverity[item.severity] =
      (alarmStats.bySeverity[item.severity] || 0) + item._count;
    alarmStats.byStatus[item.status] =
      (alarmStats.byStatus[item.status] || 0) + item._count;
  });

  // Get daily energy generation for chart
  const dailyEnergy = await prisma.$queryRaw`
    SELECT
      DATE(timestamp) as date,
      SUM(CAST(value AS DECIMAL)) as total_energy
    FROM "solar2"."ProcessedData"
    WHERE "plantId" = ${plantId}
      AND timestamp >= ${new Date(startDate)}
      AND timestamp <= ${new Date(endDate)}
      AND "tagId" IN (
        SELECT id FROM "solar2"."Tags"
        WHERE name IN ('Energy', 'TotalEnergy')
      )
    GROUP BY DATE(timestamp)
    ORDER BY date ASC
  `;

  return {
    plant: {
      id: plant.id,
      name: plant.name,
      location: plant.location,
      capacity: plant.capacity,
      status: plant.status,
      installationDate: plant.installationDate,
      owner: plant.owner,
    },
    reportPeriod: {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
    },
    energyGeneration: {
      ...energyStats,
      unit: 'kWh',
      dailyData: dailyEnergy.map(d => ({
        date: formatDate(d.date),
        energy: parseFloat(d.total_energy || 0).toFixed(2),
      })),
    },
    deviceUptime: {
      total: totalDevices,
      online: onlineDevices,
      offline: deviceStats.OFFLINE || 0,
      error: deviceStats.ERROR || 0,
      maintenance: deviceStats.MAINTENANCE || 0,
      uptimePercentage: parseFloat(uptimePercentage),
    },
    alarms: alarmStats,
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Generate Plant Performance Report as PDF
 */
const generatePlantPerformancePDF = async (params) => {
  const data = await getPlantPerformanceData(params);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text('Plant Performance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Plant: ${data.plant.name}`, { align: 'center' });
    doc.text(`Period: ${data.reportPeriod.startDate} - ${data.reportPeriod.endDate}`, { align: 'center' });
    doc.text(`Generated: ${formatDateTime(data.generatedAt)}`, { align: 'center' });
    doc.moveDown(2);

    // Plant Information
    doc.fontSize(16).text('Plant Information', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Location: ${data.plant.location.address || 'N/A'}`);
    doc.text(`Capacity: ${data.plant.capacity} kW`);
    doc.text(`Status: ${data.plant.status}`);
    doc.text(`Installation Date: ${formatDate(data.plant.installationDate)}`);
    doc.moveDown();

    // Energy Generation Summary
    doc.fontSize(16).text('Energy Generation Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Total Energy: ${data.energyGeneration.sum} ${data.energyGeneration.unit}`);
    doc.text(`Average: ${data.energyGeneration.avg} ${data.energyGeneration.unit}`);
    doc.text(`Peak: ${data.energyGeneration.max} ${data.energyGeneration.unit}`);
    doc.text(`Minimum: ${data.energyGeneration.min} ${data.energyGeneration.unit}`);
    doc.text(`Data Points: ${data.energyGeneration.count}`);
    doc.moveDown();

    // Device Uptime
    doc.fontSize(16).text('Device Uptime Statistics', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Total Devices: ${data.deviceUptime.total}`);
    doc.text(`Online: ${data.deviceUptime.online} devices`);
    doc.text(`Offline: ${data.deviceUptime.offline} devices`);
    doc.text(`Error: ${data.deviceUptime.error} devices`);
    doc.text(`Maintenance: ${data.deviceUptime.maintenance} devices`);
    doc.text(`Uptime Percentage: ${data.deviceUptime.uptimePercentage}%`);
    doc.moveDown();

    // Alarm Summary
    doc.fontSize(16).text('Alarm Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Total Alarms: ${data.alarms.total}`);
    doc.moveDown(0.3);
    doc.text('By Severity:');
    Object.entries(data.alarms.bySeverity).forEach(([severity, count]) => {
      doc.text(`  ${severity}: ${count}`, { indent: 20 });
    });
    doc.moveDown(0.3);
    doc.text('By Status:');
    Object.entries(data.alarms.byStatus).forEach(([status, count]) => {
      doc.text(`  ${status}: ${count}`, { indent: 20 });
    });

    doc.end();
  });
};

/**
 * Generate Plant Performance Report as Excel
 */
const generatePlantPerformanceExcel = async (params) => {
  const data = await getPlantPerformanceData(params);

  const workbook = new ExcelJS.Workbook();

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');

  // Header
  summarySheet.mergeCells('A1:D1');
  summarySheet.getCell('A1').value = 'Plant Performance Report';
  summarySheet.getCell('A1').font = { size: 16, bold: true };
  summarySheet.getCell('A1').alignment = { horizontal: 'center' };

  summarySheet.mergeCells('A2:D2');
  summarySheet.getCell('A2').value = `Plant: ${data.plant.name}`;
  summarySheet.getCell('A2').alignment = { horizontal: 'center' };

  summarySheet.mergeCells('A3:D3');
  summarySheet.getCell('A3').value = `Period: ${data.reportPeriod.startDate} - ${data.reportPeriod.endDate}`;
  summarySheet.getCell('A3').alignment = { horizontal: 'center' };

  // Plant Information
  let row = 5;
  summarySheet.getCell(`A${row}`).value = 'Plant Information';
  summarySheet.getCell(`A${row}`).font = { bold: true, size: 12 };
  row++;

  summarySheet.getCell(`A${row}`).value = 'Capacity:';
  summarySheet.getCell(`B${row}`).value = `${data.plant.capacity} kW`;
  row++;
  summarySheet.getCell(`A${row}`).value = 'Status:';
  summarySheet.getCell(`B${row}`).value = data.plant.status;
  row++;
  summarySheet.getCell(`A${row}`).value = 'Installation Date:';
  summarySheet.getCell(`B${row}`).value = formatDate(data.plant.installationDate);
  row += 2;

  // Energy Generation
  summarySheet.getCell(`A${row}`).value = 'Energy Generation';
  summarySheet.getCell(`A${row}`).font = { bold: true, size: 12 };
  row++;

  summarySheet.getCell(`A${row}`).value = 'Metric';
  summarySheet.getCell(`B${row}`).value = 'Value';
  summarySheet.getCell(`A${row}`).font = { bold: true };
  summarySheet.getCell(`B${row}`).font = { bold: true };
  row++;

  summarySheet.getCell(`A${row}`).value = 'Total Energy';
  summarySheet.getCell(`B${row}`).value = `${data.energyGeneration.sum} ${data.energyGeneration.unit}`;
  row++;
  summarySheet.getCell(`A${row}`).value = 'Average';
  summarySheet.getCell(`B${row}`).value = `${data.energyGeneration.avg} ${data.energyGeneration.unit}`;
  row++;
  summarySheet.getCell(`A${row}`).value = 'Peak';
  summarySheet.getCell(`B${row}`).value = `${data.energyGeneration.max} ${data.energyGeneration.unit}`;
  row++;
  summarySheet.getCell(`A${row}`).value = 'Minimum';
  summarySheet.getCell(`B${row}`).value = `${data.energyGeneration.min} ${data.energyGeneration.unit}`;
  row += 2;

  // Device Uptime
  summarySheet.getCell(`A${row}`).value = 'Device Uptime';
  summarySheet.getCell(`A${row}`).font = { bold: true, size: 12 };
  row++;

  summarySheet.getCell(`A${row}`).value = 'Uptime Percentage';
  summarySheet.getCell(`B${row}`).value = `${data.deviceUptime.uptimePercentage}%`;
  row++;
  summarySheet.getCell(`A${row}`).value = 'Online Devices';
  summarySheet.getCell(`B${row}`).value = `${data.deviceUptime.online} / ${data.deviceUptime.total}`;

  // Daily Energy Sheet
  const dailySheet = workbook.addWorksheet('Daily Energy');
  dailySheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Energy (kWh)', key: 'energy', width: 15 },
  ];

  dailySheet.getRow(1).font = { bold: true };
  data.energyGeneration.dailyData.forEach(item => {
    dailySheet.addRow(item);
  });

  // Column widths
  summarySheet.getColumn('A').width = 25;
  summarySheet.getColumn('B').width = 25;

  return await workbook.xlsx.writeBuffer();
};

// ============================================
// DEVICE PERFORMANCE REPORT
// ============================================

/**
 * Generate Device Performance Report Data
 */
const getDevicePerformanceData = async ({ deviceId, startDate, endDate, userId, userRole }) => {
  // Validate device exists and user has access
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: {
      plant: {
        include: {
          owner: { select: { id: true, name: true } },
        },
      },
      deviceType: true,
      deviceTags: {
        include: {
          tag: true,
        },
      },
    },
  });

  if (!device) {
    throw new NotFoundError('Device not found');
  }

  // Check access
  if (userRole !== 'ADMIN' && device.plant.ownerId !== userId) {
    const hasAccess = await prisma.userPlantAccess.findFirst({
      where: { userId, plantId: device.plantId },
    });
    if (!hasAccess) {
      throw new BadRequestError('You do not have access to this device');
    }
  }

  // Get device performance data
  const performanceData = await prisma.processedData.findMany({
    where: {
      deviceId,
      timestamp: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    include: {
      tag: {
        select: { name: true, unit: true },
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  // Group by tag
  const tagData = {};
  performanceData.forEach(data => {
    const tagName = data.tag.name;
    if (!tagData[tagName]) {
      tagData[tagName] = {
        tag: data.tag,
        values: [],
      };
    }
    tagData[tagName].values.push({
      timestamp: data.timestamp,
      value: parseFloat(data.value),
    });
  });

  // Calculate statistics per tag
  const tagStats = {};
  Object.entries(tagData).forEach(([tagName, data]) => {
    const values = data.values.map(v => v.value);
    tagStats[tagName] = {
      ...calculateStats(values),
      unit: data.tag.unit,
      trend: data.values,
    };
  });

  // Get downtime periods
  const alarms = await prisma.alarm.findMany({
    where: {
      deviceId,
      triggeredAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      severity: {
        in: ['CRITICAL', 'HIGH'],
      },
    },
    orderBy: { triggeredAt: 'desc' },
    take: 50,
  });

  const downtimeHours = alarms
    .filter(a => a.resolvedAt)
    .reduce((sum, alarm) => {
      const duration = (new Date(alarm.resolvedAt) - new Date(alarm.triggeredAt)) / (1000 * 60 * 60);
      return sum + duration;
    }, 0);

  return {
    device: {
      id: device.id,
      name: device.name,
      deviceType: device.deviceType,
      status: device.status,
      serialNumber: device.serialNumber,
      plant: {
        id: device.plant.id,
        name: device.plant.name,
      },
    },
    reportPeriod: {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
    },
    performance: tagStats,
    downtime: {
      totalHours: parseFloat(downtimeHours.toFixed(2)),
      alarmCount: alarms.length,
      criticalAlarms: alarms.filter(a => a.severity === 'CRITICAL').length,
    },
    recentAlarms: alarms.slice(0, 10).map(a => ({
      severity: a.severity,
      message: a.message,
      triggeredAt: formatDateTime(a.triggeredAt),
      resolvedAt: a.resolvedAt ? formatDateTime(a.resolvedAt) : 'Not resolved',
    })),
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Generate Device Performance Report as PDF
 */
const generateDevicePerformancePDF = async (params) => {
  const data = await getDevicePerformanceData(params);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text('Device Performance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Device: ${data.device.name}`, { align: 'center' });
    doc.text(`Plant: ${data.device.plant.name}`, { align: 'center' });
    doc.text(`Period: ${data.reportPeriod.startDate} - ${data.reportPeriod.endDate}`, { align: 'center' });
    doc.moveDown(2);

    // Device Information
    doc.fontSize(16).text('Device Information', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Type: ${data.device.deviceType}`);
    doc.text(`Status: ${data.device.status}`);
    doc.text(`Serial Number: ${data.device.serialNumber || 'N/A'}`);
    doc.moveDown();

    // Performance Metrics
    doc.fontSize(16).text('Performance Metrics', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);

    Object.entries(data.performance).forEach(([tagName, stats]) => {
      doc.text(`${tagName}:`, { underline: true });
      doc.text(`  Average: ${stats.avg} ${stats.unit}`, { indent: 20 });
      doc.text(`  Peak: ${stats.max} ${stats.unit}`, { indent: 20 });
      doc.text(`  Minimum: ${stats.min} ${stats.unit}`, { indent: 20 });
      doc.moveDown(0.3);
    });

    doc.moveDown();

    // Downtime Analysis
    doc.fontSize(16).text('Downtime Analysis', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Total Downtime: ${data.downtime.totalHours} hours`);
    doc.text(`Total Alarms: ${data.downtime.alarmCount}`);
    doc.text(`Critical Alarms: ${data.downtime.criticalAlarms}`);
    doc.moveDown();

    // Recent Alarms
    if (data.recentAlarms.length > 0) {
      doc.fontSize(16).text('Recent Alarms', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);

      data.recentAlarms.forEach((alarm, idx) => {
        doc.text(`${idx + 1}. [${alarm.severity}] ${alarm.message}`);
        doc.text(`   Triggered: ${alarm.triggeredAt}`, { indent: 20 });
        doc.text(`   Resolved: ${alarm.resolvedAt}`, { indent: 20 });
        doc.moveDown(0.3);
      });
    }

    doc.end();
  });
};

/**
 * Generate Device Performance Report as Excel
 */
const generateDevicePerformanceExcel = async (params) => {
  const data = await getDevicePerformanceData(params);

  const workbook = new ExcelJS.Workbook();

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');

  summarySheet.mergeCells('A1:C1');
  summarySheet.getCell('A1').value = 'Device Performance Report';
  summarySheet.getCell('A1').font = { size: 16, bold: true };
  summarySheet.getCell('A1').alignment = { horizontal: 'center' };

  let row = 3;
  summarySheet.getCell(`A${row}`).value = 'Device:';
  summarySheet.getCell(`B${row}`).value = data.device.name;
  row++;
  summarySheet.getCell(`A${row}`).value = 'Type:';
  summarySheet.getCell(`B${row}`).value = data.device.deviceType;
  row++;
  summarySheet.getCell(`A${row}`).value = 'Status:';
  summarySheet.getCell(`B${row}`).value = data.device.status;
  row += 2;

  // Performance metrics
  summarySheet.getCell(`A${row}`).value = 'Performance Metrics';
  summarySheet.getCell(`A${row}`).font = { bold: true, size: 12 };
  row++;

  summarySheet.getCell(`A${row}`).value = 'Metric';
  summarySheet.getCell(`B${row}`).value = 'Average';
  summarySheet.getCell(`C${row}`).value = 'Min';
  summarySheet.getCell(`D${row}`).value = 'Max';
  summarySheet.getCell(`E${row}`).value = 'Unit';
  summarySheet.getRow(row).font = { bold: true };
  row++;

  Object.entries(data.performance).forEach(([tagName, stats]) => {
    summarySheet.getCell(`A${row}`).value = tagName;
    summarySheet.getCell(`B${row}`).value = stats.avg;
    summarySheet.getCell(`C${row}`).value = stats.min;
    summarySheet.getCell(`D${row}`).value = stats.max;
    summarySheet.getCell(`E${row}`).value = stats.unit;
    row++;
  });

  row += 2;
  summarySheet.getCell(`A${row}`).value = 'Downtime Analysis';
  summarySheet.getCell(`A${row}`).font = { bold: true, size: 12 };
  row++;
  summarySheet.getCell(`A${row}`).value = 'Total Hours:';
  summarySheet.getCell(`B${row}`).value = data.downtime.totalHours;
  row++;
  summarySheet.getCell(`A${row}`).value = 'Alarm Count:';
  summarySheet.getCell(`B${row}`).value = data.downtime.alarmCount;

  // Alarms Sheet
  const alarmsSheet = workbook.addWorksheet('Alarms');
  alarmsSheet.columns = [
    { header: 'Severity', key: 'severity', width: 12 },
    { header: 'Message', key: 'message', width: 40 },
    { header: 'Triggered At', key: 'triggeredAt', width: 20 },
    { header: 'Resolved At', key: 'resolvedAt', width: 20 },
  ];

  alarmsSheet.getRow(1).font = { bold: true };
  data.recentAlarms.forEach(alarm => {
    alarmsSheet.addRow(alarm);
  });

  summarySheet.getColumn('A').width = 25;
  summarySheet.getColumn('B').width = 20;

  return await workbook.xlsx.writeBuffer();
};

// ============================================
// ALARM REPORT
// ============================================

/**
 * Generate Alarm Report Data
 */
const getAlarmReportData = async ({ plantId, deviceId, severity, status, startDate, endDate, userId, userRole }) => {
  // Build where clause
  const where = {
    triggeredAt: {
      gte: new Date(startDate),
      lte: new Date(endDate),
    },
  };

  if (plantId) where.plantId = plantId;
  if (deviceId) where.deviceId = deviceId;
  if (severity) where.severity = severity;
  if (status) where.status = status;

  // Check access for non-admin users
  if (userRole !== 'ADMIN') {
    const accessiblePlants = await prisma.plant.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { userPlantAccess: { some: { userId } } },
        ],
      },
      select: { id: true },
    });

    const plantIds = accessiblePlants.map(p => p.id);
    where.plantId = { in: plantIds };
  }

  // Get alarms
  const alarms = await prisma.alarm.findMany({
    where,
    include: {
      plant: {
        select: { id: true, name: true },
      },
      device: {
        select: { id: true, name: true, deviceType: true },
      },
      tag: {
        select: { id: true, name: true },
      },
      creator: {
        select: { name: true },
      },
      acknowledger: {
        select: { name: true },
      },
    },
    orderBy: { triggeredAt: 'desc' },
  });

  // Calculate resolution time statistics
  const resolvedAlarms = alarms.filter(a => a.resolvedAt);
  const resolutionTimes = resolvedAlarms.map(a =>
    (new Date(a.resolvedAt) - new Date(a.triggeredAt)) / (1000 * 60) // minutes
  );

  const resolutionStats = calculateStats(resolutionTimes);

  // Group alarms by type (message)
  const alarmTypes = {};
  alarms.forEach(alarm => {
    const type = alarm.message;
    if (!alarmTypes[type]) {
      alarmTypes[type] = {
        message: type,
        count: 0,
        severity: alarm.severity,
      };
    }
    alarmTypes[type].count++;
  });

  const topAlarmTypes = Object.values(alarmTypes)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Statistics by severity
  const bySeverity = alarms.reduce((acc, alarm) => {
    acc[alarm.severity] = (acc[alarm.severity] || 0) + 1;
    return acc;
  }, {});

  // Statistics by status
  const byStatus = alarms.reduce((acc, alarm) => {
    acc[alarm.status] = (acc[alarm.status] || 0) + 1;
    return acc;
  }, {});

  return {
    filters: {
      plantId,
      deviceId,
      severity,
      status,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
    },
    summary: {
      total: alarms.length,
      bySeverity,
      byStatus,
      resolved: resolvedAlarms.length,
      pending: alarms.filter(a => a.status === 'ACTIVE').length,
    },
    resolutionTime: {
      avgMinutes: resolutionStats.avg,
      minMinutes: resolutionStats.min,
      maxMinutes: resolutionStats.max,
      totalResolved: resolvedAlarms.length,
    },
    topAlarmTypes,
    alarms: alarms.map(a => ({
      id: a.id,
      plant: a.plant.name,
      device: a.device ? a.device.name : 'N/A',
      deviceType: a.device ? a.device.deviceType : 'N/A',
      severity: a.severity,
      status: a.status,
      message: a.message,
      triggeredAt: formatDateTime(a.triggeredAt),
      acknowledgedAt: a.acknowledgedAt ? formatDateTime(a.acknowledgedAt) : null,
      resolvedAt: a.resolvedAt ? formatDateTime(a.resolvedAt) : null,
      acknowledger: a.acknowledger ? a.acknowledger.name : null,
    })),
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Generate Alarm Report as PDF
 */
const generateAlarmReportPDF = async (params) => {
  const data = await getAlarmReportData(params);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text('Alarm Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Period: ${data.filters.startDate} - ${data.filters.endDate}`, { align: 'center' });
    doc.moveDown(2);

    // Summary
    doc.fontSize(16).text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Total Alarms: ${data.summary.total}`);
    doc.text(`Resolved: ${data.summary.resolved}`);
    doc.text(`Pending: ${data.summary.pending}`);
    doc.moveDown();

    // By Severity
    doc.text('By Severity:', { underline: true });
    Object.entries(data.summary.bySeverity).forEach(([severity, count]) => {
      doc.text(`  ${severity}: ${count}`, { indent: 20 });
    });
    doc.moveDown();

    // By Status
    doc.text('By Status:', { underline: true });
    Object.entries(data.summary.byStatus).forEach(([status, count]) => {
      doc.text(`  ${status}: ${count}`, { indent: 20 });
    });
    doc.moveDown(2);

    // Resolution Time
    doc.fontSize(16).text('Resolution Time Statistics', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Average Resolution Time: ${data.resolutionTime.avgMinutes.toFixed(1)} minutes`);
    doc.text(`Fastest Resolution: ${data.resolutionTime.minMinutes.toFixed(1)} minutes`);
    doc.text(`Slowest Resolution: ${data.resolutionTime.maxMinutes.toFixed(1)} minutes`);
    doc.moveDown(2);

    // Top Alarm Types
    doc.fontSize(16).text('Top Alarm Types', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    data.topAlarmTypes.forEach((type, idx) => {
      doc.text(`${idx + 1}. ${type.message} (${type.count} occurrences)`);
    });
    doc.moveDown(2);

    // Recent Alarms
    doc.fontSize(16).text('Alarm Details (Recent 20)', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(9);

    data.alarms.slice(0, 20).forEach((alarm, idx) => {
      doc.text(`${idx + 1}. [${alarm.severity}] ${alarm.plant} - ${alarm.device}`);
      doc.text(`   ${alarm.message}`, { indent: 20 });
      doc.text(`   Triggered: ${alarm.triggeredAt}`, { indent: 20 });
      if (alarm.resolvedAt) {
        doc.text(`   Resolved: ${alarm.resolvedAt}`, { indent: 20 });
      }
      doc.moveDown(0.3);
    });

    doc.end();
  });
};

/**
 * Generate Alarm Report as Excel
 */
const generateAlarmReportExcel = async (params) => {
  const data = await getAlarmReportData(params);

  const workbook = new ExcelJS.Workbook();

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');

  summarySheet.mergeCells('A1:C1');
  summarySheet.getCell('A1').value = 'Alarm Report';
  summarySheet.getCell('A1').font = { size: 16, bold: true };
  summarySheet.getCell('A1').alignment = { horizontal: 'center' };

  let row = 3;
  summarySheet.getCell(`A${row}`).value = 'Total Alarms:';
  summarySheet.getCell(`B${row}`).value = data.summary.total;
  row++;
  summarySheet.getCell(`A${row}`).value = 'Resolved:';
  summarySheet.getCell(`B${row}`).value = data.summary.resolved;
  row++;
  summarySheet.getCell(`A${row}`).value = 'Pending:';
  summarySheet.getCell(`B${row}`).value = data.summary.pending;
  row += 2;

  summarySheet.getCell(`A${row}`).value = 'By Severity';
  summarySheet.getCell(`A${row}`).font = { bold: true };
  row++;
  Object.entries(data.summary.bySeverity).forEach(([severity, count]) => {
    summarySheet.getCell(`A${row}`).value = severity;
    summarySheet.getCell(`B${row}`).value = count;
    row++;
  });

  row += 2;
  summarySheet.getCell(`A${row}`).value = 'Resolution Time Statistics';
  summarySheet.getCell(`A${row}`).font = { bold: true };
  row++;
  summarySheet.getCell(`A${row}`).value = 'Average (min):';
  summarySheet.getCell(`B${row}`).value = data.resolutionTime.avgMinutes.toFixed(1);
  row++;
  summarySheet.getCell(`A${row}`).value = 'Min (min):';
  summarySheet.getCell(`B${row}`).value = data.resolutionTime.minMinutes.toFixed(1);
  row++;
  summarySheet.getCell(`A${row}`).value = 'Max (min):';
  summarySheet.getCell(`B${row}`).value = data.resolutionTime.maxMinutes.toFixed(1);

  // Alarms Detail Sheet
  const alarmsSheet = workbook.addWorksheet('Alarms');
  alarmsSheet.columns = [
    { header: 'Plant', key: 'plant', width: 20 },
    { header: 'Device', key: 'device', width: 20 },
    { header: 'Type', key: 'deviceType', width: 15 },
    { header: 'Severity', key: 'severity', width: 12 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Message', key: 'message', width: 40 },
    { header: 'Triggered At', key: 'triggeredAt', width: 20 },
    { header: 'Resolved At', key: 'resolvedAt', width: 20 },
  ];

  alarmsSheet.getRow(1).font = { bold: true };
  data.alarms.forEach(alarm => {
    alarmsSheet.addRow(alarm);
  });

  // Top Alarm Types Sheet
  const typesSheet = workbook.addWorksheet('Top Types');
  typesSheet.columns = [
    { header: 'Message', key: 'message', width: 50 },
    { header: 'Count', key: 'count', width: 10 },
    { header: 'Severity', key: 'severity', width: 12 },
  ];

  typesSheet.getRow(1).font = { bold: true };
  data.topAlarmTypes.forEach(type => {
    typesSheet.addRow(type);
  });

  summarySheet.getColumn('A').width = 30;
  summarySheet.getColumn('B').width = 20;

  return await workbook.xlsx.writeBuffer();
};

// ============================================
// ENERGY PRODUCTION REPORT
// ============================================

/**
 * Generate Energy Production Report Data
 */
const getEnergyProductionData = async ({ plantId, deviceId, startDate, endDate, userId, userRole }) => {
  // Build where clause
  const where = {
    timestamp: {
      gte: new Date(startDate),
      lte: new Date(endDate),
    },
    tag: {
      name: {
        in: ['Energy', 'TotalEnergy', 'ActivePower', 'Power'],
      },
    },
  };

  if (plantId) where.plantId = plantId;
  if (deviceId) where.deviceId = deviceId;

  // Check access for non-admin users
  if (userRole !== 'ADMIN') {
    if (plantId) {
      const plant = await prisma.plant.findUnique({
        where: { id: plantId },
        select: { ownerId: true },
      });

      if (!plant) {
        throw new NotFoundError('Plant not found');
      }

      if (plant.ownerId !== userId) {
        const hasAccess = await prisma.userPlantAccess.findFirst({
          where: { userId, plantId },
        });
        if (!hasAccess) {
          throw new BadRequestError('You do not have access to this plant');
        }
      }
    } else {
      // Get all accessible plants
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
    }
  }

  // Get energy production data
  const productionData = await prisma.processedData.findMany({
    where,
    include: {
      plant: {
        select: { id: true, name: true },
      },
      device: {
        select: { id: true, name: true, deviceType: true },
      },
      tag: {
        select: { name: true, unit: true },
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  // Daily aggregation
  const dailyData = await prisma.$queryRaw`
    SELECT
      DATE(timestamp) as date,
      SUM(CAST(value AS DECIMAL)) as total_energy,
      AVG(CAST(value AS DECIMAL)) as avg_power,
      MAX(CAST(value AS DECIMAL)) as peak_power
    FROM "solar2"."ProcessedData"
    WHERE timestamp >= ${new Date(startDate)}
      AND timestamp <= ${new Date(endDate)}
      ${plantId ? prisma.$queryRawUnsafe(`AND "plantId" = '${plantId}'`) : prisma.$queryRawUnsafe('')}
      ${deviceId ? prisma.$queryRawUnsafe(`AND "deviceId" = '${deviceId}'`) : prisma.$queryRawUnsafe('')}
      AND "tagId" IN (
        SELECT id FROM "solar2"."Tags"
        WHERE name IN ('Energy', 'TotalEnergy', 'ActivePower', 'Power')
      )
    GROUP BY DATE(timestamp)
    ORDER BY date ASC
  `;

  // Calculate statistics
  const energyValues = productionData.map(d => parseFloat(d.value));
  const energyStats = calculateStats(energyValues);

  // Group by plant
  const byPlant = {};
  productionData.forEach(data => {
    const plantId = data.plant.id;
    if (!byPlant[plantId]) {
      byPlant[plantId] = {
        plantName: data.plant.name,
        values: [],
      };
    }
    byPlant[plantId].values.push(parseFloat(data.value));
  });

  const plantStats = {};
  Object.entries(byPlant).forEach(([plantId, data]) => {
    plantStats[plantId] = {
      name: data.plantName,
      ...calculateStats(data.values),
    };
  });

  // Group by device type
  const byDeviceType = {};
  productionData.forEach(data => {
    if (data.device) {
      const type = data.device.deviceType;
      if (!byDeviceType[type]) {
        byDeviceType[type] = [];
      }
      byDeviceType[type].push(parseFloat(data.value));
    }
  });

  const deviceTypeStats = {};
  Object.entries(byDeviceType).forEach(([type, values]) => {
    deviceTypeStats[type] = calculateStats(values);
  });

  return {
    filters: {
      plantId,
      deviceId,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
    },
    overall: {
      ...energyStats,
      unit: 'kWh',
    },
    daily: dailyData.map(d => ({
      date: formatDate(d.date),
      totalEnergy: parseFloat(d.total_energy || 0).toFixed(2),
      avgPower: parseFloat(d.avg_power || 0).toFixed(2),
      peakPower: parseFloat(d.peak_power || 0).toFixed(2),
    })),
    byPlant: plantStats,
    byDeviceType: deviceTypeStats,
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Generate Energy Production Report as PDF
 */
const generateEnergyProductionPDF = async (params) => {
  const data = await getEnergyProductionData(params);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text('Energy Production Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Period: ${data.filters.startDate} - ${data.filters.endDate}`, { align: 'center' });
    doc.moveDown(2);

    // Overall Statistics
    doc.fontSize(16).text('Overall Statistics', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Total Energy: ${data.overall.sum} ${data.overall.unit}`);
    doc.text(`Average: ${data.overall.avg} ${data.overall.unit}`);
    doc.text(`Peak: ${data.overall.max} ${data.overall.unit}`);
    doc.text(`Minimum: ${data.overall.min} ${data.overall.unit}`);
    doc.text(`Data Points: ${data.overall.count}`);
    doc.moveDown(2);

    // By Plant
    if (Object.keys(data.byPlant).length > 0) {
      doc.fontSize(16).text('Performance by Plant', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);

      Object.entries(data.byPlant).forEach(([plantId, stats]) => {
        doc.text(`${stats.name}:`, { underline: true });
        doc.text(`  Total: ${stats.sum} ${data.overall.unit}`, { indent: 20 });
        doc.text(`  Average: ${stats.avg} ${data.overall.unit}`, { indent: 20 });
        doc.text(`  Peak: ${stats.max} ${data.overall.unit}`, { indent: 20 });
        doc.moveDown(0.3);
      });
      doc.moveDown();
    }

    // By Device Type
    if (Object.keys(data.byDeviceType).length > 0) {
      doc.fontSize(16).text('Performance by Device Type', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);

      Object.entries(data.byDeviceType).forEach(([type, stats]) => {
        doc.text(`${type}:`, { underline: true });
        doc.text(`  Total: ${stats.sum} ${data.overall.unit}`, { indent: 20 });
        doc.text(`  Average: ${stats.avg} ${data.overall.unit}`, { indent: 20 });
        doc.moveDown(0.3);
      });
    }

    doc.end();
  });
};

/**
 * Generate Energy Production Report as Excel
 */
const generateEnergyProductionExcel = async (params) => {
  const data = await getEnergyProductionData(params);

  const workbook = new ExcelJS.Workbook();

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');

  summarySheet.mergeCells('A1:C1');
  summarySheet.getCell('A1').value = 'Energy Production Report';
  summarySheet.getCell('A1').font = { size: 16, bold: true };
  summarySheet.getCell('A1').alignment = { horizontal: 'center' };

  let row = 3;
  summarySheet.getCell(`A${row}`).value = 'Overall Statistics';
  summarySheet.getCell(`A${row}`).font = { bold: true, size: 12 };
  row++;

  summarySheet.getCell(`A${row}`).value = 'Total Energy:';
  summarySheet.getCell(`B${row}`).value = `${data.overall.sum} ${data.overall.unit}`;
  row++;
  summarySheet.getCell(`A${row}`).value = 'Average:';
  summarySheet.getCell(`B${row}`).value = `${data.overall.avg} ${data.overall.unit}`;
  row++;
  summarySheet.getCell(`A${row}`).value = 'Peak:';
  summarySheet.getCell(`B${row}`).value = `${data.overall.max} ${data.overall.unit}`;
  row += 2;

  // By Plant
  if (Object.keys(data.byPlant).length > 0) {
    summarySheet.getCell(`A${row}`).value = 'By Plant';
    summarySheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    row++;

    summarySheet.getCell(`A${row}`).value = 'Plant';
    summarySheet.getCell(`B${row}`).value = 'Total';
    summarySheet.getCell(`C${row}`).value = 'Average';
    summarySheet.getCell(`D${row}`).value = 'Peak';
    summarySheet.getRow(row).font = { bold: true };
    row++;

    Object.entries(data.byPlant).forEach(([plantId, stats]) => {
      summarySheet.getCell(`A${row}`).value = stats.name;
      summarySheet.getCell(`B${row}`).value = stats.sum;
      summarySheet.getCell(`C${row}`).value = stats.avg;
      summarySheet.getCell(`D${row}`).value = stats.max;
      row++;
    });
  }

  // Daily Data Sheet
  const dailySheet = workbook.addWorksheet('Daily Production');
  dailySheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Total Energy (kWh)', key: 'totalEnergy', width: 20 },
    { header: 'Avg Power (kW)', key: 'avgPower', width: 18 },
    { header: 'Peak Power (kW)', key: 'peakPower', width: 18 },
  ];

  dailySheet.getRow(1).font = { bold: true };
  data.daily.forEach(item => {
    dailySheet.addRow(item);
  });

  summarySheet.getColumn('A').width = 25;
  summarySheet.getColumn('B').width = 20;

  return await workbook.xlsx.writeBuffer();
};

// ============================================
// EXPORTS
// ============================================

export {
  // Plant Performance
  getPlantPerformanceData,
  generatePlantPerformancePDF,
  generatePlantPerformanceExcel,

  // Device Performance
  getDevicePerformanceData,
  generateDevicePerformancePDF,
  generateDevicePerformanceExcel,

  // Alarm Report
  getAlarmReportData,
  generateAlarmReportPDF,
  generateAlarmReportExcel,

  // Energy Production
  getEnergyProductionData,
  generateEnergyProductionPDF,
  generateEnergyProductionExcel,
};
