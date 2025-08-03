/**
 * Performance Optimization Utilities
 * Tools for optimizing application performance and monitoring
 */

import { logger } from './logger';

export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

export interface OptimizationConfig {
  enableMemoryOptimization: boolean;
  enableCpuOptimization: boolean;
  enableCaching: boolean;
  maxCacheSize: number;
  cacheTimeout: number;
}

/**
 * Performance Monitor Class
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics>;
  private config: OptimizationConfig;

  private constructor() {
    this.metrics = new Map();
    this.config = {
      enableMemoryOptimization: process.env.ENABLE_MEMORY_OPTIMIZATION === 'true',
      enableCpuOptimization: process.env.ENABLE_CPU_OPTIMIZATION === 'true',
      enableCaching: process.env.ENABLE_CACHING === 'true',
      maxCacheSize: parseInt(process.env.MAX_CACHE_SIZE || '1000', 10),
      cacheTimeout: parseInt(process.env.CACHE_TIMEOUT || '300000', 10) // 5 minutes
    };
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start performance monitoring for an operation
   */
  public startMonitoring(operationId: string): void {
    const metrics: PerformanceMetrics = {
      startTime: Date.now(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };

    this.metrics.set(operationId, metrics);
  }

  /**
   * End performance monitoring and calculate metrics
   */
  public endMonitoring(operationId: string): PerformanceMetrics | null {
    const metrics = this.metrics.get(operationId);
    if (!metrics) {
      return null;
    }

    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;

    // Calculate memory and CPU usage differences
    const currentMemory = process.memoryUsage();
    const currentCpu = process.cpuUsage(metrics.cpuUsage);

    const finalMetrics: PerformanceMetrics = {
      ...metrics,
      memoryUsage: {
        rss: currentMemory.rss - (metrics.memoryUsage?.rss || 0),
        heapTotal: currentMemory.heapTotal - (metrics.memoryUsage?.heapTotal || 0),
        heapUsed: currentMemory.heapUsed - (metrics.memoryUsage?.heapUsed || 0),
        external: currentMemory.external - (metrics.memoryUsage?.external || 0),
        arrayBuffers: currentMemory.arrayBuffers - (metrics.memoryUsage?.arrayBuffers || 0)
      },
      cpuUsage: currentCpu
    };

    // Log performance metrics if duration is significant
    if (finalMetrics.duration && finalMetrics.duration > 1000) {
      logger.info('Performance metrics', {
        operationId,
        duration: finalMetrics.duration,
        memoryDelta: finalMetrics.memoryUsage?.heapUsed,
        cpuTime: (currentCpu.user + currentCpu.system) / 1000 // Convert to milliseconds
      });
    }

    this.metrics.delete(operationId);
    return finalMetrics;
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(operationId: string): PerformanceMetrics | null {
    return this.metrics.get(operationId) || null;
  }

  /**
   * Clear all metrics
   */
  public clearMetrics(): void {
    this.metrics.clear();
  }
}

/**
 * Memory optimization utilities
 */
export class MemoryOptimizer {
  private static cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private static maxCacheSize = 1000;
  private static defaultTTL = 300000; // 5 minutes

  /**
   * Force garbage collection if available
   */
  public static forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      logger.debug('Forced garbage collection');
    }
  }

  /**
   * Clean up memory by removing references
   */
  public static cleanupMemory(obj: any): void {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        delete obj[key];
      });
    }
  }

  /**
   * Get memory usage statistics
   */
  public static getMemoryUsage(): NodeJS.MemoryUsage & { percentage: number } {
    const usage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const percentage = (usage.rss / totalMemory) * 100;

    return {
      ...usage,
      percentage
    };
  }

  /**
   * Cache data with TTL
   */
  public static setCache(key: string, data: any, ttl: number = this.defaultTTL): void {
    // Clean expired entries if cache is getting full
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanExpiredCache();
    }

    // If still full, remove oldest entries
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get cached data
   */
  public static getCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Clear expired cache entries
   */
  public static cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  public static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  public static getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0, // Would need to track hits/misses
      memoryUsage: JSON.stringify([...this.cache.values()]).length
    };
  }
}

/**
 * CPU optimization utilities
 */
export class CpuOptimizer {
  /**
   * Batch process items to avoid blocking the event loop
   */
  public static async batchProcess<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 10,
    delay: number = 0
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);

      // Add delay to prevent CPU blocking
      if (delay > 0 && i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return results;
  }

  /**
   * Throttle function execution
   */
  public static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return function(this: any, ...args: Parameters<T>) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Debounce function execution
   */
  public static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return function(this: any, ...args: Parameters<T>) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * Get CPU usage statistics
   */
  public static getCpuUsage(): {
    user: number;
    system: number;
    total: number;
    percentage: number;
  } {
    const usage = process.cpuUsage();
    const total = usage.user + usage.system;
    const percentage = (total / 1000000) * 100; // Convert to percentage

    return {
      user: usage.user / 1000, // Convert to milliseconds
      system: usage.system / 1000,
      total: total / 1000,
      percentage
    };
  }
}

/**
 * Request optimization utilities
 */
export class RequestOptimizer {
  private static requestQueue: Map<string, Promise<any>> = new Map();

  /**
   * Deduplicate identical requests
   */
  public static async deduplicateRequest<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Check if request is already in progress
    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key) as Promise<T>;
    }

    // Start new request
    const requestPromise = requestFn().finally(() => {
      this.requestQueue.delete(key);
    });

    this.requestQueue.set(key, requestPromise);
    return requestPromise;
  }

  /**
   * Parallel request execution with concurrency limit
   */
  public static async parallelRequests<T>(
    requests: (() => Promise<T>)[],
    concurrencyLimit: number = 5
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const request of requests) {
      const promise = request().then(result => {
        results.push(result);
      });

      executing.push(promise);

      if (executing.length >= concurrencyLimit) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Request timeout wrapper
   */
  public static async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string = 'Request timeout'
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }
}

/**
 * Performance decorator for methods
 */
export function measurePerformance(operationName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const monitor = PerformanceMonitor.getInstance();

    descriptor.value = async function (...args: any[]) {
      const opName = operationName || `${target.constructor.name}.${propertyName}`;
      const operationId = `${opName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      monitor.startMonitoring(operationId);

      try {
        const result = await method.apply(this, args);
        const metrics = monitor.endMonitoring(operationId);

        if (metrics && metrics.duration && metrics.duration > 1000) {
          logger.info('Slow operation detected', {
            operation: opName,
            duration: metrics.duration,
            memoryUsed: metrics.memoryUsage?.heapUsed
          });
        }

        return result;
      } catch (error) {
        monitor.endMonitoring(operationId);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Memory cleanup decorator
 */
export function cleanupMemory(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    try {
      const result = await method.apply(this, args);
      
      // Clean up arguments
      args.forEach(arg => {
        if (arg && typeof arg === 'object') {
          MemoryOptimizer.cleanupMemory(arg);
        }
      });

      return result;
    } finally {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
  };

  return descriptor;
}

// Export singleton instances
export const performanceMonitor = PerformanceMonitor.getInstance();