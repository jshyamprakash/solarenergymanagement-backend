/**
 * AWS IoT Certificate Management
 * Handles X.509 certificate lifecycle for device authentication
 */

import {
  CreateKeysAndCertificateCommand,
  DeleteCertificateCommand,
  UpdateCertificateCommand,
  DescribeCertificateCommand,
  AttachThingPrincipalCommand,
  DetachThingPrincipalCommand,
  ListThingPrincipalsCommand,
} from '@aws-sdk/client-iot';
import { getAwsClients, isAwsIotEnabled } from '../config/iotConfig.js';
import logger from '../../../config/logger.js';
import { encryptData, decryptData } from '../utils/encryption.js';

/**
 * Create a new X.509 certificate for device authentication
 * @param {boolean} setAsActive - Set certificate as active immediately
 * @returns {Promise<Object>} Certificate data with keys
 */
const createCertificate = async (setAsActive = true) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping certificate creation');
    return {
      certificateArn: 'mock-certificate-arn',
      certificateId: 'mock-certificate-id',
      certificatePem: 'mock-certificate-pem',
      privateKey: 'mock-private-key',
      publicKey: 'mock-public-key',
    };
  }

  try {
    const { iot } = getAwsClients();

    const command = new CreateKeysAndCertificateCommand({
      setAsActive,
    });

    const response = await iot.send(command);

    logger.info('Certificate created successfully', {
      certificateId: response.certificateId,
      certificateArn: response.certificateArn,
    });

    return {
      certificateArn: response.certificateArn,
      certificateId: response.certificateId,
      certificatePem: response.certificatePem,
      privateKey: response.keyPair.PrivateKey,
      publicKey: response.keyPair.PublicKey,
    };
  } catch (error) {
    logger.error('Failed to create certificate', {
      error: error.message,
      stack: error.stack,
    });
    throw new Error(`Certificate creation failed: ${error.message}`);
  }
};

/**
 * Attach certificate to an IoT Thing
 * @param {string} certificateArn - Certificate ARN
 * @param {string} thingName - Thing name
 * @returns {Promise<void>}
 */
const attachCertificateToThing = async (certificateArn, thingName) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping certificate attachment');
    return;
  }

  try {
    const { iot } = getAwsClients();

    const command = new AttachThingPrincipalCommand({
      thingName,
      principal: certificateArn,
    });

    await iot.send(command);

    logger.info('Certificate attached to Thing', {
      certificateArn,
      thingName,
    });
  } catch (error) {
    logger.error('Failed to attach certificate to Thing', {
      error: error.message,
      certificateArn,
      thingName,
    });
    throw new Error(`Failed to attach certificate to Thing: ${error.message}`);
  }
};

/**
 * Detach certificate from an IoT Thing
 * @param {string} certificateArn - Certificate ARN
 * @param {string} thingName - Thing name
 * @returns {Promise<void>}
 */
const detachCertificateFromThing = async (certificateArn, thingName) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping certificate detachment');
    return;
  }

  try {
    const { iot } = getAwsClients();

    const command = new DetachThingPrincipalCommand({
      thingName,
      principal: certificateArn,
    });

    await iot.send(command);

    logger.info('Certificate detached from Thing', {
      certificateArn,
      thingName,
    });
  } catch (error) {
    logger.error('Failed to detach certificate from Thing', {
      error: error.message,
      certificateArn,
      thingName,
    });
    throw new Error(`Failed to detach certificate from Thing: ${error.message}`);
  }
};

/**
 * Deactivate a certificate
 * @param {string} certificateId - Certificate ID
 * @returns {Promise<void>}
 */
const deactivateCertificate = async (certificateId) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping certificate deactivation');
    return;
  }

  try {
    const { iot } = getAwsClients();

    const command = new UpdateCertificateCommand({
      certificateId,
      newStatus: 'INACTIVE',
    });

    await iot.send(command);

    logger.info('Certificate deactivated', { certificateId });
  } catch (error) {
    logger.error('Failed to deactivate certificate', {
      error: error.message,
      certificateId,
    });
    throw new Error(`Failed to deactivate certificate: ${error.message}`);
  }
};

/**
 * Delete a certificate
 * Note: Certificate must be deactivated and detached before deletion
 * @param {string} certificateId - Certificate ID
 * @returns {Promise<void>}
 */
const deleteCertificate = async (certificateId) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping certificate deletion');
    return;
  }

  try {
    const { iot } = getAwsClients();

    const command = new DeleteCertificateCommand({
      certificateId,
      forceDelete: false, // Require detachment first for safety
    });

    await iot.send(command);

    logger.info('Certificate deleted', { certificateId });
  } catch (error) {
    logger.error('Failed to delete certificate', {
      error: error.message,
      certificateId,
    });
    throw new Error(`Failed to delete certificate: ${error.message}`);
  }
};

/**
 * Get certificate details
 * @param {string} certificateId - Certificate ID
 * @returns {Promise<Object>} Certificate details
 */
const getCertificateDetails = async (certificateId) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - returning mock certificate details');
    return {
      certificateId,
      status: 'ACTIVE',
      creationDate: new Date(),
    };
  }

  try {
    const { iot } = getAwsClients();

    const command = new DescribeCertificateCommand({
      certificateId,
    });

    const response = await iot.send(command);

    return {
      certificateId: response.certificateDescription.certificateId,
      certificateArn: response.certificateDescription.certificateArn,
      status: response.certificateDescription.status,
      creationDate: response.certificateDescription.creationDate,
      lastModifiedDate: response.certificateDescription.lastModifiedDate,
    };
  } catch (error) {
    logger.error('Failed to get certificate details', {
      error: error.message,
      certificateId,
    });
    throw new Error(`Failed to get certificate details: ${error.message}`);
  }
};

/**
 * List all certificates attached to a Thing
 * @param {string} thingName - Thing name
 * @returns {Promise<Array>} Array of certificate ARNs
 */
const listThingCertificates = async (thingName) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - returning empty certificate list');
    return [];
  }

  try {
    const { iot } = getAwsClients();

    const command = new ListThingPrincipalsCommand({
      thingName,
    });

    const response = await iot.send(command);

    return response.principals || [];
  } catch (error) {
    logger.error('Failed to list Thing certificates', {
      error: error.message,
      thingName,
    });
    throw new Error(`Failed to list Thing certificates: ${error.message}`);
  }
};

/**
 * Store certificate data securely in database
 * @param {string} plantId - Plant ID
 * @param {string} certificatePem - Certificate PEM
 * @param {string} privateKey - Private key
 * @returns {Promise<Object>} Encrypted certificate data
 */
const storeCertificateSecurely = async (plantId, certificatePem, privateKey) => {
  try {
    // Encrypt sensitive data before storage
    const encryptedCertificate = await encryptData(certificatePem);
    const encryptedPrivateKey = await encryptData(privateKey);

    logger.info('Certificate data encrypted for storage', {
      plantId,
      certificateLength: certificatePem.length,
      privateKeyLength: privateKey.length,
    });

    return {
      encryptedCertificate,
      encryptedPrivateKey,
    };
  } catch (error) {
    logger.error('Failed to encrypt certificate data', {
      error: error.message,
      plantId,
    });
    throw new Error(`Failed to encrypt certificate data: ${error.message}`);
  }
};

/**
 * Retrieve and decrypt certificate data
 * @param {string} encryptedCertificate - Encrypted certificate PEM
 * @param {string} encryptedPrivateKey - Encrypted private key
 * @returns {Promise<Object>} Decrypted certificate data
 */
const retrieveCertificateSecurely = async (encryptedCertificate, encryptedPrivateKey) => {
  try {
    const certificatePem = await decryptData(encryptedCertificate);
    const privateKey = await decryptData(encryptedPrivateKey);

    return {
      certificatePem,
      privateKey,
    };
  } catch (error) {
    logger.error('Failed to decrypt certificate data', {
      error: error.message,
    });
    throw new Error(`Failed to decrypt certificate data: ${error.message}`);
  }
};

/**
 * Complete certificate lifecycle cleanup
 * Detaches from Thing, deactivates, and deletes
 * @param {string} certificateId - Certificate ID
 * @param {string} certificateArn - Certificate ARN
 * @param {string} thingName - Thing name
 * @returns {Promise<void>}
 */
const cleanupCertificate = async (certificateId, certificateArn, thingName) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping certificate cleanup');
    return;
  }

  try {
    // Step 1: Detach from Thing
    if (thingName && certificateArn) {
      await detachCertificateFromThing(certificateArn, thingName);
    }

    // Step 2: Deactivate certificate
    if (certificateId) {
      await deactivateCertificate(certificateId);
    }

    // Step 3: Delete certificate
    if (certificateId) {
      await deleteCertificate(certificateId);
    }

    logger.info('Certificate cleanup completed', {
      certificateId,
      thingName,
    });
  } catch (error) {
    logger.error('Certificate cleanup failed', {
      error: error.message,
      certificateId,
      thingName,
    });
    throw new Error(`Certificate cleanup failed: ${error.message}`);
  }
};

export {
  createCertificate,
  attachCertificateToThing,
  detachCertificateFromThing,
  deactivateCertificate,
  deleteCertificate,
  getCertificateDetails,
  listThingCertificates,
  storeCertificateSecurely,
  retrieveCertificateSecurely,
  cleanupCertificate,
};
