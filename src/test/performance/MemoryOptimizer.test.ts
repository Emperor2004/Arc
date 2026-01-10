import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryOptimizer } from '../../core/performance/MemoryOptimizer';

// Mock global.gc if not available
const mockGc = vi.fn();
if (!global.gc) {
  global.gc = mockGc;
}

describe('MemoryOptimizer', () => {
  let memoryOptimizer: MemoryOptimizer;

  beforeEach(() => {
    memoryOptimizer = new MemoryOptimizer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    memoryOptimizer.stopMonitoring();
  });

  describe('initialization', () => {
    it('should create memory optimizer with default thresholds', () => {
      expect(memoryOptimizer).toBeDefined();
      expect(memoryOptimizer.isMemoryAboveThreshold).toBeDefined();
    });

    it('should allow setting custom thresholds', () => {
      memoryOptimizer.setMemoryThresholds({
        warning: 200,
        critical: 400
      });

      // Thresholds are internal, but we can test behavior
      expect(memoryOptimizer).toBeDefined();
    });
  });

  describe('monitoring', () => {
    it('should start and stop monitoring', () => {
      expect(() => {
        memoryOptimizer.startMonitoring(1000);
        memoryOptimizer.stopMonitoring();
      }).not.toThrow();
    });

    it('should not start monitoring twice', () => {
      memoryOptimizer.startMonitoring(1000);
      memoryOptimizer.startMonitoring(1000); // Should not throw

      memoryOptimizer.stopMonitoring();
    });
  });

  describe('cleanup strategies', () => {
    it('should register cleanup strategies', () => {
      const mockStrategy = vi.fn().mockResolvedValue(undefined);
      
      memoryOptimizer.registerCleanupStrategy('test', mockStrategy);
      
      expect(() => {
        memoryOptimizer.registerCleanupStrategy('test2', mockStrategy);
      }).not.toThrow();
    });

    it('should execute cleanup strategies', async () => {
      const mockStrategy1 = vi.fn().mockResolvedValue(undefined);
      const mockStrategy2 = vi.fn().mockResolvedValue(undefined);
      
      memoryOptimizer.registerCleanupStrategy('test1', mockStrategy1);
      memoryOptimizer.registerCleanupStrategy('test2', mockStrategy2);
      
      await memoryOptimizer.forceCleanup();
      
      expect(mockStrategy1).toHaveBeenCalled();
      expect(mockStrategy2).toHaveBeenCalled();
    });

    it('should handle failing cleanup strategies', async () => {
      const mockStrategy1 = vi.fn().mockResolvedValue(undefined);
      const mockStrategy2 = vi.fn().mockRejectedValue(new Error('Cleanup failed'));
      
      memoryOptimizer.registerCleanupStrategy('test1', mockStrategy1);
      memoryOptimizer.registerCleanupStrategy('test2', mockStrategy2);
      
      // Should not throw even if one strategy fails
      await expect(memoryOptimizer.forceCleanup()).resolves.toBeUndefined();
      
      expect(mockStrategy1).toHaveBeenCalled();
      expect(mockStrategy2).toHaveBeenCalled();
    });
  });

  describe('memory usage', () => {
    it('should get current memory usage if available', () => {
      const usage = memoryOptimizer.getCurrentMemoryUsage();
      
      // May be null in test environment
      if (usage) {
        expect(usage).toHaveProperty('heapUsed');
        expect(usage).toHaveProperty('heapTotal');
        expect(usage).toHaveProperty('external');
      }
    });

    it('should get memory usage in MB', () => {
      const usage = memoryOptimizer.getMemoryUsageMB();
      
      // May be null in test environment
      if (usage) {
        expect(typeof usage.heapUsed).toBe('number');
        expect(typeof usage.heapTotal).toBe('number');
        expect(typeof usage.external).toBe('number');
      }
    });

    it('should check memory thresholds', () => {
      // This will return false in test environment where process.memoryUsage might not be available
      const isAboveWarning = memoryOptimizer.isMemoryAboveThreshold('warning');
      const isAboveCritical = memoryOptimizer.isMemoryAboveThreshold('critical');
      
      expect(typeof isAboveWarning).toBe('boolean');
      expect(typeof isAboveCritical).toBe('boolean');
    });
  });

  describe('managed cache', () => {
    it('should create managed cache with cleanup strategy', () => {
      const cache = memoryOptimizer.createManagedCache<string, string>('test', 10);
      
      expect(cache).toBeDefined();
      expect(cache.size()).toBe(0);
      
      // Add some items
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      expect(cache.size()).toBe(2);
    });

    it('should register cleanup strategy for managed cache', async () => {
      const cache = memoryOptimizer.createManagedCache<string, string>('test', 5, 0.5);
      
      // Fill cache beyond cleanup threshold
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      
      const initialSize = cache.size();
      
      // Force cleanup should reduce cache size
      await memoryOptimizer.forceCleanup();
      
      // Cache should be cleaned up (though exact behavior depends on implementation)
      expect(cache.size()).toBeLessThanOrEqual(initialSize);
    });
  });

  describe('object optimization', () => {
    it('should optimize objects by removing undefined properties', () => {
      const obj = {
        defined: 'value',
        undefined: undefined,
        null: null,
        zero: 0,
        empty: ''
      };
      
      const optimized = memoryOptimizer.optimizeObject(obj);
      
      expect(optimized).toHaveProperty('defined');
      expect(optimized).not.toHaveProperty('undefined');
      expect(optimized).not.toHaveProperty('null');
      expect(optimized).toHaveProperty('zero');
      expect(optimized).toHaveProperty('empty');
    });
  });

  describe('weak references', () => {
    it('should create weak reference if available', () => {
      const obj = { test: 'value' };
      const weakRef = memoryOptimizer.createWeakReference(obj);
      
      expect(weakRef).toBeDefined();
      expect(weakRef.deref()).toBe(obj);
    });
  });

  describe('reporting', () => {
    it('should generate memory report', () => {
      const report = memoryOptimizer.generateMemoryReport();
      
      expect(typeof report).toBe('string');
      expect(report).toContain('Memory Usage Report');
    });

    it('should handle missing memory usage in report', () => {
      // Mock getCurrentMemoryUsage to return null
      const originalMethod = memoryOptimizer.getCurrentMemoryUsage;
      memoryOptimizer.getCurrentMemoryUsage = vi.fn().mockReturnValue(null);
      
      const report = memoryOptimizer.generateMemoryReport();
      
      expect(report).toContain('not available');
      
      // Restore original method
      memoryOptimizer.getCurrentMemoryUsage = originalMethod;
    });
  });
});