# Report Service Usage Guide

This guide shows how to use the Report Service programmatically or via HTTP endpoints (once controllers are created).

## Import the Service

```javascript
import * as reportService from '../services/reportService.js';
```

## Plant Performance Report

### Get Report Data (JSON)

```javascript
const reportData = await reportService.getPlantPerformanceData({
  plantId: 'uuid-of-plant',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  userId: req.user.id,
  userRole: req.user.role,
});

// Returns:
// {
//   plant: { id, name, location, capacity, status, ... },
//   reportPeriod: { startDate, endDate },
//   energyGeneration: { sum, avg, max, min, count, unit, dailyData },
//   deviceUptime: { total, online, offline, error, maintenance, uptimePercentage },
//   alarms: { total, bySeverity, byStatus },
//   generatedAt: ISO timestamp
// }
```

### Generate PDF

```javascript
const pdfBuffer = await reportService.generatePlantPerformancePDF({
  plantId: 'uuid-of-plant',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  userId: req.user.id,
  userRole: req.user.role,
});

// Send as download
res.setHeader('Content-Type', 'application/pdf');
res.setHeader('Content-Disposition', 'attachment; filename=plant-performance-report.pdf');
res.send(pdfBuffer);
```

### Generate Excel

```javascript
const excelBuffer = await reportService.generatePlantPerformanceExcel({
  plantId: 'uuid-of-plant',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  userId: req.user.id,
  userRole: req.user.role,
});

// Send as download
res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
res.setHeader('Content-Disposition', 'attachment; filename=plant-performance-report.xlsx');
res.send(excelBuffer);
```

## Device Performance Report

### Get Report Data (JSON)

```javascript
const reportData = await reportService.getDevicePerformanceData({
  deviceId: 'uuid-of-device',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  userId: req.user.id,
  userRole: req.user.role,
});

// Returns:
// {
//   device: { id, name, deviceType, status, serialNumber, plant },
//   reportPeriod: { startDate, endDate },
//   performance: {
//     [tagName]: { avg, min, max, sum, count, unit, trend }
//   },
//   downtime: { totalHours, alarmCount, criticalAlarms },
//   recentAlarms: [...],
//   generatedAt: ISO timestamp
// }
```

### Generate PDF

```javascript
const pdfBuffer = await reportService.generateDevicePerformancePDF({
  deviceId: 'uuid-of-device',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  userId: req.user.id,
  userRole: req.user.role,
});

res.setHeader('Content-Type', 'application/pdf');
res.setHeader('Content-Disposition', 'attachment; filename=device-performance-report.pdf');
res.send(pdfBuffer);
```

### Generate Excel

```javascript
const excelBuffer = await reportService.generateDevicePerformanceExcel({
  deviceId: 'uuid-of-device',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  userId: req.user.id,
  userRole: req.user.role,
});

res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
res.setHeader('Content-Disposition', 'attachment; filename=device-performance-report.xlsx');
res.send(excelBuffer);
```

## Alarm Report

### Get Report Data (JSON)

```javascript
const reportData = await reportService.getAlarmReportData({
  plantId: 'uuid-of-plant',      // optional
  deviceId: 'uuid-of-device',    // optional
  severity: 'CRITICAL',          // optional: CRITICAL, HIGH, MEDIUM, LOW, INFO
  status: 'ACTIVE',              // optional: ACTIVE, ACKNOWLEDGED, RESOLVED
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  userId: req.user.id,
  userRole: req.user.role,
});

// Returns:
// {
//   filters: { plantId, deviceId, severity, status, startDate, endDate },
//   summary: { total, bySeverity, byStatus, resolved, pending },
//   resolutionTime: { avgMinutes, minMinutes, maxMinutes, totalResolved },
//   topAlarmTypes: [{ message, count, severity }, ...],
//   alarms: [...detailed alarm list...],
//   generatedAt: ISO timestamp
// }
```

### Generate PDF

```javascript
const pdfBuffer = await reportService.generateAlarmReportPDF({
  plantId: 'uuid-of-plant',      // optional
  deviceId: 'uuid-of-device',    // optional
  severity: 'CRITICAL',          // optional
  status: 'ACTIVE',              // optional
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  userId: req.user.id,
  userRole: req.user.role,
});

res.setHeader('Content-Type', 'application/pdf');
res.setHeader('Content-Disposition', 'attachment; filename=alarm-report.pdf');
res.send(pdfBuffer);
```

### Generate Excel

```javascript
const excelBuffer = await reportService.generateAlarmReportExcel({
  plantId: 'uuid-of-plant',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  userId: req.user.id,
  userRole: req.user.role,
});

res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
res.setHeader('Content-Disposition', 'attachment; filename=alarm-report.xlsx');
res.send(excelBuffer);
```

## Energy Production Report

### Get Report Data (JSON)

```javascript
const reportData = await reportService.getEnergyProductionData({
  plantId: 'uuid-of-plant',      // optional - filter by specific plant
  deviceId: 'uuid-of-device',    // optional - filter by specific device
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  userId: req.user.id,
  userRole: req.user.role,
});

// Returns:
// {
//   filters: { plantId, deviceId, startDate, endDate },
//   overall: { sum, avg, max, min, count, unit },
//   daily: [{ date, totalEnergy, avgPower, peakPower }, ...],
//   byPlant: {
//     [plantId]: { name, sum, avg, max, min, count }
//   },
//   byDeviceType: {
//     [deviceType]: { sum, avg, max, min, count }
//   },
//   generatedAt: ISO timestamp
// }
```

### Generate PDF

```javascript
const pdfBuffer = await reportService.generateEnergyProductionPDF({
  plantId: 'uuid-of-plant',      // optional
  deviceId: 'uuid-of-device',    // optional
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  userId: req.user.id,
  userRole: req.user.role,
});

res.setHeader('Content-Type', 'application/pdf');
res.setHeader('Content-Disposition', 'attachment; filename=energy-production-report.pdf');
res.send(pdfBuffer);
```

### Generate Excel

```javascript
const excelBuffer = await reportService.generateEnergyProductionExcel({
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  userId: req.user.id,
  userRole: req.user.role,
});

res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
res.setHeader('Content-Disposition', 'attachment; filename=energy-production-report.xlsx');
res.send(excelBuffer);
```

## Example: Complete Controller Implementation

Here's how you would create a controller to expose these reports via HTTP:

```javascript
// src/controllers/reportController.js

import * as reportService from '../services/reportService.js';
import asyncHandler from '../middlewares/asyncHandler.js';

/**
 * Generate Plant Performance Report
 * POST /api/reports/plant-performance
 */
export const generatePlantPerformanceReport = asyncHandler(async (req, res) => {
  const { plantId, startDate, endDate, format = 'json' } = req.body;

  if (format === 'pdf') {
    const pdfBuffer = await reportService.generatePlantPerformancePDF({
      plantId,
      startDate,
      endDate,
      userId: req.user.id,
      userRole: req.user.role,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=plant-performance-${plantId}-${startDate}-to-${endDate}.pdf`);
    return res.send(pdfBuffer);
  }

  if (format === 'excel') {
    const excelBuffer = await reportService.generatePlantPerformanceExcel({
      plantId,
      startDate,
      endDate,
      userId: req.user.id,
      userRole: req.user.role,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=plant-performance-${plantId}-${startDate}-to-${endDate}.xlsx`);
    return res.send(excelBuffer);
  }

  // Default: JSON format
  const reportData = await reportService.getPlantPerformanceData({
    plantId,
    startDate,
    endDate,
    userId: req.user.id,
    userRole: req.user.role,
  });

  res.status(200).json({
    success: true,
    data: reportData,
    message: 'Plant performance report generated successfully',
  });
});
```

## Example: Routes Implementation

```javascript
// src/routes/reports.js

import express from 'express';
import * as reportController from '../controllers/reportController.js';
import { protect, restrictTo } from '../middlewares/auth.js';

const router = express.Router();

// All report routes require authentication
router.use(protect);

/**
 * POST /api/reports/plant-performance
 * Body: { plantId, startDate, endDate, format: 'json'|'pdf'|'excel' }
 */
router.post('/plant-performance', reportController.generatePlantPerformanceReport);

/**
 * POST /api/reports/device-performance
 * Body: { deviceId, startDate, endDate, format: 'json'|'pdf'|'excel' }
 */
router.post('/device-performance', reportController.generateDevicePerformanceReport);

/**
 * POST /api/reports/alarms
 * Body: { plantId?, deviceId?, severity?, status?, startDate, endDate, format }
 */
router.post('/alarms', reportController.generateAlarmReport);

/**
 * POST /api/reports/energy-production
 * Body: { plantId?, deviceId?, startDate, endDate, format }
 */
router.post('/energy-production', reportController.generateEnergyProductionReport);

export default router;
```

## Example: Register Routes in App

```javascript
// src/app.js

import reportRoutes from './routes/reports.js';

// ... other routes ...

app.use('/api/reports', reportRoutes);
```

## Error Handling

All report functions throw standard errors that are caught by the asyncHandler:

```javascript
try {
  const reportData = await reportService.getPlantPerformanceData({...});
} catch (error) {
  // Possible errors:
  // - NotFoundError: Plant not found
  // - BadRequestError: You do not have access to this plant
  // - InternalServerError: Database or processing errors
}
```

## Access Control

The report service enforces access control:

- **Admin**: Can generate reports for any plant/device
- **Plant Manager**: Can generate reports for owned plants or plants with granted access
- **Viewer**: Can generate reports for plants with granted access

Access checks are performed automatically within the service functions.

## Performance Considerations

1. **Large Date Ranges**: Be cautious with very large date ranges (e.g., multiple years)
   - Consider implementing pagination for data queries
   - Add warning messages for date ranges > 90 days

2. **PDF Generation**: Memory-intensive for large reports
   - Consider streaming PDFs for very large reports
   - Implement job queue for reports > certain size

3. **Excel Generation**: More efficient than PDF for large datasets
   - Can handle 100K+ rows if needed
   - Uses streaming internally

4. **Caching**: Consider caching frequently requested reports
   ```javascript
   const cacheKey = `report:plant:${plantId}:${startDate}:${endDate}`;
   const cached = await redis.get(cacheKey);
   if (cached) return JSON.parse(cached);

   const reportData = await reportService.getPlantPerformanceData({...});
   await redis.set(cacheKey, JSON.stringify(reportData), 'EX', 3600); // 1 hour TTL
   ```

## Validation Schema Example

```javascript
// src/validators/reportValidators.js

import { z } from 'zod';

export const plantPerformanceReportSchema = z.object({
  body: z.object({
    plantId: z.string().uuid('Invalid plant ID format'),
    startDate: z.string().refine(
      (date) => !isNaN(Date.parse(date)),
      'Invalid start date format'
    ),
    endDate: z.string().refine(
      (date) => !isNaN(Date.parse(date)),
      'Invalid end date format'
    ),
    format: z.enum(['json', 'pdf', 'excel']).default('json'),
  }),
});
```

## Complete Usage Example

```javascript
// In a controller or service

import * as reportService from '../services/reportService.js';

// Get plant performance for January 2024
const plantReport = await reportService.getPlantPerformanceData({
  plantId: '550e8400-e29b-41d4-a716-446655440000',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  userId: req.user.id,
  userRole: req.user.role,
});

console.log(`Total Energy: ${plantReport.energyGeneration.sum} kWh`);
console.log(`Uptime: ${plantReport.deviceUptime.uptimePercentage}%`);
console.log(`Total Alarms: ${plantReport.alarms.total}`);

// Generate PDF for download
const pdfBuffer = await reportService.generatePlantPerformancePDF({
  plantId: '550e8400-e29b-41d4-a716-446655440000',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  userId: req.user.id,
  userRole: req.user.role,
});

// Save to file or send as response
fs.writeFileSync('plant-report.pdf', pdfBuffer);
// or
res.send(pdfBuffer);
```
