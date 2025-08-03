/**
 * Monitoring Routes
 * API endpoints for monitoring, metrics, and health checks
 */

import { Router } from 'express';
import { 
  healthCheck, 
  metricsEndpoint, 
  alertsEndpoint, 
  resolveAlertEndpoint 
} from '../middleware/monitoring.middleware';
import { monitoringService } from '../services/monitoring.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Health check endpoint
 * GET /monitoring/health
 */
router.get('/health', healthCheck);

/**
 * Metrics endpoint
 * GET /monitoring/metrics?type=system|application|performance&limit=100
 */
router.get('/metrics', metricsEndpoint);

/**
 * Alerts endpoint
 * GET /monitoring/alerts?resolved=true|false
 */
router.get('/alerts', alertsEndpoint);

/**
 * Resolve alert endpoint
 * POST /monitoring/alerts/:alertId/resolve
 */
router.post('/alerts/:alertId/resolve', resolveAlertEndpoint);

/**
 * System status endpoint
 * GET /monitoring/status
 */
router.get('/status', (req, res) => {
  try {
    const healthStatus = monitoringService.getHealthStatus();
    const recentMetrics = {
      system: monitoringService.getMetrics('system', 1)[0] || null,
      application: monitoringService.getMetrics('application', 1)[0] || null
    };

    res.json({
      timestamp: new Date().toISOString(),
      status: healthStatus.status,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      metrics: recentMetrics,
      alerts: {
        active: healthStatus.activeAlerts,
        critical: healthStatus.criticalAlerts
      },
      services: {
        monitoring: 'operational',
        logging: 'operational',
        api: healthStatus.status === 'critical' ? 'degraded' : 'operational'
      }
    });
  } catch (error) {
    logger.error('Failed to get system status', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to get system status',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Performance metrics endpoint
 * GET /monitoring/performance/:metricName
 */
router.get('/performance/:metricName', (req, res) => {
  try {
    const { metricName } = req.params;
    const { limit = '100', hours = '24' } = req.query;

    const limitNum = parseInt(limit as string, 10);
    const hoursNum = parseInt(hours as string, 10);
    const cutoff = new Date(Date.now() - hoursNum * 60 * 60 * 1000);

    const allMetrics = monitoringService.getMetrics('performance');
    const filteredMetrics = allMetrics
      .filter((metric: any) => 
        metric.name === metricName && 
        new Date(metric.timestamp) > cutoff
      )
      .slice(0, limitNum);

    // Calculate statistics
    const values = filteredMetrics.map((m: any) => m.value);
    const stats = values.length > 0 ? {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      median: values.sort((a, b) => a - b)[Math.floor(values.length / 2)]
    } : null;

    res.json({
      timestamp: new Date().toISOString(),
      metricName,
      timeRange: `${hoursNum} hours`,
      metrics: filteredMetrics,
      statistics: stats
    });
  } catch (error) {
    logger.error('Failed to get performance metrics', {
      metricName: req.params.metricName,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to get performance metrics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Configuration endpoint
 * GET /monitoring/config
 */
router.get('/config', (req, res) => {
  try {
    // Return safe configuration (without sensitive data)
    const config = {
      enabled: process.env.MONITORING_ENABLED !== 'false',
      metricsInterval: parseInt(process.env.METRICS_INTERVAL || '30000', 10),
      alertsEnabled: process.env.ALERTS_ENABLED !== 'false',
      retentionDays: parseInt(process.env.METRICS_RETENTION_DAYS || '7', 10),
      thresholds: {
        cpu: {
          warning: parseFloat(process.env.CPU_WARNING_THRESHOLD || '70'),
          critical: parseFloat(process.env.CPU_CRITICAL_THRESHOLD || '90')
        },
        memory: {
          warning: parseFloat(process.env.MEMORY_WARNING_THRESHOLD || '80'),
          critical: parseFloat(process.env.MEMORY_CRITICAL_THRESHOLD || '95')
        },
        responseTime: {
          warning: parseFloat(process.env.RESPONSE_TIME_WARNING_THRESHOLD || '1000'),
          critical: parseFloat(process.env.RESPONSE_TIME_CRITICAL_THRESHOLD || '3000')
        },
        errorRate: {
          warning: parseFloat(process.env.ERROR_RATE_WARNING_THRESHOLD || '5'),
          critical: parseFloat(process.env.ERROR_RATE_CRITICAL_THRESHOLD || '10')
        }
      }
    };

    res.json({
      timestamp: new Date().toISOString(),
      config
    });
  } catch (error) {
    logger.error('Failed to get monitoring configuration', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to get monitoring configuration',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Update configuration endpoint
 * PUT /monitoring/config
 */
router.put('/config', (req, res) => {
  try {
    const { config } = req.body;

    if (!config || typeof config !== 'object') {
      res.status(400).json({
        error: 'Invalid configuration data',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Validate configuration
    const validKeys = [
      'enabled', 'metricsInterval', 'alertsEnabled', 'retentionDays', 'thresholds'
    ];

    const invalidKeys = Object.keys(config).filter(key => !validKeys.includes(key));
    if (invalidKeys.length > 0) {
      res.status(400).json({
        error: `Invalid configuration keys: ${invalidKeys.join(', ')}`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Update configuration
    monitoringService.updateConfig(config);

    logger.info('Monitoring configuration updated', {
      updatedBy: req.ip,
      config
    });

    res.json({
      message: 'Configuration updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to update monitoring configuration', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to update monitoring configuration',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Custom metric endpoint
 * POST /monitoring/metrics/custom
 */
router.post('/metrics/custom', (req, res) => {
  try {
    const { name, value, unit, tags, threshold } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({
        error: 'Metric name is required and must be a string',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (typeof value !== 'number') {
      res.status(400).json({
        error: 'Metric value is required and must be a number',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const metric = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      value,
      unit: unit || 'count',
      timestamp: new Date(),
      tags: tags || {},
      threshold: threshold || undefined
    };

    monitoringService.recordMetric(metric);

    logger.info('Custom metric recorded', {
      metric: {
        name: metric.name,
        value: metric.value,
        unit: metric.unit,
        tags: metric.tags
      }
    });

    res.json({
      message: 'Custom metric recorded successfully',
      metricId: metric.id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to record custom metric', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to record custom metric',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Dashboard data endpoint
 * GET /monitoring/dashboard
 */
router.get('/dashboard', (req, res) => {
  try {
    const healthStatus = monitoringService.getHealthStatus();
    const recentSystemMetrics = monitoringService.getMetrics('system', 10);
    const recentAppMetrics = monitoringService.getMetrics('application', 10);
    const activeAlerts = monitoringService.getAlerts(false);
    const recentPerformanceMetrics = monitoringService.getMetrics('performance', 50);

    // Calculate trends
    const systemTrends = recentSystemMetrics.length >= 2 ? {
      cpu: {
        current: recentSystemMetrics[recentSystemMetrics.length - 1]?.cpu?.usage || 0,
        previous: recentSystemMetrics[recentSystemMetrics.length - 2]?.cpu?.usage || 0
      },
      memory: {
        current: recentSystemMetrics[recentSystemMetrics.length - 1]?.memory?.usage || 0,
        previous: recentSystemMetrics[recentSystemMetrics.length - 2]?.memory?.usage || 0
      }
    } : null;

    const appTrends = recentAppMetrics.length >= 2 ? {
      requests: {
        current: recentAppMetrics[recentAppMetrics.length - 1]?.requests?.total || 0,
        previous: recentAppMetrics[recentAppMetrics.length - 2]?.requests?.total || 0
      },
      errors: {
        current: recentAppMetrics[recentAppMetrics.length - 1]?.errors?.total || 0,
        previous: recentAppMetrics[recentAppMetrics.length - 2]?.errors?.total || 0
      }
    } : null;

    res.json({
      timestamp: new Date().toISOString(),
      status: healthStatus.status,
      uptime: process.uptime(),
      metrics: {
        system: recentSystemMetrics,
        application: recentAppMetrics,
        performance: recentPerformanceMetrics
      },
      trends: {
        system: systemTrends,
        application: appTrends
      },
      alerts: {
        active: activeAlerts,
        summary: {
          total: activeAlerts.length,
          critical: activeAlerts.filter((a: any) => a.severity === 'critical' || a.severity === 'emergency').length,
          warning: activeAlerts.filter((a: any) => a.severity === 'warning').length,
          info: activeAlerts.filter((a: any) => a.severity === 'info').length
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get dashboard data', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to get dashboard data',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;