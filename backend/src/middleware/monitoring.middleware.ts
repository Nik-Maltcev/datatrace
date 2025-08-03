/**
 * Monitoring Middleware
 * Express middleware for request monitoring and metrics collection
 */

import { Request, Response, NextFunction } from 'express';
import { monitoringService } from '../services/monitoring.service';
import { logger } from '../utils/logger';

export interface MonitoringRequest extends Request {
  startTime?: number;
  requestId?: string;
}

/**
 * Request monitoring middleware
 */
export const requestMonitoring = (req: MonitoringRequest, res: Response, next: NextFunction): void => {
  // Generate unique request ID
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.startTime = Date.now();

  // Log request start
  logger.info('Request started', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): Response {
    const responseTime = Date.now() - (req.startTime || Date.now());
    const success = res.statusCode < 400;

    // Record request metrics
    monitoringService.recordApiRequest(
      `${req.method} ${req.route?.path || req.url}`,
      responseTime,
      success
    );

    // Log request completion
    logger.info('Request completed', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      success,
      timestamp: new Date().toISOString()
    });

    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Error monitoring middleware
 */
export const errorMonitoring = (error: Error, req: MonitoringRequest, res: Response, next: NextFunction): void => {
  const responseTime = Date.now() - (req.startTime || Date.now());

  // Record error metrics
  monitoringService.recordApiRequest(
    `${req.method} ${req.route?.path || req.url}`,
    responseTime,
    false
  );

  // Record custom error metric
  monitoringService.recordMetric(
    'application_error',
    1,
    'count',
    {
      endpoint: `${req.method} ${req.route?.path || req.url}`,
      errorType: error.constructor.name,
      statusCode: res.statusCode?.toString() || '500',
      requestId: req.requestId || 'unknown'
    }
  );

  // Log error details
  logger.error('Request error', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    error: error.message,
    stack: error.stack,
    responseTime,
    timestamp: new Date().toISOString()
  });

  next(error);
};

/**
 * Health check middleware
 */
export const healthCheck = (req: Request, res: Response): void => {
  const healthStatus = monitoringService.getHealthStatus();
  
  res.status(healthStatus.status === 'unhealthy' ? 503 : 200).json({
    status: healthStatus.status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    metrics: {
      system: healthStatus.metrics,
      alerts: {
        active: 0,
        critical: 0
      }
    },
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
};

/**
 * Metrics endpoint middleware
 */
export const metricsEndpoint = (req: Request, res: Response): void => {
  try {
    const { type = 'all', limit } = req.query;
    const limitNum = limit ? parseInt(limit as string, 10) : undefined;

    let metrics: any = {};

    if (type === 'all' || type === 'system') {
      metrics.system = monitoringService.getMetrics('system', new Date(Date.now() - (limitNum || 3600) * 1000));
    }

    if (type === 'all' || type === 'application') {
      metrics.application = monitoringService.getMetrics('application', new Date(Date.now() - (limitNum || 3600) * 1000));
    }

    if (type === 'all' || type === 'performance') {
      metrics.performance = monitoringService.getMetrics('performance', new Date(Date.now() - (limitNum || 3600) * 1000));
    }

    res.json({
      timestamp: new Date().toISOString(),
      metrics
    });
  } catch (error) {
    logger.error('Failed to retrieve metrics', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to retrieve metrics',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Alerts endpoint middleware
 */
export const alertsEndpoint = (req: Request, res: Response): void => {
  try {
    const { resolved } = req.query;
    const resolvedFilter = resolved === 'true' ? true : resolved === 'false' ? false : undefined;

    const alerts: any[] = []; // Simplified - no alerts system for now

    res.json({
      timestamp: new Date().toISOString(),
      alerts,
      summary: {
        total: alerts.length,
        active: alerts.filter(a => !a.resolved).length,
        resolved: alerts.filter(a => a.resolved).length,
        critical: alerts.filter(a => a.severity === 'critical' || a.severity === 'emergency').length
      }
    });
  } catch (error) {
    logger.error('Failed to retrieve alerts', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to retrieve alerts',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Resolve alert endpoint middleware
 */
export const resolveAlertEndpoint = (req: Request, res: Response): void => {
  try {
    const { alertId } = req.params;

    if (!alertId) {
      res.status(400).json({
        error: 'Alert ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const resolved = false; // Simplified - no alert resolution for now

    if (!resolved) {
      res.status(404).json({
        error: 'Alert not found or already resolved',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      message: 'Alert resolved successfully',
      alertId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to resolve alert', {
      alertId: req.params.alertId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to resolve alert',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Search monitoring middleware
 */
export const searchMonitoring = (req: MonitoringRequest, res: Response, next: NextFunction): void => {
  const originalJson = res.json;
  
  res.json = function(body: any): Response {
    const responseTime = Date.now() - (req.startTime || Date.now());
    const success = res.statusCode < 400;
    
    // Extract search-specific metrics
    let botCount = 0;
    if (body && body.results && Array.isArray(body.results)) {
      botCount = body.results.length;
    }

    // Record search metrics
    monitoringService.recordApiRequest('search', responseTime, success);

    // Record search-specific metric
    monitoringService.recordMetric(
      'search_bot_count',
      botCount,
      'count',
      {
        success: success.toString(),
        requestId: req.requestId || 'unknown',
        searchType: req.body?.searchType || 'unknown'
      }
    );

    return originalJson.call(this, body);
  };

  next();
};

/**
 * Performance monitoring decorator
 */
export const performanceMonitoring = (metricName: string) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      
      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;

        // Record performance metric
        monitoringService.recordMetric(
          metricName,
          duration,
          'ms',
          {
            method: propertyName,
            success: 'true'
          }
        );

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Record performance metric for failed operation
        monitoringService.recordMetric(
          metricName,
          duration,
          'ms',
          {
            method: propertyName,
            success: 'false',
            error: error instanceof Error ? error.constructor.name : 'UnknownError'
          }
        );

        throw error;
      }
    };

    return descriptor;
  };
};

/**
 * Search metrics middleware
 */
export const searchMetricsMiddleware = searchMonitoring;

/**
 * API performance middleware
 */
export const apiPerformanceMiddleware = (metricName: string) => {
  return (req: MonitoringRequest, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    
    const originalJson = res.json;
    res.json = function(body: any): Response {
      const responseTime = Date.now() - startTime;
      const success = res.statusCode < 400;

      // Record API performance metric
      monitoringService.recordMetric(
        `api_${metricName}_performance`,
        responseTime,
        'ms',
        {
          endpoint: `${req.method} ${req.route?.path || req.url}`,
          success: success.toString(),
          statusCode: res.statusCode.toString(),
          requestId: req.requestId || 'unknown'
        }
      );

      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Legacy middleware aliases for backward compatibility
 */
export const requestMetricsMiddleware = requestMonitoring;
export const errorTrackingMiddleware = errorMonitoring;
export const healthCheckMiddleware = healthCheck;
export const rateLimitMetricsMiddleware = requestMonitoring;
export const memoryTrackingMiddleware = requestMonitoring;