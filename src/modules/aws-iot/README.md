# AWS IoT Core Integration Module

Complete AWS IoT Core integration for automatic solar plant provisioning and MQTT data ingestion.

## Overview

This module provides a production-ready, isolated AWS IoT Core integration that automatically provisions and manages IoT resources for solar plants. It handles the complete lifecycle of:

- **IoT Things** - Digital twins representing solar plants
- **X.509 Certificates** - Device authentication credentials
- **IoT Policies** - MQTT publish/subscribe permissions
- **IoT Rules** - Message routing to SQS FIFO queue

## Features

- Automatic IoT provisioning when plants are created
- Automatic cleanup when plants are deleted
- Certificate encryption for secure storage
- Graceful degradation when AWS is not configured
- Comprehensive error handling with rollback
- Three-layer deduplication strategy (SQS FIFO + DB constraints + Lambda UPSERT)
- Support for Thing Shadows (device state)
- Mock mode for local development

## Module Structure

```
aws-iot/
├── config/
│   └── iotConfig.js           # AWS SDK clients, configuration, validation
├── services/
│   ├── iotService.js          # Main orchestration (provision/deprovision)
│   ├── certificateManager.js  # X.509 certificate lifecycle
│   ├── policyManager.js       # IoT policy management
│   └── ruleManager.js         # IoT Rules for data ingestion
├── utils/
│   └── encryption.js          # Certificate encryption/decryption
├── index.js                   # Main module exports
└── README.md                  # This file
```

## Environment Configuration

### Required Variables

```bash
# AWS Credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

### Optional Variables (needed for full functionality)

```bash
# AWS IoT Core
AWS_IOT_ENDPOINT=xxx-ats.iot.us-east-1.amazonaws.com  # From IoT Core console
AWS_IOT_ROLE_ARN=arn:aws:iam::123456789012:role/IoTToSQSRole

# AWS SQS (FIFO Queue for data ingestion)
AWS_SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/solar-plant-data-queue.fifo

# Encryption (for certificate storage)
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Feature Flags
USE_AWS_IOT=true              # Set to false to disable AWS IoT integration
USE_MOCK_DATA=false           # Set to true for development without AWS
```

### Getting AWS_IOT_ENDPOINT

1. Go to AWS IoT Core console
2. Navigate to **Settings**
3. Copy the **Endpoint** value (looks like: `xxx-ats.iot.us-east-1.amazonaws.com`)

## Usage

### Basic Integration (Already Implemented)

The module is automatically integrated with `plantService.js`:

```javascript
import { provisionPlantIoT, deprovisionPlantIoT, isAwsIotEnabled } from './modules/aws-iot/index.js';

// When creating a plant
if (isAwsIotEnabled()) {
  const iotResources = await provisionPlantIoT(plantId, plantName);
  // Store iotResources in database
}

// When deleting a plant
await deprovisionPlantIoT(plantId, {
  iotThingName: plant.iotThingName,
  iotCertificateId: plant.iotCertificateId,
  iotCertificateArn: plant.iotCertificateArn,
  iotPolicyName: plant.iotPolicyName,
  iotRuleName: 'solar_plant_rule_...',
});
```

### Advanced Usage

#### Working with Thing Shadows

```javascript
import { updateThingShadow, getThingShadow } from './modules/aws-iot/index.js';

// Update desired device state
await updateThingShadow('solar-plant-123', {
  powerLimit: 1000,
  mode: 'auto',
});

// Get current device state
const shadow = await getThingShadow('solar-plant-123');
console.log(shadow.state.reported);
```

#### Manual Certificate Management

```javascript
import {
  createCertificate,
  attachCertificateToThing,
  storeCertificateSecurely,
} from './modules/aws-iot/index.js';

const cert = await createCertificate(true);
await attachCertificateToThing(cert.certificateArn, thingName);

// Store securely
const encrypted = await storeCertificateSecurely(
  plantId,
  cert.certificatePem,
  cert.privateKey
);
```

#### Custom IoT Rules

```javascript
import { createDataIngestionRule, updateRule } from './modules/aws-iot/index.js';

// Create custom rule
await createDataIngestionRule(plantId, ruleName, 'Custom rule description');

// Update existing rule
await updateRule(ruleName, plantId, {
  sql: "SELECT * FROM 'solar/+/data' WHERE temperature > 50",
});
```

## Provisioning Flow

When a plant is created, the module automatically:

1. **Creates IoT Thing** - Digital representation of the plant
2. **Generates Certificate** - X.509 certificate and private key
3. **Creates Policy** - MQTT permissions (publish to `solar/{plantId}/#`, subscribe to commands)
4. **Attaches Policy to Certificate** - Links permissions to credentials
5. **Attaches Certificate to Thing** - Links credentials to Thing
6. **Creates IoT Rule** - Routes MQTT messages to SQS FIFO queue
7. **Encrypts & Stores Certificate** - Securely saves credentials in database

If any step fails, the module automatically rolls back all created resources.

## Deprovisioning Flow

When a plant is deleted, the module:

1. **Deletes IoT Rule** - Stops message routing
2. **Detaches Certificate from Thing** - Unlinks credentials
3. **Deactivates Certificate** - Prevents further use
4. **Deletes Certificate** - Removes from AWS
5. **Detaches Policy from Certificate** - Unlinks permissions
6. **Deletes Policy** - Removes policy document
7. **Deletes Thing** - Removes digital twin

## MQTT Topics

### Data Publishing (Device → Cloud)

Devices publish data to:
```
solar/{plantId}/data
```

Example message:
```json
{
  "plantId": "uuid-here",
  "deviceId": "inverter-01",
  "timestamp": "2024-01-01T12:00:00Z",
  "metrics": {
    "voltage_dc": 350.5,
    "current_dc": 12.3,
    "power_ac": 4200
  }
}
```

### Commands (Cloud → Device)

Cloud sends commands to:
```
solar/{plantId}/commands
```

## IoT Policy Template

The module creates policies with these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["iot:Connect"],
      "Resource": ["arn:aws:iot:*:*:client/${thingName}"]
    },
    {
      "Effect": "Allow",
      "Action": ["iot:Publish"],
      "Resource": ["arn:aws:iot:*:*:topic/solar/${plantId}/*"]
    },
    {
      "Effect": "Allow",
      "Action": ["iot:Subscribe"],
      "Resource": ["arn:aws:iot:*:*:topicfilter/solar/${plantId}/commands/*"]
    },
    {
      "Effect": "Allow",
      "Action": ["iot:Receive"],
      "Resource": ["arn:aws:iot:*:*:topic/solar/${plantId}/commands/*"]
    },
    {
      "Effect": "Allow",
      "Action": ["iot:UpdateThingShadow", "iot:GetThingShadow", "iot:DeleteThingShadow"],
      "Resource": ["arn:aws:iot:*:*:thing/${thingName}"]
    }
  ]
}
```

## Error Handling

The module implements comprehensive error handling:

### Graceful Degradation

- If AWS IoT is not configured, the module logs warnings and continues
- Plants can be created without IoT resources
- Set `USE_AWS_IOT=false` to explicitly disable

### Rollback on Failure

If provisioning fails midway:
```
1. Thing created ✓
2. Certificate created ✓
3. Policy creation FAILED ✗
   → Rollback: Delete certificate, delete Thing
```

### Error Scenarios Handled

- Missing AWS credentials
- Invalid IoT endpoint
- Certificate attachment failures
- Policy creation conflicts
- Rule creation failures
- Network timeouts

## Security Best Practices

### Certificate Encryption

Certificates are encrypted using AES-256-GCM before database storage:

```javascript
// Encryption uses PBKDF2 key derivation
const key = pbkdf2(ENCRYPTION_KEY, salt, 100000, 32, 'sha256');
const encrypted = aes256gcm.encrypt(certificate, key, iv);
```

### Never Log Sensitive Data

The module never logs:
- Private keys
- Certificate PEM data
- Decrypted credentials

### Least Privilege IAM

The IoT Role ARN should have minimal permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["sqs:SendMessage"],
      "Resource": "arn:aws:sqs:*:*:solar-plant-data-queue.fifo"
    }
  ]
}
```

## Three-Layer Deduplication

The module implements deduplication at three levels:

### Layer 1: SQS FIFO (5-minute window)
```javascript
messageDeduplicationId: "${md5(topic())}-${md5(payload.timestamp)}-${md5(payload.deviceId)}"
```

### Layer 2: Database Constraints
```sql
UNIQUE INDEX idx_message_id ON raw_mqtt_data(messageId)
UNIQUE INDEX idx_message_hash ON raw_mqtt_data(messageHash)
```

### Layer 3: Lambda UPSERT
```sql
INSERT INTO processed_data (device_id, tag_id, timestamp, value)
ON CONFLICT (device_id, tag_id, timestamp) DO NOTHING
```

## Testing

### Mock Mode (Development)

Set environment variables:
```bash
USE_MOCK_DATA=true
USE_AWS_IOT=false
```

The module returns mock data without AWS calls:
```javascript
{
  thingName: 'solar-plant-mock-123',
  certificateId: 'mock-certificate-id',
  certificatePem: 'mock-certificate-pem',
  // ...
}
```

### Testing with Real AWS

Ensure you have:
1. Valid AWS credentials
2. IoT endpoint configured
3. SQS FIFO queue created
4. IAM role with SQS write permissions

### Testing Certificate Encryption

```javascript
import { encryptData, decryptData, generateEncryptionKey } from './modules/aws-iot/index.js';

// Generate a secure key
const key = generateEncryptionKey();
console.log('Use this in .env:', key);

// Test encryption
const encrypted = await encryptData('sensitive-data');
const decrypted = await decryptData(encrypted);
assert(decrypted === 'sensitive-data');
```

## Troubleshooting

### Issue: "AWS IoT configuration validation failed"

**Solution:** Check that these environment variables are set:
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### Issue: "Failed to create certificate"

**Possible causes:**
- Invalid AWS credentials
- Insufficient IAM permissions
- AWS service outage

**Solution:** Verify IAM user has `AWSIoTFullAccess` policy

### Issue: "Failed to create IoT Rule"

**Possible causes:**
- Missing `AWS_SQS_QUEUE_URL`
- Missing `AWS_IOT_ROLE_ARN`
- Role doesn't have SQS write permissions

**Solution:**
1. Create FIFO queue in SQS
2. Create IAM role with SQS write policy
3. Add trust policy for `iot.amazonaws.com`

### Issue: "Encryption failed"

**Possible causes:**
- `ENCRYPTION_KEY` not set
- Key too short (< 32 characters)

**Solution:**
```bash
# Generate a secure 64-character key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## API Reference

See inline JSDoc comments in source files for detailed API documentation:

- `iotService.js` - Main provisioning/deprovisioning
- `certificateManager.js` - Certificate operations
- `policyManager.js` - Policy operations
- `ruleManager.js` - Rules operations
- `encryption.js` - Encryption utilities

## Migration Guide

### Existing Plants Without IoT

To provision IoT resources for existing plants:

```javascript
import { provisionPlantIoT } from './modules/aws-iot/index.js';
import { prisma } from './config/database.js';

async function migrateExistingPlants() {
  const plants = await prisma.plant.findMany({
    where: { iotThingName: null }
  });

  for (const plant of plants) {
    try {
      const iotResources = await provisionPlantIoT(plant.id, plant.name);
      await prisma.plant.update({
        where: { id: plant.id },
        data: {
          iotThingName: iotResources.thingName,
          iotCertificateId: iotResources.certificateId,
          // ... other fields
        }
      });
      console.log(`Provisioned IoT for plant: ${plant.name}`);
    } catch (error) {
      console.error(`Failed for plant ${plant.id}:`, error.message);
    }
  }
}
```

## Support

For issues related to this module:
1. Check CloudWatch Logs for AWS IoT errors
2. Enable debug logging: `LOG_LEVEL=debug`
3. Verify AWS console shows created resources
4. Check database for stored IoT metadata

## License

This module is part of the Solar Energy Monitoring System.
