/**
 * Validation Middleware
 * Validates incoming requests using Joi schemas
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';

// Search request validation schema
const searchRequestSchema = Joi.object({
  type: Joi.string()
    .valid('phone', 'email', 'inn', 'snils', 'passport')
    .required()
    .messages({
      'any.required': 'Search type is required',
      'any.only': 'Search type must be one of: phone, email, inn, snils, passport'
    }),
  
  value: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Search value cannot be empty',
      'string.min': 'Search value is too short',
      'string.max': 'Search value is too long',
      'any.required': 'Search value is required'
    }),

  botIds: Joi.array()
    .items(Joi.string().valid('dyxless', 'itp', 'leak_osint', 'userbox', 'vektor'))
    .optional()
    .messages({
      'array.base': 'botIds must be an array',
      'any.only': 'Invalid bot ID provided'
    })
});

// Specific validation functions for different search types
const validatePhone = (value: string): boolean => {
  // Remove common formatting characters
  const cleanValue = value.replace(/[\s\-\(\)\+]/g, '');
  // Check if it's a valid phone number (7-15 digits)
  return /^\d{7,15}$/.test(cleanValue);
};

const validateEmail = (value: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

const validateINN = (value: string): boolean => {
  // INN should be 10 or 12 digits
  return /^\d{10}$/.test(value) || /^\d{12}$/.test(value);
};

const validateSNILS = (value: string): boolean => {
  // SNILS should be 11 digits (with or without formatting)
  const cleanValue = value.replace(/[\s\-]/g, '');
  return /^\d{11}$/.test(cleanValue);
};

const validatePassport = (value: string): boolean => {
  // Russian passport format: 4 digits + space + 6 digits
  return /^\d{4}\s?\d{6}$/.test(value);
};

/**
 * Middleware to validate search requests
 */
export const validateSearchRequest = (req: Request, res: Response, next: NextFunction) => {
  try {
    // First, validate the basic structure
    const { error, value } = searchRequestSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Validation failed', {
        errors: validationErrors,
        requestBody: req.body,
        ip: req.ip
      });

      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 400,
          type: 'VALIDATION_ERROR',
          details: validationErrors
        }
      });
    }

    // Now validate the specific format based on type
    const { type, value: searchValue } = value;
    let isValidFormat = true;
    let formatError = '';

    switch (type) {
      case 'phone':
        isValidFormat = validatePhone(searchValue);
        formatError = 'Invalid phone number format. Expected: 7-15 digits with optional formatting';
        break;
      case 'email':
        isValidFormat = validateEmail(searchValue);
        formatError = 'Invalid email format. Expected: user@domain.com';
        break;
      case 'inn':
        isValidFormat = validateINN(searchValue);
        formatError = 'Invalid INN format. Expected: 10 or 12 digits';
        break;
      case 'snils':
        isValidFormat = validateSNILS(searchValue);
        formatError = 'Invalid SNILS format. Expected: 11 digits with optional formatting';
        break;
      case 'passport':
        isValidFormat = validatePassport(searchValue);
        formatError = 'Invalid passport format. Expected: 4 digits + space + 6 digits (e.g., 1234 567890)';
        break;
    }

    if (!isValidFormat) {
      logger.warn('Format validation failed', {
        type,
        valueLength: searchValue.length,
        formatError,
        ip: req.ip
      });

      return res.status(400).json({
        success: false,
        error: {
          message: formatError,
          code: 400,
          type: 'FORMAT_VALIDATION_ERROR',
          searchType: type
        }
      });
    }

    // If validation passes, attach the validated data to request
    req.body = value;
    next();

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
    
    logger.error('Validation middleware error', {
      error: errorMessage,
      requestBody: req.body,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Internal validation error',
        code: 500,
        type: 'VALIDATION_MIDDLEWARE_ERROR'
      }
    });
  }
};

/**
 * Generic validation middleware factory
 */
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Generic validation failed', {
        errors: validationErrors,
        ip: req.ip
      });

      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 400,
          type: 'VALIDATION_ERROR',
          details: validationErrors
        }
      });
    }

    req.body = value;
    next();
  };
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        error: {
          message: 'Query validation failed',
          code: 400,
          type: 'QUERY_VALIDATION_ERROR',
          details: validationErrors
        }
      });
    }

    req.query = value;
    next();
  };
};

/**
 * Validate URL parameters
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        error: {
          message: 'Parameter validation failed',
          code: 400,
          type: 'PARAMS_VALIDATION_ERROR',
          details: validationErrors
        }
      });
    }

    req.params = value;
    next();
  };
};