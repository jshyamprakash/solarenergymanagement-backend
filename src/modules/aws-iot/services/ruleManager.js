/**
 * AWS IoT Rules Management
 * Handles IoT Rules for routing MQTT messages to SQS queue
 */

import {
  CreateTopicRuleCommand,
  DeleteTopicRuleCommand,
  GetTopicRuleCommand,
  ReplaceTopicRuleCommand,
  ListTopicRulesCommand,
  EnableTopicRuleCommand,
  DisableTopicRuleCommand,
} from '@aws-sdk/client-iot';
import { getAwsClients, isAwsIotEnabled, generateMqttTopic } from '../config/iotConfig.js';
import logger from '../../../config/logger.js';
import crypto from 'crypto';

/**
 * Generate IoT Rule SQL statement for a plant
 * @param {string} plantId - Plant UUID
 * @returns {string} SQL statement
 */
const generateRuleSql = (plantId) => {
  const topic = generateMqttTopic(plantId);
  // SQL statement to select all data from the topic and add metadata
  return `SELECT *, topic() as topic, timestamp() as aws_timestamp FROM '${topic}' WHERE plantId = '${plantId}'`;
};

/**
 * Generate SQS action configuration
 * @param {string} queueUrl - SQS queue URL
 * @param {string} roleArn - IAM role ARN for IoT to access SQS
 * @param {string} plantId - Plant UUID for message deduplication
 * @returns {Object} SQS action configuration
 */
const generateSqsAction = (queueUrl, roleArn, plantId) => {
  return {
    sqs: {
      queueUrl,
      roleArn,
      useBase64: false,
      // Use content-based message deduplication ID (Layer 1)
      // The messageDeduplicationId is generated from the message content hash
      messageDeduplicationId: "${md5(topic())}-${md5(payload.timestamp)}-${md5(payload.deviceId)}",
      // Message group ID to ensure FIFO ordering per plant
      messageGroupId: plantId,
    },
  };
};

/**
 * Create an IoT Rule to route MQTT data to SQS
 * @param {string} plantId - Plant UUID
 * @param {string} ruleName - Rule name
 * @param {string} description - Rule description
 * @returns {Promise<Object>} Rule details
 */
const createDataIngestionRule = async (plantId, ruleName, description = null) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping rule creation');
    return {
      ruleName,
      ruleArn: 'mock-rule-arn',
    };
  }

  try {
    const { iot, config } = getAwsClients();

    if (!config.sqsQueueUrl || !config.iotRoleArn) {
      throw new Error('SQS queue URL and IoT role ARN are required for rule creation');
    }

    const sql = generateRuleSql(plantId);
    const sqsAction = generateSqsAction(config.sqsQueueUrl, config.iotRoleArn, plantId);

    const command = new CreateTopicRuleCommand({
      ruleName,
      topicRulePayload: {
        sql,
        description: description || `Data ingestion rule for solar plant ${plantId}`,
        actions: [sqsAction],
        ruleDisabled: false,
        awsIotSqlVersion: '2016-03-23',
        errorAction: {
          // Send errors to a DLQ or CloudWatch (optional)
          cloudwatchLogs: {
            logGroupName: `/aws/iot/rules/${ruleName}`,
            roleArn: config.iotRoleArn,
          },
        },
      },
    });

    await iot.send(command);

    // Construct rule ARN
    const ruleArn = `arn:aws:iot:${config.region}:${config.accountId}:rule/${ruleName}`;

    logger.info('IoT Rule created successfully', {
      ruleName,
      ruleArn,
      plantId,
      sql,
    });

    return {
      ruleName,
      ruleArn,
      sql,
      queueUrl: config.sqsQueueUrl,
    };
  } catch (error) {
    logger.error('Failed to create IoT Rule', {
      error: error.message,
      ruleName,
      plantId,
    });
    throw new Error(`Rule creation failed: ${error.message}`);
  }
};

/**
 * Get IoT Rule details
 * @param {string} ruleName - Rule name
 * @returns {Promise<Object>} Rule details
 */
const getRule = async (ruleName) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - returning mock rule');
    return {
      ruleName,
      sql: 'SELECT * FROM "mock/topic"',
      ruleDisabled: false,
    };
  }

  try {
    const { iot } = getAwsClients();

    const command = new GetTopicRuleCommand({
      ruleName,
    });

    const response = await iot.send(command);

    return {
      ruleName: response.ruleName,
      ruleArn: response.ruleArn,
      sql: response.rule.sql,
      description: response.rule.description,
      actions: response.rule.actions,
      ruleDisabled: response.rule.ruleDisabled,
      createdAt: response.rule.createdAt,
    };
  } catch (error) {
    logger.error('Failed to get IoT Rule', {
      error: error.message,
      ruleName,
    });
    throw new Error(`Failed to get rule: ${error.message}`);
  }
};

/**
 * Update an existing IoT Rule
 * @param {string} ruleName - Rule name
 * @param {string} plantId - Plant UUID
 * @param {Object} config - Rule configuration
 * @returns {Promise<void>}
 */
const updateRule = async (ruleName, plantId, config = {}) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping rule update');
    return;
  }

  try {
    const { iot, config: awsConfig } = getAwsClients();

    const sql = config.sql || generateRuleSql(plantId);
    const sqsAction = generateSqsAction(awsConfig.sqsQueueUrl, awsConfig.iotRoleArn, plantId);

    const command = new ReplaceTopicRuleCommand({
      ruleName,
      topicRulePayload: {
        sql,
        description: config.description || `Data ingestion rule for solar plant ${plantId}`,
        actions: config.actions || [sqsAction],
        ruleDisabled: config.ruleDisabled || false,
        awsIotSqlVersion: '2016-03-23',
      },
    });

    await iot.send(command);

    logger.info('IoT Rule updated successfully', {
      ruleName,
      plantId,
    });
  } catch (error) {
    logger.error('Failed to update IoT Rule', {
      error: error.message,
      ruleName,
      plantId,
    });
    throw new Error(`Failed to update rule: ${error.message}`);
  }
};

/**
 * Enable an IoT Rule
 * @param {string} ruleName - Rule name
 * @returns {Promise<void>}
 */
const enableRule = async (ruleName) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping rule enable');
    return;
  }

  try {
    const { iot } = getAwsClients();

    const command = new EnableTopicRuleCommand({
      ruleName,
    });

    await iot.send(command);

    logger.info('IoT Rule enabled', { ruleName });
  } catch (error) {
    logger.error('Failed to enable IoT Rule', {
      error: error.message,
      ruleName,
    });
    throw new Error(`Failed to enable rule: ${error.message}`);
  }
};

/**
 * Disable an IoT Rule
 * @param {string} ruleName - Rule name
 * @returns {Promise<void>}
 */
const disableRule = async (ruleName) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping rule disable');
    return;
  }

  try {
    const { iot } = getAwsClients();

    const command = new DisableTopicRuleCommand({
      ruleName,
    });

    await iot.send(command);

    logger.info('IoT Rule disabled', { ruleName });
  } catch (error) {
    logger.error('Failed to disable IoT Rule', {
      error: error.message,
      ruleName,
    });
    throw new Error(`Failed to disable rule: ${error.message}`);
  }
};

/**
 * Delete an IoT Rule
 * @param {string} ruleName - Rule name
 * @returns {Promise<void>}
 */
const deleteRule = async (ruleName) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - skipping rule deletion');
    return;
  }

  try {
    const { iot } = getAwsClients();

    const command = new DeleteTopicRuleCommand({
      ruleName,
    });

    await iot.send(command);

    logger.info('IoT Rule deleted successfully', { ruleName });
  } catch (error) {
    logger.error('Failed to delete IoT Rule', {
      error: error.message,
      ruleName,
    });
    throw new Error(`Failed to delete rule: ${error.message}`);
  }
};

/**
 * List all IoT Rules
 * @param {string} topic - Optional topic filter
 * @returns {Promise<Array>} List of rules
 */
const listRules = async (topic = null) => {
  if (!isAwsIotEnabled()) {
    logger.info('AWS IoT disabled - returning empty rules list');
    return [];
  }

  try {
    const { iot } = getAwsClients();

    const command = new ListTopicRulesCommand({
      topic,
      maxResults: 100,
    });

    const response = await iot.send(command);

    return response.rules || [];
  } catch (error) {
    logger.error('Failed to list IoT Rules', {
      error: error.message,
    });
    throw new Error(`Failed to list rules: ${error.message}`);
  }
};

/**
 * Test if a rule exists
 * @param {string} ruleName - Rule name
 * @returns {Promise<boolean>} True if rule exists
 */
const ruleExists = async (ruleName) => {
  if (!isAwsIotEnabled()) {
    return false;
  }

  try {
    await getRule(ruleName);
    return true;
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('does not exist')) {
      return false;
    }
    throw error;
  }
};

export {
  generateRuleSql,
  generateSqsAction,
  createDataIngestionRule,
  getRule,
  updateRule,
  enableRule,
  disableRule,
  deleteRule,
  listRules,
  ruleExists,
};
