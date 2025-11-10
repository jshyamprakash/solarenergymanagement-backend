/**
 * Report Controller
 * Handles HTTP requests for report generation
 * Supports JSON, PDF, and Excel formats
 */

import * as reportService from '../services/reportService.js';
import asyncHandler from '../middlewares/asyncHandler.js';

/**
 * Generate Plant Performance Report
 * POST /api/reports/plant-performance
 * @access Private (Authenticated users based on plant access)
 */
export const generatePlantPerformanceReport = asyncHandler(async (req, res) => {
  const { plantId, startDate, endDate, format = 'json' } = req.body;

  const options = {
    plantId,
    startDate,
    endDate,
    userId: req.user.id,
    userRole: req.user.role,
  };

  // Generate PDF report
  if (format === 'pdf') {
    const pdfBuffer = await reportService.generatePlantPerformancePDF(options);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=plant-performance-${plantId}-${startDate}-to-${endDate}.pdf`
    );
    return res.send(pdfBuffer);
  }

  // Generate Excel report
  if (format === 'excel') {
    const excelBuffer = await reportService.generatePlantPerformanceExcel(options);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=plant-performance-${plantId}-${startDate}-to-${endDate}.xlsx`
    );
    return res.send(excelBuffer);
  }

  // Default: JSON format
  const reportData = await reportService.getPlantPerformanceData(options);

  res.status(200).json({
    success: true,
    data: reportData,
    message: 'Plant performance report generated successfully',
  });
});

/**
 * Generate Device Performance Report
 * POST /api/reports/device-performance
 * @access Private (Authenticated users based on plant access)
 */
export const generateDevicePerformanceReport = asyncHandler(async (req, res) => {
  const { deviceId, startDate, endDate, format = 'json' } = req.body;

  const options = {
    deviceId,
    startDate,
    endDate,
    userId: req.user.id,
    userRole: req.user.role,
  };

  // Generate PDF report
  if (format === 'pdf') {
    const pdfBuffer = await reportService.generateDevicePerformancePDF(options);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=device-performance-${deviceId}-${startDate}-to-${endDate}.pdf`
    );
    return res.send(pdfBuffer);
  }

  // Generate Excel report
  if (format === 'excel') {
    const excelBuffer = await reportService.generateDevicePerformanceExcel(options);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=device-performance-${deviceId}-${startDate}-to-${endDate}.xlsx`
    );
    return res.send(excelBuffer);
  }

  // Default: JSON format
  const reportData = await reportService.getDevicePerformanceData(options);

  res.status(200).json({
    success: true,
    data: reportData,
    message: 'Device performance report generated successfully',
  });
});

/**
 * Generate Alarm Report
 * POST /api/reports/alarms
 * @access Private (Authenticated users based on plant access)
 */
export const generateAlarmReport = asyncHandler(async (req, res) => {
  const { plantId, deviceId, severity, status, startDate, endDate, format = 'json' } = req.body;

  const options = {
    plantId,
    deviceId,
    severity,
    status,
    startDate,
    endDate,
    userId: req.user.id,
    userRole: req.user.role,
  };

  // Generate PDF report
  if (format === 'pdf') {
    const pdfBuffer = await reportService.generateAlarmReportPDF(options);

    const filename = plantId
      ? `alarm-report-plant-${plantId}-${startDate}-to-${endDate}.pdf`
      : `alarm-report-${startDate}-to-${endDate}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.send(pdfBuffer);
  }

  // Generate Excel report
  if (format === 'excel') {
    const excelBuffer = await reportService.generateAlarmReportExcel(options);

    const filename = plantId
      ? `alarm-report-plant-${plantId}-${startDate}-to-${endDate}.xlsx`
      : `alarm-report-${startDate}-to-${endDate}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.send(excelBuffer);
  }

  // Default: JSON format
  const reportData = await reportService.getAlarmReportData(options);

  res.status(200).json({
    success: true,
    data: reportData,
    message: 'Alarm report generated successfully',
  });
});

/**
 * Generate Energy Production Report
 * POST /api/reports/energy-production
 * @access Private (Authenticated users based on plant access)
 */
export const generateEnergyProductionReport = asyncHandler(async (req, res) => {
  const { plantId, deviceId, startDate, endDate, format = 'json' } = req.body;

  const options = {
    plantId,
    deviceId,
    startDate,
    endDate,
    userId: req.user.id,
    userRole: req.user.role,
  };

  // Generate PDF report
  if (format === 'pdf') {
    const pdfBuffer = await reportService.generateEnergyProductionPDF(options);

    const filename = plantId
      ? `energy-production-plant-${plantId}-${startDate}-to-${endDate}.pdf`
      : `energy-production-${startDate}-to-${endDate}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.send(pdfBuffer);
  }

  // Generate Excel report
  if (format === 'excel') {
    const excelBuffer = await reportService.generateEnergyProductionExcel(options);

    const filename = plantId
      ? `energy-production-plant-${plantId}-${startDate}-to-${endDate}.xlsx`
      : `energy-production-${startDate}-to-${endDate}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.send(excelBuffer);
  }

  // Default: JSON format
  const reportData = await reportService.getEnergyProductionData(options);

  res.status(200).json({
    success: true,
    data: reportData,
    message: 'Energy production report generated successfully',
  });
});
