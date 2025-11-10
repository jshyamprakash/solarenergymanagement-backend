/**
 * AWS IoT Policy Management
 * Handles IoT policy creation and management for MQTT permissions
 */

import {
  CreatePolicyCommand,
  DeletePolicyCommand,
  GetPolicyCommand,
  AttachPolicyCommand,
  DetachPolicyCommand,
  ListAttachedPoliciesCommand,
  ListPolicyVersionsCommand,
  DeletePolicyVersionCommand,
} from '@aws-sdk/client-iot';
import { getAwsClients, isAwsIotEnabled, generateMqttTopic, generateCommandTopic } from '../config/iotConfig.js';
import logger from '../../../config/logger.js';

/**
 * Generate IoT policy document for a plant
 * @param {string} plantId - Plant UUID
 * @param {string} thingName - IoT Thing name
 * @returns {Object} Policy document
 */
const generatePolicyDocument = (plantId, thingName) => {
  const dataTopic = generateMqttTopic(plantId);
  const commandTopic = generateCommandTopic(plantId);

  return {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['iot:Connect'],
        Resource: [`arn:aws:iot:*:*:client/${thingName}`],
      },
      {
        Effect: 'Allow',
        Action: ['iot:Publish'],
        Resource: [
          `arn:aws:iot:*:*:topic/${dataTopic}`,
          `arn:aws:iot:*:*:topic/${dataTopic}/*`,
        ],
      },
      {
        Effect: 'Allow',
        Action: ['iot:Subscribe'],
        Resource: [
          `arn:aws:iot:*:*:topicfilter/${commandTopic}`,
          `arn:aws:iot:*:*:topicfilter/${commandTopic}/*`,
        ],
      },
      {
        Effect: 'Allow',
        Action: ['iot:Receive'],
        Resource: [
          `arn:aws:iot:*:*:topic/${commandTopic}`,
          `arn:aws:iot:*:*:topic/${commandTopic}/*`,
        ],
      },
      {
        Effect: 'Allow',
        Action: ['iot:UpdateThingShadow', 'iot:GetThingShadow', 'iot:DeleteThingShadow'],
        Resource: [`arn:aws:iot:*:*:thing/${thingName}`],
      },
    ],
  };
};

/**
 * Create an IoT policy for a plant
 * @param {string} plantId - Plant UUID
 * @param {string} policyName - Policy name
 * @param {string} thingName - IoT Thing name
 * @returns {Promise<Object>} Policy details
 */
const createPolicy = async (plantId, policyName, thingName) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping policy creation');
    return {
      policyName,
      policyArn: 'mock-policy-arn',
      policyDocument: generatePolicyDocument(plantId, thingName),
    };
  }

  try {
    const { iot } = getAwsClients();
    const policyDocument = generatePolicyDocument(plantId, thingName);

    const command = new CreatePolicyCommand({
      policyName,
      policyDocument: JSON.stringify(policyDocument),
    });

    const response = await iot.send(command);

    logger.info('IoT policy created successfully', {
      policyName,
      policyArn: response.policyArn,
      plantId,
    });

    return {
      policyName: response.policyName,
      policyArn: response.policyArn,
      policyDocument,
    };
  } catch (error) {
    logger.error('Failed to create IoT policy', {
      error: error.message,
      policyName,
      plantId,
    });
    throw new Error(`Policy creation failed: ${error.message}`);
  }
};

/**
 * Attach policy to a certificate
 * @param {string} policyName - Policy name
 * @param {string} certificateArn - Certificate ARN
 * @returns {Promise<void>}
 */
const attachPolicyToCertificate = async (policyName, certificateArn) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping policy attachment');
    return;
  }

  try {
    const { iot } = getAwsClients();

    const command = new AttachPolicyCommand({
      policyName,
      target: certificateArn,
    });

    await iot.send(command);

    logger.info('Policy attached to certificate', {
      policyName,
      certificateArn,
    });
  } catch (error) {
    logger.error('Failed to attach policy to certificate', {
      error: error.message,
      policyName,
      certificateArn,
    });
    throw new Error(`Failed to attach policy to certificate: ${error.message}`);
  }
};

/**
 * Detach policy from a certificate
 * @param {string} policyName - Policy name
 * @param {string} certificateArn - Certificate ARN
 * @returns {Promise<void>}
 */
const detachPolicyFromCertificate = async (policyName, certificateArn) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping policy detachment');
    return;
  }

  try {
    const { iot } = getAwsClients();

    const command = new DetachPolicyCommand({
      policyName,
      target: certificateArn,
    });

    await iot.send(command);

    logger.info('Policy detached from certificate', {
      policyName,
      certificateArn,
    });
  } catch (error) {
    logger.error('Failed to detach policy from certificate', {
      error: error.message,
      policyName,
      certificateArn,
    });
    throw new Error(`Failed to detach policy from certificate: ${error.message}`);
  }
};

/**
 * Get policy details
 * @param {string} policyName - Policy name
 * @returns {Promise<Object>} Policy details
 */
const getPolicy = async (policyName) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - returning mock policy');
    return {
      policyName,
      policyDocument: {},
    };
  }

  try {
    const { iot } = getAwsClients();

    const command = new GetPolicyCommand({
      policyName,
    });

    const response = await iot.send(command);

    return {
      policyName: response.policyName,
      policyArn: response.policyArn,
      policyDocument: JSON.parse(response.policyDocument),
      defaultVersionId: response.defaultVersionId,
      creationDate: response.creationDate,
      lastModifiedDate: response.lastModifiedDate,
    };
  } catch (error) {
    logger.error('Failed to get policy', {
      error: error.message,
      policyName,
    });
    throw new Error(`Failed to get policy: ${error.message}`);
  }
};

/**
 * List all policy versions
 * @param {string} policyName - Policy name
 * @returns {Promise<Array>} Policy versions
 */
const listPolicyVersions = async (policyName) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - returning empty versions list');
    return [];
  }

  try {
    const { iot } = getAwsClients();

    const command = new ListPolicyVersionsCommand({
      policyName,
    });

    const response = await iot.send(command);

    return response.policyVersions || [];
  } catch (error) {
    logger.error('Failed to list policy versions', {
      error: error.message,
      policyName,
    });
    throw new Error(`Failed to list policy versions: ${error.message}`);
  }
};

/**
 * Delete a specific policy version
 * @param {string} policyName - Policy name
 * @param {string} policyVersionId - Version ID
 * @returns {Promise<void>}
 */
const deletePolicyVersion = async (policyName, policyVersionId) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping policy version deletion');
    return;
  }

  try {
    const { iot } = getAwsClients();

    const command = new DeletePolicyVersionCommand({
      policyName,
      policyVersionId,
    });

    await iot.send(command);

    logger.info('Policy version deleted', {
      policyName,
      policyVersionId,
    });
  } catch (error) {
    logger.error('Failed to delete policy version', {
      error: error.message,
      policyName,
      policyVersionId,
    });
    throw new Error(`Failed to delete policy version: ${error.message}`);
  }
};

/**
 * Delete a policy
 * Note: All non-default versions must be deleted first
 * @param {string} policyName - Policy name
 * @returns {Promise<void>}
 */
const deletePolicy = async (policyName) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping policy deletion');
    return;
  }

  try {
    const { iot } = getAwsClients();

    // First, delete all non-default versions
    const versions = await listPolicyVersions(policyName);
    for (const version of versions) {
      if (!version.isDefaultVersion) {
        await deletePolicyVersion(policyName, version.versionId);
      }
    }

    // Now delete the policy
    const command = new DeletePolicyCommand({
      policyName,
    });

    await iot.send(command);

    logger.info('Policy deleted successfully', { policyName });
  } catch (error) {
    logger.error('Failed to delete policy', {
      error: error.message,
      policyName,
    });
    throw new Error(`Failed to delete policy: ${error.message}`);
  }
};

/**
 * List policies attached to a certificate
 * @param {string} certificateArn - Certificate ARN
 * @returns {Promise<Array>} Attached policies
 */
const listAttachedPolicies = async (certificateArn) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - returning empty policies list');
    return [];
  }

  try {
    const { iot } = getAwsClients();

    const command = new ListAttachedPoliciesCommand({
      target: certificateArn,
    });

    const response = await iot.send(command);

    return response.policies || [];
  } catch (error) {
    logger.error('Failed to list attached policies', {
      error: error.message,
      certificateArn,
    });
    throw new Error(`Failed to list attached policies: ${error.message}`);
  }
};

/**
 * Complete policy cleanup
 * Detaches from certificate and deletes policy
 * @param {string} policyName - Policy name
 * @param {string} certificateArn - Certificate ARN
 * @returns {Promise<void>}
 */
const cleanupPolicy = async (policyName, certificateArn) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping policy cleanup');
    return;
  }

  try {
    // Step 1: Detach from certificate
    if (certificateArn && policyName) {
      await detachPolicyFromCertificate(policyName, certificateArn);
    }

    // Step 2: Delete policy
    if (policyName) {
      await deletePolicy(policyName);
    }

    logger.info('Policy cleanup completed', { policyName });
  } catch (error) {
    logger.error('Policy cleanup failed', {
      error: error.message,
      policyName,
    });
    throw new Error(`Policy cleanup failed: ${error.message}`);
  }
};

export {
  generatePolicyDocument,
  createPolicy,
  attachPolicyToCertificate,
  detachPolicyFromCertificate,
  getPolicy,
  listPolicyVersions,
  deletePolicyVersion,
  deletePolicy,
  listAttachedPolicies,
  cleanupPolicy,
};
