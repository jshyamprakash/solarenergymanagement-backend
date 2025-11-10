/**
 * Prisma Database Seed Script
 * Creates mock data for development and testing
 *
 * Data includes:
 * - 3 users (Admin, Manager, Viewer)
 * - 5 solar plants (Indian locations)
 * - 50+ devices with hierarchies
 * - 20 tags per plant
 * - 7 days of simulated MQTT data
 * - 50+ alarms
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================
// UTILITY FUNCTIONS
// ============================================

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

function generateRandomValue(min, max) {
  return Math.random() * (max - min) + min;
}

function getDateMinusHours(hours) {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
}

function getDateMinusDays(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

// ============================================
// MOCK DATA DEFINITIONS
// ============================================

const MOCK_USERS = [
  {
    email: 'admin@solar.com',
    password: 'Admin123!',
    name: 'Admin User',
    role: 'ADMIN',
  },
  {
    email: 'manager@solar.com',
    password: 'Manager123!',
    name: 'Plant Manager',
    role: 'PLANT_MANAGER',
  },
  {
    email: 'viewer@solar.com',
    password: 'Viewer123!',
    name: 'Viewer User',
    role: 'VIEWER',
  },
];

// ============================================
// DEVICE TEMPLATE DEFINITIONS
// ============================================

const DEVICE_TEMPLATES = [
  {
    name: 'Transformer 5MVA',
    shortform: 'TRF',
    deviceType: 'TRANSFORMER',
    category: 'Power Equipment',
    description: '5MVA Distribution Transformer',
    manufacturer: 'ABB',
    modelNumber: 'RESIBLOC TMR 5000',
    ratedCapacity: 5000,
    specifications: {
      primaryVoltage: '33kV',
      secondaryVoltage: '415V',
      frequency: '50Hz',
      coolingType: 'ONAN',
    },
    isSystemTemplate: true,
    tags: [
      { tagName: 'voltage_primary_l1', displayName: 'Primary Voltage L1', unit: 'kV', dataType: 'FLOAT', minValue: 0, maxValue: 40, displayOrder: 1, isMonitored: true },
      { tagName: 'voltage_primary_l2', displayName: 'Primary Voltage L2', unit: 'kV', dataType: 'FLOAT', minValue: 0, maxValue: 40, displayOrder: 2, isMonitored: true },
      { tagName: 'voltage_primary_l3', displayName: 'Primary Voltage L3', unit: 'kV', dataType: 'FLOAT', minValue: 0, maxValue: 40, displayOrder: 3, isMonitored: true },
      { tagName: 'voltage_secondary_l1', displayName: 'Secondary Voltage L1', unit: 'V', dataType: 'FLOAT', minValue: 0, maxValue: 500, displayOrder: 4, isMonitored: true },
      { tagName: 'voltage_secondary_l2', displayName: 'Secondary Voltage L2', unit: 'V', dataType: 'FLOAT', minValue: 0, maxValue: 500, displayOrder: 5, isMonitored: true },
      { tagName: 'voltage_secondary_l3', displayName: 'Secondary Voltage L3', unit: 'V', dataType: 'FLOAT', minValue: 0, maxValue: 500, displayOrder: 6, isMonitored: true },
      { tagName: 'current_primary', displayName: 'Primary Current', unit: 'A', dataType: 'FLOAT', minValue: 0, maxValue: 200, displayOrder: 7, isMonitored: true },
      { tagName: 'current_secondary', displayName: 'Secondary Current', unit: 'A', dataType: 'FLOAT', minValue: 0, maxValue: 400, displayOrder: 8, isMonitored: true },
      { tagName: 'load_percentage', displayName: 'Load Percentage', unit: '%', dataType: 'FLOAT', minValue: 0, maxValue: 120, displayOrder: 9, isMonitored: true },
      { tagName: 'temperature_oil', displayName: 'Oil Temperature', unit: '°C', dataType: 'FLOAT', minValue: -20, maxValue: 120, displayOrder: 10, isMonitored: true },
      { tagName: 'temperature_winding', displayName: 'Winding Temperature', unit: '°C', dataType: 'FLOAT', minValue: -20, maxValue: 150, displayOrder: 11, isMonitored: true },
      { tagName: 'status', displayName: 'Operational Status', unit: '', dataType: 'INTEGER', minValue: 0, maxValue: 3, displayOrder: 12, isMonitored: true },
    ],
  },
  {
    name: 'Inverter 100kW',
    shortform: 'INV',
    deviceType: 'INVERTER',
    category: 'Power Conversion',
    description: '100kW String Inverter',
    manufacturer: 'SMA',
    modelNumber: 'Sunny Central 100',
    ratedCapacity: 100,
    specifications: {
      maxDCVoltage: '1000V',
      maxDCCurrent: '200A',
      maxACPower: '100kW',
      efficiency: '98.5%',
    },
    isSystemTemplate: true,
    tags: [
      { tagName: 'voltage_dc_input', displayName: 'DC Input Voltage', unit: 'V', dataType: 'FLOAT', minValue: 0, maxValue: 1000, displayOrder: 1, isMonitored: true },
      { tagName: 'current_dc_input', displayName: 'DC Input Current', unit: 'A', dataType: 'FLOAT', minValue: 0, maxValue: 200, displayOrder: 2, isMonitored: true },
      { tagName: 'power_dc_input', displayName: 'DC Input Power', unit: 'kW', dataType: 'FLOAT', minValue: 0, maxValue: 110, displayOrder: 3, isMonitored: true },
      { tagName: 'voltage_ac_output_l1', displayName: 'AC Output Voltage L1', unit: 'V', dataType: 'FLOAT', minValue: 0, maxValue: 500, displayOrder: 4, isMonitored: true },
      { tagName: 'voltage_ac_output_l2', displayName: 'AC Output Voltage L2', unit: 'V', dataType: 'FLOAT', minValue: 0, maxValue: 500, displayOrder: 5, isMonitored: true },
      { tagName: 'voltage_ac_output_l3', displayName: 'AC Output Voltage L3', unit: 'V', dataType: 'FLOAT', minValue: 0, maxValue: 500, displayOrder: 6, isMonitored: true },
      { tagName: 'current_ac_output', displayName: 'AC Output Current', unit: 'A', dataType: 'FLOAT', minValue: 0, maxValue: 200, displayOrder: 7, isMonitored: true },
      { tagName: 'power_ac_output', displayName: 'AC Output Power', unit: 'kW', dataType: 'FLOAT', minValue: 0, maxValue: 110, displayOrder: 8, isMonitored: true },
      { tagName: 'frequency', displayName: 'Output Frequency', unit: 'Hz', dataType: 'FLOAT', minValue: 49.5, maxValue: 50.5, displayOrder: 9, isMonitored: true },
      { tagName: 'efficiency', displayName: 'Efficiency', unit: '%', dataType: 'FLOAT', minValue: 0, maxValue: 100, displayOrder: 10, isMonitored: true },
      { tagName: 'temperature_internal', displayName: 'Internal Temperature', unit: '°C', dataType: 'FLOAT', minValue: -20, maxValue: 80, displayOrder: 11, isMonitored: true },
      { tagName: 'energy_today', displayName: 'Energy Today', unit: 'kWh', dataType: 'FLOAT', minValue: 0, maxValue: 1000, displayOrder: 12, isMonitored: false },
      { tagName: 'energy_total', displayName: 'Total Energy', unit: 'kWh', dataType: 'FLOAT', minValue: 0, maxValue: 10000000, displayOrder: 13, isMonitored: false },
      { tagName: 'status', displayName: 'Operational Status', unit: '', dataType: 'INTEGER', minValue: 0, maxValue: 5, displayOrder: 14, isMonitored: true },
    ],
  },
  {
    name: 'AC Distribution Box 16 String',
    shortform: 'ACDB',
    deviceType: 'COMBINER_BOX',
    category: 'Distribution Equipment',
    description: 'AC Distribution Box with 16 String Inputs',
    manufacturer: 'Schneider Electric',
    modelNumber: 'ACDB-16S',
    ratedCapacity: null,
    specifications: {
      stringInputs: 16,
      maxCurrent: '25A per string',
      protection: 'SPD Type 2',
    },
    isSystemTemplate: true,
    tags: [
      { tagName: 'voltage_ac', displayName: 'AC Voltage', unit: 'V', dataType: 'FLOAT', minValue: 0, maxValue: 500, displayOrder: 1, isMonitored: true },
      { tagName: 'current_total', displayName: 'Total Current', unit: 'A', dataType: 'FLOAT', minValue: 0, maxValue: 400, displayOrder: 2, isMonitored: true },
      { tagName: 'power_total', displayName: 'Total Power', unit: 'kW', dataType: 'FLOAT', minValue: 0, maxValue: 200, displayOrder: 3, isMonitored: true },
      { tagName: 'current_string_1', displayName: 'String 1 Current', unit: 'A', dataType: 'FLOAT', minValue: 0, maxValue: 30, displayOrder: 4, isMonitored: true },
      { tagName: 'current_string_2', displayName: 'String 2 Current', unit: 'A', dataType: 'FLOAT', minValue: 0, maxValue: 30, displayOrder: 5, isMonitored: true },
      { tagName: 'temperature', displayName: 'Box Temperature', unit: '°C', dataType: 'FLOAT', minValue: -20, maxValue: 70, displayOrder: 6, isMonitored: true },
      { tagName: 'status', displayName: 'Operational Status', unit: '', dataType: 'INTEGER', minValue: 0, maxValue: 3, displayOrder: 7, isMonitored: true },
    ],
  },
  {
    name: 'Weather Station',
    shortform: 'WS',
    deviceType: 'WEATHER_STATION',
    category: 'Monitoring Equipment',
    description: 'Meteorological Weather Station',
    manufacturer: 'Kipp & Zonen',
    modelNumber: 'SOLYS 2',
    ratedCapacity: null,
    specifications: {
      pyranomet: 'CMP11',
      windSensor: 'Ultrasonic',
      tempSensor: 'PT100',
    },
    isSystemTemplate: true,
    tags: [
      { tagName: 'irradiance_ghi', displayName: 'Global Horizontal Irradiance', unit: 'W/m²', dataType: 'FLOAT', minValue: 0, maxValue: 1500, displayOrder: 1, isMonitored: true },
      { tagName: 'irradiance_poa', displayName: 'Plane of Array Irradiance', unit: 'W/m²', dataType: 'FLOAT', minValue: 0, maxValue: 1500, displayOrder: 2, isMonitored: true },
      { tagName: 'temperature_ambient', displayName: 'Ambient Temperature', unit: '°C', dataType: 'FLOAT', minValue: -10, maxValue: 50, displayOrder: 3, isMonitored: true },
      { tagName: 'temperature_module', displayName: 'Module Temperature', unit: '°C', dataType: 'FLOAT', minValue: -10, maxValue: 80, displayOrder: 4, isMonitored: true },
      { tagName: 'wind_speed', displayName: 'Wind Speed', unit: 'm/s', dataType: 'FLOAT', minValue: 0, maxValue: 30, displayOrder: 5, isMonitored: true },
      { tagName: 'wind_direction', displayName: 'Wind Direction', unit: '°', dataType: 'FLOAT', minValue: 0, maxValue: 360, displayOrder: 6, isMonitored: false },
      { tagName: 'humidity', displayName: 'Relative Humidity', unit: '%', dataType: 'FLOAT', minValue: 0, maxValue: 100, displayOrder: 7, isMonitored: true },
      { tagName: 'pressure', displayName: 'Atmospheric Pressure', unit: 'hPa', dataType: 'FLOAT', minValue: 900, maxValue: 1100, displayOrder: 8, isMonitored: false },
      { tagName: 'rainfall', displayName: 'Rainfall', unit: 'mm', dataType: 'FLOAT', minValue: 0, maxValue: 100, displayOrder: 9, isMonitored: false },
    ],
  },
  {
    name: 'Energy Meter',
    shortform: 'MTR',
    deviceType: 'METER',
    category: 'Metering Equipment',
    description: 'Three-Phase Energy Meter',
    manufacturer: 'Schneider Electric',
    modelNumber: 'PM5560',
    ratedCapacity: null,
    specifications: {
      accuracy: 'Class 0.5S',
      voltage: '415V',
      current: '5A',
    },
    isSystemTemplate: true,
    tags: [
      { tagName: 'voltage_l1', displayName: 'Voltage L1', unit: 'V', dataType: 'FLOAT', minValue: 0, maxValue: 500, displayOrder: 1, isMonitored: true },
      { tagName: 'voltage_l2', displayName: 'Voltage L2', unit: 'V', dataType: 'FLOAT', minValue: 0, maxValue: 500, displayOrder: 2, isMonitored: true },
      { tagName: 'voltage_l3', displayName: 'Voltage L3', unit: 'V', dataType: 'FLOAT', minValue: 0, maxValue: 500, displayOrder: 3, isMonitored: true },
      { tagName: 'current_l1', displayName: 'Current L1', unit: 'A', dataType: 'FLOAT', minValue: 0, maxValue: 1000, displayOrder: 4, isMonitored: true },
      { tagName: 'current_l2', displayName: 'Current L2', unit: 'A', dataType: 'FLOAT', minValue: 0, maxValue: 1000, displayOrder: 5, isMonitored: true },
      { tagName: 'current_l3', displayName: 'Current L3', unit: 'A', dataType: 'FLOAT', minValue: 0, maxValue: 1000, displayOrder: 6, isMonitored: true },
      { tagName: 'power_active', displayName: 'Active Power', unit: 'kW', dataType: 'FLOAT', minValue: -5000, maxValue: 5000, displayOrder: 7, isMonitored: true },
      { tagName: 'power_reactive', displayName: 'Reactive Power', unit: 'kVAR', dataType: 'FLOAT', minValue: -5000, maxValue: 5000, displayOrder: 8, isMonitored: true },
      { tagName: 'power_apparent', displayName: 'Apparent Power', unit: 'kVA', dataType: 'FLOAT', minValue: 0, maxValue: 5000, displayOrder: 9, isMonitored: true },
      { tagName: 'power_factor', displayName: 'Power Factor', unit: '', dataType: 'FLOAT', minValue: -1, maxValue: 1, displayOrder: 10, isMonitored: true },
      { tagName: 'frequency', displayName: 'Frequency', unit: 'Hz', dataType: 'FLOAT', minValue: 49, maxValue: 51, displayOrder: 11, isMonitored: true },
      { tagName: 'energy_active_import', displayName: 'Active Energy Import', unit: 'kWh', dataType: 'FLOAT', minValue: 0, maxValue: 100000000, displayOrder: 12, isMonitored: false },
      { tagName: 'energy_active_export', displayName: 'Active Energy Export', unit: 'kWh', dataType: 'FLOAT', minValue: 0, maxValue: 100000000, displayOrder: 13, isMonitored: false },
    ],
  },
];

const MOCK_PLANTS = [
  {
    name: 'Rajasthan Solar Farm',
    plantId: 'RAJASTHAN_PLANT_1',
    mqttBaseTopic: 'solar/rajasthan/plant1',
    location: {
      lat: 26.9124,
      lng: 75.7873,
      address: 'Jaipur, Rajasthan, India',
    },
    capacity: 50000, // 50 MW in kW
    status: 'ACTIVE',
    timezone: 'Asia/Kolkata',
  },
  {
    name: 'Gujarat Solar Park',
    plantId: 'GUJARAT_PLANT_1',
    mqttBaseTopic: 'solar/gujarat/plant1',
    location: {
      lat: 23.0225,
      lng: 72.5714,
      address: 'Ahmedabad, Gujarat, India',
    },
    capacity: 100000, // 100 MW in kW
    status: 'ACTIVE',
    timezone: 'Asia/Kolkata',
  },
  {
    name: 'Karnataka Solar Plant',
    plantId: 'KARNATAKA_PLANT_1',
    mqttBaseTopic: 'solar/karnataka/plant1',
    location: {
      lat: 12.9716,
      lng: 77.5946,
      address: 'Bangalore, Karnataka, India',
    },
    capacity: 75000, // 75 MW in kW
    status: 'ACTIVE',
    timezone: 'Asia/Kolkata',
  },
  {
    name: 'Tamil Nadu Solar Station',
    plantId: 'TAMILNADU_PLANT_1',
    mqttBaseTopic: 'solar/tamilnadu/plant1',
    location: {
      lat: 13.0827,
      lng: 80.2707,
      address: 'Chennai, Tamil Nadu, India',
    },
    capacity: 60000, // 60 MW in kW
    status: 'MAINTENANCE',
    timezone: 'Asia/Kolkata',
  },
  {
    name: 'Maharashtra Solar Facility',
    plantId: 'MAHARASHTRA_PLANT_1',
    mqttBaseTopic: 'solar/maharashtra/plant1',
    location: {
      lat: 19.0760,
      lng: 72.8777,
      address: 'Mumbai, Maharashtra, India',
    },
    capacity: 80000, // 80 MW in kW
    status: 'ACTIVE',
    timezone: 'Asia/Kolkata',
  },
];

const DEVICE_TYPES_PER_PLANT = [
  { type: 'INVERTER', count: 5 },
  { type: 'TRANSFORMER', count: 2 },
  { type: 'COMBINER_BOX', count: 8 },
  { type: 'WEATHER_STATION', count: 1 },
  { type: 'METER', count: 3 },
];

const TAG_DEFINITIONS = {
  INVERTER: [
    { name: 'voltage_dc_input', unit: 'V', dataType: 'FLOAT', minValue: 0, maxValue: 1500 },
    { name: 'current_dc_input', unit: 'A', dataType: 'FLOAT', minValue: 0, maxValue: 100 },
    { name: 'voltage_ac_output', unit: 'V', dataType: 'FLOAT', minValue: 0, maxValue: 500 },
    { name: 'current_ac_output', unit: 'A', dataType: 'FLOAT', minValue: 0, maxValue: 200 },
    { name: 'power_output', unit: 'kW', dataType: 'FLOAT', minValue: 0, maxValue: 1000 },
    { name: 'temperature', unit: '°C', dataType: 'FLOAT', minValue: 20, maxValue: 80 },
    { name: 'efficiency', unit: '%', dataType: 'FLOAT', minValue: 90, maxValue: 98 },
  ],
  TRANSFORMER: [
    { name: 'voltage_primary', unit: 'V', dataType: 'FLOAT', minValue: 0, maxValue: 1000 },
    { name: 'voltage_secondary', unit: 'V', dataType: 'FLOAT', minValue: 0, maxValue: 500 },
    { name: 'current_primary', unit: 'A', dataType: 'FLOAT', minValue: 0, maxValue: 100 },
    { name: 'current_secondary', unit: 'A', dataType: 'FLOAT', minValue: 0, maxValue: 200 },
    { name: 'temperature', unit: '°C', dataType: 'FLOAT', minValue: 30, maxValue: 90 },
  ],
  COMBINER_BOX: [
    { name: 'voltage_dc', unit: 'V', dataType: 'FLOAT', minValue: 0, maxValue: 1000 },
    { name: 'current_dc', unit: 'A', dataType: 'FLOAT', minValue: 0, maxValue: 50 },
  ],
  WEATHER_STATION: [
    { name: 'irradiance', unit: 'W/m²', dataType: 'FLOAT', minValue: 0, maxValue: 1200 },
    { name: 'ambient_temperature', unit: '°C', dataType: 'FLOAT', minValue: 15, maxValue: 45 },
    { name: 'module_temperature', unit: '°C', dataType: 'FLOAT', minValue: 20, maxValue: 70 },
    { name: 'wind_speed', unit: 'm/s', dataType: 'FLOAT', minValue: 0, maxValue: 20 },
    { name: 'humidity', unit: '%', dataType: 'FLOAT', minValue: 20, maxValue: 90 },
  ],
  METER: [
    { name: 'active_power', unit: 'kW', dataType: 'FLOAT', minValue: 0, maxValue: 5000 },
    { name: 'reactive_power', unit: 'kVAR', dataType: 'FLOAT', minValue: -1000, maxValue: 1000 },
    { name: 'energy_total', unit: 'kWh', dataType: 'FLOAT', minValue: 0, maxValue: 1000000 },
    { name: 'frequency', unit: 'Hz', dataType: 'FLOAT', minValue: 49.5, maxValue: 50.5 },
  ],
};

// ============================================
// SEED FUNCTIONS
// ============================================

async function seedUsers() {
  console.log('📝 Seeding users...');

  const users = [];
  for (const userData of MOCK_USERS) {
    const hashedPassword = await hashPassword(userData.password);
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        passwordHash: hashedPassword,
        name: userData.name,
        role: userData.role,
        isActive: true,
        lastLogin: getDateMinusHours(Math.random() * 24),
      },
    });
    users.push(user);
    console.log(`  ✓ Created user: ${user.email} (${user.role})`);
  }

  return users;
}

async function seedDeviceTemplates() {
  console.log('🔧 Seeding device templates...');

  const templates = [];
  for (const templateData of DEVICE_TEMPLATES) {
    const { tags, ...templateFields } = templateData;

    const template = await prisma.deviceTemplate.create({
      data: {
        ...templateFields,
        tags: {
          create: tags,
        },
      },
      include: {
        tags: true,
      },
    });

    templates.push(template);
    console.log(`  ✓ Created template: ${template.shortform} - ${template.name} (${template.tags.length} tags)`);
  }

  return templates;
}

async function seedPlants(createdById) {
  console.log('🏭 Seeding plants...');

  const plants = [];
  for (const plantData of MOCK_PLANTS) {
    const coordinates = `${plantData.location.lat},${plantData.location.lng}`;
    const plant = await prisma.plant.create({
      data: {
        plantId: plantData.plantId,
        mqttBaseTopic: plantData.mqttBaseTopic,
        name: plantData.name,
        location: plantData.location,
        capacity: plantData.capacity,
        status: plantData.status,
        coordinates,
        timezone: plantData.timezone,
        installationDate: getDateMinusDays(Math.random() * 365 * 2), // Random date within 2 years
        createdById,
        // IoT fields will be populated when AWS IoT is configured
        iotThingName: `solar-plant-${plantData.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
    });
    plants.push(plant);
    console.log(`  ✓ Created plant: ${plant.plantId} - ${plant.name} (${plant.capacity / 1000} MW)`);
  }

  return plants;
}

async function seedUserPlantMappings(users, plants) {
  console.log('🔗 Seeding user-plant mappings...');

  const adminUser = users.find(u => u.role === 'ADMIN');
  const managerUser = users.find(u => u.role === 'PLANT_MANAGER');
  const viewerUser = users.find(u => u.role === 'VIEWER');

  let mappingCount = 0;

  // Admin gets access to all plants
  for (const plant of plants) {
    await prisma.userPlantMap.create({
      data: {
        userId: adminUser.id,
        plantId: plant.id,
      },
    });
    mappingCount++;
  }
  console.log(`  ✓ Assigned all ${plants.length} plants to Admin`);

  // Manager gets access to first 3 plants
  const managerPlants = plants.slice(0, 3);
  for (const plant of managerPlants) {
    await prisma.userPlantMap.create({
      data: {
        userId: managerUser.id,
        plantId: plant.id,
      },
    });
    mappingCount++;
  }
  console.log(`  ✓ Assigned ${managerPlants.length} plants to Plant Manager`);

  // Viewer gets access to first 2 plants
  const viewerPlants = plants.slice(0, 2);
  for (const plant of viewerPlants) {
    await prisma.userPlantMap.create({
      data: {
        userId: viewerUser.id,
        plantId: plant.id,
      },
    });
    mappingCount++;
  }
  console.log(`  ✓ Assigned ${viewerPlants.length} plants to Viewer`);

  console.log(`  ✓ Total mappings created: ${mappingCount}`);

  return mappingCount;
}

async function seedDevicesAndTags(plants) {
  console.log('📡 Seeding devices and tags...');

  const allDevices = [];
  const allTags = [];

  for (const plant of plants) {
    console.log(`  Creating devices for ${plant.name}...`);

    for (const deviceTypeConfig of DEVICE_TYPES_PER_PLANT) {
      for (let i = 1; i <= deviceTypeConfig.count; i++) {
        const deviceName = `${deviceTypeConfig.type}-${i}`;
        const serialNumber = `${plant.name.substring(0, 3).toUpperCase()}-${deviceTypeConfig.type}-${i}-${Math.random().toString(36).substring(7).toUpperCase()}`;

        const device = await prisma.device.create({
          data: {
            plantId: plant.id,
            name: deviceName,
            deviceType: deviceTypeConfig.type,
            manufacturer: 'Generic Manufacturer',
            model: `Model-${deviceTypeConfig.type}-X`,
            serialNumber,
            status: Math.random() > 0.1 ? 'ONLINE' : 'OFFLINE',
            installationDate: getDateMinusDays(Math.random() * 365),
            lastCommunication: getDateMinusHours(Math.random() * 2),
          },
        });

        allDevices.push(device);

        // Create tags for this device
        const tagDefinitions = TAG_DEFINITIONS[deviceTypeConfig.type] || [];
        for (const tagDef of tagDefinitions) {
          const tag = await prisma.tag.create({
            data: {
              deviceId: device.id,
              name: tagDef.name,
              description: `${tagDef.name.replace(/_/g, ' ')} measurement`,
              unit: tagDef.unit,
              dataType: tagDef.dataType,
              minValue: tagDef.minValue,
              maxValue: tagDef.maxValue,
            },
          });
          allTags.push(tag);
        }
      }
    }

    console.log(`  ✓ Created ${allDevices.filter(d => d.plantId === plant.id).length} devices for ${plant.name}`);
  }

  console.log(`  ✓ Total: ${allDevices.length} devices, ${allTags.length} tags`);
  return { devices: allDevices, tags: allTags };
}

async function seedProcessedData(plants, devices, tags) {
  console.log('📊 Seeding processed data (7 days of simulated measurements)...');

  const DAYS_TO_SEED = 7;
  const HOURS_PER_DAY = 24;
  const SAMPLES_PER_HOUR = 12; // Every 5 minutes

  let totalDataPoints = 0;

  for (const plant of plants) {
    const plantDevices = devices.filter(d => d.plantId === plant.id);

    for (const device of plantDevices) {
      const deviceTags = tags.filter(t => t.deviceId === device.id);

      for (let day = 0; day < DAYS_TO_SEED; day++) {
        for (let hour = 0; hour < HOURS_PER_DAY; hour++) {
          // Simulate solar generation curve (0 at night, peak around noon)
          const isDaytime = hour >= 6 && hour <= 18;
          const solarFactor = isDaytime
            ? Math.sin(((hour - 6) / 12) * Math.PI)
            : 0;

          for (let sample = 0; sample < SAMPLES_PER_HOUR; sample++) {
            const timestamp = new Date();
            timestamp.setDate(timestamp.getDate() - day);
            timestamp.setHours(hour);
            timestamp.setMinutes(sample * 5);
            timestamp.setSeconds(0);
            timestamp.setMilliseconds(0);

            for (const tag of deviceTags) {
              const baseValue = (tag.minValue + tag.maxValue) / 2;
              const range = tag.maxValue - tag.minValue;
              const noise = (Math.random() - 0.5) * 0.1 * range;

              // Apply solar factor for power-related measurements
              let value;
              if (tag.name.includes('power') || tag.name.includes('current')) {
                value = tag.minValue + (range * solarFactor) + noise;
              } else if (tag.name.includes('irradiance')) {
                value = tag.maxValue * solarFactor + noise;
              } else if (tag.name.includes('temperature')) {
                value = baseValue + (solarFactor * range * 0.3) + noise;
              } else {
                value = baseValue + noise;
              }

              // Ensure value is within bounds
              value = Math.max(tag.minValue, Math.min(tag.maxValue, value));

              await prisma.processedData.create({
                data: {
                  plantId: plant.id,
                  deviceId: device.id,
                  tagId: tag.id,
                  timestamp,
                  value: parseFloat(value.toFixed(2)),
                  quality: Math.random() > 0.05 ? 100 : 80, // 95% good quality
                },
              });

              totalDataPoints++;
            }
          }
        }
      }
    }

    console.log(`  ✓ Created data for ${plant.name}`);
  }

  console.log(`  ✓ Total: ${totalDataPoints} data points`);
}

async function seedAlarms(plants, devices, tags, userId) {
  console.log('🚨 Seeding alarms...');

  const alarmMessages = [
    { severity: 'CRITICAL', message: 'Inverter overcurrent detected', status: 'ACTIVE' },
    { severity: 'CRITICAL', message: 'Transformer overheating', status: 'ACKNOWLEDGED' },
    { severity: 'HIGH', message: 'DC voltage out of range', status: 'RESOLVED' },
    { severity: 'HIGH', message: 'Communication loss with device', status: 'ACTIVE' },
    { severity: 'MEDIUM', message: 'Low efficiency detected', status: 'ACKNOWLEDGED' },
    { severity: 'MEDIUM', message: 'String underperformance', status: 'ACTIVE' },
    { severity: 'LOW', message: 'Minor temperature variation', status: 'RESOLVED' },
    { severity: 'INFO', message: 'Scheduled maintenance due', status: 'ACTIVE' },
  ];

  const alarms = [];
  for (let i = 0; i < 50; i++) {
    const plant = plants[Math.floor(Math.random() * plants.length)];
    const plantDevices = devices.filter(d => d.plantId === plant.id);
    const device = plantDevices[Math.floor(Math.random() * plantDevices.length)];
    const deviceTags = tags.filter(t => t.deviceId === device.id);
    const tag = deviceTags.length > 0 ? deviceTags[Math.floor(Math.random() * deviceTags.length)] : null;

    const alarmTemplate = alarmMessages[Math.floor(Math.random() * alarmMessages.length)];
    const triggeredAt = getDateMinusHours(Math.random() * 168); // Within last 7 days

    const alarmData = {
      plantId: plant.id,
      deviceId: device.id,
      tagId: tag?.id,
      severity: alarmTemplate.severity,
      status: alarmTemplate.status,
      message: alarmTemplate.message,
      description: `Alarm triggered for ${device.name} in ${plant.name}`,
      value: tag ? generateRandomValue(tag.minValue, tag.maxValue) : null,
      threshold: tag ? tag.maxValue * 0.9 : null,
      triggeredAt,
      createdBy: userId,
    };

    if (alarmTemplate.status === 'ACKNOWLEDGED' || alarmTemplate.status === 'RESOLVED') {
      alarmData.acknowledgedAt = new Date(triggeredAt.getTime() + Math.random() * 3600000);
      alarmData.acknowledgedBy = userId;
    }

    if (alarmTemplate.status === 'RESOLVED') {
      alarmData.resolvedAt = new Date(triggeredAt.getTime() + Math.random() * 7200000);
    }

    const alarm = await prisma.alarm.create({ data: alarmData });
    alarms.push(alarm);
  }

  console.log(`  ✓ Created ${alarms.length} alarms`);
  return alarms;
}

// AUDIT LOG - COMMENTED OUT (Enable when needed)
// async function seedAuditLogs(userId) {
//   console.log('📋 Seeding audit logs...');
//
//   const actions = ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT'];
//   const resources = ['Plant', 'Device', 'User', 'Alarm', 'Report'];
//
//   for (let i = 0; i < 30; i++) {
//     await prisma.auditLog.create({
//       data: {
//         userId,
//         action: actions[Math.floor(Math.random() * actions.length)],
//         resource: resources[Math.floor(Math.random() * resources.length)],
//         resourceId: Math.random().toString(36).substring(7),
//         timestamp: getDateMinusHours(Math.random() * 168),
//         ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
//         userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
//       },
//     });
//   }
//
//   console.log(`  ✓ Created 30 audit log entries`);
// }

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function main() {
  console.log('');
  console.log('='.repeat(60));
  console.log('🌱 SOLAR ENERGY MONITORING SYSTEM - DATABASE SEEDING');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await prisma.processedData.deleteMany();
    await prisma.rawMqttData.deleteMany();
    await prisma.alarm.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.deviceHierarchyHistory.deleteMany();
    await prisma.device.deleteMany();
    await prisma.deviceSequence.deleteMany();
    await prisma.userPlantMap.deleteMany();
    await prisma.plant.deleteMany();
    await prisma.deviceTemplateTag.deleteMany();
    await prisma.hierarchyRule.deleteMany();
    await prisma.deviceTemplate.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.userHistory.deleteMany();
    await prisma.user.deleteMany();
    console.log('  ✓ Cleared all existing data');
    console.log('');

    // Seed data
    const users = await seedUsers();
    console.log('');

    const templates = await seedDeviceTemplates();
    console.log('');

    const adminUser = users.find(u => u.role === 'ADMIN');
    const plants = await seedPlants(adminUser.id);
    console.log('');

    const mappingCount = await seedUserPlantMappings(users, plants);
    console.log('');

    const { devices, tags } = await seedDevicesAndTags(plants);
    console.log('');

    await seedProcessedData(plants, devices, tags);
    console.log('');

    await seedAlarms(plants, devices, tags, adminUser.id);
    console.log('');

    // AUDIT LOG - COMMENTED OUT (Enable when needed)
    // await seedAuditLogs(adminUser.id);
    // console.log('');

    // Summary
    console.log('='.repeat(60));
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Device Templates: ${templates.length}`);
    console.log(`   Plants: ${plants.length}`);
    console.log(`   User-Plant Mappings: ${mappingCount}`);
    console.log(`   Devices: ${devices.length}`);
    console.log(`   Tags: ${tags.length}`);
    console.log(`   Alarms: 50`);
    // console.log(`   Audit Logs: 30`); // AUDIT LOG - COMMENTED OUT
    console.log('');
    console.log('🔐 Login Credentials:');
    console.log('');
    console.log('   Admin:');
    console.log('     Email: admin@solar.com');
    console.log('     Password: Admin123!');
    console.log('');
    console.log('   Manager:');
    console.log('     Email: manager@solar.com');
    console.log('     Password: Manager123!');
    console.log('');
    console.log('   Viewer:');
    console.log('     Email: viewer@solar.com');
    console.log('     Password: Viewer123!');
    console.log('');
    console.log('='.repeat(60));
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ ERROR DURING SEEDING:');
    console.error(error);
    console.error('');
    throw error;
  }
}

// ============================================
// EXECUTE SEED
// ============================================

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
