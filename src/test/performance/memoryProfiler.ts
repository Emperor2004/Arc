/**
 * Memory Profiler Utility
 * 
 * This utility provides real-time memory monitoring and leak detection
 * for the Arc Browser application during development and testing.
 */

import { performance } from 'perf_hooks';
import * as process from 'process';

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

export interface MemoryLeak {
  startSnapshot: MemorySnapshot;
  endSnapshot: MemorySnapshot;
  leakRate: number; // MB per second
  duration: number; // milliseconds
  severity: 'low' | 'medium' | 'high';
}

export class MemoryProfiler {
  private snapshots: MemorySnapshot[] = [];
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private leakThreshold: number = 1; // MB per minute

  constructor(leakThreshold: number = 1) {
    this.leakThreshold = leakThreshold;
  }

  /**
   * Take a memory snapshot
   */
  takeSnapshot(): MemorySnapshot {
    const memUsage = process.memoryUsage();
    const snapshot: MemorySnapshot = {
      timestamp: performance.now(),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100,
      rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
      arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024 * 100) / 100
    };

    this.snapshots.push(snapshot);
    return snapshot;
  }

  /**
   * Start continuous memory monitoring
   */
  startMonitoring(intervalMs: number = 1000): void {
    if (this.isMonitoring) {
      console.warn('Memory monitoring is already active');
      return;
    }

    this.isMonitoring = true;
    this.snapshots = []; // Clear previous snapshots
    
    console.log(`🔍 Starting memory monitoring (interval: ${intervalMs}ms)`);
    
    // Take initial snapshot
    this.takeSnapshot();
    
    this.monitoringInterval = setInterval(() => {
      this.takeSnapshot();
    }, intervalMs);
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): MemorySnapshot[] {
    if (!this.isMonitoring) {
      console.warn('Memory monitoring is not active');
      return [];
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log(`✅ Memory monitoring stopped. Collected ${this.snapshots.length} snapshots`);
    
    return [...this.snapshots];
  }

  /**
   * Analyze memory usage for potential leaks
   */
  analyzeMemoryLeaks(): MemoryLeak[] {
    if (this.snapshots.length < 10) {
      console.warn('Not enough snapshots for leak analysis (minimum 10 required)');
      return [];
    }

    const leaks: MemoryLeak[] = [];
    const windowSize = 10; // Analyze in windows of 10 snapshots
    
    for (let i = 0; i <= this.snapshots.length - windowSize; i += windowSize) {
      const windowSnapshots = this.snapshots.slice(i, i + windowSize);
      const startSnapshot = windowSnapshots[0];
      const endSnapshot = windowSnapshots[windowSnapshots.length - 1];
      
      const duration = endSnapshot.timestamp - startSnapshot.timestamp;
      const memoryIncrease = endSnapshot.heapUsed - startSnapshot.heapUsed;
      const leakRate = (memoryIncrease / duration) * 1000 * 60; // MB per minute
      
      if (leakRate > this.leakThreshold) {
        const severity = this.classifyLeakSeverity(leakRate);
        
        leaks.push({
          startSnapshot,
          endSnapshot,
          leakRate,
          duration,
          severity
        });
      }
    }

    return leaks;
  }

  /**
   * Classify leak severity based on leak rate
   */
  private classifyLeakSeverity(leakRate: number): 'low' | 'medium' | 'high' {
    if (leakRate > 10) return 'high';
    if (leakRate > 5) return 'medium';
    return 'low';
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    min: MemorySnapshot;
    max: MemorySnapshot;
    avg: Omit<MemorySnapshot, 'timestamp'>;
    trend: 'increasing' | 'decreasing' | 'stable';
  } | null {
    if (this.snapshots.length === 0) {
      return null;
    }

    const heapUsedValues = this.snapshots.map(s => s.heapUsed);
    const heapTotalValues = this.snapshots.map(s => s.heapTotal);
    const externalValues = this.snapshots.map(s => s.external);
    const rssValues = this.snapshots.map(s => s.rss);
    const arrayBuffersValues = this.snapshots.map(s => s.arrayBuffers);

    const min = this.snapshots.reduce((min, current) => 
      current.heapUsed < min.heapUsed ? current : min
    );

    const max = this.snapshots.reduce((max, current) => 
      current.heapUsed > max.heapUsed ? current : max
    );

    const avg = {
      heapUsed: Math.round(heapUsedValues.reduce((sum, val) => sum + val, 0) / heapUsedValues.length * 100) / 100,
      heapTotal: Math.round(heapTotalValues.reduce((sum, val) => sum + val, 0) / heapTotalValues.length * 100) / 100,
      external: Math.round(externalValues.reduce((sum, val) => sum + val, 0) / externalValues.length * 100) / 100,
      rss: Math.round(rssValues.reduce((sum, val) => sum + val, 0) / rssValues.length * 100) / 100,
      arrayBuffers: Math.round(arrayBuffersValues.reduce((sum, val) => sum + val, 0) / arrayBuffersValues.length * 100) / 100
    };

    // Determine trend
    const firstQuarter = this.snapshots.slice(0, Math.floor(this.snapshots.length / 4));
    const lastQuarter = this.snapshots.slice(-Math.floor(this.snapshots.length / 4));
    
    const firstQuarterAvg = firstQuarter.reduce((sum, s) => sum + s.heapUsed, 0) / firstQuarter.length;
    const lastQuarterAvg = lastQuarter.reduce((sum, s) => sum + s.heapUsed, 0) / lastQuarter.length;
    
    const trendThreshold = 2; // MB
    let trend: 'increasing' | 'decreasing' | 'stable';
    
    if (lastQuarterAvg - firstQuarterAvg > trendThreshold) {
      trend = 'increasing';
    } else if (firstQuarterAvg - lastQuarterAvg > trendThreshold) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    return { min, max, avg, trend };
  }

  /**
   * Generate a memory usage report
   */
  generateReport(): string {
    const stats = this.getMemoryStats();
    const leaks = this.analyzeMemoryLeaks();
    
    if (!stats) {
      return 'No memory data available. Start monitoring first.';
    }

    const report = [
      '📊 Memory Usage Report',
      '====================',
      '',
      `📈 Snapshots Collected: ${this.snapshots.length}`,
      `⏱️  Duration: ${((this.snapshots[this.snapshots.length - 1]?.timestamp || 0) - (this.snapshots[0]?.timestamp || 0)) / 1000}s`,
      '',
      '💾 Memory Statistics:',
      `   Min Heap Used: ${stats.min.heapUsed}MB`,
      `   Max Heap Used: ${stats.max.heapUsed}MB`,
      `   Avg Heap Used: ${stats.avg.heapUsed}MB`,
      `   Trend: ${stats.trend === 'increasing' ? '📈' : stats.trend === 'decreasing' ? '📉' : '➡️'} ${stats.trend}`,
      '',
      `🔍 Memory Leak Analysis:`,
      `   Leaks Detected: ${leaks.length}`,
    ];

    if (leaks.length > 0) {
      report.push('   Leak Details:');
      leaks.forEach((leak, index) => {
        const emoji = leak.severity === 'high' ? '🚨' : leak.severity === 'medium' ? '⚠️' : '💡';
        report.push(`     ${emoji} Leak ${index + 1}: ${leak.leakRate.toFixed(2)}MB/min (${leak.severity} severity)`);
      });
    } else {
      report.push('   ✅ No significant memory leaks detected');
    }

    return report.join('\n');
  }

  /**
   * Export snapshots to JSON
   */
  exportSnapshots(): string {
    return JSON.stringify({
      snapshots: this.snapshots,
      stats: this.getMemoryStats(),
      leaks: this.analyzeMemoryLeaks(),
      timestamp: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Clear all snapshots
   */
  clear(): void {
    this.snapshots = [];
  }

  /**
   * Get current memory usage without storing snapshot
   */
  getCurrentMemoryUsage(): MemorySnapshot {
    const memUsage = process.memoryUsage();
    return {
      timestamp: performance.now(),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100,
      rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
      arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024 * 100) / 100
    };
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): boolean {
    if (global.gc) {
      global.gc();
      return true;
    }
    return false;
  }
}

// Export singleton instance for easy use
export const memoryProfiler = new MemoryProfiler();

// Utility function for quick memory monitoring
export async function monitorMemoryDuring<T>(
  operation: () => Promise<T>,
  intervalMs: number = 100
): Promise<{ result: T; snapshots: MemorySnapshot[]; report: string }> {
  const profiler = new MemoryProfiler();
  
  profiler.startMonitoring(intervalMs);
  
  try {
    const result = await operation();
    const snapshots = profiler.stopMonitoring();
    const report = profiler.generateReport();
    
    return { result, snapshots, report };
  } catch (error) {
    profiler.stopMonitoring();
    throw error;
  }
}