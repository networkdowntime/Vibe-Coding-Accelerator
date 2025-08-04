import Joi from 'joi';
import { createErrorResponse } from '../utils/helpers.js';
import { AppError } from './errorHandler.js';

/**
 * Validation middleware factory
 * Creates middleware to validate request data using Joi schemas
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const validationData = {
      body: req.body,
      query: req.query,
      params: req.params
    };

    const { error, value } = schema.validate(validationData, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      throw new AppError('Validation failed', 400, details);
    }

    // Replace request data with validated and sanitized data
    req.body = value.body || {};
    req.query = value.query || {};
    req.params = value.params || {};

    next();
  };
};

/**
 * Common validation schemas
 */
export const schemas = {
  // Project validation schemas
  createProject: Joi.object({
    body: Joi.object({
      name: Joi.string()
        .min(3)
        .max(100)
        .pattern(/^[a-zA-Z0-9\s\-_]+$/)
        .required()
        .messages({
          'string.pattern.base': 'Project name can only contain letters, numbers, spaces, hyphens, and underscores'
        }),
      description: Joi.string()
        .max(500)
        .allow('')
        .optional(),
      tags: Joi.array()
        .items(Joi.string().max(50))
        .max(10)
        .optional()
        .default([])
    }).required(),
    query: Joi.object().optional(),
    params: Joi.object().optional()
  }),

  updateProject: Joi.object({
    body: Joi.object({
      name: Joi.string()
        .min(3)
        .max(100)
        .pattern(/^[a-zA-Z0-9\s\-_]+$/)
        .optional()
        .messages({
          'string.pattern.base': 'Project name can only contain letters, numbers, spaces, hyphens, and underscores'
        }),
      description: Joi.string()
        .max(500)
        .allow('')
        .optional(),
      status: Joi.string()
        .valid('active', 'completed', 'draft')
        .optional(),
      tags: Joi.array()
        .items(Joi.string().max(50))
        .max(10)
        .optional()
    }).required(),
    params: Joi.object({
      id: Joi.string()
        .uuid()
        .required()
    }).required(),
    query: Joi.object().optional()
  }),

  getProject: Joi.object({
    params: Joi.object({
      id: Joi.string()
        .uuid()
        .required()
    }).required(),
    body: Joi.object().optional(),
    query: Joi.object().optional()
  }),

  deleteProject: Joi.object({
    params: Joi.object({
      id: Joi.string()
        .uuid()
        .required()
    }).required(),
    body: Joi.object().optional(),
    query: Joi.object().optional()
  }),

  // File validation schemas
  uploadFile: Joi.object({
    body: Joi.object({
      description: Joi.string()
        .max(200)
        .allow('')
        .optional()
    }).optional(),
    params: Joi.object({
      projectId: Joi.string()
        .uuid()
        .required()
    }).required(),
    query: Joi.object().optional()
  }),

  getFile: Joi.object({
    params: Joi.object({
      projectId: Joi.string()
        .uuid()
        .required(),
      fileId: Joi.string()
        .uuid()
        .required()
    }).required(),
    body: Joi.object().optional(),
    query: Joi.object().optional()
  }),

  deleteFile: Joi.object({
    params: Joi.object({
      projectId: Joi.string()
        .uuid()
        .required(),
      fileId: Joi.string()
        .uuid()
        .required()
    }).required(),
    body: Joi.object().optional(),
    query: Joi.object().optional()
  }),

  // Query validation schemas
  listProjects: Joi.object({
    query: Joi.object({
      page: Joi.number()
        .integer()
        .min(1)
        .default(1),
      limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(10),
      status: Joi.string()
        .valid('active', 'completed', 'draft')
        .optional(),
      search: Joi.string()
        .max(100)
        .optional(),
      sortBy: Joi.string()
        .valid('name', 'createdAt', 'updatedAt', 'status')
        .default('updatedAt'),
      sortOrder: Joi.string()
        .valid('asc', 'desc')
        .default('desc')
    }).optional(),
    body: Joi.object().optional(),
    params: Joi.object().optional()
  }),

  listFiles: Joi.object({
    params: Joi.object({
      projectId: Joi.string()
        .uuid()
        .required()
    }).required(),
    query: Joi.object({
      page: Joi.number()
        .integer()
        .min(1)
        .default(1),
      limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20)
    }).optional(),
    body: Joi.object().optional()
  })
};

/**
 * File validation middleware
 */
export const validateFile = (req, res, next) => {
  if (!req.file && !req.files) {
    return res.status(400).json(createErrorResponse('No file uploaded', 400));
  }
  next();
};

// Additional validation middleware for file operations
export const validateProjectId = (req, res, next) => {
  const { projectId } = req.params;
  
  if (!projectId) {
    return res.status(400).json(createErrorResponse('Project ID is required', 400));
  }
  
  // Basic UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(projectId)) {
    return res.status(400).json(createErrorResponse('Invalid project ID format', 400));
  }
  
  next();
};

export const validateFileId = (req, res, next) => {
  const { fileId } = req.params;
  
  if (!fileId) {
    return res.status(400).json(createErrorResponse('File ID is required', 400));
  }
  
  // Basic filename validation (alphanumeric, dots, dashes, underscores)
  const filenameRegex = /^[a-zA-Z0-9._-]+$/;
  if (!filenameRegex.test(fileId)) {
    return res.status(400).json(createErrorResponse('Invalid file ID format', 400));
  }
  
  next();
};

export const validateFileUpload = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json(createErrorResponse('No files uploaded', 400));
  }
  
  // Additional file validation can be added here
  next();
};
