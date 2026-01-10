import { performanceMonitor } from './PerformanceMonitor';
import { LRUCache } from './LRUCache';

/**
 * Memory optimization strategies and garbage collection management
 */
export class MemoryOptimizer {
  private memoryThresholds = {
    warning: 150, // MB
    critical: 300, // MB
    cleanup: 200  // MB
  };

  private cleanupStrategies: Map<string, () => Promise<void>> = new Map();
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    this.setupDefaultCleanupStrategies();
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    
    this.monitoringInterval = setInterval(async () => {
      await this.checkMemoryUsage();
    }, intervalMs);

    console.log('🧠 Memory monitoring started');
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    console.log('🛑 Memory monitoring stopped');
  }

  /**
   * Register a cleanup strategy
   */
  registerCleanupStrategy(name: string, strategy: () => Promise<void>): void {
    this.cleanupStrategies.set(name, strategy);
  }

  /**
   * Force memory cleanup
   */
  async forceCleanup(): Promise<void> {
    console.log('🧹 Forcing memory cleanup...');
    
    const startTime = performance.now();
    let cleanedStrategies = 0;

    for (const [name, strategy] of this.cleanupStrategies) {
      try {
        await strategy();
        cleanedStrategies++;
        console.log(`✅ Cleanup strategy '${name}' executed`);
      } catch (error) {
        console.error(`❌ Cleanup strategy '${name}' failed:`, error);
      }
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      console.log('🗑️ Garbage collection triggered');
    }

    const endTime = performance.now();
    performanceMonitor.recordTiming('memory_cleanup', startTime, endTime);
    performanceMonitor.recordMetric('cleanup_strategies_executed', cleanedStrategies, 'count');

    console.log(`🎯 Memory cleanup completed in ${(endTime - startTime).toFixed(2)}ms`);
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): NodeJS.MemoryUsage | null {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }
    return null;
  }

  /**
   * Get memory usage in MB
   */
  getMemoryUsageMB(): { heapUsed: number; heapTotal: number; external: number } | null {
    const usage = this.getCurrentMemoryUsage();
    if (!usage) return null;

    return {
      heapUsed: usage.heapUsed / 1024 / 1024,
      heapTotal: usage.heapTotal / 1024 / 1024,
      external: usage.external / 1024 / 1024
    };
  }

  /**
   * Check if memory usage is above threshold
   */
  isMemoryAboveThreshold(threshold: 'warning' | 'critical' | 'cleanup'): boolean {
    const usage = this.getMemoryUsageMB();
    if (!usage) return false;

    return usage.heapUsed > this.memoryThresholds[threshold];
  }

  /**
   * Set memory thresholds
   */
  setMemoryThresholds(thresholds: Partial<typeof this.memoryThresholds>): void {
    this.memoryThresholds = { ...this.memoryThresholds, ...thresholds };
  }

  /**
   * Generate memory report
   */
  generateMemoryReport(): string {
    const usage = this.getMemoryUsageMB();
    
    if (!usage) {
      return 'Memory usage information not available';
    }

    const report = [
      '=== Memory Usage Report ===',
      `Generated at: ${new Date().toISOString()}`,
      '',
      `Heap Used: ${usage.heapUsed.toFixed(2)} MB`,
      `Heap Total: ${usage.heapTotal.toFixed(2)} MB`,
      `External: ${usage.external.toFixed(2)} MB`,
      '',
      'Thresholds:',
      `  Warning: ${this.memoryThresholds.warning} MB ${usage.heapUsed > this.memoryThresholds.warning ? '⚠️' : '✅'}`,
      `  Critical: ${this.memoryThresholds.critical} MB ${usage.heapUsed > this.memoryThresholds.critical ? '🚨' : '✅'}`,
      `  Cleanup: ${this.memoryThresholds.cleanup} MB ${usage.heapUsed > this.memoryThresholds.cleanup ? '🧹' : '✅'}`,
      '',
      `Registered Cleanup Strategies: ${this.cleanupStrategies.size}`,
      Array.from(this.cleanupStrategies.keys()).map(name => `  - ${name}`).join('\n'),
      '',
      '=========================='
    ].join('\n');

    return report;
  }

  /**
   * Create memory-efficient cache with automatic cleanup
   */
  createManagedCache<K, V>(
    name: string,
    capacity: number,
    cleanupThreshold: number = 0.8
  ): LRUCache<K, V> {
    const cache = new LRUCache<K, V>(capacity);
    
    // Register cleanup strategy for this cache
    this.registerCleanupStrategy(`cache_${name}`, async () => {
      const currentSize = cache.size();
      const targetSize = Math.floor(capacity * (1 - cleanupThreshold));
      
      if (currentSize > targetSize) {
        // Clear oldest entries
        const entriesToRemove = currentSize - targetSize;
        const keys = Array.from(cache.keys());
        
        for (let i = 0; i < entriesToRemove && i < keys.length; i++) {
          cache.delete(keys[i]);
        }
        
        console.log(`🧹 Cache '${name}' cleaned: ${entriesToRemove} entries removed`);
      }
    });

    return cache;
  }

  /**
   * Optimize object for memory efficiency
   */
  optimizeObject<T extends object>(obj: T): T {
    // Remove undefined properties
    const optimized = {} as T;
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        (optimized as any)[key] = value;
      }
    }

    return optimized;
  }

  /**
   * Create weak reference for large objects
   */
  createWeakReference<T extends object>(obj: T): any {
    if (typeof (globalThis as any).WeakRef !== 'undefined') {
      return new (globalThis as any).WeakRef(obj);
    }
    
    // Fallback for environments without WeakRef
    return {
      deref: () => obj
    };
  }

  private async checkMemoryUsage(): Promise<void> {
    const usage = this.getMemoryUsageMB();
    if (!usage) return;

    performanceMonitor.recordMetric('memory_heap_used', usage.heapUsed, 'memory');
    performanceMonitor.recordMetric('memory_heap_total', usage.heapTotal, 'memory');
    performanceMonitor.recordMetric('memory_external', usage.external, 'memory');

    // Check thresholds and trigger cleanup if needed
    if (usage.heapUsed > this.memoryThresholds.critical) {
      console.warn(`🚨 Critical memory usage: ${usage.heapUsed.toFixed(2)} MB`);
      await this.forceCleanup();
    } else if (usage.heapUsed > this.memoryThresholds.cleanup) {
      console.warn(`🧹 High memory usage, triggering cleanup: ${usage.heapUsed.toFixed(2)} MB`);
      await this.forceCleanup();
    } else if (usage.heapUsed > this.memoryThresholds.warning) {
      console.warn(`⚠️ Memory usage warning: ${usage.heapUsed.toFixed(2)} MB`);
    }
  }

  private setupDefaultCleanupStrategies(): void {
    // Default cleanup strategy: clear temporary data
    this.registerCleanupStrategy('temp_data', async () => {
      // This would clear temporary data structures
      // Implementation depends on what temporary data exists
      console.log('🧹 Clearing temporary data');
    });

    // Default cleanup strategy: optimize objects
    this.registerCleanupStrategy('object_optimization', async () => {
      // This would run object optimization routines
      console.log('🧹 Running object optimization');
    });
  }
}

// Export singleton instance
export const memoryOptimizer = new MemoryOptimizer();