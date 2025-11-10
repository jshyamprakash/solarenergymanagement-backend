# User Management API - Testing Guide

## Prerequisites

1. **Backend server running**
   ```bash
   cd backend
   npm run dev
   ```

2. **Admin user credentials**
   - You need an admin token to test these endpoints
   - Login as admin via `/api/auth/login`

3. **Testing tool**
   - Use Postman, Thunder Client, or curl

## Quick Start Testing

### Step 1: Get Admin Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-admin-password"
  }'
```

Save the returned token for subsequent requests.

### Step 2: Set Authorization Header

For all requests below, include:
```
Authorization: Bearer <your-admin-token>
```

## Testing Scenarios

### Scenario 1: Create a New User

**Request:**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPass123",
    "name": "Test User",
    "role": "VIEWER"
  }'
```

**Expected Result:**
- Status: 201 Created
- Response contains user object without password
- User appears in database

**Verify:**
```bash
# Check user was created
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer <token>"
```

### Scenario 2: List All Users

**Request:**
```bash
curl -X GET "http://localhost:3000/api/users?page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

**Expected Result:**
- Status: 200 OK
- Array of users with pagination metadata
- No password hashes visible

**Test Filters:**
```bash
# Filter by role
curl -X GET "http://localhost:3000/api/users?role=VIEWER" \
  -H "Authorization: Bearer <token>"

# Filter by active status
curl -X GET "http://localhost:3000/api/users?isActive=true" \
  -H "Authorization: Bearer <token>"

# Search by name or email
curl -X GET "http://localhost:3000/api/users?search=test" \
  -H "Authorization: Bearer <token>"
```

### Scenario 3: Get User by ID

**Request:**
```bash
curl -X GET http://localhost:3000/api/users/<user-id> \
  -H "Authorization: Bearer <token>"
```

**Expected Result:**
- Status: 200 OK
- User details with plant counts
- No password hash visible

**Test Error Case:**
```bash
# Non-existent user
curl -X GET http://localhost:3000/api/users/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer <token>"

# Expected: 404 Not Found
```

### Scenario 4: Update User

**Request:**
```bash
curl -X PUT http://localhost:3000/api/users/<user-id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "email": "updated@example.com"
  }'
```

**Expected Result:**
- Status: 200 OK
- Updated user object
- Changes reflected in database

**Test Password Update:**
```bash
curl -X PUT http://localhost:3000/api/users/<user-id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "NewPassword123"
  }'
```

**Verify:**
- New password is hashed in database
- User can login with new password

### Scenario 5: Update User Role

**Request:**
```bash
curl -X PUT http://localhost:3000/api/users/<user-id>/role \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "PLANT_MANAGER"
  }'
```

**Expected Result:**
- Status: 200 OK
- User role updated
- History logged in user_history table

**Test All Roles:**
```bash
# Promote to PLANT_MANAGER
{"role": "PLANT_MANAGER"}

# Promote to ADMIN
{"role": "ADMIN"}

# Demote to VIEWER
{"role": "VIEWER"}
```

**Test Error Case:**
```bash
# Try to change your own role (should fail)
curl -X PUT http://localhost:3000/api/users/<your-own-id>/role \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"role": "ADMIN"}'

# Expected: 400 Bad Request - Cannot change your own role
```

### Scenario 6: Assign Plants to User

**Prerequisites:**
- Create or identify existing plant IDs

**Request:**
```bash
curl -X POST http://localhost:3000/api/users/<user-id>/plants \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "plantIds": [
      "plant-uuid-1",
      "plant-uuid-2"
    ]
  }'
```

**Expected Result:**
- Status: 200 OK
- Plants transferred to user
- History logged

**Verify:**
```bash
# Check user's plants
curl -X GET http://localhost:3000/api/users/<user-id>/plants \
  -H "Authorization: Bearer <token>"

# Should see the assigned plants
```

### Scenario 7: Get User's Plants

**Request:**
```bash
curl -X GET "http://localhost:3000/api/users/<user-id>/plants?page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

**Expected Result:**
- Status: 200 OK
- Array of plants owned by user
- Pagination metadata
- Device and alarm counts included

### Scenario 8: Delete User

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/users/<user-id> \
  -H "Authorization: Bearer <token>"
```

**Expected Result:**
- Status: 200 OK
- User is deactivated (isActive = false)
- User still exists in database
- History logged

**Verify:**
```bash
# User should appear as inactive
curl -X GET http://localhost:3000/api/users/<user-id> \
  -H "Authorization: Bearer <token>"

# isActive should be false
```

**Test Error Case:**
```bash
# Try to delete yourself (should fail)
curl -X DELETE http://localhost:3000/api/users/<your-own-id> \
  -H "Authorization: Bearer <token>"

# Expected: 400 Bad Request - Cannot delete your own account
```

## Authorization Tests

### Test 1: Non-Admin Access

**Create a VIEWER user and login:**
```bash
# Login as viewer
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "viewer@example.com",
    "password": "ViewerPass123"
  }'
```

**Try to access user endpoints:**
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer <viewer-token>"

# Expected: 403 Forbidden
```

### Test 2: Unauthenticated Access

```bash
curl -X GET http://localhost:3000/api/users

# Expected: 401 Unauthorized
```

### Test 3: Invalid Token

```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer invalid-token"

# Expected: 401 Unauthorized
```

## Validation Tests

### Test 1: Invalid Email

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "not-an-email",
    "password": "TestPass123",
    "name": "Test User"
  }'

# Expected: 422 Validation Error
```

### Test 2: Weak Password

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "weak",
    "name": "Test User"
  }'

# Expected: 422 Validation Error
```

### Test 3: Duplicate Email

```bash
# Create user with email
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "duplicate@example.com",
    "password": "TestPass123",
    "name": "User 1"
  }'

# Try to create another with same email
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "duplicate@example.com",
    "password": "TestPass123",
    "name": "User 2"
  }'

# Expected: 409 Conflict
```

### Test 4: Invalid UUID

```bash
curl -X GET http://localhost:3000/api/users/not-a-uuid \
  -H "Authorization: Bearer <token>"

# Expected: 422 Validation Error
```

## Pagination Tests

### Test 1: Default Pagination

```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer <token>"

# Should return page 1 with 10 items
```

### Test 2: Custom Page Size

```bash
curl -X GET "http://localhost:3000/api/users?page=1&limit=5" \
  -H "Authorization: Bearer <token>"

# Should return 5 items
```

### Test 3: Navigate Pages

```bash
# Page 1
curl -X GET "http://localhost:3000/api/users?page=1&limit=5" \
  -H "Authorization: Bearer <token>"

# Page 2
curl -X GET "http://localhost:3000/api/users?page=2&limit=5" \
  -H "Authorization: Bearer <token>"
```

## Sorting Tests

### Test 1: Sort by Name

```bash
# Ascending
curl -X GET "http://localhost:3000/api/users?sortBy=name&sortOrder=asc" \
  -H "Authorization: Bearer <token>"

# Descending
curl -X GET "http://localhost:3000/api/users?sortBy=name&sortOrder=desc" \
  -H "Authorization: Bearer <token>"
```

### Test 2: Sort by Email

```bash
curl -X GET "http://localhost:3000/api/users?sortBy=email&sortOrder=asc" \
  -H "Authorization: Bearer <token>"
```

### Test 3: Sort by Date

```bash
# Most recent first
curl -X GET "http://localhost:3000/api/users?sortBy=createdAt&sortOrder=desc" \
  -H "Authorization: Bearer <token>"

# Oldest first
curl -X GET "http://localhost:3000/api/users?sortBy=createdAt&sortOrder=asc" \
  -H "Authorization: Bearer <token>"
```

## Database Verification

After each operation, verify in the database:

### Check User Creation

```sql
SELECT id, email, name, role, "isActive", "createdAt"
FROM users
WHERE email = 'testuser@example.com';
```

### Check Password Hashing

```sql
SELECT email, "passwordHash"
FROM users
WHERE email = 'testuser@example.com';

-- Password should be hashed (bcrypt format: $2a$...)
```

### Check User History

```sql
SELECT * FROM user_history
WHERE "userId" = '<user-id>'
ORDER BY "changedAt" DESC;

-- Should show all changes made to the user
```

### Check Plant Assignment

```sql
SELECT p.id, p.name, p."ownerId", u.email
FROM plants p
JOIN users u ON p."ownerId" = u.id
WHERE u.id = '<user-id>';

-- Should show plants assigned to the user
```

## Postman Collection

Create a Postman collection with:

### Environment Variables
```json
{
  "baseUrl": "http://localhost:3000",
  "adminToken": "<your-admin-token>",
  "testUserId": "<test-user-id>"
}
```

### Collection Structure
1. **Auth**
   - Login Admin
   - Get Current User

2. **Users - CRUD**
   - Create User
   - Get All Users
   - Get User by ID
   - Update User
   - Delete User

3. **Users - Role Management**
   - Update User Role

4. **Users - Plant Management**
   - Assign Plants to User
   - Get User Plants

5. **Users - Filters & Search**
   - Filter by Role
   - Filter by Active Status
   - Search Users

6. **Users - Error Cases**
   - Invalid Email
   - Weak Password
   - Duplicate Email
   - Self Delete
   - Self Role Change

## Success Criteria

After testing, verify:

- [ ] All 8 endpoints return correct status codes
- [ ] Passwords are properly hashed
- [ ] No passwords in API responses
- [ ] Pagination works correctly
- [ ] Filtering works for all fields
- [ ] Sorting works for all fields
- [ ] Search works (case-insensitive)
- [ ] Authorization prevents non-admin access
- [ ] Authentication prevents unauthenticated access
- [ ] Validation catches all invalid inputs
- [ ] User history is logged for all changes
- [ ] Plant assignment transfers ownership
- [ ] Soft delete preserves user data
- [ ] Cannot delete own account
- [ ] Cannot change own role
- [ ] Email uniqueness enforced

## Troubleshooting

### Issue: 401 Unauthorized
- Check if token is valid
- Check if token is expired
- Check Authorization header format

### Issue: 403 Forbidden
- Verify user has ADMIN role
- Check if restrictTo middleware is applied

### Issue: 422 Validation Error
- Check request body against schema
- Verify all required fields present
- Check data types match

### Issue: 409 Conflict
- Email already exists
- Update user with different email

### Issue: 404 Not Found
- Verify user ID is correct
- Check if user exists in database

## Performance Testing

### Load Test
```bash
# Use Apache Bench or similar
ab -n 1000 -c 10 \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/users
```

### Monitor Response Times
- List users: < 200ms
- Get user by ID: < 100ms
- Create user: < 300ms (bcrypt hashing)
- Update user: < 200ms
- Delete user: < 150ms

## Security Checklist

- [ ] Passwords hashed with bcrypt
- [ ] No passwords in responses
- [ ] JWT authentication required
- [ ] Role-based authorization enforced
- [ ] SQL injection prevented (Prisma)
- [ ] XSS prevented (input validation)
- [ ] CSRF not applicable (stateless API)
- [ ] Rate limiting (if configured)
- [ ] User history audit trail
