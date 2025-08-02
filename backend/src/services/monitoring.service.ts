/**
 * Monitoring Service
 * Handles performance metrics, health monitoring, and system analytics
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface ApiMetrics {
  botId: string;
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastRequestTime: Date;
  circuitBreakerOpen: boolean;
  errorRate: number;
}

export interface SystemMetrics {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  activeConnections: number;
  totalRequests: number;
  errorRate: number;
  averageResponseTime: number;
}

export interface SearchMetrics {
  totalSearches: number;
  successfulSearches: number;
  failedSearches: number;
  averageSearchTime: number;
  searchesByType: Record<string, number>;
  searchesByHour: Record<string, number>;
  botsWithDataFound: Record<string, number>;
}

export class MonitoringService extends EventEmitter {
  private static instance: MonitoringService;
  private metrics: Map<string, PerformanceMetric[]>;
  private apiMetrics: Map<string, ApiMetrics>;
  private systemStartTime: Date;
  private requestCount: number;
  private errorCount: number;
  private responseTimeSum: number;
  private searchMetrics: SearchMetrics;
  private metricsRetentionHours: number;

  private constructor() {
    super();
    this.metrics = new Map();
    this.apiMetrics = new Map();
    this.systemStartTime = new Date();
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimeSum = 0;
    this.metricsRetentionHours = 24; // Keep metrics for 24 hours
    
    this.searchMetrics = {
      totalSearches: 0,
      successfulSearches: 0,
      failedSearches: 0,
      averageSearchTime: 0,
      searchesByType: {},
      searchesByHour: {},
      botsWithDataFound: {}
    };

    this.startMetricsCleanup();
    this.startSystemMetricsCollection();
    
    logger.info('Monitoring service initialized');
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Record a performance metric
   */
  public recordMetric(name: string, value: number, unit: string, tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push(metric);
    this.emit('metric_recorded', metric);

    // Log significant metrics
    if (this.isSignificantMetric(name, value)) {
      logger.info('Performance metric recorded', {
        metric: name,
        value,
        unit,
        tags
      });
    }
  }

  /**
   * Record API request metrics
   */
  public recordApiRequest(botId: string, responseTime: number, success: boolean): void {
    if (!this.apiMetrics.has(botId)) {
      this.apiMetrics.set(botId, {
        botId,
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
        lastRequestTime: new Date(),
        circuitBreakerOpen: false,
        errorRate: 0
      });
    }

    const metrics = this.apiMetrics.get(botId)!;
    metrics.requestCount++;
    metrics.lastRequestTime = new Date();

    if (success) {
      metrics.successCount++;
    } else {
      metrics.errorCount++;
    }

    // Update average response time
    const totalResponseTime = metrics.averageResponseTime * (metrics.requestCount - 1) + responseTime;
    metrics.averageResponseTime = totalResponseTime / metrics.requestCount;

    // Update error rate
    metrics.errorRate = (metrics.errorCount / metrics.requestCount) * 100;

    // Record performance metrics
    this.recordMetric(`api.${botId}.response_time`, responseTime, 'ms', { botId, success: success.toString() });
    this.recordMetric(`api.${botId}.requests`, 1, 'count', { botId, success: success.toString() });

    this.emit('api_request_recorded', { botId, responseTime, success, metrics });
  }

  /**
   * Record search metrics
   */
  public recordSearch(searchType: string, duration: number, success: boolean, botsWithData: string[] = []): void {
    this.searchMetrics.totalSearches++;
    
    if (success) {
      this.searchMetrics.successfulSearches++;
    } else {
      this.searchMetrics.failedSearches++;
    }

    // Update average search time
    const totalTime = this.searchMetrics.averageSearchTime * (this.searchMetrics.totalSearches - 1) + duration;
    this.searchMetrics.averageSearchTime = totalTime / this.searchMetrics.totalSearches;

    // Update searches by type
    this.searchMetrics.searchesByType[searchType] = (this.searchMetrics.searchesByType[searchType] || 0) + 1;

    // Update searches by hour
    const hour = new Date().getHours().toString();
    this.searchMetrics.searchesByHour[hour] = (this.searchMetrics.searchesByHour[hour] || 0) + 1;

    // Update bots with data found
    botsWithData.forEach(botId => {
      this.searchMetrics.botsWithDataFound[botId] = (this.searchMetrics.botsWithDataFound[botId] || 0) + 1;
    });

    // Record performance metrics
    this.recordMetric('search.duration', duration, 'ms', { type: searchType, success: success.toString() });
    this.recordMetric('search.count', 1, 'count', { type: searchType, success: success.toString() });
    this.recordMetric('search.bots_with_data', botsWithData.length, 'count', { type: searchType });

    this.emit('search_recorded', {
      searchType,
      duration,
      success,
      botsWithData,
      metrics: this.searchMetrics
    });
  }

  /**
   * Record HTTP request metrics
   */
  public recordHttpRequest(method: string, path: string, statusCode: number, responseTime: number): void {
    this.requestCount++;
    this.responseTimeSum += responseTime;

    if (statusCode >= 400) {
      this.errorCount++;
    }

    const success = statusCode < 400;
    const tags = {
      method,
      path: this.sanitizePath(path),
      status_code: statusCode.toString(),
      success: success.toString()
    };

    this.recordMetric('http.request.duration', responseTime, 'ms', tags);
    this.recordMetric('http.request.count', 1, 'count', tags);

    this.emit('http_request_recorded', {
      method,
      path,
      statusCode,
      responseTime,
      success
    });
  }

  /**
   * Update circuit breaker status
   */
  public updateCircuitBreakerStatus(botId: string, isOpen: boolean): void {
    if (this.apiMetrics.has(botId)) {
      this.apiMetrics.get(botId)!.circuitBreakerOpen = isOpen;
    }

    this.recordMetric(`circuit_breaker.${botId}.status`, isOpen ? 1 : 0, 'boolean', { botId });
    
    logger.info('Circuit breaker status updated', {
      botId,
      isOpen,
      timestamp: new Date().toISOString()
    });

    this.emit('circuit_breaker_updated', { botId, isOpen });
  }

  /**
   * Get API metrics for a specific bot
   */
  public getApiMetrics(botId: string): ApiMetrics | null {
    return this.apiMetrics.get(botId) || null;
  }

  /**
   * Get all API metrics
   */
  public getAllApiMetrics(): ApiMetrics[] {
    return Array.from(this.apiMetrics.values());
  }

  /**
   * Get search metrics
   */
  public getSearchMetrics(): SearchMetrics {
    return { ...this.searchMetrics };
  }

  /**
   * Get system metrics
   */
  public getSystemMetrics(): SystemMetrics {
    const uptime = Date.now() - this.systemStartTime.getTime();
    const memoryUsage = process.memoryUsage();
    const averageResponseTime = this.requestCount > 0 ? this.responseTimeSum / this.requestCount : 0;
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

    return {
      uptime,
      memoryUsage,
      cpuUsage: this.getCpuUsage(),
      activeConnections: this.getActiveConnections(),
      totalRequests: this.requestCount,
      errorRate,
      averageResponseTime
    };
  }

  /**
   * Get metrics for a specific metric name
   */
  public getMetrics(name: string, since?: Date): PerformanceMetric[] {
    const metrics = this.metrics.get(name) || [];
    
    if (since) {
      return metrics.filter(metric => metric.timestamp >= since);
    }
    
    return [...metrics];
  }

  /**
   * Get aggregated metrics
   */
  public getAggregatedMetrics(name: string, since?: Date): {
    count: number;
    average: number;
    min: number;
    max: number;
    sum: number;
  } {
    const metrics = this.getMetrics(name, since);
    
    if (metrics.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0, sum: 0 };
    }

    const values = metrics.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: metrics.length,
      average: sum / metrics.length,
      min: Math.min(...values),
      max: Math.max(...values),
      sum
    };
  }

  /**
   * Get health status
   */
  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    metrics: SystemMetrics;
  } {
    const systemMetrics = this.getSystemMetrics();
    const apiMetrics = this.getAllApiMetrics();
    
    const checks = {
      memory_usage: systemMetrics.memoryUsage.heapUsed < 1024 * 1024 * 1024, // < 1GB
      error_rate: systemMetrics.errorRate < 5, // < 5%
      response_time: systemMetrics.averageResponseTime < 5000, // < 5s
      apis_available: apiMetrics.filter(api => !api.circuitBreakerOpen).length > 0
    };

    const healthyChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.values(checks).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyChecks === totalChecks) {
      status = 'healthy';
    } else if (healthyChecks >= totalChecks * 0.7) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      checks,
      metrics: systemMetrics
    };
  }

  /**
   * Export metrics for external monitoring systems
   */
  public exportMetrics(): {
    timestamp: string;
    system: SystemMetrics;
    apis: ApiMetrics[];
    search: SearchMetrics;
    performance: Record<string, any>;
  } {
    const performanceMetrics: Record<string, any> = {};
    
    for (const [name, metrics] of this.metrics.entries()) {
      const recent = metrics.filter(m => 
        Date.now() - m.timestamp.getTime() < 60 * 60 * 1000 // Last hour
      );
      
      if (recent.length > 0) {
        performanceMetrics[name] = this.getAggregatedMetrics(name, new Date(Date.now() - 60 * 60 * 1000));
      }
    }

    return {
      timestamp: new Date().toISOString(),
      system: this.getSystemMetrics(),
      apis: this.getAllApiMetrics(),
      search: this.getSearchMetrics(),
      performance: performanceMetrics
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  public resetMetrics(): void {
    this.metrics.clear();
    this.apiMetrics.clear();
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimeSum = 0;
    this.searchMetrics = {
      totalSearches: 0,
      successfulSearches: 0,
      failedSearches: 0,
      averageSearchTime: 0,
      searchesByType: {},
      searchesByHour: {},
      botsWithDataFound: {}
    };
    
    logger.info('Monitoring metrics reset');
  }

  /**
   * Private helper methods
   */
  private isSignificantMetric(name: string, value: number): boolean {
    // Log slow requests
    if (name.includes('response_time') && value > 5000) return true;
    
    // Log high error rates
    if (name.includes('error_rate') && value > 10) return true;
    
    // Log circuit breaker changes
    if (name.includes('circuit_breaker')) return true;
    
    return false;
  }

  private sanitizePath(path: string): string {
    // Remove sensitive data from paths for metrics
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/[?&].*$/, '') // Remove query parameters
      .toLowerCase();
  }

  private getCpuUsage(): number {
    // Simple CPU usage approximation
    // In production, you might want to use a more sophisticated method
    const usage = process.cpuUsage();
    return (usage.user + usage.system) / 1000000; // Convert to seconds
  }

  private getActiveConnections(): number {
    // This would need to be implemented based on your server setup
    // For now, return a placeholder
    return 0;
  }

  private startMetricsCleanup(): void {
    // Clean up old metrics every hour
    setInterval(() => {
      const cutoffTime = new Date(Date.now() - this.metricsRetentionHours * 60 * 60 * 1000);
      
      for (const [name, metrics] of this.metrics.entries()) {
        const filteredMetrics = metrics.filter(metric => metric.timestamp > cutoffTime);
        this.metrics.set(name, filteredMetrics);
      }
      
      logger.debug('Old metrics cleaned up', {
        retentionHours: this.metricsRetentionHours,
        cutoffTime: cutoffTime.toISOString()
      });
    }, 60 * 60 * 1000); // Every hour
  }

  private startSystemMetricsCollection(): void {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      const systemMetrics = this.getSystemMetrics();
      
      this.recordMetric('system.memory.heap_used', systemMetrics.memoryUsage.heapUsed, 'bytes');
      this.recordMetric('system.memory.heap_total', systemMetrics.memoryUsage.heapTotal, 'bytes');
      this.recordMetric('system.memory.external', systemMetrics.memoryUsage.external, 'bytes');
      this.recordMetric('system.uptime', systemMetrics.uptime, 'ms');
      this.recordMetric('system.error_rate', systemMetrics.errorRate, 'percent');
      this.recordMetric('system.average_response_time', systemMetrics.averageResponseTime, 'ms');
      
    }, 30 * 1000); // Every 30 seconds
  }
}

// Export singleton instance
export const monitoringService = MonitoringService.getInstance();