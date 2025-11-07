# Solar Energy Monitoring System - API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### 1. Login

**POST** `/api/auth/login`

Login with email and password to receive JWT tokens.

**Request Body:**
```json
{
  "email": "admin@solar.com",
  "password": "Admin123!"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "01a5f0b6-863d-4042-94d5-f92cacfe9455",
      "email": "admin@solar.com",
      "name": "Admin User",
      "role": "ADMIN",
      "isActive": true,
      "lastLogin": "2025-11-04T15:43:33.264Z",
      "createdAt": "2025-11-04T15:24:45.953Z",
      "updatedAt": "2025-11-04T15:43:33.265Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (401):**
```json
{
  "status": "fail",
  "message": "Invalid email or password"
}
```

---

### 2. Get Current User

**GET** `/api/auth/me`

Get the currently authenticated user's information.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "01a5f0b6-863d-4042-94d5-f92cacfe9455",
      "email": "admin@solar.com",
      "name": "Admin User",
      "role": "ADMIN",
      "isActive": true,
      "lastLogin": "2025-11-04T15:43:33.264Z",
      "createdAt": "2025-11-04T15:24:45.953Z",
      "updatedAt": "2025-11-04T15:43:33.265Z"
    }
  }
}
```

**Error Response (401):**
```json
{
  "status": "fail",
  "message": "You are not logged in. Please log in to get access"
}
```

---

### 3. Refresh Token

**POST** `/api/auth/refresh`

Refresh the access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (401):**
```json
{
  "status": "fail",
  "message": "Invalid or expired refresh token"
}
```

---

### 4. Logout

**POST** `/api/auth/logout`

Logout the current user (client-side token removal).

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

## User Roles

- **ADMIN**: Full system access
- **PLANT_MANAGER**: Manage plants and devices
- **VIEWER**: Read-only access

---

## Development Credentials

### Admin User
```
Email: admin@solar.com
Password: Admin123!
```

### Plant Manager
```
Email: manager@solar.com
Password: Manager123!
```

### Viewer
```
Email: viewer@solar.com
Password: Viewer123!
```

---

## Error Responses

All error responses follow this format:

```json
{
  "status": "fail" | "error",
  "message": "Error message",
  "errors": [] // Optional: validation errors array
}
```

### Common HTTP Status Codes

- **200 OK**: Successful request
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Duplicate resource (e.g., email already exists)
- **422 Unprocessable Entity**: Validation failed
- **500 Internal Server Error**: Server error

---

## Example cURL Commands

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@solar.com","password":"Admin123!"}'
```

### Get Current User
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Refresh Token
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN_HERE"}'
```

### Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Plant Management Endpoints

### 1. Get All Plants

**GET** `/api/plants`

Get all plants with filters and pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): Filter by status (ACTIVE, INACTIVE, MAINTENANCE, OFFLINE)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sortBy` (optional): Sort field (name, capacity, createdAt, updatedAt)
- `sortOrder` (optional): Sort order (asc, desc)

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "plants": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

### 2. Create Plant

**POST** `/api/plants`

Create a new plant (Admin or Plant Manager only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Test Solar Plant",
  "location": {
    "lat": 28.7041,
    "lng": 77.1025,
    "address": "Delhi, India"
  },
  "capacity": 25000,
  "status": "ACTIVE",
  "timezone": "Asia/Kolkata"
}
```

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "plant": {
      "id": "...",
      "name": "Test Solar Plant",
      "location": {...},
      "capacity": 25000,
      ...
    }
  }
}
```

---

### 3. Get Plant by ID

**GET** `/api/plants/:id`

Get a specific plant by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "plant": {
      "id": "...",
      "name": "Maharashtra Solar Facility",
      "location": {...},
      "capacity": 80000,
      "_count": {
        "devices": 19,
        "alarms": 6
      },
      ...
    }
  }
}
```

---

### 4. Update Plant

**PUT** `/api/plants/:id`

Update a plant (Admin or Plant Manager for own plants only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Plant Name",
  "status": "MAINTENANCE",
  "capacity": 30000
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "plant": {...}
  }
}
```

---

### 5. Delete Plant

**DELETE** `/api/plants/:id`

Delete a plant (Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "message": "Plant deleted successfully"
  }
}
```

---

### 6. Get Plant Statistics

**GET** `/api/plants/:id/stats`

Get comprehensive statistics for a plant.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "stats": {
      "deviceStats": {
        "total": 19,
        "online": 17,
        "offline": 2,
        "byType": [...]
      },
      "alarmStats": {
        "active": 6
      },
      "dataStats": {
        "last24Hours": 24726
      },
      "energyStats": {
        "totalGenerated": 3025240
      }
    }
  }
}
```

---

## Coming Soon

- Device Management APIs
- Data Query APIs
- Alarm Management APIs
- User Management APIs
- Report Generation APIs
