/**
 * Logging Configuration
 * Winston configuration for structured logging
 */

import winston from 'winston';
import path from 'path';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(logColors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Define transports
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'info',
    format: consoleFormat
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: path.join(logsDir, 'app.log'),
    level: 'info',
    format: fileFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5
  }),

  // File transport for error logs
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5
  }),

  // File transport for HTTP logs
  new winston.transports.File({
    filename: path.join(logsDir, 'http.log'),
    level: 'http',
    format: fileFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 3
  })
];

// Add daily rotate file transport for production
if (process.env.NODE_ENV === 'production') {
  const DailyRotateFile = require('winston-daily-rotate-file');
  
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: fileFormat,
      level: 'info'
    }),
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: fileFormat,
      level: 'error'
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'privacy-data-removal',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports,
  exitOnError: false
});

// Create stream for Morgan HTTP logging
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  }
};

// Export logging utilities
export const loggerUtils = {
  /**
   * Log request with sanitized data
   */
  logRequest: (req: any, additionalData?: any) => {
    logger.http('HTTP Request', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString(),
      ...additionalData
    });
  },

  /**
   * Log response with metrics
   */
  logResponse: (req: any, res: any, responseTime: number, additionalData?: any) => {
    logger.http('HTTP Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      timestamp: new Date().toISOString(),
      ...additionalData
    });
  },

  /**
   * Log search operation (without PII)
   */
  logSearch: (searchType: string, duration: number, success: boolean, additionalData?: any) => {
    logger.info('Search Operation', {
      searchType,
      duration,
      success,
      timestamp: new Date().toISOString(),
      ...additionalData
    });
  },

  /**
   * Log API call to external service
   */
  logApiCall: (service: string, endpoint: string, duration: number, success: boolean, additionalData?: any) => {
    logger.info('External API Call', {
      service,
      endpoint,
      duration,
      success,
      timestamp: new Date().toISOString(),
      ...additionalData
    });
  },

  /**
   * Log security event
   */
  logSecurityEvent: (eventType: string, severity: 'low' | 'medium' | 'high' | 'critical', details: any) => {
    logger.warn('Security Event', {
      eventType,
      severity,
      details,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log performance metric
   */
  logPerformanceMetric: (metricName: string, value: number, unit: string, tags?: any) => {
    logger.info('Performance Metric', {
      metricName,
      value,
      unit,
      tags,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log error with context
   */
  logError: (error: Error, context?: any) => {
    logger.error('Application Error', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Sanitize sensitive data from logs
   */
  sanitizeForLogging: (data: any): any => {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data };
    const sensitiveFields = [
      'password', 'token', 'apiKey', 'secret', 'phone', 'email', 
      'inn', 'snils', 'passport', 'value', 'query'
    ];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        if (typeof sanitized[field] === 'string') {
          sanitized[field] = `[${sanitized[field].length} characters]`;
        } else {
          sanitized[field] = '[REDACTED]';
        }
      }
    }

    return sanitized;
  }
};

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(logsDir, 'exceptions.log'),
    format: fileFormat
  })
);

logger.rejections.handle(
  new winston.transports.File({
    filename: path.join(logsDir, 'rejections.log'),
    format: fileFormat
  })
);

export default logger;