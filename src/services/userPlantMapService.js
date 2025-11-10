/**
 * User-Plant Mapping Service
 * Business logic for managing user-plant assignments
 */

import { prisma } from '../config/database.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

/**
 * Assign multiple plants to a user
 */
const assignPlantsToUser = async (userId, plantIds) => {
  // Verify user exists
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
  });

  if (plants.length !== plantIds.length) {
    throw new NotFoundError('One or more plants not found');
  }

  // Create mappings (ignore duplicates)
  const mappings = await Promise.all(
    plantIds.map(async (plantId) => {
      return prisma.userPlantMap.upsert({
        where: {
          userId_plantId: {
            userId,
            plantId,
          },
        },
        create: {
          userId,
          plantId,
        },
        update: {}, // No update needed if already exists
      });
    })
  );

  return {
    message: `Assigned ${plantIds.length} plant(s) to user`,
    assignments: mappings,
  };
};

/**
 * Remove plant assignments from a user
 */
const removePlantsFromUser = async (userId, plantIds) => {
  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Delete mappings
  const result = await prisma.userPlantMap.deleteMany({
    where: {
      userId,
      plantId: { in: plantIds },
    },
  });

  return {
    message: `Removed ${result.count} plant assignment(s) from user`,
    count: result.count,
  };
};

/**
 * Get all users assigned to a plant
 */
const getUsersForPlant = async (plantId) => {
  // Verify plant exists
  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
  });

  if (!plant) {
    throw new NotFoundError('Plant not found');
  }

  // Get all user mappings for this plant
  const mappings = await prisma.userPlantMap.findMany({
    where: { plantId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        },
      },
    },
  });

  return {
    plant: {
      id: plant.id,
      name: plant.name,
      plantId: plant.plantId,
    },
    users: mappings.map((m) => m.user),
  };
};

/**
 * Get all plants assigned to a user
 */
const getPlantsForUser = async (userId) => {
  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Get all plant mappings for this user
  const mappings = await prisma.userPlantMap.findMany({
    where: { userId },
    include: {
      plant: {
        select: {
          id: true,
          name: true,
          plantId: true,
          status: true,
          capacity: true,
          location: true,
        },
      },
    },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    plants: mappings.map((m) => m.plant),
  };
};

/**
 * Bulk assign multiple users to multiple plants
 */
const bulkAssign = async (assignments) => {
  // assignments format: [{ userId, plantIds: [] }, ...]

  const results = [];
  for (const assignment of assignments) {
    const { userId, plantIds } = assignment;
    const result = await assignPlantsToUser(userId, plantIds);
    results.push({ userId, ...result });
  }

  return {
    message: 'Bulk assignment completed',
    results,
  };
};

export {
  assignPlantsToUser,
  removePlantsFromUser,
  getUsersForPlant,
  getPlantsForUser,
  bulkAssign,
};
