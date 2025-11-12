/**
 * Device Template Service
 * Business logic for device template management
 */

import { prisma } from '../config/database.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors.js';
// AUDIT LOG - COMMENTED OUT (Enable when needed)
// import { logAuditEntry } from './auditService.js';

/**
 * Validate shortform format
 */
const validateShortform = (shortform) => {
  const shortformRegex = /^[A-Z0-9]{2,6}$/;
  if (!shortformRegex.test(shortform)) {
    throw new BadRequestError(
      'Shortform must be 2-6 uppercase alphanumeric characters with no spaces or special characters'
    );
  }
};

/**
 * Get all device templates
 */
const getAllTemplates = async (filters = {}) => {
  const { deviceType, isActive, search, page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

  // Build where clause
  const where = {};

  if (deviceType) {
    where.deviceType = deviceType;
  }

  if (isActive !== undefined) {
    where.isActive = isActive === 'true' || isActive === true;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { shortform: { contains: search, mode: 'insensitive' } },
      { manufacturer: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const take = parseInt(limit);

  // Get total count
  const total = await prisma.deviceTemplate.count({ where });

  // Get templates
  const templates = await prisma.deviceTemplate.findMany({
    where,
    skip,
    take,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      tags: {
        orderBy: {
          displayOrder: 'asc',
        },
      },
      _count: {
        select: {
          devices: true,
          parentRules: true,
          childRules: true,
        },
      },
    },
  });

  return {
    templates,
    pagination: {
      page: parseInt(page),
      limit: take,
      total,
      totalPages: Math.ceil(total / take),
    },
  };
};

/**
 * Get template by ID
 */
const getTemplateById = async (templateId) => {
  const template = await prisma.deviceTemplate.findUnique({
    where: { id: parseInt(templateId) },
    include: {
      tags: {
        orderBy: {
          displayOrder: 'asc',
        },
      },
      parentRules: {
        include: {
          childTemplate: {
            select: {
              id: true,
              name: true,
              shortform: true,
              deviceType: true,
            },
          },
        },
      },
      childRules: {
        include: {
          parentTemplate: {
            select: {
              id: true,
              name: true,
              shortform: true,
              deviceType: true,
            },
          },
        },
      },
      _count: {
        select: {
          devices: true,
        },
      },
    },
  });

  if (!template) {
    throw new NotFoundError('Device template not found');
  }

  return template;
};

/**
 * Get template by shortform
 */
const getTemplateByShortform = async (shortform) => {
  const template = await prisma.deviceTemplate.findUnique({
    where: { shortform: shortform.toUpperCase() },
    include: {
      tags: {
        orderBy: {
          displayOrder: 'asc',
        },
      },
    },
  });

  if (!template) {
    throw new NotFoundError(`Template with shortform "${shortform}" not found`);
  }

  return template;
};

/**
 * Create a new device template
 */
const createTemplate = async (templateData, userId, userRole) => {
  // Only admins can create templates
  if (userRole !== 'ADMIN') {
    throw new ForbiddenError('Only administrators can create device templates');
  }

  const { tags, ...templateFields } = templateData;

  // Validate shortform
  validateShortform(templateFields.shortform);

  // Check if shortform already exists
  const existingTemplate = await prisma.deviceTemplate.findUnique({
    where: { shortform: templateFields.shortform.toUpperCase() },
  });

  if (existingTemplate) {
    throw new BadRequestError(`Template with shortform "${templateFields.shortform}" already exists`);
  }

  // Create template with tags
  const template = await prisma.deviceTemplate.create({
    data: {
      ...templateFields,
      shortform: templateFields.shortform.toUpperCase(),
      createdBy: userId,
      tags: tags
        ? {
            create: tags.map((tag, index) => ({
              ...tag,
              displayOrder: tag.displayOrder !== undefined ? tag.displayOrder : index,
            })),
          }
        : undefined,
    },
    include: {
      tags: {
        orderBy: {
          displayOrder: 'asc',
        },
      },
    },
  });

  // Log audit entry
  await logAuditEntry({
    entityType: 'DeviceTemplate',
    entityId: template.id,
    action: 'CREATE',
    userId,
    changesBefore: null,
    changesAfter: {
      name: template.name,
      shortform: template.shortform,
      deviceType: template.deviceType,
      tagsCount: template.tags.length,
    },
  });

  return template;
};

/**
 * Update device template
 */
const updateTemplate = async (templateId, updateData, userId, userRole) => {
  // Only admins can update templates
  if (userRole !== 'ADMIN') {
    throw new ForbiddenError('Only administrators can update device templates');
  }

  // Get existing template
  const existingTemplate = await getTemplateById(templateId);

  // Prevent updating system templates
  if (existingTemplate.isSystemTemplate) {
    throw new ForbiddenError('System templates cannot be modified');
  }

  const { tags, ...templateFields } = updateData;

  // If shortform is being changed, validate and check uniqueness
  if (templateFields.shortform && templateFields.shortform !== existingTemplate.shortform) {
    validateShortform(templateFields.shortform);

    const conflictingTemplate = await prisma.deviceTemplate.findUnique({
      where: { shortform: templateFields.shortform.toUpperCase() },
    });

    if (conflictingTemplate) {
      throw new BadRequestError(`Template with shortform "${templateFields.shortform}" already exists`);
    }

    // Check if template has devices - warn that device IDs won't change
    if (existingTemplate._count.devices > 0) {
      throw new BadRequestError(
        `Cannot change shortform - template has ${existingTemplate._count.devices} devices. ` +
          `Device IDs will not be updated automatically.`
      );
    }
  }

  // Update template
  const template = await prisma.deviceTemplate.update({
    where: { id: parseInt(templateId) },
    data: {
      ...templateFields,
      shortform: templateFields.shortform ? templateFields.shortform.toUpperCase() : undefined,
    },
    include: {
      tags: {
        orderBy: {
          displayOrder: 'asc',
        },
      },
    },
  });

  // Log audit entry
  await logAuditEntry({
    entityType: 'DeviceTemplate',
    entityId: template.id,
    action: 'UPDATE',
    userId,
    changesBefore: {
      name: existingTemplate.name,
      shortform: existingTemplate.shortform,
      deviceType: existingTemplate.deviceType,
    },
    changesAfter: {
      name: template.name,
      shortform: template.shortform,
      deviceType: template.deviceType,
    },
  });

  return template;
};

/**
 * Delete device template
 */
const deleteTemplate = async (templateId, userId, userRole) => {
  // Only admins can delete templates
  if (userRole !== 'ADMIN') {
    throw new ForbiddenError('Only administrators can delete device templates');
  }

  // Get existing template
  const existingTemplate = await getTemplateById(templateId);

  // Prevent deleting system templates
  if (existingTemplate.isSystemTemplate) {
    throw new ForbiddenError('System templates cannot be deleted');
  }

  // Check if template has devices
  if (existingTemplate._count.devices > 0) {
    throw new BadRequestError(
      `Cannot delete template - it has ${existingTemplate._count.devices} devices using it. ` +
        `Please delete or reassign those devices first.`
    );
  }

  // Delete template (tags will be cascade deleted)
  await prisma.deviceTemplate.delete({
    where: { id: parseInt(templateId) },
  });

  // Log audit entry
  await logAuditEntry({
    entityType: 'DeviceTemplate',
    entityId: templateId,
    action: 'DELETE',
    userId,
    changesBefore: {
      name: existingTemplate.name,
      shortform: existingTemplate.shortform,
      deviceType: existingTemplate.deviceType,
    },
    changesAfter: null,
  });

  return {
    message: 'Device template deleted successfully',
  };
};

/**
 * Add tag to template
 */
const addTagToTemplate = async (templateId, tagData, userId, userRole) => {
  // Only admins can modify templates
  if (userRole !== 'ADMIN') {
    throw new ForbiddenError('Only administrators can modify device templates');
  }

  // Get existing template
  const template = await getTemplateById(templateId);

  // Prevent modifying system templates
  if (template.isSystemTemplate) {
    throw new ForbiddenError('System templates cannot be modified');
  }

  // Check if tag name already exists in this template
  const existingTag = await prisma.deviceTemplateTag.findUnique({
    where: {
      templateId_tagName: {
        templateId,
        tagName: tagData.tagName,
      },
    },
  });

  if (existingTag) {
    throw new BadRequestError(`Tag "${tagData.tagName}" already exists in this template`);
  }

  // Create tag
  const tag = await prisma.deviceTemplateTag.create({
    data: {
      ...tagData,
      templateId,
    },
  });

  return tag;
};

/**
 * Update template tag
 */
const updateTemplateTag = async (tagId, updateData, userId, userRole) => {
  // Only admins can modify templates
  if (userRole !== 'ADMIN') {
    throw new ForbiddenError('Only administrators can modify device templates');
  }

  // Get existing tag with template
  const existingTag = await prisma.deviceTemplateTag.findUnique({
    where: { id: tagId },
    include: {
      template: {
        select: {
          isSystemTemplate: true,
        },
      },
    },
  });

  if (!existingTag) {
    throw new NotFoundError('Template tag not found');
  }

  // Prevent modifying system templates
  if (existingTag.template.isSystemTemplate) {
    throw new ForbiddenError('System template tags cannot be modified');
  }

  // Update tag
  const tag = await prisma.deviceTemplateTag.update({
    where: { id: tagId },
    data: updateData,
  });

  return tag;
};

/**
 * Delete template tag
 */
const deleteTemplateTag = async (tagId, userId, userRole) => {
  // Only admins can modify templates
  if (userRole !== 'ADMIN') {
    throw new ForbiddenError('Only administrators can modify device templates');
  }

  // Get existing tag with template
  const existingTag = await prisma.deviceTemplateTag.findUnique({
    where: { id: tagId },
    include: {
      template: {
        select: {
          isSystemTemplate: true,
        },
      },
    },
  });

  if (!existingTag) {
    throw new NotFoundError('Template tag not found');
  }

  // Prevent modifying system templates
  if (existingTag.template.isSystemTemplate) {
    throw new ForbiddenError('System template tags cannot be modified');
  }

  // Delete tag
  await prisma.deviceTemplateTag.delete({
    where: { id: tagId },
  });

  return {
    message: 'Template tag deleted successfully',
  };
};

/**
 * Get hierarchy rules for template
 */
const getHierarchyRules = async (templateId) => {
  const rules = await prisma.hierarchyRule.findMany({
    where: {
      OR: [{ parentTemplateId: templateId }, { childTemplateId: templateId }],
    },
    include: {
      parentTemplate: {
        select: {
          id: true,
          name: true,
          shortform: true,
          deviceType: true,
        },
      },
      childTemplate: {
        select: {
          id: true,
          name: true,
          shortform: true,
          deviceType: true,
        },
      },
    },
  });

  return rules;
};

/**
 * Create hierarchy rule
 */
const createHierarchyRule = async (ruleData, userId, userRole) => {
  // Only admins can create hierarchy rules
  if (userRole !== 'ADMIN') {
    throw new ForbiddenError('Only administrators can create hierarchy rules');
  }

  const { parentTemplateId, childTemplateId, description } = ruleData;

  // Check if rule already exists
  const existingRule = await prisma.hierarchyRule.findUnique({
    where: {
      parentTemplateId_childTemplateId: {
        parentTemplateId: parentTemplateId || null,
        childTemplateId,
      },
    },
  });

  if (existingRule) {
    throw new BadRequestError('This hierarchy rule already exists');
  }

  // Create rule
  const rule = await prisma.hierarchyRule.create({
    data: {
      parentTemplateId: parentTemplateId || null,
      childTemplateId,
      description,
      isAllowed: true,
    },
    include: {
      parentTemplate: {
        select: {
          id: true,
          name: true,
          shortform: true,
          deviceType: true,
        },
      },
      childTemplate: {
        select: {
          id: true,
          name: true,
          shortform: true,
          deviceType: true,
        },
      },
    },
  });

  return rule;
};

/**
 * Delete hierarchy rule
 */
const deleteHierarchyRule = async (ruleId, userId, userRole) => {
  // Only admins can delete hierarchy rules
  if (userRole !== 'ADMIN') {
    throw new ForbiddenError('Only administrators can delete hierarchy rules');
  }

  const rule = await prisma.hierarchyRule.findUnique({
    where: { id: ruleId },
  });

  if (!rule) {
    throw new NotFoundError('Hierarchy rule not found');
  }

  await prisma.hierarchyRule.delete({
    where: { id: ruleId },
  });

  return {
    message: 'Hierarchy rule deleted successfully',
  };
};

export {
  getAllTemplates,
  getTemplateById,
  getTemplateByShortform,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  addTagToTemplate,
  updateTemplateTag,
  deleteTemplateTag,
  getHierarchyRules,
  createHierarchyRule,
  deleteHierarchyRule,
};
