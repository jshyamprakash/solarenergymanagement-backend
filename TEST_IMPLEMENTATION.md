# Phase 13 & 14 Implementation Test Guide

This document provides testing instructions for the newly implemented features:
- Phase 13: Report Generation Service
- Phase 14: Audit Log API Endpoints

## Prerequisites

1. Ensure PostgreSQL is running
2. Database is seeded with test data: `npm run prisma:seed`
3. Backend server is running: `npm run dev`
4. You have admin credentials for testing audit endpoints

## Test Credentials (from seed data)

**Admin User:**
- Email: `admin@solar.com`
- Password: `Admin123!`

## Phase 14: Audit Log API Endpoints

All audit endpoints require Admin role authentication.

### 1. Get All Audit Logs

```bash
GET /api/audit
Authorization: Bearer <admin_token>
Query Parameters:
  - page: 1 (optional)
  - limit: 20 (optional)
  - entityType: User|Plant|Device|Tag|Alarm (optional)
  - userId: <user_id> (optional)
  - action: CREATE|UPDATE|DELETE (optional)
  - startDate: 2024-01-01 (optional)
  - endDate: 2024-12-31 (optional)
  - sortBy: timestamp (optional)
  - sortOrder: desc (optional)
```

**Example cURL:**
```bash
curl -X GET "http://localhost:3000/api/audit?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "userId": "...",
      "action": "CREATE",
      "resource": "Plant",
      "resourceId": "...",
      "timestamp": "2024-01-15T10:30:00Z",
      "user": {
        "id": "...",
        "email": "admin@solar.com",
        "name": "Admin User",
        "role": "ADMIN"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15
  }
}
```

### 2. Get Audit Statistics

```bash
GET /api/audit/stats
Authorization: Bearer <admin_token>
Query Parameters:
  - entityType: User|Plant|Device|Tag|Alarm (optional)
  - userId: <user_id> (optional)
  - startDate: 2024-01-01 (optional)
  - endDate: 2024-12-31 (optional)
```

**Example cURL:**
```bash
curl -X GET "http://localhost:3000/api/audit/stats" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "total": 250,
    "byAction": {
      "CREATE": 100,
      "UPDATE": 120,
      "DELETE": 30
    },
    "byResource": {
      "Plant": 50,
      "Device": 150,
      "User": 50
    },
    "topUsers": [
      {
        "userId": "...",
        "count": 100
      }
    ]
  }
}
```

### 3. Get Entity Audit History

```bash
GET /api/audit/entity/:entityType/:entityId
Authorization: Bearer <admin_token>
Query Parameters:
  - limit: 50 (optional)
```

**Example cURL:**
```bash
# Get audit history for a specific plant
curl -X GET "http://localhost:3000/api/audit/entity/Plant/PLANT_ID?limit=20" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "action": "UPDATE",
      "resource": "Plant",
      "resourceId": "PLANT_ID",
      "timestamp": "2024-01-15T10:30:00Z",
      "changes": {
        "before": { "status": "ACTIVE" },
        "after": { "status": "MAINTENANCE" }
      },
      "user": { ... }
    }
  ]
}
```

### 4. Export Audit Logs

```bash
POST /api/audit/export
Authorization: Bearer <admin_token>
Content-Type: application/json

Body:
{
  "format": "json" | "csv",
  "entityType": "Plant" (optional),
  "startDate": "2024-01-01" (optional),
  "endDate": "2024-12-31" (optional)
}
```

**Example cURL (JSON Export):**
```bash
curl -X POST "http://localhost:3000/api/audit/export" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format": "json"}' \
  --output audit-logs.json
```

**Example cURL (CSV Export):**
```bash
curl -X POST "http://localhost:3000/api/audit/export" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format": "csv"}' \
  --output audit-logs.csv
```

### 5. Cleanup Old Audit Logs

```bash
DELETE /api/audit/cleanup
Authorization: Bearer <admin_token>
Content-Type: application/json

Body:
{
  "retentionDays": 90
}
```

**Example cURL:**
```bash
curl -X DELETE "http://localhost:3000/api/audit/cleanup" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"retentionDays": 90}'
```

## Phase 13: Report Generation Service

The report service is integrated but requires controller and route setup for HTTP access. The service provides these functions:

### Available Report Types

#### 1. Plant Performance Report

**Service Functions:**
- `getPlantPerformanceData(params)` - Get report data as JSON
- `generatePlantPerformancePDF(params)` - Generate PDF buffer
- `generatePlantPerformanceExcel(params)` - Generate Excel buffer

**Parameters:**
```javascript
{
  plantId: "uuid",
  startDate: "2024-01-01",
  endDate: "2024-01-31",
  userId: "uuid",
  userRole: "ADMIN"
}
```

**Data Included:**
- Plant information
- Energy generation summary (total, avg, peak, min)
- Daily energy data for charts
- Device uptime statistics
- Alarm summary by severity and status

#### 2. Device Performance Report

**Service Functions:**
- `getDevicePerformanceData(params)` - Get report data as JSON
- `generateDevicePerformancePDF(params)` - Generate PDF buffer
- `generateDevicePerformanceExcel(params)` - Generate Excel buffer

**Parameters:**
```javascript
{
  deviceId: "uuid",
  startDate: "2024-01-01",
  endDate: "2024-01-31",
  userId: "uuid",
  userRole: "ADMIN"
}
```

**Data Included:**
- Device information
- Performance metrics per tag (avg, min, max)
- Trend data for charts
- Downtime analysis
- Recent alarms

#### 3. Alarm Report

**Service Functions:**
- `getAlarmReportData(params)` - Get report data as JSON
- `generateAlarmReportPDF(params)` - Generate PDF buffer
- `generateAlarmReportExcel(params)` - Generate Excel buffer

**Parameters:**
```javascript
{
  plantId: "uuid" (optional),
  deviceId: "uuid" (optional),
  severity: "CRITICAL" (optional),
  status: "ACTIVE" (optional),
  startDate: "2024-01-01",
  endDate: "2024-01-31",
  userId: "uuid",
  userRole: "ADMIN"
}
```

**Data Included:**
- Alarm summary by severity and status
- Resolution time statistics
- Top alarm types
- Detailed alarm list

#### 4. Energy Production Report

**Service Functions:**
- `getEnergyProductionData(params)` - Get report data as JSON
- `generateEnergyProductionPDF(params)` - Generate PDF buffer
- `generateEnergyProductionExcel(params)` - Generate Excel buffer

**Parameters:**
```javascript
{
  plantId: "uuid" (optional),
  deviceId: "uuid" (optional),
  startDate: "2024-01-01",
  endDate: "2024-01-31",
  userId: "uuid",
  userRole: "ADMIN"
}
```

**Data Included:**
- Overall energy statistics
- Daily energy production data
- Performance by plant
- Performance by device type

### Usage Example (in a controller)

```javascript
import * as reportService from '../services/reportService.js';

// Generate plant performance report as PDF
const pdfBuffer = await reportService.generatePlantPerformancePDF({
  plantId: 'plant-uuid',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  userId: req.user.id,
  userRole: req.user.role,
});

res.setHeader('Content-Type', 'application/pdf');
res.setHeader('Content-Disposition', 'attachment; filename=plant-report.pdf');
res.send(pdfBuffer);

// Generate as Excel
const excelBuffer = await reportService.generatePlantPerformanceExcel({...});

res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
res.setHeader('Content-Disposition', 'attachment; filename=plant-report.xlsx');
res.send(excelBuffer);
```

## Next Steps

To expose the report service via HTTP endpoints:

1. Create `src/controllers/reportController.js`
2. Create `src/routes/reports.js`
3. Register routes in `src/app.js`
4. Add validation schemas for report requests

Example route structure:
```
POST /api/reports/plant-performance
POST /api/reports/device-performance
POST /api/reports/alarms
POST /api/reports/energy-production
```

## Security Notes

1. **Audit Endpoints**: Only accessible to ADMIN role users
2. **Report Generation**: Access control based on plant ownership (non-admin users can only generate reports for their plants)
3. **Rate Limiting**: Consider adding rate limiting for export endpoints to prevent abuse
4. **Data Privacy**: Audit logs may contain sensitive information - ensure proper access controls

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400
}
```

Common status codes:
- 400: Bad Request (invalid parameters)
- 401: Unauthorized (missing or invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found (resource doesn't exist)
- 500: Internal Server Error

## Performance Considerations

1. **Large Exports**: Audit log exports can be large. Consider pagination for very large datasets.
2. **Report Generation**: PDF/Excel generation can be CPU intensive. Consider:
   - Implementing job queue for large reports
   - Adding caching for frequently requested reports
   - Setting reasonable date range limits
3. **Database Queries**: Report queries aggregate large datasets. Ensure:
   - Proper indexes on timestamp and foreign key columns
   - Query optimization for aggregations
   - Connection pooling is configured

## Validation

All endpoints validate input parameters. Common validations:
- Date formats (ISO 8601)
- UUID formats for entity IDs
- Enum values for entityType, action, severity, status
- Numeric ranges for pagination parameters

## Monitoring

Monitor these metrics:
- Audit log growth rate
- Report generation time
- Export file sizes
- Database query performance
- API response times

## Troubleshooting

### Issue: "You do not have access to this plant"
**Solution**: Ensure the requesting user owns the plant or has been granted access via UserPlantAccess

### Issue: Empty report data
**Solution**: Verify:
1. Date range contains data
2. Plant/device has associated data points
3. Tags are properly configured

### Issue: PDF generation fails
**Solution**: Check:
1. PDFKit is properly installed
2. Sufficient memory for large reports
3. No special characters breaking PDF rendering

### Issue: Audit logs not appearing
**Solution**: Verify:
1. AuditService is being called in CRUD operations
2. Database transactions are completing successfully
3. User has ADMIN role to view logs
