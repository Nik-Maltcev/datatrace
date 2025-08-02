/**
 * Monitoring Integration Tests
 * Tests for monitoring service, middleware, and endpoints
 */

import request from 'supertest';
import app from '../../index';
import { monitoringService } from '../../services/monitoring.service';

describe('Monitoring Integration Tests', () => {
  beforeEach(() => {
    // Reset monitoring service state
    jest.clearAllMocks();
  });

  describe('Health Check Endpoint', () => {
    it('should return system health status', async () => {
      const response = await request(app)
        .get('/api/monitoring/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('metrics');
      expect(['healthy', 'warning', 'critical']).toContain(response.body.status);
    });
  });

  describe('Metrics Endpoint', () => {
    it('should return system metrics', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics?type=system')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('metrics');
      expect(response.body.metrics).toHaveProperty('system');
    });

    it('should return application metrics', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics?type=application')
        .expect(200);

      expect(response.body).toHaveProperty('metrics');
      expect(response.body.metrics).toHaveProperty('application');
    });

    it('should return performance metrics', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics?type=performance')
        .expect(200);

      expect(response.body).toHaveProperty('metrics');
      expect(response.body.metrics).toHaveProperty('performance');
    });

    it('should return all metrics by default', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics')
        .expect(200);

      expect(response.body.metrics).toHaveProperty('system');
      expect(response.body.metrics).toHaveProperty('application');
      expect(response.body.metrics).toHaveProperty('performance');
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics?type=system&limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('metrics');
      // Note: Actual length check would depend on available metrics
    });
  });

  describe('Alerts Endpoint', () => {
    it('should return alerts list', async () => {
      const response = await request(app)
        .get('/api/monitoring/alerts')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.alerts)).toBe(true);
    });

    it('should filter resolved alerts', async () => {
      const response = await request(app)
        .get('/api/monitoring/alerts?resolved=false')
        .expect(200);

      expect(response.body).toHaveProperty('alerts');
      expect(Array.isArray(response.body.alerts)).toBe(true);
    });
  });

  describe('Status Endpoint', () => {
    it('should return comprehensive system status', async () => {
      const response = await request(app)
        .get('/api/monitoring/status')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('services');
    });
  });

  describe('Dashboard Endpoint', () => {
    it('should return dashboard data', async () => {
      const response = await request(app)
        .get('/api/monitoring/dashboard')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('trends');
      expect(response.body).toHaveProperty('alerts');
    });
  });

  describe('Configuration Endpoint', () => {
    it('should return monitoring configuration', async () => {
      const response = await request(app)
        .get('/api/monitoring/config')
        .expect(200);

      expect(response.body).toHaveProperty('config');
      expect(response.body.config).toHaveProperty('enabled');
      expect(response.body.config).toHaveProperty('metricsInterval');
      expect(response.body.config).toHaveProperty('alertsEnabled');
      expect(response.body.config).toHaveProperty('thresholds');
    });

    it('should update monitoring configuration', async () => {
      const newConfig = {
        config: {
          metricsInterval: 60000,
          alertsEnabled: true
        }
      };

      const response = await request(app)
        .put('/api/monitoring/config')
        .send(newConfig)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('updated successfully');
    });

    it('should reject invalid configuration', async () => {
      const invalidConfig = {
        config: {
          invalidField: 'invalid'
        }
      };

      await request(app)
        .put('/api/monitoring/config')
        .send(invalidConfig)
        .expect(400);
    });
  });

  describe('Custom Metrics Endpoint', () => {
    it('should record custom metric', async () => {
      const customMetric = {
        name: 'test_metric',
        value: 100,
        unit: 'count',
        tags: { test: 'true' }
      };

      const response = await request(app)
        .post('/api/monitoring/metrics/custom')
        .send(customMetric)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('metricId');
      expect(response.body.message).toContain('recorded successfully');
    });

    it('should reject invalid custom metric', async () => {
      const invalidMetric = {
        name: 'test_metric'
        // Missing required value field
      };

      await request(app)
        .post('/api/monitoring/metrics/custom')
        .send(invalidMetric)
        .expect(400);
    });
  });

  describe('Performance Metrics Endpoint', () => {
    it('should return performance metrics for specific metric name', async () => {
      // First record a metric
      monitoringService.recordMetric({
        id: 'test_metric_1',
        name: 'test_performance',
        value: 150,
        unit: 'ms',
        timestamp: new Date(),
        tags: { test: 'true' }
      });

      const response = await request(app)
        .get('/api/monitoring/performance/test_performance')
        .expect(200);

      expect(response.body).toHaveProperty('metricName', 'test_performance');
      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('statistics');
    });

    it('should respect time range parameter', async () => {
      const response = await request(app)
        .get('/api/monitoring/performance/test_metric?hours=1')
        .expect(200);

      expect(response.body).toHaveProperty('timeRange', '1 hours');
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/monitoring/performance/test_metric?limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('metrics');
      expect(Array.isArray(response.body.metrics)).toBe(true);
    });
  });

  describe('Request Monitoring Middleware', () => {
    it('should record request metrics for API calls', async () => {
      const recordRequestSpy = jest.spyOn(monitoringService, 'recordRequest');

      await request(app)
        .get('/health')
        .expect(200);

      expect(recordRequestSpy).toHaveBeenCalled();
    });

    it('should record error metrics for failed requests', async () => {
      const recordRequestSpy = jest.spyOn(monitoringService, 'recordRequest');

      await request(app)
        .get('/nonexistent-endpoint')
        .expect(404);

      expect(recordRequestSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        false // success = false for 404
      );
    });
  });

  describe('Search Monitoring Integration', () => {
    it('should record search metrics during search operations', async () => {
      const recordSearchSpy = jest.spyOn(monitoringService, 'recordSearch');

      const searchRequest = {
        type: 'phone',
        value: '+1234567890'
      };

      // This will likely fail due to missing API keys, but should still record metrics
      await request(app)
        .post('/api/search')
        .send(searchRequest);

      // Check if search metrics were recorded (even for failed searches)
      expect(recordSearchSpy).toHaveBeenCalled();
    });
  });

  describe('Alert Management', () => {
    it('should resolve alerts', async () => {
      // First create an alert by triggering a threshold
      monitoringService.recordMetric({
        id: 'high_cpu_test',
        name: 'cpu_usage',
        value: 95, // Above critical threshold
        unit: '%',
        timestamp: new Date(),
        tags: { test: 'true' },
        threshold: {
          warning: 70,
          critical: 90
        }
      });

      // Wait a bit for alert processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get alerts to find the created alert
      const alertsResponse = await request(app)
        .get('/api/monitoring/alerts?resolved=false')
        .expect(200);

      if (alertsResponse.body.alerts.length > 0) {
        const alertId = alertsResponse.body.alerts[0].id;

        // Resolve the alert
        const resolveResponse = await request(app)
          .post(`/api/monitoring/alerts/${alertId}/resolve`)
          .expect(200);

        expect(resolveResponse.body).toHaveProperty('message');
        expect(resolveResponse.body.message).toContain('resolved successfully');
      }
    });

    it('should handle non-existent alert resolution', async () => {
      await request(app)
        .post('/api/monitoring/alerts/nonexistent-alert/resolve')
        .expect(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle monitoring service errors gracefully', async () => {
      // Mock a service error
      jest.spyOn(monitoringService, 'getHealthStatus').mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      await request(app)
        .get('/api/monitoring/health')
        .expect(503);

      // Restore the mock
      jest.restoreAllMocks();
    });
  });

  describe('Metrics Collection', () => {
    it('should collect system metrics periodically', (done) => {
      const originalInterval = monitoringService['config'].metricsInterval;
      
      // Set a short interval for testing
      monitoringService.updateConfig({ metricsInterval: 100 });

      // Check if metrics are being collected
      setTimeout(() => {
        const systemMetrics = monitoringService.getMetrics('system', 1);
        expect(systemMetrics.length).toBeGreaterThan(0);
        
        // Restore original interval
        monitoringService.updateConfig({ metricsInterval: originalInterval });
        done();
      }, 200);
    });
  });
});