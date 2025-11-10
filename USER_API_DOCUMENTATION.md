# User Management API Documentation

## Overview
Complete CRUD operations and user-plant access management for the Solar Energy Monitoring System.

## Base URL
```
/api/users
```

## Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Authorization
Most endpoints require ADMIN role. Users can only access their own data through `/api/auth/me`.

---

## API Endpoints

### 1. Get All Users
Retrieve a paginated list of users with optional filtering.

**Endpoint:** `GET /api/users`

**Access:** Admin only

**Query Parameters:**
- `role` (optional): Filter by user role (ADMIN, PLANT_MANAGER, VIEWER)
- `isActive` (optional): Filter by active status (true/false)
- `search` (optional): Search by name or email
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sortBy` (optional): Sort field (name, email, role, createdAt, updatedAt, lastLogin) (default: createdAt)
- `sortOrder` (optional): Sort order (asc, desc) (default: desc)

**Example Request:**
```bash
GET /api/users?role=VIEWER&isActive=true&page=1&limit=10
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "name": "John Doe",
        "role": "VIEWER",
        "isActive": true,
        "lastLogin": "2024-01-15T10:30:00Z",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z",
        "_count": {
          "plants": 5
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

---

### 2. Get User by ID
Retrieve details of a specific user.

**Endpoint:** `GET /api/users/:id`

**Access:** Admin only

**Path Parameters:**
- `id`: User UUID

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "VIEWER",
      "isActive": true,
      "lastLogin": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "_count": {
        "plants": 5,
        "createdAlarms": 12
      }
    }
  }
}
```

**Error Responses:**
- `404 Not Found`: User not found

---

### 3. Create New User
Create a new user account.

**Endpoint:** `POST /api/users`

**Access:** Admin only

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123",
  "name": "Jane Smith",
  "role": "VIEWER",
  "isActive": true
}
```

**Validation Rules:**
- `email`: Required, valid email format
- `password`: Required, minimum 8 characters, must contain uppercase, lowercase, and number
- `name`: Required, 2-100 characters
- `role`: Optional, one of [ADMIN, PLANT_MANAGER, VIEWER] (default: VIEWER)
- `isActive`: Optional, boolean (default: true)

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "newuser@example.com",
      "name": "Jane Smith",
      "role": "VIEWER",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  },
  "message": "User created successfully"
}
```

**Error Responses:**
- `409 Conflict`: User with this email already exists
- `400 Bad Request`: Validation errors

---

### 4. Update User
Update user details.

**Endpoint:** `PUT /api/users/:id`

**Access:** Admin only

**Path Parameters:**
- `id`: User UUID

**Request Body:**
```json
{
  "email": "updated@example.com",
  "name": "Updated Name",
  "password": "NewSecurePass123",
  "isActive": true
}
```

**Notes:**
- All fields are optional, but at least one must be provided
- Password will be automatically hashed
- Cannot update role (use dedicated endpoint)
- User history is automatically logged

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "updated@example.com",
      "name": "Updated Name",
      "role": "VIEWER",
      "isActive": true,
      "lastLogin": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T11:00:00Z"
    }
  },
  "message": "User updated successfully"
}
```

**Error Responses:**
- `404 Not Found`: User not found
- `409 Conflict`: Email already in use by another user

---

### 5. Delete User
Soft delete a user by deactivating their account.

**Endpoint:** `DELETE /api/users/:id`

**Access:** Admin only

**Path Parameters:**
- `id`: User UUID

**Notes:**
- This is a soft delete - sets `isActive` to false
- Cannot delete your own account
- User history is logged

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "message": "User deactivated successfully"
  }
}
```

**Error Responses:**
- `404 Not Found`: User not found
- `400 Bad Request`: Cannot delete your own account

---

### 6. Update User Role
Change a user's role.

**Endpoint:** `PUT /api/users/:id/role`

**Access:** Admin only

**Path Parameters:**
- `id`: User UUID

**Request Body:**
```json
{
  "role": "PLANT_MANAGER"
}
```

**Valid Roles:**
- `ADMIN`: Full system access
- `PLANT_MANAGER`: Can manage plants and devices
- `VIEWER`: Read-only access

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "PLANT_MANAGER",
      "isActive": true,
      "lastLogin": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T11:00:00Z"
    }
  },
  "message": "User role updated successfully"
}
```

**Error Responses:**
- `404 Not Found`: User not found
- `400 Bad Request`: Cannot change your own role

---

### 7. Assign Plants to User
Transfer ownership of plants to a user.

**Endpoint:** `POST /api/users/:id/plants`

**Access:** Admin only

**Path Parameters:**
- `id`: User UUID

**Request Body:**
```json
{
  "plantIds": [
    "plant-uuid-1",
    "plant-uuid-2",
    "plant-uuid-3"
  ]
}
```

**Notes:**
- All plants must exist
- Plants will be transferred from their current owner
- User history is logged

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "message": "3 plant(s) assigned to user successfully",
    "plantIds": [
      "plant-uuid-1",
      "plant-uuid-2",
      "plant-uuid-3"
    ]
  }
}
```

**Error Responses:**
- `404 Not Found`: User not found or one or more plants not found

---

### 8. Get User's Plants
Retrieve all plants owned by a user.

**Endpoint:** `GET /api/users/:id/plants`

**Access:** Admin only

**Path Parameters:**
- `id`: User UUID

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "plants": [
      {
        "id": "uuid",
        "name": "Solar Plant A",
        "location": {
          "lat": 40.7128,
          "lng": -74.0060,
          "address": "123 Main St, New York, NY"
        },
        "capacity": 1000.5,
        "status": "ACTIVE",
        "installationDate": "2023-01-01T00:00:00Z",
        "createdAt": "2023-01-01T00:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z",
        "_count": {
          "devices": 25,
          "alarms": 3
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

**Error Responses:**
- `404 Not Found`: User not found

---

## Security Features

### Password Security
- Passwords are hashed using bcrypt with salt rounds of 12
- Passwords never returned in API responses
- Strong password requirements enforced

### Audit Trail
All user modifications are logged to the `user_history` table with:
- User ID
- Changes made
- User who made the changes
- Timestamp

### Authorization
- All endpoints require authentication
- Admin-only access enforced via middleware
- Self-deletion and self-role-change prevented

---

## Error Handling

All errors follow a consistent format:

```json
{
  "status": "error",
  "message": "Error message here",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ]
}
```

**Common HTTP Status Codes:**
- `200 OK`: Successful GET, PUT, DELETE
- `201 Created`: Successful POST
- `400 Bad Request`: Validation errors or bad input
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate email)
- `500 Internal Server Error`: Server error

---

## Database Schema

### User Model
```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String
  role         UserRole @default(VIEWER)
  isActive     Boolean  @default(true)
  lastLogin    DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

enum UserRole {
  ADMIN
  PLANT_MANAGER
  VIEWER
}
```

### User History Model
```prisma
model UserHistory {
  id        String   @id @default(uuid())
  userId    String
  changes   Json
  changedBy String
  changedAt DateTime @default(now())
}
```

---

## Testing Examples

### Create Admin User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminPass123",
    "name": "Admin User",
    "role": "ADMIN"
  }'
```

### List All Active Users
```bash
curl -X GET "http://localhost:3000/api/users?isActive=true&page=1&limit=20" \
  -H "Authorization: Bearer <admin-token>"
```

### Update User Role
```bash
curl -X PUT http://localhost:3000/api/users/{userId}/role \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "PLANT_MANAGER"
  }'
```

### Assign Plants to User
```bash
curl -X POST http://localhost:3000/api/users/{userId}/plants \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "plantIds": ["plant-id-1", "plant-id-2"]
  }'
```

---

## Implementation Files

### Created Files
1. `/backend/src/validators/userValidators.js` - Zod validation schemas
2. `/backend/src/services/userService.js` - Business logic layer
3. `/backend/src/controllers/userController.js` - HTTP request handlers
4. `/backend/src/routes/users.js` - Route definitions

### Modified Files
1. `/backend/src/app.js` - Added user routes to Express app

---

## Next Steps

### Recommended Enhancements
1. **Email Notifications**: Send welcome emails when users are created
2. **Password Reset**: Implement forgot password functionality
3. **User Permissions**: Extend beyond role-based to granular permissions
4. **Activity Logging**: Track user login history and actions
5. **Bulk Operations**: Support bulk user creation/updates
6. **User Export**: Export user data in CSV/Excel format
7. **Profile Pictures**: Add avatar upload functionality
8. **Two-Factor Authentication**: Implement 2FA for enhanced security
