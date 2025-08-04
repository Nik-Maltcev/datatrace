/**
 * Comprehensive Security Middleware
 * Combines all security features including PII sanitization, rate limiting,
 * memory cleanup, and threat detection
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { getSecurityService } from '../services/security.service';
import { advancedRateLimitService } from '../services/advanced-rate-limit.service';
import {
  piiSanitizationMiddleware,
  memoryCleanupMiddleware,
  dataEncryptionMiddleware,
  securityHeadersMiddleware
} from './pii-sanitization.middleware';

export interface SecurityConfig {
  enablePIISanitization: boolean;
  enableMemoryCleanup: boolean;
  enableDataEncryption: boolean;
  enableAdvancedRateLimit: boolean;
  enableThreatDetection: boolean;
  enableSecurityHeaders: boolean;
}

const defaultSecurityConfig: SecurityConfig = {
  enablePIISanitization: true,
  enableMemoryCleanup: true,
  enableDataEncryption: true,
  enableAdvancedRateLimit: true,
  enableThreatDetection: true,
  enableSecurityHeaders: true
};

/**
 * Main security middleware that orchestrates all security features
 */
export const securityMiddleware = (config: Partial<SecurityConfig> = {}) => {
  const finalConfig = { ...defaultSecurityConfig, ...config };
  
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Apply security headers first
      if (finalConfig.enableSecurityHeaders) {
        securityHeadersMiddleware(req, res, () => {});
      }

      // Check for threats and suspicious activity
      if (finalConfig.enableThreatDetection) {
        const threatDetected = detectThreats(req);
        if (threatDetected.isBlocked) {
          logger.warn('Request blocked due to threat detection', {
            ip: req.ip,
            path: req.path,
            threat: threatDetected.reason,
            userAgent: req.get('User-Agent')
          });
          
          res.status(403).json({
            success: false,
            error: {
              message: 'Request blocked for security reasons',
              code: 403,
              type: 'SECURITY_THREAT_DETECTED'
            }
          });
        }
      }

      // Apply advanced rate limiting
      if (finalConfig.enableAdvancedRateLimit) {
        const rateLimitResult = advancedRateLimitService.checkRateLimit(req, {
          windowMs: 15 * 60 * 1000, // 15 minutes
          maxRequests: getMaxRequestsForEndpoint(req.path),
          suspiciousThreshold: 0.7,
          blockDuration: 60 * 60 * 1000, // 1 hour
          enableSuspiciousDetection: true
        });

        if (!rateLimitResult.allowed) {
          logger.warn('Request blocked by advanced rate limiting', {
            ip: req.ip,
            path: req.path,
            reason: rateLimitResult.reason,
            resetTime: new Date(rateLimitResult.resetTime).toISOString()
          });

          res.status(429).json({
            success: false,
            error: {
              message: 'Rate limit exceeded',
              code: 429,
              type: 'ADVANCED_RATE_LIMIT_ERROR',
              reason: rateLimitResult.reason,
              resetTime: new Date(rateLimitResult.resetTime).toISOString()
            }
          });
        }

        // Add rate limit headers
        res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
        res.setHeader('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());
      }

      // Apply data encryption
      if (finalConfig.enableDataEncryption) {
        dataEncryptionMiddleware(req, res, () => {});
      }

      // Apply PII sanitization
      if (finalConfig.enablePIISanitization) {
        piiSanitizationMiddleware(req, res, () => {});
      }

      // Apply memory cleanup
      if (finalConfig.enableMemoryCleanup) {
        memoryCleanupMiddleware(req, res, () => {});
      }

      // Log security event
      logger.debug('Security middleware applied', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        config: finalConfig,
        requestId: req.headers['x-request-id']
      });

      next();
    } catch (error) {
      logger.error('Security middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      // Continue processing even if security middleware fails
      next();
    }
  };
};

/**
 * Detect various types of threats in the request
 */
function detectThreats(req: Request): { isBlocked: boolean; reason?: string } {
  const userAgent = req.get('User-Agent') || '';
  const path = req.path;
  const body = req.body;
  const query = req.query;

  // Check for SQL injection attempts
  if (detectSQLInjection(body) || detectSQLInjection(query)) {
    return { isBlocked: true, reason: 'SQL_INJECTION_ATTEMPT' };
  }

  // Check for XSS attempts
  if (detectXSS(body) || detectXSS(query)) {
    return { isBlocked: true, reason: 'XSS_ATTEMPT' };
  }

  // Check for path traversal attempts
  if (detectPathTraversal(path)) {
    return { isBlocked: true, reason: 'PATH_TRAVERSAL_ATTEMPT' };
  }

  // Check for malicious user agents
  if (detectMaliciousUserAgent(userAgent)) {
    return { isBlocked: true, reason: 'MALICIOUS_USER_AGENT' };
  }

  // Check for suspicious request patterns
  if (detectSuspiciousPatterns(req)) {
    return { isBlocked: true, reason: 'SUSPICIOUS_REQUEST_PATTERN' };
  }

  return { isBlocked: false };
}

/**
 * Detect SQL injection attempts
 */
function detectSQLInjection(data: any): boolean {
  if (!data) return false;
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(\'|\"|;|--|\*|\|)/,
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bOR\b.*\b1\s*=\s*1\b)/i
  ];

  const dataString = JSON.stringify(data).toLowerCase();
  return sqlPatterns.some(pattern => pattern.test(dataString));
}

/**
 * Detect XSS attempts
 */
function detectXSS(data: any): boolean {
  if (!data) return false;
  
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /eval\s*\(/i,
    /expression\s*\(/i
  ];

  const dataString = JSON.stringify(data);
  return xssPatterns.some(pattern => pattern.test(dataString));
}

/**
 * Detect path traversal attempts
 */
function detectPathTraversal(path: string): boolean {
  const traversalPatterns = [
    /\.\.\//,
    /\.\.\\/, 
    /%2e%2e%2f/i,
    /%2e%2e%5c/i,
    /\.\.%2f/i,
    /\.\.%5c/i
  ];

  return traversalPatterns.some(pattern => pattern.test(path));
}

/**
 * Detect malicious user agents
 */
function detectMaliciousUserAgent(userAgent: string): boolean {
  const maliciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /openvas/i,
    /nmap/i,
    /masscan/i,
    /zap/i,
    /burp/i,
    /havij/i,
    /pangolin/i
  ];

  return maliciousPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Detect suspicious request patterns
 */
function detectSuspiciousPatterns(req: Request): boolean {
  // Check for unusually long URLs
  if (req.url.length > 2000) {
    return true;
  }

  // Check for too many parameters
  if (Object.keys(req.query).length > 50) {
    return true;
  }

  // Check for unusually large request body
  if (req.body && JSON.stringify(req.body).length > 100000) {
    return true;
  }

  // Check for suspicious headers
  const suspiciousHeaders = ['x-forwarded-host', 'x-original-url', 'x-rewrite-url'];
  for (const header of suspiciousHeaders) {
    if (req.headers[header]) {
      return true;
    }
  }

  return false;
}

/**
 * Get maximum requests allowed for specific endpoint
 */
function getMaxRequestsForEndpoint(path: string): number {
  if (path.includes('/api/search')) {
    return 20; // More restrictive for search endpoints
  } else if (path.includes('/api/instructions')) {
    return 50; // Moderate for instructions
  } else if (path.includes('/api/tariffs')) {
    return 100; // Lenient for tariffs
  } else if (path === '/health') {
    return 1000; // Very lenient for health checks
  }
  
  return 100; // Default
}

/**
 * Security monitoring middleware
 */
export const securityMonitoringMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  
  // Override res.end to capture response time and status
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const responseTime = Date.now() - startTime;
    
    // Log security metrics
    logger.info('Security monitoring', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: res.get('Content-Length'),
      requestId: req.headers['x-request-id']
    });

    // Check for potential data leaks in response
    if (chunk && typeof chunk === 'string') {
      const sanitizedChunk = getSecurityService().sanitizeForLogging(chunk);
      if (sanitizedChunk !== chunk) {
        logger.warn('Potential PII in response detected and sanitized', {
          path: req.path,
          method: req.method,
          ip: req.ip
        });
      }
    }

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Emergency security lockdown middleware
 */
export const emergencyLockdownMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const lockdownEnabled = process.env.EMERGENCY_LOCKDOWN === 'true';
  
  if (lockdownEnabled) {
    logger.warn('Emergency lockdown active - request blocked', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    
    res.status(503).json({
      success: false,
      error: {
        message: 'Service temporarily unavailable due to security maintenance',
        code: 503,
        type: 'EMERGENCY_LOCKDOWN'
      }
    });
  }
  
  next();
};