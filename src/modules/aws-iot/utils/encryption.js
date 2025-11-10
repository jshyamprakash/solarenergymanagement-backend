/**
 * Encryption Utilities
 * Handles encryption and decryption of sensitive certificate data
 */

import crypto from 'crypto';
import logger from '../../../config/logger.js';

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;

/**
 * Derive encryption key from password/secret
 * @param {string} secret - Base secret from environment
 * @param {Buffer} salt - Salt for key derivation
 * @returns {Buffer} Derived key
 */
const deriveKey = (secret, salt) => {
  if (!secret) {
    throw new Error('Encryption key not configured - set ENCRYPTION_KEY environment variable');
  }

  // Use PBKDF2 to derive a strong key from the secret
  return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha256');
};

/**
 * Encrypt data using AES-256-GCM
 * @param {string} data - Plain text data to encrypt
 * @returns {Promise<string>} Encrypted data as base64 string
 */
const encryptData = async (data) => {
  try {
    const secret = process.env.ENCRYPTION_KEY;

    if (!secret) {
      logger.warn('ENCRYPTION_KEY not set - storing data in plain text (NOT RECOMMENDED FOR PRODUCTION)');
      // In development/mock mode, return base64 encoded data without encryption
      return Buffer.from(data).toString('base64');
    }

    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive encryption key
    const key = deriveKey(secret, salt);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt data
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine salt, iv, authTag, and encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, 'base64'),
    ]);

    // Return as base64 string
    return combined.toString('base64');
  } catch (error) {
    logger.error('Encryption failed', {
      error: error.message,
      stack: error.stack,
    });
    throw new Error(`Encryption failed: ${error.message}`);
  }
};

/**
 * Decrypt data using AES-256-GCM
 * @param {string} encryptedData - Encrypted data as base64 string
 * @returns {Promise<string>} Decrypted plain text
 */
const decryptData = async (encryptedData) => {
  try {
    const secret = process.env.ENCRYPTION_KEY;

    if (!secret) {
      logger.warn('ENCRYPTION_KEY not set - assuming plain text data');
      // In development/mock mode, decode base64 without decryption
      return Buffer.from(encryptedData, 'base64').toString('utf8');
    }

    // Convert from base64
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    // Derive encryption key
    const key = deriveKey(secret, salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt data
    let decrypted = decipher.update(encrypted, 'binary', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('Decryption failed', {
      error: error.message,
      stack: error.stack,
    });
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

/**
 * Generate a secure random encryption key
 * @param {number} length - Key length in bytes (default: 32 for AES-256)
 * @returns {string} Random key as hex string
 */
const generateEncryptionKey = (length = KEY_LENGTH) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash data using SHA-256
 * @param {string} data - Data to hash
 * @returns {string} Hash as hex string
 */
const hashData = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Validate encryption key format
 * @param {string} key - Encryption key to validate
 * @returns {boolean} True if key is valid
 */
const validateEncryptionKey = (key) => {
  if (!key || typeof key !== 'string') {
    return false;
  }

  // Key should be at least 32 characters for security
  return key.length >= 32;
};

/**
 * Check if encryption is properly configured
 * @returns {Object} Configuration status
 */
const checkEncryptionConfig = () => {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    return {
      configured: false,
      valid: false,
      warning: 'ENCRYPTION_KEY not set - sensitive data will not be encrypted',
    };
  }

  const valid = validateEncryptionKey(key);

  return {
    configured: true,
    valid,
    warning: valid ? null : 'ENCRYPTION_KEY is too short - should be at least 32 characters',
  };
};

// Validate encryption configuration on module load
const encryptionStatus = checkEncryptionConfig();
if (!encryptionStatus.configured || !encryptionStatus.valid) {
  logger.warn('Encryption configuration issue', {
    status: encryptionStatus,
    recommendation: 'Set a strong ENCRYPTION_KEY (32+ characters) in environment variables',
  });
}

export {
  encryptData,
  decryptData,
  generateEncryptionKey,
  hashData,
  validateEncryptionKey,
  checkEncryptionConfig,
};
