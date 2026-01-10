/**
 * Application Performance Profiler
 * 
 * This module provides comprehensive performance profiling for the Arc Browser application.
 * It measures app startup time, recommendation generation, search operations, and memory usage.
 * 
 * Requirements: 10.5 - Performance Optimization
 */

import { performance } from 'perf_hooks';
import * as process from 'process';
import { getJarvisRecommendations } from '../../core/recommender';
import { searchBookmarks, getAllBookmarks } from '../../core/bookmarkStore';
import { searchHistory, getRecentHistory } from '../../core/historyStore';
import { HistorySearchManager } from '../../core/historySearchManager';
import { HistoryEntry, Bookmark } from '../../core/types';

export interface PerformanceBenchmark {
  appStartup: number;           // < 2000ms
  recommendationGeneration: number; // < 500ms
  bookmarkSearch: number;       // < 100ms
  historySearch: number;        // < 200ms
  memoryUsage: number;          // < 200MB
}

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
  timestamp: number;
  dataSize?: number;
  success: boolean;
  error?: string;
}

export interface MemorySnapshot {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  timestamp: number;
}

export class AppPerformanceProfiler {
  private metrics: PerformanceMetrics[] = [];
  private memorySnapshots: MemorySnapshot[] = [];
  private startupTime: number = 0;

  constructor() {
    this.startupTime = performance.now();
  }

  /**
   * Get current memory usage in MB
   */
  private getMemoryUsage(): MemorySnapshot {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100,
      rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
      timestamp: performance.now()
    };
  }

  /**
   * Record a performance metric
   */
  private recordMetric(
    operation: string,
    startTime: number,
    memoryBefore: MemorySnapshot,
    dataSize?: number,
    error?: string
  ): PerformanceMetrics {
    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    
    const metric: PerformanceMetrics = {
      operation,
      duration: Math.round((endTime - startTime) * 100) / 100,
      memoryBefore: memoryBefore.heapUsed,
      memoryAfter: memoryAfter.heapUsed,
      memoryDelta: Math.round((memoryAfter.heapUsed - memoryBefore.heapUsed) * 100) / 100,
      timestamp: endTime,
      dataSize,
      success: !error,
      error
    };

    this.metrics.push(metric);
    this.memorySnapshots.push(memoryAfter);
    
    return metric;
  }

  /**
   * Measure app startup time
   * This simulates the time from app launch to ready state
   */
  async measureAppStartup(): Promise<PerformanceMetrics> {
    const startTime = performance.now();
    const memoryBefore = this.getMemoryUsage();
    
    try {
      // Simulate app initialization tasks
      await this.simulateAppInitialization();
      
      return this.recordMetric('App Startup', startTime, memoryBefore);
    } catch (error) {
      return this.recordMetric('App Startup', startTime, memoryBefore, undefined, error.message);
    }
  }

  /**
   * Simulate app initialization with realistic data loading
   */
  private async simulateAppInitialization(): Promise<void> {
    // Simulate loading history (this would normally happen during app startup)
    await getRecentHistory(1000);
    
    // Simulate loading bookmarks
    await getAllBookmarks();
    
    // Simulate initializing search index
    const historySearchManager = new HistorySearchManager();
    await historySearchManager.indexHistory();
    
    // Small delay to simulate other initialization tasks
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Profile recommendation generation performance
   */
  async profileRecommendationGeneration(iterations: number = 10): Promise<PerformanceMetrics[]> {
    const results: PerformanceMetrics[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      const memoryBefore = this.getMemoryUsage();
      
      try {
        const recommendations = await getJarvisRecommendations(5);
        const metric = this.recordMetric(
          `Recommendation Generation (${i + 1}/${iterations})`,
          startTime,
          memoryBefore,
          recommendations.length
        );
        results.push(metric);
        
        // Small delay between iterations to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (error) {
        const metric = this.recordMetric(
          `Recommendation Generation (${i + 1}/${iterations})`,
          startTime,
          memoryBefore,
          0,
          error.message
        );
        results.push(metric);
      }
    }
    
    return results;
  }

  /**
   * Profile bookmark search performance
   */
  async profileBookmarkSearch(queries: string[], iterations: number = 5): Promise<PerformanceMetrics[]> {
    const results: PerformanceMetrics[] = [];
    
    // First, get total bookmark count for context
    const allBookmarks = await getAllBookmarks();
    const totalBookmarks = allBookmarks.length;
    
    for (const query of queries) {
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const memoryBefore = this.getMemoryUsage();
        
        try {
          const searchResults = await searchBookmarks(query);
          const metric = this.recordMetric(
            `Bookmark Search: "${query}" (${i + 1}/${iterations})`,
            startTime,
            memoryBefore,
            totalBookmarks
          );
          results.push(metric);
        } catch (error) {
          const metric = this.recordMetric(
            `Bookmark Search: "${query}" (${i + 1}/${iterations})`,
            startTime,
            memoryBefore,
            totalBookmarks,
            error.message
          );
          results.push(metric);
        }
      }
    }
    
    return results;
  }

  /**
   * Profile history search performance
   */
  async profileHistorySearch(queries: string[], iterations: number = 5): Promise<PerformanceMetrics[]> {
    const results: PerformanceMetrics[] = [];
    
    // Initialize history search manager
    const historySearchManager = new HistorySearchManager();
    await historySearchManager.indexHistory();
    
    for (const query of queries) {
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const memoryBefore = this.getMemoryUsage();
        
        try {
          const searchResults = await historySearchManager.search({ query });
          const metric = this.recordMetric(
            `History Search: "${query}" (${i + 1}/${iterations})`,
            startTime,
            memoryBefore,
            searchResults.length
          );
          results.push(metric);
        } catch (error) {
          const metric = this.recordMetric(
            `History Search: "${query}" (${i + 1}/${iterations})`,
            startTime,
            memoryBefore,
            0,
            error.message
          );
          results.push(metric);
        }
      }
    }
    
    return results;
  }

  /**
   * Profile memory usage over time
   */
  async profileMemoryUsage(durationMs: number = 30000, intervalMs: number = 1000): Promise<MemorySnapshot[]> {
    const snapshots: MemorySnapshot[] = [];
    const startTime = performance.now();
    
    while (performance.now() - startTime < durationMs) {
      const snapshot = this.getMemoryUsage();
      snapshots.push(snapshot);
      this.memorySnapshots.push(snapshot);
      
      // Trigger some activity to simulate real usage
      await this.simulateUserActivity();
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    return snapshots;
  }

  /**
   * Simulate user activity for memory profiling
   */
  private async simulateUserActivity(): Promise<void> {
    try {
      // Simulate getting recommendations
      await getJarvisRecommendations(3);
      
      // Simulate a search
      await searchBookmarks('test');
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    } catch (error) {
      // Ignore errors during simulation
    }
  }

  /**
   * Run comprehensive performance benchmark
   */
  async runComprehensiveBenchmark(): Promise<{
    benchmark: PerformanceBenchmark;
    detailedMetrics: PerformanceMetrics[];
    memoryProfile: MemorySnapshot[];
    summary: string;
  }> {
    console.log('🚀 Starting comprehensive performance benchmark...');
    
    // Clear previous metrics
    this.metrics = [];
    this.memorySnapshots = [];
    
    // 1. Measure app startup
    console.log('📊 Measuring app startup time...');
    const startupMetric = await this.measureAppStartup();
    
    // 2. Profile recommendation generation
    console.log('🎯 Profiling recommendation generation...');
    const recommendationMetrics = await this.profileRecommendationGeneration(10);
    const avgRecommendationTime = recommendationMetrics.reduce((sum, m) => sum + m.duration, 0) / recommendationMetrics.length;
    
    // 3. Profile bookmark search
    console.log('🔍 Profiling bookmark search...');
    const bookmarkQueries = ['github', 'documentation', 'tutorial', 'api', 'test'];
    const bookmarkMetrics = await this.profileBookmarkSearch(bookmarkQueries, 3);
    const avgBookmarkSearchTime = bookmarkMetrics.reduce((sum, m) => sum + m.duration, 0) / bookmarkMetrics.length;
    
    // 4. Profile history search
    console.log('📚 Profiling history search...');
    const historyQueries = ['stackoverflow', 'react', 'typescript', 'performance', 'optimization'];
    const historyMetrics = await this.profileHistorySearch(historyQueries, 3);
    const avgHistorySearchTime = historyMetrics.reduce((sum, m) => sum + m.duration, 0) / historyMetrics.length;
    
    // 5. Profile memory usage
    console.log('💾 Profiling memory usage...');
    const memoryProfile = await this.profileMemoryUsage(10000, 500); // 10 seconds, every 500ms
    const maxMemoryUsage = Math.max(...memoryProfile.map(s => s.heapUsed));
    
    // Compile benchmark results
    const benchmark: PerformanceBenchmark = {
      appStartup: startupMetric.duration,
      recommendationGeneration: avgRecommendationTime,
      bookmarkSearch: avgBookmarkSearchTime,
      historySearch: avgHistorySearchTime,
      memoryUsage: maxMemoryUsage
    };
    
    // Generate summary
    const summary = this.generateBenchmarkSummary(benchmark);
    
    console.log('✅ Performance benchmark completed!');
    console.log(summary);
    
    return {
      benchmark,
      detailedMetrics: this.metrics,
      memoryProfile: this.memorySnapshots,
      summary
    };
  }

  /**
   * Generate a human-readable benchmark summary
   */
  private generateBenchmarkSummary(benchmark: PerformanceBenchmark): string {
    const requirements = {
      appStartup: 2000,
      recommendationGeneration: 500,
      bookmarkSearch: 100,
      historySearch: 200,
      memoryUsage: 200
    };

    const results = [
      `📊 Performance Benchmark Results`,
      `=====================================`,
      ``,
      `🚀 App Startup: ${benchmark.appStartup.toFixed(2)}ms ${benchmark.appStartup <= requirements.appStartup ? '✅' : '❌'} (target: <${requirements.appStartup}ms)`,
      `🎯 Recommendation Generation: ${benchmark.recommendationGeneration.toFixed(2)}ms ${benchmark.recommendationGeneration <= requirements.recommendationGeneration ? '✅' : '❌'} (target: <${requirements.recommendationGeneration}ms)`,
      `🔍 Bookmark Search: ${benchmark.bookmarkSearch.toFixed(2)}ms ${benchmark.bookmarkSearch <= requirements.bookmarkSearch ? '✅' : '❌'} (target: <${requirements.bookmarkSearch}ms)`,
      `📚 History Search: ${benchmark.historySearch.toFixed(2)}ms ${benchmark.historySearch <= requirements.historySearch ? '✅' : '❌'} (target: <${requirements.historySearch}ms)`,
      `💾 Memory Usage: ${benchmark.memoryUsage.toFixed(2)}MB ${benchmark.memoryUsage <= requirements.memoryUsage ? '✅' : '❌'} (target: <${requirements.memoryUsage}MB)`,
      ``,
      `Overall Status: ${this.allBenchmarksPassed(benchmark, requirements) ? '✅ PASSED' : '❌ FAILED'}`,
      ``
    ];

    return results.join('\n');
  }

  /**
   * Check if all benchmarks passed their requirements
   */
  private allBenchmarksPassed(benchmark: PerformanceBenchmark, requirements: PerformanceBenchmark): boolean {
    return (
      benchmark.appStartup <= requirements.appStartup &&
      benchmark.recommendationGeneration <= requirements.recommendationGeneration &&
      benchmark.bookmarkSearch <= requirements.bookmarkSearch &&
      benchmark.historySearch <= requirements.historySearch &&
      benchmark.memoryUsage <= requirements.memoryUsage
    );
  }

  /**
   * Export metrics to JSON for analysis
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      memorySnapshots: this.memorySnapshots,
      timestamp: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get all memory snapshots
   */
  getMemorySnapshots(): MemorySnapshot[] {
    return [...this.memorySnapshots];
  }

  /**
   * Clear all recorded data
   */
  clear(): void {
    this.metrics = [];
    this.memorySnapshots = [];
  }
}

// Export singleton instance for easy use
export const performanceProfiler = new AppPerformanceProfiler();

// Export helper functions for specific profiling needs
export async function quickBenchmark(): Promise<PerformanceBenchmark> {
  const profiler = new AppPerformanceProfiler();
  const result = await profiler.runComprehensiveBenchmark();
  return result.benchmark;
}

export async function profileOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  const profiler = new AppPerformanceProfiler();
  const startTime = performance.now();
  const memoryBefore = profiler['getMemoryUsage']();
  
  try {
    const result = await operation();
    const metrics = profiler['recordMetric'](operationName, startTime, memoryBefore);
    return { result, metrics };
  } catch (error) {
    const metrics = profiler['recordMetric'](operationName, startTime, memoryBefore, undefined, error.message);
    throw error;
  }
}