#!/usr/bin/env node

/**
 * Debug script to test Prisma query directly
 */

import { PrismaClient } from '@prisma/client';
import config from './src/config/index.js';

const prisma = new PrismaClient();

async function testQuery() {
  try {
    console.log('🔍 Testing Prisma query directly...\n');

    const plantId = 11;
    const includeDevices = true;

    console.log(`Plant ID: ${plantId}`);
    console.log(`Include Devices: ${includeDevices}\n`);

    // Build the include clause exactly as in plantService
    const includeClause = {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      userMaps: {
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
      _count: {
        select: {
          devices: true,
          alarms: true,
        },
      },
    };

    if (includeDevices) {
      console.log('📋 Adding devices to include clause...');
      includeClause.devices = {
        include: {
          template: {
            select: {
              id: true,
              name: true,
              deviceType: true,
              shortform: true,
            },
          },
          parentDevice: {
            select: {
              id: true,
              name: true,
              deviceId: true,
            },
          },
          tags: {
            include: {
              templateTag: {
                select: {
                  id: true,
                  tagName: true,
                  displayName: true,
                  description: true,
                },
              },
            },
          },
        },
      };
    }

    console.log('Include clause:', JSON.stringify(includeClause, null, 2));

    // Execute the query
    console.log('\n🔎 Executing Prisma query...');
    const plant = await prisma.plant.findUnique({
      where: { id: plantId },
      include: includeClause,
    });

    console.log('\n📊 Query Results:');
    console.log('Plant found:', plant?.name || 'NOT FOUND');
    console.log('Devices count:', plant?.devices?.length || 0);
    console.log('Devices array exists:', !!plant?.devices);
    
    if (plant?.devices) {
      console.log('First device:', plant.devices[0]);
    }

    console.log('\n✅ Test completed');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testQuery();