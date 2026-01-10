import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitor } from '../../core/performance/PerformanceMonitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    vi.useFakeTimers();
  });

  afterEach(() => {
    monitor.stopMonitoring();
    vi.useRealTimers();
  });

  it('should record and retrieve metrics', () => {
    monitor.recordMetric('test_metric', 100, 'timing');
    
    const metrics = monitor.getMetrics('test_metric');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe('test_metric');
    expect(metrics[0].value).toBe(100);
    expect(metrics[0].category).toBe('timing');
  });

  it('should record timing metrics', () => {
    const startTime = performance.now();
    vi.advanceTimersByTime(50);
    
    monitor.recordTiming('operation_time', startTime);
    
    const latest = monitor.getLatestMetric('operation_time');
    expect(latest?.category).toBe('timing');
    expect(latest?.value).toBeGreaterThan(0);
  });

  it('should time function execution', async () => {
    const testFunction = vi.fn().mockResolvedValue('result');
    
    const result = await monitor.timeFunction('async_operation', testFunction);
    
    expect(result).toBe('result');
    expect(testFunction).toHaveBeenCalled();
    
    const metrics = monitor.getMetrics('async_operation');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].category).toBe('timing');
  });

  it('should handle function execution errors', async () => {
    const errorFunction = vi.fn().mockRejectedValue(new Error('Test error'));
    
    await expect(monitor.timeFunction('error_operation', errorFunction)).rejects.toThrow('Test error');
    
    const errorMetrics = monitor.getMetrics('error_operation_error');
    expect(errorMetrics).toHaveLength(1);
  });

  it('should get latest metric', () => {
    monitor.recordMetric('test_metric', 100);
    monitor.recordMetric('test_metric', 200);
    monitor.recordMetric('test_metric', 300);
    
    const latest = monitor.getLatestMetric('test_metric');
    expect(latest?.value).toBe(300);
  });

  it('should calculate average metrics', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    
    monitor.recordMetric('test_metric', 100);
    monitor.recordMetric('test_metric', 200);
    monitor.recordMetric('test_metric', 300);
    
    const average = monitor.getAverageMetric('test_metric', 60000);
    expect(average).toBe(200); // (100 + 200 + 300) / 3
  });

  it('should filter metrics by time period for average', () => {
    const now = Date.now();
    
    // Old metric (outside time period)
    vi.setSystemTime(now - 120000); // 2 minutes ago
    monitor.recordMetric('test_metric', 100);
    
    // Recent metrics (within time period)
    vi.setSystemTime(now - 30000); // 30 seconds ago
    monitor.recordMetric('test_metric', 200);
    monitor.recordMetric('test_metric', 300);
    
    vi.setSystemTime(now);
    
    const average = monitor.getAverageMetric('test_metric', 60000); // Last minute
    expect(average).toBe(250); // (200 + 300) / 2, excluding the old metric
  });

  it('should set and check thresholds', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    monitor.setThreshold('test_metric', 100, 200);
    monitor.recordMetric('test_metric', 150); // Should trigger warning
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('WARNING: test_metric = 150')
    );
    
    consoleSpy.mockRestore();
  });

  it('should notify observers', () => {
    const observer = vi.fn();
    const unsubscribe = monitor.subscribe('test_metric', observer);
    
    monitor.recordMetric('test_metric', 100);
    
    expect(observer).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'test_metric',
        value: 100
      })
    );
    
    unsubscribe();
    monitor.recordMetric('test_metric', 200);
    
    expect(observer).toHaveBeenCalledTimes(1); // Should not be called after unsubscribe
  });

  it('should generate performance report', () => {
    monitor.recordMetric('startup_time', 500, 'timing');
    monitor.recordMetric('memory_usage', 100, 'memory');
    
    const report = monitor.generateReport();
    
    expect(report).toContain('Performance Report');
    expect(report).toContain('startup_time');
    expect(report).toContain('memory_usage');
    expect(report).toContain('500.00');
    expect(report).toContain('100.00');
  });

  it('should clear all metrics', () => {
    monitor.recordMetric('test_metric1', 100);
    monitor.recordMetric('test_metric2', 200);
    
    expect(monitor.getMetricNames()).toHaveLength(2);
    
    monitor.clearMetrics();
    
    expect(monitor.getMetricNames()).toHaveLength(0);
  });

  it('should limit metric history to 100 entries', () => {
    // Record 150 metrics
    for (let i = 0; i < 150; i++) {
      monitor.recordMetric('test_metric', i);
    }
    
    const metrics = monitor.getMetrics('test_metric');
    expect(metrics).toHaveLength(100);
    
    // Should keep the most recent 100
    expect(metrics[0].value).toBe(50); // First kept metric
    expect(metrics[99].value).toBe(149); // Last metric
  });

  it('should handle observer errors gracefully', () => {
    const errorObserver = vi.fn().mockImplementation(() => {
      throw new Error('Observer error');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    monitor.subscribe('test_metric', errorObserver);
    monitor.recordMetric('test_metric', 100);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error in performance metric observer:',
      expect.any(Error)
    );
    
    consoleSpy.mockRestore();
  });
});