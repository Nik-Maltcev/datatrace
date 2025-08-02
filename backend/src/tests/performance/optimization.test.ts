/**
 * Performance Optimization Tests
 * Tests for performance monitoring, memory optimization, and system efficiency
 */

import { 
  PerformanceMonitor, 
  MemoryOptimizer, 
  CpuOptimizer, 
  RequestOptimizer,
  performanceMonitor 
} from '../../utils/performance';

describe('Performance Optimization Tests', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance();
    monitor.clearMetrics();
    MemoryOptimizer.clearCache();
  });

  describe('Performance Monitoring', () => {
    it('should track operation performance', async () => {
      const operationId = 'test-operation';
      
      monitor.startMonitoring(operationId);
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const metrics = monitor.endMonitoring(operationId);
      
      expect(metrics).toBeTruthy();
      expect(metrics!.duration).toBeGreaterThan(90);
      expect(metrics!.duration).toBeLessThan(200);
      expect(metrics!.startTime).toBeTruthy();
      expect(metrics!.endTime).toBeTruthy();
    });

    it('should handle multiple concurrent operations', async () => {
      const operations = ['op1', 'op2', 'op3'];
      
      // Start all operations
      operations.forEach(op => monitor.startMonitoring(op));
      
      // Simulate different work durations
      await Promise.all([
        new Promise(resolve => setTimeout(resolve, 50)),
        new Promise(resolve => setTimeout(resolve, 100)),
        new Promise(resolve => setTimeout(resolve, 150))
      ]);
      
      // End all operations
      const results = operations.map(op => monitor.endMonitoring(op));
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeTruthy();
        expect(result!.duration).toBeGreaterThan(0);
      });
    });

    it('should return null for non-existent operations', () => {
      const metrics = monitor.endMonitoring('non-existent');
      expect(metrics).toBeNull();
    });
  });

  describe('Memory Optimization', () => {
    it('should cache and retrieve data correctly', () => {
      const key = 'test-key';
      const data = { test: 'data', number: 42 };
      
      MemoryOptimizer.setCache(key, data, 1000);
      const retrieved = MemoryOptimizer.getCache(key);
      
      expect(retrieved).toEqual(data);
    });

    it('should expire cached data after TTL', async () => {
      const key = 'expiring-key';
      const data = { test: 'data' };
      
      MemoryOptimizer.setCache(key, data, 100); // 100ms TTL
      
      // Should be available immediately
      expect(MemoryOptimizer.getCache(key)).toEqual(data);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be expired
      expect(MemoryOptimizer.getCache(key)).toBeNull();
    });

    it('should clean expired cache entries', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const data = { test: 'data' };
      
      // Set cache with short TTL
      keys.forEach(key => MemoryOptimizer.setCache(key, data, 50));
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Clean expired entries
      MemoryOptimizer.cleanExpiredCache();
      
      // All should be expired
      keys.forEach(key => {
        expect(MemoryOptimizer.getCache(key)).toBeNull();
      });
    });

    it('should limit cache size', () => {
      const maxSize = 1000; // Default max size
      
      // Fill cache beyond max size
      for (let i = 0; i < maxSize + 100; i++) {
        MemoryOptimizer.setCache(`key-${i}`, { data: i });
      }
      
      const stats = MemoryOptimizer.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(maxSize);
    });

    it('should provide memory usage statistics', () => {
      const usage = MemoryOptimizer.getMemoryUsage();
      
      expect(usage).toHaveProperty('rss');
      expect(usage).toHaveProperty('heapTotal');
      expect(usage).toHaveProperty('heapUsed');
      expect(usage).toHaveProperty('external');
      expect(usage).toHaveProperty('percentage');
      
      expect(typeof usage.rss).toBe('number');
      expect(typeof usage.percentage).toBe('number');
      expect(usage.percentage).toBeGreaterThan(0);
      expect(usage.percentage).toBeLessThan(100);
    });

    it('should cleanup memory objects', () => {
      const obj = {
        prop1: 'value1',
        prop2: 'value2',
        nested: { prop3: 'value3' }
      };
      
      MemoryOptimizer.cleanupMemory(obj);
      
      expect(Object.keys(obj)).toHaveLength(0);
    });
  });

  describe('CPU Optimization', () => {
    it('should batch process items', async () => {
      const items = Array.from({ length: 25 }, (_, i) => i);
      const processor = async (item: number) => item * 2;
      
      const results = await CpuOptimizer.batchProcess(items, processor, 5, 10);
      
      expect(results).toHaveLength(25);
      expect(results[0]).toBe(0);
      expect(results[24]).toBe(48);
    });

    it('should throttle function execution', (done) => {
      let callCount = 0;
      const throttledFn = CpuOptimizer.throttle(() => {
        callCount++;
      }, 100);
      
      // Call multiple times rapidly
      throttledFn();
      throttledFn();
      throttledFn();
      throttledFn();
      
      // Should only be called once initially
      expect(callCount).toBe(1);
      
      // Wait for throttle to reset
      setTimeout(() => {
        throttledFn();
        expect(callCount).toBe(2);
        done();
      }, 150);
    });

    it('should debounce function execution', (done) => {
      let callCount = 0;
      const debouncedFn = CpuOptimizer.debounce(() => {
        callCount++;
      }, 100);
      
      // Call multiple times rapidly
      debouncedFn();
      debouncedFn();
      debouncedFn();
      debouncedFn();
      
      // Should not be called yet
      expect(callCount).toBe(0);
      
      // Wait for debounce delay
      setTimeout(() => {
        expect(callCount).toBe(1);
        done();
      }, 150);
    });

    it('should provide CPU usage statistics', () => {
      const usage = CpuOptimizer.getCpuUsage();
      
      expect(usage).toHaveProperty('user');
      expect(usage).toHaveProperty('system');
      expect(usage).toHaveProperty('total');
      expect(usage).toHaveProperty('percentage');
      
      expect(typeof usage.user).toBe('number');
      expect(typeof usage.system).toBe('number');
      expect(typeof usage.total).toBe('number');
      expect(typeof usage.percentage).toBe('number');
    });
  });

  describe('Request Optimization', () => {
    it('should deduplicate identical requests', async () => {
      let callCount = 0;
      const requestFn = async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'result';
      };
      
      // Make multiple identical requests
      const promises = [
        RequestOptimizer.deduplicateRequest('test-key', requestFn),
        RequestOptimizer.deduplicateRequest('test-key', requestFn),
        RequestOptimizer.deduplicateRequest('test-key', requestFn)
      ];
      
      const results = await Promise.all(promises);
      
      // Should only call the function once
      expect(callCount).toBe(1);
      expect(results).toEqual(['result', 'result', 'result']);
    });

    it('should handle parallel requests with concurrency limit', async () => {
      let activeRequests = 0;
      let maxConcurrent = 0;
      
      const createRequest = () => async () => {
        activeRequests++;
        maxConcurrent = Math.max(maxConcurrent, activeRequests);
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        activeRequests--;
        return 'result';
      };
      
      const requests = Array.from({ length: 10 }, createRequest);
      const results = await RequestOptimizer.parallelRequests(requests, 3);
      
      expect(results).toHaveLength(10);
      expect(maxConcurrent).toBeLessThanOrEqual(3);
      expect(results.every(r => r === 'result')).toBe(true);
    });

    it('should handle request timeouts', async () => {
      const slowRequest = new Promise(resolve => 
        setTimeout(() => resolve('result'), 200)
      );
      
      await expect(
        RequestOptimizer.withTimeout(slowRequest, 100, 'Custom timeout')
      ).rejects.toThrow('Custom timeout');
    });

    it('should complete fast requests within timeout', async () => {
      const fastRequest = new Promise(resolve => 
        setTimeout(() => resolve('result'), 50)
      );
      
      const result = await RequestOptimizer.withTimeout(fastRequest, 100);
      expect(result).toBe('result');
    });
  });

  describe('Performance Decorators', () => {
    it('should measure method performance', async () => {
      class TestClass {
        @measurePerformance('test-method')
        async testMethod() {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'result';
        }
      }
      
      const instance = new TestClass();
      const result = await instance.testMethod();
      
      expect(result).toBe('result');
      // Performance should be logged for operations > 1000ms
    });
  });

  describe('Integration Performance Tests', () => {
    it('should handle high-load scenarios', async () => {
      const startTime = Date.now();
      const operations = [];
      
      // Create multiple concurrent operations
      for (let i = 0; i < 50; i++) {
        const operationId = `load-test-${i}`;
        monitor.startMonitoring(operationId);
        
        operations.push(
          new Promise(async (resolve) => {
            // Simulate varying workloads
            await new Promise(r => setTimeout(r, Math.random() * 100));
            
            // Use cache
            MemoryOptimizer.setCache(`cache-${i}`, { data: i });
            const cached = MemoryOptimizer.getCache(`cache-${i}`);
            
            const metrics = monitor.endMonitoring(operationId);
            resolve({ metrics, cached });
          })
        );
      }
      
      const results = await Promise.all(operations);
      const totalTime = Date.now() - startTime;
      
      expect(results).toHaveLength(50);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Check that all operations were tracked
      results.forEach((result: any) => {
        expect(result.metrics).toBeTruthy();
        expect(result.cached).toBeTruthy();
      });
    });

    it('should maintain performance under memory pressure', async () => {
      const initialMemory = MemoryOptimizer.getMemoryUsage();
      
      // Create memory pressure
      const largeObjects = [];
      for (let i = 0; i < 100; i++) {
        largeObjects.push({
          id: i,
          data: new Array(1000).fill(`data-${i}`)
        });
        
        // Cache some objects
        if (i % 10 === 0) {
          MemoryOptimizer.setCache(`large-${i}`, largeObjects[i]);
        }
      }
      
      const peakMemory = MemoryOptimizer.getMemoryUsage();
      
      // Clean up
      largeObjects.length = 0;
      MemoryOptimizer.clearCache();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = MemoryOptimizer.getMemoryUsage();
      
      expect(peakMemory.heapUsed).toBeGreaterThan(initialMemory.heapUsed);
      expect(finalMemory.heapUsed).toBeLessThan(peakMemory.heapUsed);
    });

    it('should optimize concurrent API requests', async () => {
      const mockApiCall = async (id: number) => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        return { id, data: `result-${id}` };
      };
      
      const requests = Array.from({ length: 20 }, (_, i) => () => mockApiCall(i));
      
      const startTime = Date.now();
      const results = await RequestOptimizer.parallelRequests(requests, 5);
      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(20);
      expect(duration).toBeLessThan(1000); // Should be faster than sequential
      
      // Verify all results are correct
      results.forEach((result, index) => {
        expect(result.id).toBe(index);
        expect(result.data).toBe(`result-${index}`);
      });
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many operations that could potentially leak memory
      for (let i = 0; i < 100; i++) {
        const operationId = `leak-test-${i}`;
        monitor.startMonitoring(operationId);
        
        // Create and destroy objects
        const tempData = {
          id: i,
          data: new Array(100).fill(`test-${i}`),
          nested: { prop: `nested-${i}` }
        };
        
        // Cache and retrieve
        MemoryOptimizer.setCache(`temp-${i}`, tempData);
        MemoryOptimizer.getCache(`temp-${i}`);
        
        // Clean up
        MemoryOptimizer.cleanupMemory(tempData);
        monitor.endMonitoring(operationId);
        
        // Periodic cleanup
        if (i % 20 === 0) {
          MemoryOptimizer.cleanExpiredCache();
          if (global.gc) {
            global.gc();
          }
        }
      }
      
      // Final cleanup
      MemoryOptimizer.clearCache();
      monitor.clearMetrics();
      
      if (global.gc) {
        global.gc();
      }
      
      // Wait for garbage collection
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});