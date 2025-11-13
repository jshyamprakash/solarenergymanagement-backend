/**
 * User Plant Mapping Service
 * Manages plant access permissions for users
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Get all plants assigned to a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of plants
 */
const getUserPlants = async (userId) => {
  try {
    const userPlants = await prisma.userPlantMap.findMany({
      where: { userId },
      include: {
        plant: {
          include: {
            devices: {
              select: {
                id: true,
                name: true,
                deviceType: true,
                status: true
              }
            }
          }
        }
      }
    });

    return userPlants.map(up => up.plant);
  } catch (error) {
    console.error('Error fetching user plants:', error);
    throw new Error('Failed to fetch user plants');
  }
};

/**
 * Get all users assigned to a plant
 * @param {number} plantId - Plant ID
 * @returns {Promise<Array>} Array of users with plant access
 */
const getPlantUsers = async (plantId) => {
  try {
    const plantUsers = await prisma.userPlantMap.findMany({
      where: { plantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            lastLogin: true
          }
        }
      }
    });

    return plantUsers.map(pu => pu.user);
  } catch (error) {
    console.error('Error fetching plant users:', error);
    throw new Error('Failed to fetch plant users');
  }
};

/**
 * Assign a user to a plant
 * @param {number} userId - User ID
 * @param {number} plantId - Plant ID
 * @returns {Promise<Object>} Created mapping
 */
const assignUserToPlant = async (userId, plantId) => {
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if plant exists
    const plant = await prisma.plant.findUnique({
      where: { id: plantId }
    });

    if (!plant) {
      throw new Error('Plant not found');
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.userPlantMap.findUnique({
      where: {
        userId_plantId: {
          userId,
          plantId
        }
      }
    });

    if (existingAssignment) {
      throw new Error('User is already assigned to this plant');
    }

    // Create assignment
    const assignment = await prisma.userPlantMap.create({
      data: {
        userId,
        plantId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        plant: {
          select: {
            id: true,
            name: true,
            location: true,
            capacity: true
          }
        }
      }
    });

    return assignment;
  } catch (error) {
    console.error('Error assigning user to plant:', error);
    throw error;
  }
};

/**
 * Remove user assignment from a plant
 * @param {number} userId - User ID
 * @param {number} plantId - Plant ID
 * @returns {Promise<Object>} Deleted mapping
 */
const removeUserFromPlant = async (userId, plantId) => {
  try {
    const assignment = await prisma.userPlantMap.delete({
      where: {
        userId_plantId: {
          userId,
          plantId
        }
      }
    });

    return assignment;
  } catch (error) {
    if (error.code === 'P2025') {
      throw new Error('User assignment not found');
    }
    console.error('Error removing user from plant:', error);
    throw new Error('Failed to remove user from plant');
  }
};

/**
 * Assign multiple users to multiple plants
 * @param {Array} assignments - Array of {userId, plantId} objects
 * @returns {Promise<Array>} Array of created assignments
 */
const assignMultipleUsersToPlants = async (assignments) => {
  try {
    const results = await prisma.$transaction(
      assignments.map(({ userId, plantId }) =>
        prisma.userPlantMap.upsert({
          where: {
            userId_plantId: {
              userId,
              plantId
            }
          },
          update: {},
          create: {
            userId,
            plantId
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            },
            plant: {
              select: {
                id: true,
                name: true,
                location: true,
                capacity: true
              }
            }
          }
        })
      )
    );

    return results;
  } catch (error) {
    console.error('Error assigning multiple users to plants:', error);
    throw new Error('Failed to assign users to plants');
  }
};

/**
 * Check if user has access to a specific plant
 * @param {number} userId - User ID
 * @param {number} plantId - Plant ID
 * @returns {Promise<boolean>} True if user has access
 */
const checkUserPlantAccess = async (userId, plantId) => {
  try {
    // Admin users have access to all plants
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      return false;
    }

    if (user.role === 'ADMIN') {
      return true;
    }

    // Check if user is assigned to the plant
    const assignment = await prisma.userPlantMap.findUnique({
      where: {
        userId_plantId: {
          userId,
          plantId
        }
      }
    });

    return !!assignment;
  } catch (error) {
    console.error('Error checking user plant access:', error);
    return false;
  }
};

/**
 * Get all accessible plants for a user (with device counts)
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of plants with device counts
 */
const getAccessiblePlants = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    let plants;

    if (user.role === 'ADMIN') {
      // Admin gets all plants
      plants = await prisma.plant.findMany({
        include: {
          _count: {
            select: {
              devices: true,
              userMaps: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });
    } else {
      // Non-admin users get only assigned plants
      const userPlants = await prisma.userPlantMap.findMany({
        where: { userId },
        include: {
          plant: {
            include: {
              _count: {
                select: {
                  devices: true,
                  userMaps: true
                }
              }
            }
          }
        }
      });

      plants = userPlants.map(up => up.plant);
    }

    return plants;
  } catch (error) {
    console.error('Error fetching accessible plants:', error);
    throw new Error('Failed to fetch accessible plants');
  }
};

/**
 * Get users not assigned to a specific plant
 * @param {number} plantId - Plant ID
 * @returns {Promise<Array>} Array of unassigned users
 */
const getUnassignedUsers = async (plantId) => {
  try {
    // Get all users
    const allUsers = await prisma.user.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Get users already assigned to the plant
    const assignedUserIds = await prisma.userPlantMap.findMany({
      where: { plantId },
      select: { userId: true }
    });

    const assignedIds = assignedUserIds.map(au => au.userId);

    // Filter out assigned users
    const unassignedUsers = allUsers.filter(user => !assignedIds.includes(user.id));

    return unassignedUsers;
  } catch (error) {
    console.error('Error fetching unassigned users:', error);
    throw new Error('Failed to fetch unassigned users');
  }
};

export {
  getUserPlants,
  getPlantUsers,
  assignUserToPlant,
  removeUserFromPlant,
  assignMultipleUsersToPlants,
  checkUserPlantAccess,
  getAccessiblePlants,
  getUnassignedUsers
};