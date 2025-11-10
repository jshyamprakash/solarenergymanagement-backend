/**
 * AWS IoT Core Service
 * Main orchestration service for IoT Thing provisioning and lifecycle management
 */

import {
  CreateThingCommand,
  DeleteThingCommand,
  DescribeThingCommand,
  UpdateThingCommand
} from '@aws-sdk/client-iot';
import {
  UpdateThingShadowCommand as DataPlaneUpdateThingShadowCommand,
  GetThingShadowCommand as DataPlaneGetThingShadowCommand,
  DeleteThingShadowCommand as DataPlaneDeleteThingShadowCommand,
} from '@aws-sdk/client-iot-data-plane';
import { getAwsClients, isAwsIotEnabled, generateThingName, generatePolicyName, generateRuleName } from '../config/iotConfig.js';
import logger from '../../../config/logger.js';
import * as certificateManager from './certificateManager.js';
import * as policyManager from './policyManager.js';
import * as ruleManager from './ruleManager.js';

/**
 * Create an IoT Thing for a plant
 * @param {string} plantId - Plant UUID
 * @param {string} plantName - Plant name
 * @param {Object} attributes - Optional thing attributes
 * @returns {Promise<Object>} Thing details
 */
const createThing = async (plantId, plantName, attributes = {}) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping Thing creation');
    return {
      thingName: generateThingName(plantId),
      thingArn: 'mock-thing-arn',
      thingId: 'mock-thing-id',
    };
  }

  try {
    const { iot } = getAwsClients();
    const thingName = generateThingName(plantId);

    const command = new CreateThingCommand({
      thingName,
      attributePayload: {
        attributes: {
          plantId,
          plantName,
          ...attributes,
        },
      },
    });

    const response = await iot.send(command);

    logger.info('IoT Thing created successfully', {
      thingName: response.thingName,
      thingArn: response.thingArn,
      plantId,
    });

    return {
      thingName: response.thingName,
      thingArn: response.thingArn,
      thingId: response.thingId,
    };
  } catch (error) {
    logger.error('Failed to create IoT Thing', {
      error: error.message,
      plantId,
      plantName,
    });
    throw new Error(`Thing creation failed: ${error.message}`);
  }
};

/**
 * Delete an IoT Thing
 * @param {string} thingName - Thing name
 * @returns {Promise<void>}
 */
const deleteThing = async (thingName) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping Thing deletion');
    return;
  }

  try {
    const { iot } = getAwsClients();

    const command = new DeleteThingCommand({
      thingName,
    });

    await iot.send(command);

    logger.info('IoT Thing deleted successfully', { thingName });
  } catch (error) {
    logger.error('Failed to delete IoT Thing', {
      error: error.message,
      thingName,
    });
    throw new Error(`Thing deletion failed: ${error.message}`);
  }
};

/**
 * Get IoT Thing details
 * @param {string} thingName - Thing name
 * @returns {Promise<Object>} Thing details
 */
const getThingDetails = async (thingName) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - returning mock Thing details');
    return {
      thingName,
      attributes: {},
    };
  }

  try {
    const { iot } = getAwsClients();

    const command = new DescribeThingCommand({
      thingName,
    });

    const response = await iot.send(command);

    return {
      thingName: response.thingName,
      thingArn: response.thingArn,
      thingId: response.thingId,
      attributes: response.attributes,
      version: response.version,
    };
  } catch (error) {
    logger.error('Failed to get Thing details', {
      error: error.message,
      thingName,
    });
    throw new Error(`Failed to get Thing details: ${error.message}`);
  }
};

/**
 * Update IoT Thing attributes
 * @param {string} thingName - Thing name
 * @param {Object} attributes - Attributes to update
 * @returns {Promise<void>}
 */
const updateThingAttributes = async (thingName, attributes) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping Thing update');
    return;
  }

  try {
    const { iot } = getAwsClients();

    const command = new UpdateThingCommand({
      thingName,
      attributePayload: {
        attributes,
      },
    });

    await iot.send(command);

    logger.info('IoT Thing attributes updated', {
      thingName,
      attributes,
    });
  } catch (error) {
    logger.error('Failed to update Thing attributes', {
      error: error.message,
      thingName,
    });
    throw new Error(`Failed to update Thing attributes: ${error.message}`);
  }
};

/**
 * Update Thing Shadow (device state)
 * @param {string} thingName - Thing name
 * @param {Object} state - Desired state
 * @returns {Promise<Object>} Updated shadow
 */
const updateThingShadow = async (thingName, state) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping Thing shadow update');
    return { state };
  }

  try {
    const { iotData } = getAwsClients();

    if (!iotData) {
      throw new Error('IoT Data client not available - check AWS_IOT_ENDPOINT configuration');
    }

    const payload = {
      state: {
        desired: state,
      },
    };

    const command = new DataPlaneUpdateThingShadowCommand({
      thingName,
      payload: JSON.stringify(payload),
    });

    const response = await iotData.send(command);

    logger.info('Thing shadow updated', { thingName });

    return JSON.parse(new TextDecoder().decode(response.payload));
  } catch (error) {
    logger.error('Failed to update Thing shadow', {
      error: error.message,
      thingName,
    });
    throw new Error(`Failed to update Thing shadow: ${error.message}`);
  }
};

/**
 * Get Thing Shadow (current device state)
 * @param {string} thingName - Thing name
 * @returns {Promise<Object>} Current shadow
 */
const getThingShadow = async (thingName) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - returning mock shadow');
    return { state: {} };
  }

  try {
    const { iotData } = getAwsClients();

    if (!iotData) {
      throw new Error('IoT Data client not available - check AWS_IOT_ENDPOINT configuration');
    }

    const command = new DataPlaneGetThingShadowCommand({
      thingName,
    });

    const response = await iotData.send(command);

    return JSON.parse(new TextDecoder().decode(response.payload));
  } catch (error) {
    logger.error('Failed to get Thing shadow', {
      error: error.message,
      thingName,
    });
    throw new Error(`Failed to get Thing shadow: ${error.message}`);
  }
};

/**
 * Delete Thing Shadow
 * @param {string} thingName - Thing name
 * @returns {Promise<void>}
 */
const deleteThingShadow = async (thingName) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping Thing shadow deletion');
    return;
  }

  try {
    const { iotData } = getAwsClients();

    if (!iotData) {
      throw new Error('IoT Data client not available - check AWS_IOT_ENDPOINT configuration');
    }

    const command = new DataPlaneDeleteThingShadowCommand({
      thingName,
    });

    await iotData.send(command);

    logger.info('Thing shadow deleted', { thingName });
  } catch (error) {
    logger.error('Failed to delete Thing shadow', {
      error: error.message,
      thingName,
    });
    throw new Error(`Failed to delete Thing shadow: ${error.message}`);
  }
};

/**
 * Provision complete IoT infrastructure for a plant
 * Creates Thing, Certificate, Policy, and Rule
 * @param {string} plantId - Plant UUID
 * @param {string} plantName - Plant name
 * @returns {Promise<Object>} Provisioning result with all resource details
 */
const provisionPlantIoT = async (plantId, plantName) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - returning mock provisioning result');
    return {
      thingName: generateThingName(plantId),
      thingArn: 'mock-thing-arn',
      certificateId: 'mock-certificate-id',
      certificateArn: 'mock-certificate-arn',
      certificatePem: 'mock-certificate-pem',
      privateKey: 'mock-private-key',
      policyName: generatePolicyName(plantId),
      ruleName: generateRuleName(plantId),
    };
  }

  const thingName = generateThingName(plantId);
  const policyName = generatePolicyName(plantId);
  const ruleName = generateRuleName(plantId);

  let thingArn = null;
  let certificateId = null;
  let certificateArn = null;

  try {
    logger.info('Starting IoT provisioning for plant', {
      plantId,
      plantName,
      thingName,
    });

    // Step 1: Create IoT Thing
    const thing = await createThing(plantId, plantName);
    thingArn = thing.thingArn;

    // Step 2: Create Certificate
    const certificate = await certificateManager.createCertificate(true);
    certificateId = certificate.certificateId;
    certificateArn = certificate.certificateArn;

    // Step 3: Create Policy
    const policy = await policyManager.createPolicy(plantId, policyName, thingName);

    // Step 4: Attach Policy to Certificate
    await policyManager.attachPolicyToCertificate(policyName, certificateArn);

    // Step 5: Attach Certificate to Thing
    await certificateManager.attachCertificateToThing(certificateArn, thingName);

    // Step 6: Create IoT Rule for data ingestion
    const rule = await ruleManager.createDataIngestionRule(
      plantId,
      ruleName,
      `Data ingestion rule for ${plantName}`
    );

    logger.info('IoT provisioning completed successfully', {
      plantId,
      thingName,
      certificateId,
      policyName,
      ruleName,
    });

    return {
      thingName,
      thingArn: thing.thingArn,
      thingId: thing.thingId,
      certificateId: certificate.certificateId,
      certificateArn: certificate.certificateArn,
      certificatePem: certificate.certificatePem,
      privateKey: certificate.privateKey,
      publicKey: certificate.publicKey,
      policyName,
      policyArn: policy.policyArn,
      ruleName,
      ruleArn: rule.ruleArn,
    };
  } catch (error) {
    logger.error('IoT provisioning failed - starting rollback', {
      error: error.message,
      plantId,
      thingName,
      certificateId,
    });

    // Rollback: Clean up created resources
    await rollbackProvisioningResources(thingName, certificateId, certificateArn, policyName, ruleName);

    throw new Error(`IoT provisioning failed: ${error.message}`);
  }
};

/**
 * Rollback provisioning by cleaning up partial resources
 * @param {string} thingName - Thing name
 * @param {string} certificateId - Certificate ID
 * @param {string} certificateArn - Certificate ARN
 * @param {string} policyName - Policy name
 * @param {string} ruleName - Rule name
 */
const rollbackProvisioningResources = async (thingName, certificateId, certificateArn, policyName, ruleName) => {
  logger.info('Starting rollback of IoT resources', {
    thingName,
    certificateId,
    policyName,
    ruleName,
  });

  try {
    // Clean up in reverse order of creation
    if (ruleName) {
      try {
        await ruleManager.deleteRule(ruleName);
      } catch (err) {
        logger.warn('Failed to delete rule during rollback', { ruleName, error: err.message });
      }
    }

    if (certificateId && certificateArn && policyName) {
      try {
        await policyManager.detachPolicyFromCertificate(policyName, certificateArn);
      } catch (err) {
        logger.warn('Failed to detach policy during rollback', { error: err.message });
      }
    }

    if (certificateArn && thingName) {
      try {
        await certificateManager.detachCertificateFromThing(certificateArn, thingName);
      } catch (err) {
        logger.warn('Failed to detach certificate during rollback', { error: err.message });
      }
    }

    if (policyName) {
      try {
        await policyManager.deletePolicy(policyName);
      } catch (err) {
        logger.warn('Failed to delete policy during rollback', { policyName, error: err.message });
      }
    }

    if (certificateId) {
      try {
        await certificateManager.deactivateCertificate(certificateId);
        await certificateManager.deleteCertificate(certificateId);
      } catch (err) {
        logger.warn('Failed to delete certificate during rollback', { certificateId, error: err.message });
      }
    }

    if (thingName) {
      try {
        await deleteThing(thingName);
      } catch (err) {
        logger.warn('Failed to delete Thing during rollback', { thingName, error: err.message });
      }
    }

    logger.info('Rollback completed');
  } catch (error) {
    logger.error('Rollback failed', { error: error.message });
  }
};

/**
 * Deprovision complete IoT infrastructure for a plant
 * Removes Rule, Policy, Certificate, and Thing
 * @param {string} plantId - Plant UUID
 * @param {Object} iotResources - Object containing IoT resource identifiers
 * @returns {Promise<void>}
 */
const deprovisionPlantIoT = async (plantId, iotResources) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping deprovisioning');
    return;
  }

  const {
    iotThingName,
    iotCertificateId,
    iotCertificateArn,
    iotPolicyName,
    iotRuleName,
  } = iotResources;

  try {
    logger.info('Starting IoT deprovisioning for plant', {
      plantId,
      thingName: iotThingName,
    });

    // Step 1: Delete IoT Rule
    if (iotRuleName) {
      await ruleManager.deleteRule(iotRuleName);
    }

    // Step 2: Clean up Certificate (detach, deactivate, delete)
    if (iotCertificateId && iotCertificateArn && iotThingName) {
      await certificateManager.cleanupCertificate(
        iotCertificateId,
        iotCertificateArn,
        iotThingName
      );
    }

    // Step 3: Clean up Policy (detach and delete)
    if (iotPolicyName && iotCertificateArn) {
      await policyManager.cleanupPolicy(iotPolicyName, iotCertificateArn);
    }

    // Step 4: Delete Thing
    if (iotThingName) {
      await deleteThing(iotThingName);
    }

    logger.info('IoT deprovisioning completed successfully', {
      plantId,
      thingName: iotThingName,
    });
  } catch (error) {
    logger.error('IoT deprovisioning failed', {
      error: error.message,
      plantId,
      thingName: iotThingName,
    });
    throw new Error(`IoT deprovisioning failed: ${error.message}`);
  }
};

export {
  createThing,
  deleteThing,
  getThingDetails,
  updateThingAttributes,
  updateThingShadow,
  getThingShadow,
  deleteThingShadow,
  provisionPlantIoT,
  deprovisionPlantIoT,
  rollbackProvisioningResources,
};
