/**
 * Performance monitoring system for tracking application performance
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'timing' | 'memory' | 'count' | 'custom';
}

export interface PerformanceThresholds {
  [key: string]: {
    warning: number;
    critical: number;
  };
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private thresholds: PerformanceThresholds = {};
  private observers: Map<string, ((metric: PerformanceMetric) => void)[]> = new Map();
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    this.setupDefaultThresholds();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    
    // Monitor memory usage periodically
    this.monitoringInterval = setInterval(() => {
      this.recordMemoryUsage();
    }, intervalMs);

    // Monitor performance observer if available
    if (typeof PerformanceObserver !== 'undefined') {
      this.setupPerformanceObserver();
    }
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    name: string, 
    value: number, 
    category: PerformanceMetric['category'] = 'custom'
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      category
    };

    // Store metric
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const metricHistory = this.metrics.get(name)!;
    metricHistory.push(metric);
    
    // Keep only last 100 metrics per type
    if (metricHistory.length > 100) {
      metricHistory.shift();
    }

    // Check thresholds
    this.checkThresholds(metric);

    // Notify observers
    this.notifyObservers(name, metric);
  }

  /**
   * Record timing metric
   */
  recordTiming(name: string, startTime: number, endTime?: number): void {
    const end = endTime || performance.now();
    const duration = end - startTime;
    this.recordMetric(name, duration, 'timing');
  }

  /**
   * Time a function execution
   */
  async timeFunction<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await fn();
      this.recordTiming(name, startTime);
      return result;
    } catch (error) {
      this.recordTiming(`${name}_error`, startTime);
      throw error;
    }
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      this.recordMetric('memory_heap_used', memory.heapUsed / 1024 / 1024, 'memory');
      this.recordMetric('memory_heap_total', memory.heapTotal / 1024 / 1024, 'memory');
      this.recordMetric('memory_external', memory.external / 1024 / 1024, 'memory');
    }
  }

  /**
   * Get metrics for a specific name
   */
  getMetrics(name: string): PerformanceMetric[] {
    return this.metrics.get(name) || [];
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Get latest metric value
   */
  getLatestMetric(name: string): PerformanceMetric | undefined {
    const metrics = this.getMetrics(name);
    return metrics[metrics.length - 1];
  }

  /**
   * Get average metric value over time period
   */
  getAverageMetric(name: string, timePeriodMs: number = 60000): number {
    const metrics = this.getMetrics(name);
    const cutoffTime = Date.now() - timePeriodMs;
    
    const recentMetrics = metrics.filter(m => m.timestamp >= cutoffTime);
    
    if (recentMetrics.length === 0) {
      return 0;
    }
    
    const sum = recentMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / recentMetrics.length;
  }

  /**
   * Set performance thresholds
   */
  setThreshold(name: string, warning: number, critical: number): void {
    this.thresholds[name] = { warning, critical };
  }

  /**
   * Subscribe to metric updates
   */
  subscribe(name: string, callback: (metric: PerformanceMetric) => void): () => void {
    if (!this.observers.has(name)) {
      this.observers.set(name, []);
    }
    
    this.observers.get(name)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.observers.get(name);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const report: string[] = [
      '=== Performance Report ===',
      `Generated at: ${new Date().toISOString()}`,
      ''
    ];

    for (const name of this.getMetricNames()) {
      const latest = this.getLatestMetric(name);
      const average = this.getAverageMetric(name);
      
      if (latest) {
        report.push(`${name}:`);
        report.push(`  Latest: ${latest.value.toFixed(2)} (${latest.category})`);
        report.push(`  Average (1min): ${average.toFixed(2)}`);
        report.push('');
      }
    }

    return report.join('\n');
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  private setupDefaultThresholds(): void {
    this.thresholds = {
      'memory_heap_used': { warning: 100, critical: 200 }, // MB
      'search_time': { warning: 100, critical: 500 }, // ms
      'recommendation_time': { warning: 200, critical: 1000 }, // ms
      'startup_time': { warning: 500, critical: 2000 } // ms
    };
  }

  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.thresholds[metric.name];
    if (!threshold) {
      return;
    }

    if (metric.value >= threshold.critical) {
      console.error(`CRITICAL: ${metric.name} = ${metric.value} (threshold: ${threshold.critical})`);
    } else if (metric.value >= threshold.warning) {
      console.warn(`WARNING: ${metric.name} = ${metric.value} (threshold: ${threshold.warning})`);
    }
  }

  private notifyObservers(name: string, metric: PerformanceMetric): void {
    const callbacks = this.observers.get(name);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(metric);
        } catch (error) {
          console.error('Error in performance metric observer:', error);
        }
      });
    }
  }

  private setupPerformanceObserver(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric(
            `perf_${entry.name}`,
            entry.duration || entry.startTime,
            'timing'
          );
        }
      });

      observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    } catch (error) {
      console.warn('PerformanceObserver not available:', error);
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();