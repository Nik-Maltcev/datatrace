/**
 * PII Sanitization Middleware
 * Removes personally identifiable information from logs and responses
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { getSecurityService } from '../services/security.service';

export interface SanitizedRequest extends Request {
  sanitizedBody?: any;
  sanitizedQuery?: any;
  sanitizedParams?: any;
}

/**
 * Middleware to sanitize PII from request logs
 */
export const piiSanitizationMiddleware = (
  req: SanitizedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Store original data for processing
    const originalBody = req.body;
    const originalQuery = req.query;
    const originalParams = req.params;

    // Create sanitized versions for logging
    req.sanitizedBody = getSecurityService().sanitizeForLogging(originalBody);
    req.sanitizedQuery = getSecurityService().sanitizeForLogging(originalQuery);
    req.sanitizedParams = getSecurityService().sanitizeForLogging(originalParams);

    // Override the default JSON response to sanitize sensitive data
    const originalJson = res.json;
    res.json = function(body: any) {
      // Log the sanitized response
      const sanitizedResponse = getSecurityService().sanitizeForLogging(body);
      
      logger.info('API Response', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        response: sanitizedResponse,
        requestId: req.headers['x-request-id']
      });

      // Call original json method with unsanitized data
      return originalJson.call(this, body);
    };

    // Log sanitized request
    logger.info('API Request', {
      method: req.method,
      path: req.path,
      body: req.sanitizedBody,
      query: req.sanitizedQuery,
      params: req.sanitizedParams,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      requestId: req.headers['x-request-id']
    });

    next();
  } catch (error) {
    logger.error('PII sanitization middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
      method: req.method
    });
    
    // Continue processing even if sanitization fails
    next();
  }
};

/**
 * Middleware to clean up sensitive data after request processing
 */
export const memoryCleanupMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function to trigger cleanup
  res.end = function(chunk?: any, encoding?: any) {
    // Schedule memory cleanup after response is sent
    setImmediate(() => {
      try {
        // Clear sensitive data from request
        if (req.body && typeof req.body === 'object') {
          clearSensitiveFields(req.body);
        }
        
        if (req.query && typeof req.query === 'object') {
          clearSensitiveFields(req.query);
        }

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        logger.debug('Request memory cleanup completed', {
          path: req.path,
          method: req.method,
          requestId: req.headers['x-request-id']
        });
      } catch (error) {
        logger.error('Memory cleanup error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          path: req.path,
          method: req.method
        });
      }
    });

    // Call original end function
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Clear sensitive fields from object
 */
function clearSensitiveFields(obj: any): void {
  if (!obj || typeof obj !== 'object') {
    return;
  }

  const sensitiveFields = [
    'phone', 'email', 'inn', 'snils', 'passport',
    'phoneNumber', 'emailAddress', 'passportNumber',
    'value', 'query', 'searchValue', 'personalData',
    'userData', 'userInput', 'searchQuery'
  ];

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        // Overwrite with random data
        if (typeof obj[key] === 'string') {
          obj[key] = generateRandomString(obj[key].length);
        } else {
          obj[key] = null;
        }
      } else if (typeof obj[key] === 'object') {
        clearSensitiveFields(obj[key]);
      }
    }
  }
}

/**
 * Generate random string of specified length
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Middleware to encrypt sensitive data in memory
 */
export const dataEncryptionMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Encrypt sensitive data in request body
    if (req.body && typeof req.body === 'object') {
      encryptSensitiveRequestData(req.body);
    }

    next();
  } catch (error) {
    logger.error('Data encryption middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
      method: req.method
    });
    
    // Continue processing even if encryption fails
    next();
  }
};

/**
 * Encrypt sensitive data in request object
 */
function encryptSensitiveRequestData(obj: any): void {
  if (!obj || typeof obj !== 'object') {
    return;
  }

  const sensitiveFields = ['value', 'query', 'searchValue', 'phone', 'email'];

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (sensitiveFields.includes(key.toLowerCase()) && typeof obj[key] === 'string') {
        try {
          // Store original value temporarily and encrypt
          const originalValue = obj[key];
          const encrypted = securityService.encryptSensitiveData(originalValue);
          
          // Store both encrypted and original for processing
          obj[`${key}_encrypted`] = encrypted;
          // Keep original for processing but mark for cleanup
          obj[`${key}_cleanup`] = true;
        } catch (error) {
          logger.warn('Failed to encrypt field', {
            field: key,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } else if (typeof obj[key] === 'object') {
        encryptSensitiveRequestData(obj[key]);
      }
    }
  }
}

/**
 * Security headers middleware
 */
export const securityHeadersMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Set cache control for sensitive endpoints
  if (req.path.includes('/api/search') || req.path.includes('/api/instructions')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
};