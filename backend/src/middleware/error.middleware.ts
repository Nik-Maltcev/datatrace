/**
 * Error Handling Middleware
 * Centralized error handling for the API with graceful degradation
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  type?: string;
  details?: any;
  isOperational?: boolean;
  botId?: string;
  searchType?: string;
}

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  timestamp?: string;
  searchType?: string;
  botId?: string;
}

/**
 * Sanitize error message to remove PII
 */
const sanitizeErrorMessage = (message: string, context?: ErrorContext): string => {
  // Remove potential PII patterns
  let sanitized = message
    .replace(/\b\d{10,12}\b/g, '[INN_REDACTED]')
    .replace(/\b\d{11}\b/g, '[SNILS_REDACTED]')
    .replace(/\b\d{4}\s?\d{6}\b/g, '[PASSPORT_REDACTED]')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]')
    .replace(/\b\+?[1-9]\d{1,14}\b/g, '[PHONE_REDACTED]');

  return sanitized;
};

/**
 * Determine if error is operational (expected) or programming error
 */
const isOperationalError = (error: ApiError): boolean => {
  if (error.isOperational !== undefined) {
    return error.isOperational;
  }

  // Operational errors (expected errors that should be handled gracefully)
  const operationalErrorTypes = [
    'VALIDATION_ERROR',
    'NOT_FOUND_ERROR',
    'RATE_LIMIT_ERROR',
    'TIMEOUT_ERROR',
    'SERVICE_UNAVAILABLE_ERROR',
    'CIRCUIT_BREAKER_ERROR',
    'API_UNAVAILABLE_ERROR'
  ];

  return operationalErrorTypes.includes(error.type || '');
};

/**
 * Get user-friendly error message
 */
const getUserFriendlyMessage = (error: ApiError, context?: ErrorContext): string => {
  const errorType = error.type || 'UNKNOWN_ERROR';
  
  const friendlyMessages: Record<string, string> = {
    'VALIDATION_ERROR': 'Проверьте правильность введенных данных',
    'FORMAT_VALIDATION_ERROR': 'Неверный формат данных. Проверьте правильность ввода',
    'NOT_FOUND_ERROR': 'Запрашиваемый ресурс не найден',
    'RATE_LIMIT_ERROR': 'Превышен лимит запросов. Попробуйте позже',
    'TIMEOUT_ERROR': 'Превышено время ожидания. Попробуйте еще раз',
    'SERVICE_UNAVAILABLE_ERROR': 'Сервис временно недоступен. Попробуйте позже',
    'CIRCUIT_BREAKER_ERROR': 'Сервис временно недоступен из-за технических проблем',
    'API_UNAVAILABLE_ERROR': 'Внешний сервис недоступен. Попробуйте позже',
    'NETWORK_ERROR': 'Проблемы с сетевым соединением. Проверьте подключение',
    'SEARCH_ERROR': 'Ошибка при выполнении поиска. Попробуйте еще раз',
    'BOT_ERROR': 'Ошибка при обращении к боту. Попробуйте позже'
  };

  return friendlyMessages[errorType] || 'Произошла техническая ошибка. Попробуйте позже';
};

/**
 * Enhanced global error handling middleware with graceful degradation
 */
export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const context: ErrorContext = {
    requestId: req.headers['x-request-id'] as string || generateRequestId(),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    searchType: req.body?.type,
    botId: error.botId || req.params?.botId
  };

  // Sanitize error message for logging
  const sanitizedMessage = sanitizeErrorMessage(error.message, context);
  
  // Determine error classification
  const isOperational = isOperationalError(error);
  
  // Enhanced error logging without PII
  logger.error('API Error', {
    message: sanitizedMessage,
    originalMessage: error.message !== sanitizedMessage ? '[SANITIZED]' : undefined,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    statusCode: error.statusCode,
    code: error.code,
    type: error.type,
    isOperational,
    context: {
      ...context,
      // Don't log sensitive request body data
      hasBody: !!req.body && Object.keys(req.body).length > 0,
      bodyKeys: req.body ? Object.keys(req.body) : undefined
    }
  });

  // Default error response
  let statusCode = error.statusCode || 500;
  let errorType = error.type || 'INTERNAL_SERVER_ERROR';
  let message = error.message || 'Internal server error';

  // Enhanced error type handling
  if (error.name === 'ValidationError' || error.name === 'JoiValidationError') {
    statusCode = 400;
    errorType = 'VALIDATION_ERROR';
    message = 'Validation failed';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    errorType = 'CAST_ERROR';
    message = 'Invalid data format';
  } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    statusCode = 500;
    errorType = 'DATABASE_ERROR';
    message = 'Database operation failed';
  } else if (error.code === 'ECONNREFUSED') {
    statusCode = 503;
    errorType = 'SERVICE_UNAVAILABLE';
    message = 'External service unavailable';
  } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
    statusCode = 408;
    errorType = 'TIMEOUT_ERROR';
    message = 'Request timeout';
  } else if (error.code === 'ENOTFOUND') {
    statusCode = 503;
    errorType = 'DNS_ERROR';
    message = 'Service endpoint not found';
  } else if (error.message?.includes('timeout')) {
    statusCode = 408;
    errorType = 'TIMEOUT_ERROR';
  } else if (error.message?.includes('Circuit breaker')) {
    statusCode = 503;
    errorType = 'CIRCUIT_BREAKER_ERROR';
  } else if (error.message?.includes('Rate limit')) {
    statusCode = 429;
    errorType = 'RATE_LIMIT_ERROR';
  }

  // Get user-friendly message
  const userFriendlyMessage = getUserFriendlyMessage({ ...error, type: errorType }, context);

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500 && !isOperational) {
    message = 'Internal server error';
  }

  // Graceful degradation suggestions
  const degradationSuggestions = getDegradationSuggestions(errorType, context);

  // Send enhanced error response
  res.status(statusCode).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' ? userFriendlyMessage : message,
      userMessage: userFriendlyMessage,
      code: statusCode,
      type: errorType,
      isOperational,
      ...(error.details && { details: error.details }),
      ...(degradationSuggestions.length > 0 && { suggestions: degradationSuggestions })
    },
    meta: {
      timestamp: context.timestamp,
      requestId: context.requestId,
      ...(context.searchType && { searchType: context.searchType }),
      ...(context.botId && { botId: context.botId })
    }
  });

  // Log critical errors for immediate attention
  if (!isOperational && statusCode >= 500) {
    logger.error('CRITICAL ERROR - Requires immediate attention', {
      message: sanitizedMessage,
      type: errorType,
      context,
      stack: error.stack
    });
  }
};

/**
 * Generate unique request ID
 */
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get graceful degradation suggestions based on error type
 */
const getDegradationSuggestions = (errorType: string, context?: ErrorContext): string[] => {
  const suggestions: string[] = [];

  switch (errorType) {
    case 'SERVICE_UNAVAILABLE':
    case 'CIRCUIT_BREAKER_ERROR':
      suggestions.push('Попробуйте выполнить поиск позже');
      if (context?.searchType) {
        suggestions.push('Попробуйте поиск по другому типу данных');
      }
      break;
    
    case 'TIMEOUT_ERROR':
      suggestions.push('Попробуйте еще раз через несколько секунд');
      suggestions.push('Проверьте стабильность интернет-соединения');
      break;
    
    case 'RATE_LIMIT_ERROR':
      suggestions.push('Подождите перед следующим запросом');
      suggestions.push('Рассмотрите возможность обновления тарифного плана');
      break;
    
    case 'VALIDATION_ERROR':
    case 'FORMAT_VALIDATION_ERROR':
      if (context?.searchType === 'phone') {
        suggestions.push('Убедитесь, что номер телефона содержит от 7 до 15 цифр');
      } else if (context?.searchType === 'email') {
        suggestions.push('Проверьте правильность формата email адреса');
      } else if (context?.searchType === 'inn') {
        suggestions.push('ИНН должен содержать 10 или 12 цифр');
      }
      break;
    
    case 'SEARCH_ERROR':
      suggestions.push('Попробуйте изменить поисковый запрос');
      suggestions.push('Проверьте правильность введенных данных');
      break;
  }

  return suggestions;
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 404,
      type: 'NOT_FOUND_ERROR'
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create custom API error
 */
export const createApiError = (
  message: string,
  statusCode: number = 500,
  type: string = 'API_ERROR',
  details?: any
): ApiError => {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.type = type;
  error.details = details;
  return error;
};

/**
 * Validation error creator
 */
export const createValidationError = (message: string, details?: any): ApiError => {
  return createApiError(message, 400, 'VALIDATION_ERROR', details);
};

/**
 * Not found error creator
 */
export const createNotFoundError = (resource: string): ApiError => {
  return createApiError(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
};

/**
 * Service unavailable error creator
 */
export const createServiceUnavailableError = (service: string): ApiError => {
  return createApiError(`${service} is currently unavailable`, 503, 'SERVICE_UNAVAILABLE_ERROR');
};

/**
 * Timeout error creator
 */
export const createTimeoutError = (operation: string): ApiError => {
  return createApiError(`${operation} timed out`, 408, 'TIMEOUT_ERROR');
};