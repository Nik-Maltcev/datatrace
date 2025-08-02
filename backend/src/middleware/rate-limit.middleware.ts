/**
 * Rate Limiting Middleware
 * Implements rate limiting to prevent abuse and protect API resources
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

/**
 * Create rate limit error response
 */
const createRateLimitResponse = (req: Request, res: Response) => {
  const resetTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
  
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method
  });

  res.status(429).json({
    success: false,
    error: {
      message: 'Too many requests. Please try again later.',
      code: 429,
      type: 'RATE_LIMIT_ERROR',
      retryAfter: '15 minutes',
      resetTime: resetTime.toISOString()
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * General API rate limiting
 * 100 requests per 15 minutes per IP
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: createRateLimitResponse,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: createRateLimitResponse,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/search/health';
  }
});

/**
 * Search endpoint rate limiting
 * 20 search requests per 15 minutes per IP (more restrictive)
 */
export const searchRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 search requests per windowMs
  message: createRateLimitResponse,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const resetTime = new Date(Date.now() + 15 * 60 * 1000);
    
    logger.warn('Search rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      searchType: req.body?.type
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many search requests. Please try again later.',
        code: 429,
        type: 'SEARCH_RATE_LIMIT_ERROR',
        retryAfter: '15 minutes',
        resetTime: resetTime.toISOString(),
        suggestion: 'Consider upgrading to a paid plan for higher limits'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Strict rate limiting for sensitive operations
 * 5 requests per hour per IP
 */
export const strictRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per hour
  message: createRateLimitResponse,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const resetTime = new Date(Date.now() + 60 * 60 * 1000);
    
    logger.warn('Strict rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Rate limit exceeded for this operation. Please try again later.',
        code: 429,
        type: 'STRICT_RATE_LIMIT_ERROR',
        retryAfter: '1 hour',
        resetTime: resetTime.toISOString()
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Lenient rate limiting for read-only operations
 * 200 requests per 15 minutes per IP
 */
export const lenientRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: createRateLimitResponse,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitResponse
});

/**
 * Default rate limit middleware for search endpoints
 */
export const rateLimitMiddleware = searchRateLimit;

/**
 * Create custom rate limiter with specific configuration
 */
export const createRateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
  skipPaths?: string[];
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const resetTime = new Date(Date.now() + options.windowMs);
      
      logger.warn('Custom rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        windowMs: options.windowMs,
        max: options.max
      });

      res.status(429).json({
        success: false,
        error: {
          message: options.message || 'Rate limit exceeded',
          code: 429,
          type: 'CUSTOM_RATE_LIMIT_ERROR',
          resetTime: resetTime.toISOString()
        }
      });
    },
    skip: (req) => {
      return options.skipPaths?.includes(req.path) || false;
    }
  });
};