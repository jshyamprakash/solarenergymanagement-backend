/**
 * User Service
 * Business logic for user management
 */

import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors.js';
// AUDIT LOG - COMMENTED OUT (Enable when needed)
// import { logAuditEntry } from './auditService.js';

/**
 * Get all users with filters and pagination
 */
const getAllUsers = async (filters = {}) => {
  const {
    role,
    isActive,
    search,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters;

  // Build where clause
  const where = {};

  // Filter by role if provided
  if (role) {
    where.role = role;
  }

  // Filter by active status if provided
  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  // Search by name or email
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const take = limit;

  // Get total count
  const total = await prisma.user.count({ where });

  // Get users
  const users = await prisma.user.findMany({
    where,
    skip,
    take,
    orderBy: {
      [sortBy]: sortOrder,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          plantMaps: true,
        },
      },
    },
  });

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get user by ID
 */
const getUserById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          plantMaps: true,
          createdAlarms: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
};

/**
 * Create a new user
 */
const createUser = async (userData, createdById) => {
  const { email, password, name, role = 'VIEWER', isActive = true } = userData;

  // Check if user with email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role,
      isActive,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Log user creation to history
  await prisma.userHistory.create({
    data: {
      userId: user.id,
      changes: {
        action: 'created',
        fields: {
          email,
          name,
          role,
          isActive,
        },
      },
      changedBy: createdById,
    },
  });

  // Log to audit
  //   // await logAuditEntry({
  //     entityType: 'User',
  //     entityId: user.id,
  //     action: 'CREATE',
  //     userId: createdById,
  //     changesBefore: null,
  //     changesAfter: {
  //       email: user.email,
  //       name: user.name,
  //       role: user.role,
  //       isActive: user.isActive,
  //     },
  //   });

  return user;
};

/**
 * Update user
 */
const updateUser = async (userId, updateData, updatedById) => {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new NotFoundError('User not found');
  }

  // If email is being updated, check for conflicts
  if (updateData.email && updateData.email !== existingUser.email) {
    const emailExists = await prisma.user.findUnique({
      where: { email: updateData.email },
    });

    if (emailExists) {
      throw new ConflictError('User with this email already exists');
    }
  }

  // Hash password if being updated
  const dataToUpdate = { ...updateData };
  if (updateData.password) {
    dataToUpdate.passwordHash = await bcrypt.hash(updateData.password, 12);
    delete dataToUpdate.password;
  }

  // Update user
  const user = await prisma.user.update({
    where: { id: userId },
    data: dataToUpdate,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Log user update to history
  await prisma.userHistory.create({
    data: {
      userId: user.id,
      changes: {
        action: 'updated',
        fields: updateData,
      },
      changedBy: updatedById,
    },
  });

  // Log to audit
  //   // await logAuditEntry({
  //     entityType: 'User',
  //     entityId: user.id,
  //     action: 'UPDATE',
  //     userId: updatedById,
  //     changesBefore: {
  //       email: existingUser.email,
  //       name: existingUser.name,
  //       role: existingUser.role,
  //       isActive: existingUser.isActive,
  //     },
  //     changesAfter: {
  //       email: user.email,
  //       name: user.name,
  //       role: user.role,
  //       isActive: user.isActive,
  //     },
  //   });

  return user;
};

/**
 * Delete user (soft delete by deactivating)
 */
const deleteUser = async (userId, deletedById) => {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new NotFoundError('User not found');
  }

  // Prevent deleting own account
  if (userId === deletedById) {
    throw new BadRequestError('You cannot delete your own account');
  }

  // Soft delete by deactivating
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  // Log user deletion to history
  await prisma.userHistory.create({
    data: {
      userId,
      changes: {
        action: 'deleted',
        fields: {
          isActive: false,
        },
      },
      changedBy: deletedById,
    },
  });

  // Log to audit
  //   // await logAuditEntry({
  //     entityType: 'User',
  //     entityId: userId,
  //     action: 'DELETE',
  //     userId: deletedById,
  //     changesBefore: {
  //       email: existingUser.email,
  //       name: existingUser.name,
  //       role: existingUser.role,
  //       isActive: existingUser.isActive,
  //     },
  //     changesAfter: {
  //       email: existingUser.email,
  //       name: existingUser.name,
  //       role: existingUser.role,
  //       isActive: false,
  //     },
  //   });

  return { message: 'User deactivated successfully' };
};

/**
 * Update user role
 */
const updateUserRole = async (userId, newRole, updatedById) => {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new NotFoundError('User not found');
  }

  // Prevent changing own role
  if (userId === updatedById) {
    throw new BadRequestError('You cannot change your own role');
  }

  // Update role
  const user = await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Log role change to history
  await prisma.userHistory.create({
    data: {
      userId,
      changes: {
        action: 'role_updated',
        fields: {
          oldRole: existingUser.role,
          newRole,
        },
      },
      changedBy: updatedById,
    },
  });

  // Log to audit
  //   // await logAuditEntry({
  //     entityType: 'User',
  //     entityId: userId,
  //     action: 'UPDATE',
  //     userId: updatedById,
  //     changesBefore: {
  //       role: existingUser.role,
  //     },
  //     changesAfter: {
  //       role: newRole,
  //     },
  //     metadata: {
  //       action: 'role_change',
  //     },
  //   });

  return user;
};

/**
 * Assign plants to user (change ownership)
 */
const assignPlantsToUser = async (userId, plantIds, assignedById) => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Verify all plants exist
  const plants = await prisma.plant.findMany({
    where: {
      id: { in: plantIds },
    },
    select: { id: true },
  });

  if (plants.length !== plantIds.length) {
    throw new NotFoundError('One or more plants not found');
  }

  // Update plant ownership
  await prisma.plant.updateMany({
    where: {
      id: { in: plantIds },
    },
    data: {
      ownerId: userId,
    },
  });

  // Log plant assignment to history
  await prisma.userHistory.create({
    data: {
      userId,
      changes: {
        action: 'plants_assigned',
        fields: {
          plantIds,
        },
      },
      changedBy: assignedById,
    },
  });

  return {
    message: `${plantIds.length} plant(s) assigned to user successfully`,
    plantIds,
  };
};

/**
 * Get user's plants
 */
const getUserPlants = async (userId, pagination = {}) => {
  const { page = 1, limit = 10 } = pagination;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const take = limit;

  // Get total count
  const total = await prisma.plant.count({
    where: { ownerId: userId },
  });

  // Get plants
  const plants = await prisma.plant.findMany({
    where: { ownerId: userId },
    skip,
    take,
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      name: true,
      location: true,
      capacity: true,
      status: true,
      installationDate: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          devices: true,
          alarms: true,
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

export {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserRole,
  assignPlantsToUser,
  getUserPlants,
};
