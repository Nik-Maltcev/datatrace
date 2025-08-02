/**
 * Logging Service
 * Provides PII-safe logging with structured data and error tracking
 */

import { logger } from '../utils/logger';
import { SearchType } from '../types/search';

export interface LogContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  searchType?: SearchType;
  botId?: string;
  timestamp?: string;
  duration?: number;
}

export interface ErrorLogData {
  message: string;
  stack?: string;
  type?: string;
  code?: string | number;
  isOperational?: boolean;
  context?: LogContext;
  metadata?: Record<string, any>;
}

export interface SearchLogData {
  searchType: SearchType;
  queryLength: number;
  totalBotsSearched?: number;
  totalBotsWithData?: number;
  totalRecords?: number;
  searchDuration?: number;
  isRecovered?: boolean;
  recoveryStrategy?: string;
  context?: LogContext;
}

export class LoggingService {
  private static instance: LoggingService;
  private readonly piiPatterns: RegExp[];

  constructor() {
    // Initialize PII detection patterns
    this.piiPatterns = [
      /\b\d{10,12}\b/g, // INN
      /\b\d{11}\b/g, // SNILS
      /\b\d{4}\s?\d{6}\b/g, // Passport
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
      /\b\+?[1-9]\d{7,14}\b/g, // Phone numbers
      /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, // Credit card numbers
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN format
    ];
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  /**
   * Sanitize text to remove PII
   */
  private sanitizeText(text: string): string {
    let sanitized = text;
    
    // Replace PII patterns with placeholders
    sanitized = sanitized.replace(this.piiPatterns[0], '[INN_REDACTED]');
    sanitized = sanitized.replace(this.piiPatterns[1], '[SNILS_REDACTED]');
    sanitized = sanitized.replace(this.piiPatterns[2], '[PASSPORT_REDACTED]');
    sanitized = sanitized.replace(this.piiPatterns[3], '[EMAIL_REDACTED]');
    sanitized = sanitized.replace(this.piiPatterns[4], '[PHONE_REDACTED]');
    sanitized = sanitized.replace(this.piiPatterns[5], '[CARD_REDACTED]');
    sanitized = sanitized.replace(this.piiPatterns[6], '[SSN_REDACTED]');

    return sanitized;
  }

  /**
   * Sanitize object recursively to remove PII
   */
  private sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeText(obj);
    }
    
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip sensitive fields entirely
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = this.sanitizeObject(value);
      }
    }

    return sanitized;
  }

  /**
   * Check if field name indicates sensitive data
   */
  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'auth',
      'email', 'phone', 'inn', 'snils', 'passport',
      'value', 'query', 'searchValue', 'personalData'
    ];

    return sensitiveFields.some(field => 
      fieldName.toLowerCase().includes(field.toLowerCase())
    );
  }

  /**
   * Log search operations safely
   */
  logSearch(level: 'info' | 'warn' | 'error', message: string, data: SearchLogData): void {
    const sanitizedData = {
      ...data,
      context: data.context ? this.sanitizeObject(data.context) : undefined,
      // Never log actual search values, only metadata
      queryLength: data.queryLength,
      searchType: data.searchType
    };

    logger[level](this.sanitizeText(message), sanitizedData);
  }

  /**
   * Log errors safely without PII
   */
  logError(message: string, errorData: ErrorLogData): void {
    const sanitizedError = {
      message: this.sanitizeText(errorData.message),
      stack: process.env.NODE_ENV === 'development' ? errorData.stack : undefined,
      type: errorData.type,
      code: errorData.code,
      isOperational: errorData.isOperational,
      context: errorData.context ? this.sanitizeObject(errorData.context) : undefined,
      metadata: errorData.metadata ? this.sanitizeObject(errorData.metadata) : undefined
    };

    logger.error(this.sanitizeText(message), sanitizedError);
  }

  /**
   * Log API requests safely
   */
  logApiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const logData = {
      method,
      path,
      statusCode,
      duration,
      context: context ? this.sanitizeObject(context) : undefined
    };

    const level = statusCode >= 400 ? 'warn' : 'info';
    logger[level]('API Request', logData);
  }

  /**
   * Log bot API interactions
   */
  logBotInteraction(
    botId: string,
    action: 'search' | 'health_check' | 'circuit_breaker',
    status: 'success' | 'error' | 'timeout' | 'circuit_open',
    duration?: number,
    errorMessage?: string
  ): void {
    const logData = {
      botId,
      action,
      status,
      duration,
      errorMessage: errorMessage ? this.sanitizeText(errorMessage) : undefined,
      timestamp: new Date().toISOString()
    };

    const level = status === 'error' ? 'error' : status === 'timeout' ? 'warn' : 'info';
    logger[level]('Bot Interaction', logData);
  }

  /**
   * Log system health events
   */
  logHealthEvent(
    component: string,
    status: 'healthy' | 'degraded' | 'unhealthy',
    details?: Record<string, any>
  ): void {
    const logData = {
      component,
      status,
      details: details ? this.sanitizeObject(details) : undefined,
      timestamp: new Date().toISOString()
    };

    const level = status === 'unhealthy' ? 'error' : status === 'degraded' ? 'warn' : 'info';
    logger[level]('Health Check', logData);
  }

  /**
   * Log security events
   */
  logSecurityEvent(
    event: 'rate_limit_exceeded' | 'invalid_request' | 'suspicious_activity',
    severity: 'low' | 'medium' | 'high',
    context?: LogContext,
    details?: Record<string, any>
  ): void {
    const logData = {
      event,
      severity,
      context: context ? this.sanitizeObject(context) : undefined,
      details: details ? this.sanitizeObject(details) : undefined,
      timestamp: new Date().toISOString()
    };

    const level = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';
    logger[level]('Security Event', logData);
  }

  /**
   * Log performance metrics
   */
  logPerformance(
    operation: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    const logData = {
      operation,
      duration,
      metadata: metadata ? this.sanitizeObject(metadata) : undefined,
      timestamp: new Date().toISOString()
    };

    // Log slow operations as warnings
    const level = duration > 5000 ? 'warn' : 'info';
    logger[level]('Performance Metric', logData);
  }

  /**
   * Log recovery attempts
   */
  logRecovery(
    strategy: string,
    success: boolean,
    originalError: string,
    context?: LogContext
  ): void {
    const logData = {
      strategy,
      success,
      originalError: this.sanitizeText(originalError),
      context: context ? this.sanitizeObject(context) : undefined,
      timestamp: new Date().toISOString()
    };

    const level = success ? 'info' : 'warn';
    logger[level]('Error Recovery', logData);
  }

  /**
   * Create structured log context
   */
  createContext(
    requestId?: string,
    ip?: string,
    userAgent?: string,
    additionalContext?: Record<string, any>
  ): LogContext {
    return {
      requestId,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
      ...additionalContext
    };
  }

  /**
   * Log with automatic PII sanitization
   */
  logSafe(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    data?: any
  ): void {
    const sanitizedMessage = this.sanitizeText(message);
    const sanitizedData = data ? this.sanitizeObject(data) : undefined;

    logger[level](sanitizedMessage, sanitizedData);
  }

  /**
   * Get logging statistics
   */
  getLoggingStats(): {
    totalLogs: number;
    errorLogs: number;
    warningLogs: number;
    sanitizedFields: number;
  } {
    // This would require implementing log counting in the actual logger
    // For now, return placeholder data
    return {
      totalLogs: 0,
      errorLogs: 0,
      warningLogs: 0,
      sanitizedFields: 0
    };
  }

  /**
   * Test PII sanitization
   */
  testSanitization(testString: string): {
    original: string;
    sanitized: string;
    piiDetected: boolean;
  } {
    const sanitized = this.sanitizeText(testString);
    const piiDetected = sanitized !== testString;

    return {
      original: '[REDACTED_FOR_SECURITY]', // Never return original in production
      sanitized,
      piiDetected
    };
  }
}