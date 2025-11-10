/**
 * AWS IoT Core Configuration
 * Centralized configuration for AWS IoT Core integration
 */

import { IoTClient } from '@aws-sdk/client-iot';
import { IoTDataPlaneClient } from '@aws-sdk/client-iot-data-plane';
import { SQSClient } from '@aws-sdk/client-sqs';
import logger from '../../../config/logger.js';

// Environment variables validation
const requiredEnvVars = [
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
];

const optionalEnvVars = [
  'AWS_IOT_ENDPOINT',
  'AWS_SQS_QUEUE_URL',
  'AWS_IOT_ROLE_ARN',
];

/**
 * Validate AWS configuration
 * @returns {Object} Validation result
 */
const validateConfig = () => {
  const missing = [];
  const warnings = [];

  // Check required variables
  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  // Check optional but important variables
  optionalEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  });

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
  };
};

/**
 * Get AWS IoT configuration from environment
 */
const getConfig = () => {
  return {
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    iotEndpoint: process.env.AWS_IOT_ENDPOINT,
    sqsQueueUrl: process.env.AWS_SQS_QUEUE_URL,
    iotRoleArn: process.env.AWS_IOT_ROLE_ARN,
    accountId: process.env.AWS_ACCOUNT_ID,

    // Feature flags
    useAwsIot: process.env.USE_AWS_IOT !== 'false', // Default to true unless explicitly disabled
    mockMode: process.env.USE_MOCK_DATA === 'true',

    // Certificate storage settings
    encryptionKey: process.env.ENCRYPTION_KEY,
  };
};

/**
 * Check if AWS IoT is enabled and properly configured
 */
const isAwsIotEnabled = () => {
  const config = getConfig();

  // If explicitly disabled, return false
  if (!config.useAwsIot) {
    logger.info('AWS IoT integration is disabled via USE_AWS_IOT=false');
    return false;
  }

  // If in mock mode, AWS IoT is optional
  if (config.mockMode) {
    logger.info('Running in mock data mode - AWS IoT integration is optional');
    return false;
  }

  // Validate configuration
  const validation = validateConfig();

  if (!validation.isValid) {
    logger.warn('AWS IoT integration is disabled due to missing configuration:', {
      missing: validation.missing,
    });
    return false;
  }

  if (validation.warnings.length > 0) {
    logger.warn('AWS IoT configuration has warnings:', {
      warnings: validation.warnings,
    });
  }

  return true;
};

/**
 * Create configured AWS IoT client
 */
const createIoTClient = () => {
  const config = getConfig();

  if (!isAwsIotEnabled()) {
    return null;
  }

  return new IoTClient({
    region: config.region,
    credentials: config.credentials,
  });
};

/**
 * Create configured AWS IoT Data Plane client
 */
const createIoTDataClient = () => {
  const config = getConfig();

  if (!isAwsIotEnabled() || !config.iotEndpoint) {
    return null;
  }

  return new IoTDataPlaneClient({
    region: config.region,
    credentials: config.credentials,
    endpoint: `https://${config.iotEndpoint}`,
  });
};

/**
 * Create configured AWS SQS client
 */
const createSQSClient = () => {
  const config = getConfig();

  if (!isAwsIotEnabled()) {
    return null;
  }

  return new SQSClient({
    region: config.region,
    credentials: config.credentials,
  });
};

/**
 * Get AWS clients (cached)
 */
let cachedClients = null;

const getAwsClients = () => {
  if (!cachedClients) {
    cachedClients = {
      iot: createIoTClient(),
      iotData: createIoTDataClient(),
      sqs: createSQSClient(),
      config: getConfig(),
    };

    if (isAwsIotEnabled()) {
      logger.info('AWS IoT clients initialized successfully', {
        region: cachedClients.config.region,
        hasIotClient: !!cachedClients.iot,
        hasIotDataClient: !!cachedClients.iotData,
        hasSqsClient: !!cachedClients.sqs,
      });
    }
  }

  return cachedClients;
};

/**
 * Reset cached clients (useful for testing)
 */
const resetClients = () => {
  cachedClients = null;
};

/**
 * Generate MQTT topic for a plant
 * @param {string} plantId - Plant UUID
 * @returns {string} MQTT topic pattern
 */
const generateMqttTopic = (plantId) => {
  return `solar/${plantId}/data`;
};

/**
 * Generate command topic for a plant
 * @param {string} plantId - Plant UUID
 * @returns {string} MQTT command topic pattern
 */
const generateCommandTopic = (plantId) => {
  return `solar/${plantId}/commands`;
};

/**
 * Generate IoT Thing name for a plant
 * @param {string} plantId - Plant UUID
 * @returns {string} Thing name
 */
const generateThingName = (plantId) => {
  return `solar-plant-${plantId}`;
};

/**
 * Generate IoT Policy name for a plant
 * @param {string} plantId - Plant UUID
 * @returns {string} Policy name
 */
const generatePolicyName = (plantId) => {
  return `solar-plant-policy-${plantId}`;
};

/**
 * Generate IoT Rule name for a plant
 * @param {string} plantId - Plant UUID
 * @returns {string} Rule name
 */
const generateRuleName = (plantId) => {
  return `solar_plant_rule_${plantId.replace(/-/g, '_')}`;
};

// Validate configuration on module load
const validation = validateConfig();
if (!validation.isValid && process.env.USE_AWS_IOT !== 'false' && process.env.USE_MOCK_DATA !== 'true') {
  logger.warn('AWS IoT configuration validation failed', {
    missing: validation.missing,
    message: 'AWS IoT features will be disabled. Set USE_AWS_IOT=false to suppress this warning.',
  });
}

export {
  getConfig,
  validateConfig,
  isAwsIotEnabled,
  getAwsClients,
  resetClients,
  generateMqttTopic,
  generateCommandTopic,
  generateThingName,
  generatePolicyName,
  generateRuleName,
};
