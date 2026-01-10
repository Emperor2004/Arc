import { OptimizedBookmarkStore } from './OptimizedBookmarkStore';
import { LazyHistoryLoader } from './LazyHistoryLoader';
import { PerformanceMonitor, performanceMonitor } from './PerformanceMonitor';
import { LRUCache } from './LRUCache';
import { memoryOptimizer } from './MemoryOptimizer';

/**
 * Central performance optimization manager
 */
export class PerformanceOptimizer {
  private optimizedBookmarkStore: OptimizedBookmarkStore;
  private lazyHistoryLoader: LazyHistoryLoader;
  private recommendationCache: LRUCache<string, any[]>;
  private searchCache: LRUCache<string, any[]>;
  private isInitialized: boolean = false;

  constructor() {
    this.optimizedBookmarkStore = new OptimizedBookmarkStore(200);
    this.lazyHistoryLoader = new LazyHistoryLoader(50, 20);
    
    // Use memory-managed caches
    this.recommendationCache = memoryOptimizer.createManagedCache('recommendations', 50);
    this.searchCache = memoryOptimizer.createManagedCache('search', 100);
  }

  /**
   * Initialize performance optimizations
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('🚀 Initializing performance optimizations...');

    // Start performance monitoring
    performanceMonitor.startMonitoring(10000); // Monitor every 10 seconds

    // Start memory monitoring
    memoryOptimizer.startMonitoring(30000); // Monitor every 30 seconds

    // Set up performance thresholds
    this.setupPerformanceThresholds();

    // Set up performance observers
    this.setupPerformanceObservers();

    this.isInitialized = true;
    console.log('✅ Performance optimizations initialized');
  }

  /**
   * Get optimized bookmark store
   */
  getOptimizedBookmarkStore(): OptimizedBookmarkStore {
    return this.optimizedBookmarkStore;
  }

  /**
   * Get lazy history loader
   */
  getLazyHistoryLoader(): LazyHistoryLoader {
    return this.lazyHistoryLoader;
  }

  /**
   * Cache recommendations with TTL
   */
  cacheRecommendations(key: string, recommendations: any[], ttlMs: number = 300000): void {
    const cacheEntry = {
      data: recommendations,
      timestamp: Date.now(),
      ttl: ttlMs
    };
    
    this.recommendationCache.set(key, cacheEntry as any);
  }

  /**
   * Get cached recommendations
   */
  getCachedRecommendations(key: string): any[] | null {
    const cached = this.recommendationCache.get(key) as any;
    
    if (!cached) {
      return null;
    }

    // Check if cache entry is still valid
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.recommendationCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Cache search results
   */
  cacheSearchResults(query: string, results: any[]): void {
    this.searchCache.set(query.toLowerCase(), results);
  }

  /**
   * Get cached search results
   */
  getCachedSearchResults(query: string): any[] | null {
    return this.searchCache.get(query.toLowerCase()) || null;
  }

  /**
   * Optimize application startup
   */
  async optimizeStartup(): Promise<void> {
    const startTime = performance.now();

    try {
      // Preload critical data
      await this.preloadCriticalData();

      // Initialize lazy loaders
      await this.initializeLazyLoaders();

      // Warm up caches
      await this.warmupCaches();

      const endTime = performance.now();
      performanceMonitor.recordTiming('optimized_startup', startTime, endTime);

      console.log(`🎯 Startup optimization completed in ${(endTime - startTime).toFixed(2)}ms`);
    } catch (error) {
      console.error('❌ Startup optimization failed:', error);
      performanceMonitor.recordMetric('startup_optimization_error', 1, 'count');
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    bookmarkCache: any;
    historyCache: any;
    recommendationCache: { size: number; capacity: number };
    searchCache: { size: number; capacity: number };
    memoryUsage?: NodeJS.MemoryUsage;
  } {
    const stats: any = {
      bookmarkCache: this.optimizedBookmarkStore.getCacheStats(),
      historyCache: this.lazyHistoryLoader.getCacheStats(),
      recommendationCache: {
        size: this.recommendationCache.size(),
        capacity: 50
      },
      searchCache: {
        size: this.searchCache.size(),
        capacity: 100
      }
    };

    // Add memory usage if available
    if (typeof process !== 'undefined' && process.memoryUsage) {
      stats.memoryUsage = process.memoryUsage();
    }

    return stats;
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.optimizedBookmarkStore.clearBookmarks();
    this.lazyHistoryLoader.clear();
    this.recommendationCache.clear();
    this.searchCache.clear();
    
    console.log('🧹 All performance caches cleared');
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): string {
    const stats = this.getPerformanceStats();
    const monitorReport = performanceMonitor.generateReport();
    
    const report = [
      '=== Performance Optimization Report ===',
      '',
      'Cache Statistics:',
      `  Bookmark Cache: ${stats.bookmarkCache.searchCacheSize} search, ${stats.bookmarkCache.tagCacheSize} tag, ${stats.bookmarkCache.indexCacheSize} index`,
      `  History Cache: ${stats.historyCache.size} pages loaded, ${stats.historyCache.loadedPages} total pages`,
      `  Recommendation Cache: ${stats.recommendationCache.size}/${stats.recommendationCache.capacity}`,
      `  Search Cache: ${stats.searchCache.size}/${stats.searchCache.capacity}`,
      '',
      stats.memoryUsage ? [
        'Memory Usage:',
        `  Heap Used: ${(stats.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        `  Heap Total: ${(stats.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        `  External: ${(stats.memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
        ''
      ].join('\n') : '',
      monitorReport,
      '',
      '======================================='
    ].join('\n');

    return report;
  }

  /**
   * Shutdown performance optimizations
   */
  shutdown(): void {
    performanceMonitor.stopMonitoring();
    memoryOptimizer.stopMonitoring();
    this.clearAllCaches();
    this.isInitialized = false;
    
    console.log('🛑 Performance optimizations shutdown');
  }

  private setupPerformanceThresholds(): void {
    performanceMonitor.setThreshold('startup_time', 1000, 2000);
    performanceMonitor.setThreshold('search_time', 100, 500);
    performanceMonitor.setThreshold('recommendation_time', 200, 1000);
    performanceMonitor.setThreshold('memory_heap_used', 150, 300);
  }

  private setupPerformanceObservers(): void {
    // Monitor cache hit rates
    performanceMonitor.subscribe('cache_hit', (metric) => {
      if (metric.value < 0.7) { // Less than 70% hit rate
        console.warn(`Low cache hit rate: ${(metric.value * 100).toFixed(1)}%`);
      }
    });

    // Monitor memory usage
    performanceMonitor.subscribe('memory_heap_used', (metric) => {
      if (metric.value > 200) { // More than 200MB
        console.warn(`High memory usage: ${metric.value.toFixed(2)}MB`);
        // Could trigger garbage collection or cache cleanup here
      }
    });
  }

  private async preloadCriticalData(): Promise<void> {
    // This would typically preload essential bookmarks, recent history, etc.
    // For now, we'll just simulate the operation
    await new Promise(resolve => setTimeout(resolve, 10));
    performanceMonitor.recordMetric('critical_data_preload', 1, 'count');
  }

  private async initializeLazyLoaders(): Promise<void> {
    // Initialize lazy loading systems
    await new Promise(resolve => setTimeout(resolve, 5));
    performanceMonitor.recordMetric('lazy_loaders_init', 1, 'count');
  }

  private async warmupCaches(): Promise<void> {
    // Warm up frequently accessed caches
    await new Promise(resolve => setTimeout(resolve, 5));
    performanceMonitor.recordMetric('cache_warmup', 1, 'count');
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();