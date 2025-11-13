#!/usr/bin/env node

/**
 * Test the exact plantService.getPlantById function as called by API
 */

import { PrismaClient } from '@prisma/client';
import * as plantService from './src/services/plantService.js';

const prisma = new PrismaClient();

async function testPlantService() {
  try {
    console.log('🔍 Testing plantService.getPlantById as called by API...\n');

    const plantId = 11;
    const userId = 4; // Admin user ID
    const userRole = 'ADMIN';
    const includeDevices = true;

    console.log(`Plant ID: ${plantId}`);
    console.log(`User ID: ${userId}`);
    console.log(`User Role: ${userRole}`);
    console.log(`Include Devices: ${includeDevices}\n`);

    // Call the exact same function as the API
    console.log('🔎 Calling plantService.getPlantById...');
    const plant = await plantService.getPlantById(plantId, userId, userRole, includeDevices);

    console.log('\n📊 Service Results:');
    console.log('Plant found:', plant?.name || 'NOT FOUND');
    console.log('Devices count:', plant?.devices?.length || 0);
    console.log('Devices array exists:', !!plant?.devices);
    console.log('Plant keys:', Object.keys(plant || {}));
    
    if (plant?.devices) {
      console.log('\n📋 Devices found:');
      plant.devices.forEach((device, index) => {
        console.log(`   ${index + 1}. ${device.name} (${device.deviceType}) - ${device.deviceId}`);
      });
    }

    console.log('\n✅ Test completed');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPlantService();