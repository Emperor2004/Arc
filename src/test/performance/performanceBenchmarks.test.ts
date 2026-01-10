/**
 * Performance Benchmarks Test Suite
 * 
 * This test suite runs comprehensive performance benchmarks for the Arc Browser application.
 * It validates that all performance requirements from Requirement 10.5 are met.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { AppPerformanceProfiler, PerformanceBenchmark, quickBenchmark } from './appPerformanceProfiler';
import { addBookmark, clearBookmarks } from '../../core/bookmarkStore';
import { addHistoryEntry, clearHistory } from '../../core/historyStore';
import { HistoryEntry, Bookmark } from '../../core/types';

// Mock file system operations to avoid actual file I/O during tests
vi.mock('fs');
vi.mock('path');

describe('Performance Benchmarks - Requirement 10.5', () => {
  let profiler: AppPerformanceProfiler;

  beforeAll(async () => {
    profiler = new AppPerformanceProfiler();
    
    // Set up test data for realistic performance testing
    await setupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    clearBookmarks();
    clearHistory();
  });

  /**
   * Set up realistic test data for performance testing
   */
  async function setupTestData(): Promise<void> {
    // Clear existing data
    clearBookmarks();
    clearHistory();

    // Add realistic bookmarks (simulate 1000+ bookmarks)
    const domains = [
      'github.com', 'stackoverflow.com', 'google.com', 'microsoft.com',
      'mozilla.org', 'w3.org', 'npmjs.com', 'typescript.org',
      'reactjs.org', 'nodejs.org', 'developer.mozilla.org', 'docs.microsoft.com',
      'medium.com', 'dev.to', 'hackernews.com', 'reddit.com'
    ];

    const bookmarkTitles = [
      'Documentation', 'Tutorial', 'Guide', 'Reference', 'API',
      'Examples', 'Getting Started', 'Advanced Topics', 'Best Practices',
      'Troubleshooting', 'FAQ', 'Community', 'Blog Post', 'News'
    ];

    // Add 1000 bookmarks for realistic testing
    for (let i = 0; i < 1000; i++) {
      const domain = domains[i % domains.length];
      const title = bookmarkTitles[i % bookmarkTitles.length];
      const url = `https://${domain}/page-${i}`;
      const bookmarkTitle = `${title} - ${domain}`;
      const tags = [`tag${i % 10}`, `category${i % 5}`];
      
      addBookmark(url, bookmarkTitle, tags);
    }

    // Add realistic history entries (simulate 10,000+ entries)
    const historyTitles = [
      'React Documentation', 'TypeScript Handbook', 'Node.js Guide',
      'Performance Optimization', 'Web Development', 'JavaScript Tutorial',
      'CSS Grid Layout', 'API Design', 'Database Management', 'Security Best Practices'
    ];

    // Add 10,000 history entries for realistic testing
    for (let i = 0; i < 10000; i++) {
      const domain = domains[i % domains.length];
      const title = historyTitles[i % historyTitles.length];
      const url = `https://${domain}/article-${i}`;
      const historyTitle = `${title} - ${domain}`;
      
      addHistoryEntry(url, historyTitle);
    }
  }

  describe('App Startup Performance', () => {
    it('should start up within 2 seconds with large dataset', async () => {
      const startupMetric = await profiler.measureAppStartup();
      
      expect(startupMetric.success).toBe(true);
      expect(startupMetric.duration).toBeLessThan(2000);
      expect(startupMetric.memoryDelta).toBeLessThan(50); // Should not use more than 50MB during startup
      
      console.log(`✅ App startup: ${startupMetric.duration.toFixed(2)}ms (memory: +${startupMetric.memoryDelta.toFixed(2)}MB)`);
    }, 10000); // 10 second timeout for startup test

    it('should handle multiple startup simulations consistently', async () => {
      const startupTimes: number[] = [];
      
      for (let i = 0; i < 3; i++) {
        const metric = await profiler.measureAppStartup();
        expect(metric.success).toBe(true);
        startupTimes.push(metric.duration);
      }
      
      // All startup times should be within acceptable range
      startupTimes.forEach(time => {
        expect(time).toBeLessThan(2000);
      });
      
      // Startup times should be relatively consistent (within 50% variance)
      const avgTime = startupTimes.reduce((sum, time) => sum + time, 0) / startupTimes.length;
      const maxVariance = avgTime * 0.5;
      
      startupTimes.forEach(time => {
        expect(Math.abs(time - avgTime)).toBeLessThan(maxVariance);
      });
      
      console.log(`✅ Consistent startup times: ${startupTimes.map(t => t.toFixed(2)).join('ms, ')}ms`);
    }, 15000);
  });

  describe('Recommendation Generation Performance', () => {
    it('should generate recommendations within 500ms', async () => {
      const metrics = await profiler.profileRecommendationGeneration(5);
      
      metrics.forEach(metric => {
        expect(metric.success).toBe(true);
        expect(metric.duration).toBeLessThan(500);
      });
      
      const avgTime = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
      console.log(`✅ Recommendation generation: ${avgTime.toFixed(2)}ms average`);
    }, 10000);

    it('should maintain performance with repeated generation', async () => {
      const metrics = await profiler.profileRecommendationGeneration(10);
      
      // All iterations should be within limits
      metrics.forEach((metric, index) => {
        expect(metric.success).toBe(true);
        expect(metric.duration).toBeLessThan(500);
      });
      
      // Performance should not degrade significantly over iterations
      const firstHalf = metrics.slice(0, 5);
      const secondHalf = metrics.slice(5);
      
      const firstHalfAvg = firstHalf.reduce((sum, m) => sum + m.duration, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, m) => sum + m.duration, 0) / secondHalf.length;
      
      // Second half should not be more than 50% slower than first half
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.5);
      
      console.log(`✅ Recommendation performance consistency: ${firstHalfAvg.toFixed(2)}ms → ${secondHalfAvg.toFixed(2)}ms`);
    }, 15000);
  });

  describe('Bookmark Search Performance', () => {
    it('should search bookmarks within 100ms', async () => {
      const queries = ['github', 'documentation', 'tutorial', 'api', 'react'];
      const metrics = await profiler.profileBookmarkSearch(queries, 3);
      
      metrics.forEach(metric => {
        expect(metric.success).toBe(true);
        expect(metric.duration).toBeLessThan(100);
      });
      
      const avgTime = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
      console.log(`✅ Bookmark search: ${avgTime.toFixed(2)}ms average across ${metrics.length} searches`);
    }, 10000);

    it('should handle edge case searches efficiently', async () => {
      const edgeCaseQueries = [
        '', // Empty query
        'a', // Single character
        'nonexistentquerythatshouldfindnothing', // No matches expected
        'github.com/microsoft/vscode/issues/12345', // Very specific
        'documentation tutorial guide api reference' // Multiple words
      ];
      
      const metrics = await profiler.profileBookmarkSearch(edgeCaseQueries, 2);
      
      metrics.forEach(metric => {
        expect(metric.success).toBe(true);
        expect(metric.duration).toBeLessThan(100);
      });
      
      console.log(`✅ Edge case bookmark searches completed within limits`);
    }, 8000);
  });

  describe('History Search Performance', () => {
    it('should search history within 200ms', async () => {
      const queries = ['stackoverflow', 'react', 'typescript', 'performance', 'optimization'];
      const metrics = await profiler.profileHistorySearch(queries, 3);
      
      metrics.forEach(metric => {
        expect(metric.success).toBe(true);
        expect(metric.duration).toBeLessThan(200);
      });
      
      const avgTime = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
      console.log(`✅ History search: ${avgTime.toFixed(2)}ms average across ${metrics.length} searches`);
    }, 12000);

    it('should handle complex history searches efficiently', async () => {
      const complexQueries = [
        'react typescript tutorial',
        'performance optimization guide',
        'javascript async await',
        'css grid flexbox layout',
        'node.js express mongodb'
      ];
      
      const metrics = await profiler.profileHistorySearch(complexQueries, 2);
      
      metrics.forEach(metric => {
        expect(metric.success).toBe(true);
        expect(metric.duration).toBeLessThan(200);
      });
      
      console.log(`✅ Complex history searches completed within limits`);
    }, 10000);
  });

  describe('Memory Usage Performance', () => {
    it('should maintain memory usage under 200MB', async () => {
      const memoryProfile = await profiler.profileMemoryUsage(5000, 500); // 5 seconds, every 500ms
      
      expect(memoryProfile.length).toBeGreaterThan(5); // Should have multiple snapshots
      
      const maxMemoryUsage = Math.max(...memoryProfile.map(s => s.heapUsed));
      expect(maxMemoryUsage).toBeLessThan(200);
      
      const avgMemoryUsage = memoryProfile.reduce((sum, s) => sum + s.heapUsed, 0) / memoryProfile.length;
      
      console.log(`✅ Memory usage: ${maxMemoryUsage.toFixed(2)}MB max, ${avgMemoryUsage.toFixed(2)}MB average`);
    }, 10000);

    it('should not have significant memory leaks', async () => {
      const initialMemory = profiler['getMemoryUsage']();
      
      // Perform multiple operations that could cause memory leaks
      for (let i = 0; i < 10; i++) {
        await profiler.profileRecommendationGeneration(2);
        await profiler.profileBookmarkSearch(['test'], 1);
        await profiler.profileHistorySearch(['test'], 1);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalMemory = profiler['getMemoryUsage']();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50);
      
      console.log(`✅ Memory leak test: +${memoryIncrease.toFixed(2)}MB after operations`);
    }, 15000);
  });

  describe('Comprehensive Benchmark', () => {
    it('should pass all performance requirements', async () => {
      const result = await profiler.runComprehensiveBenchmark();
      
      const { benchmark } = result;
      
      // Validate all benchmarks meet requirements
      expect(benchmark.appStartup).toBeLessThan(2000);
      expect(benchmark.recommendationGeneration).toBeLessThan(500);
      expect(benchmark.bookmarkSearch).toBeLessThan(100);
      expect(benchmark.historySearch).toBeLessThan(200);
      expect(benchmark.memoryUsage).toBeLessThan(200);
      
      // Log the summary for visibility
      console.log('\n' + result.summary);
      
      // Ensure we have detailed metrics
      expect(result.detailedMetrics.length).toBeGreaterThan(0);
      expect(result.memoryProfile.length).toBeGreaterThan(0);
      
      // All operations should have succeeded
      const failedOperations = result.detailedMetrics.filter(m => !m.success);
      expect(failedOperations.length).toBe(0);
      
    }, 30000); // 30 second timeout for comprehensive benchmark

    it('should export metrics for analysis', async () => {
      const result = await profiler.runComprehensiveBenchmark();
      const exportedMetrics = profiler.exportMetrics();
      
      expect(exportedMetrics).toBeTruthy();
      
      const parsed = JSON.parse(exportedMetrics);
      expect(parsed.metrics).toBeDefined();
      expect(parsed.memorySnapshots).toBeDefined();
      expect(parsed.timestamp).toBeDefined();
      
      console.log(`✅ Exported ${parsed.metrics.length} metrics and ${parsed.memorySnapshots.length} memory snapshots`);
    }, 20000);
  });

  describe('Quick Benchmark Utility', () => {
    it('should provide quick benchmark results', async () => {
      const benchmark = await quickBenchmark();
      
      expect(benchmark.appStartup).toBeGreaterThan(0);
      expect(benchmark.recommendationGeneration).toBeGreaterThan(0);
      expect(benchmark.bookmarkSearch).toBeGreaterThan(0);
      expect(benchmark.historySearch).toBeGreaterThan(0);
      expect(benchmark.memoryUsage).toBeGreaterThan(0);
      
      console.log(`✅ Quick benchmark completed: ${JSON.stringify(benchmark, null, 2)}`);
    }, 25000);
  });
});