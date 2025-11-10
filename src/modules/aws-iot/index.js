/**
 * AWS IoT Core Integration Module
 * Main entry point for AWS IoT functionality
 *
 * This module provides comprehensive AWS IoT Core integration for solar plant management.
 * It handles the complete lifecycle of IoT resources including Things, Certificates,
 * Policies, and Rules.
 *
 * @module aws-iot
 */

// Configuration
export * from './config/iotConfig.js';

// Core IoT Service (main orchestration)
export {
  provisionPlantIoT,
  deprovisionPlantIoT,
  createThing,
  deleteThing,
  getThingDetails,
  updateThingAttributes,
  updateThingShadow,
  getThingShadow,
  deleteThingShadow,
} from './services/iotService.js';

// Certificate Management
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
} from './services/certificateManager.js';

// Policy Management
export {
  generatePolicyDocument,
  createPolicy,
  attachPolicyToCertificate,
  detachPolicyFromCertificate,
  getPolicy,
  deletePolicy,
  listAttachedPolicies,
  cleanupPolicy,
} from './services/policyManager.js';

// Rules Management
export {
  createDataIngestionRule,
  getRule,
  updateRule,
  enableRule,
  disableRule,
  deleteRule,
  listRules,
  ruleExists,
} from './services/ruleManager.js';

// Utilities
export {
  encryptData,
  decryptData,
  generateEncryptionKey,
  hashData,
  checkEncryptionConfig,
} from './utils/encryption.js';

/**
 * Usage Example:
 *
 * import { provisionPlantIoT, deprovisionPlantIoT, isAwsIotEnabled } from './modules/aws-iot/index.js';
 *
 * // Provision IoT resources for a new plant
 * if (isAwsIotEnabled()) {
 *   const iotResources = await provisionPlantIoT(plantId, plantName);
 *   // Store iotResources in database
 * }
 *
 * // Deprovision when deleting a plant
 * await deprovisionPlantIoT(plantId, {
 *   iotThingName: plant.iotThingName,
 *   iotCertificateId: plant.iotCertificateId,
 *   iotCertificateArn: plant.iotCertificateArn,
 *   iotPolicyName: plant.iotPolicyName,
 *   iotRuleName: 'solar_plant_rule_' + plantId.replace(/-/g, '_'),
 * });
 */
