import { OptimizedBookmarkStore } from './OptimizedBookmarkStore';
import { LazyHistoryLoader } from './LazyHistoryLoader';
import { performanceOptimizer } from './PerformanceOptimizer';
import { performanceMonitor } from './PerformanceMonitor';
import * as bookmarkStore from '../bookmarkStore';
import * as historyStore from '../historyStore';
import { Bookmark } from '../types';
import { HistoryEntry } from '../types';

/**
 * Integration layer between performance optimizations and existing stores
 */
export class StoreIntegration {
  private optimizedBookmarkStore: OptimizedBookmarkStore;
  private lazyHistoryLoader: LazyHistoryLoader;
  private isInitialized: boolean = false;

  constructor() {
    this.optimizedBookmarkStore = performanceOptimizer.getOptimizedBookmarkStore();
    this.lazyHistoryLoader = performanceOptimizer.getLazyHistoryLoader();
  }

  /**
   * Initialize store integration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('🔗 Initializing store integration...');

    // Load existing bookmarks into optimized store
    await this.syncBookmarksToOptimizedStore();

    // Initialize performance optimizer
    await performanceOptimizer.initialize();

    this.isInitialized = true;
    console.log('✅ Store integration initialized');
  }

  /**
   * Enhanced bookmark operations with performance optimizations
   */
  async addBookmarkOptimized(url: string, title: string, tags?: string[]): Promise<Bookmark> {
    const startTime = performance.now();

    try {
      // Add to original store
      const bookmark = await bookmarkStore.addBookmark(url, title, tags);

      // Add to optimized store
      this.optimizedBookmarkStore.addBookmark({
        url: bookmark.url,
        title: bookmark.title,
        tags: bookmark.tags || [],
        updatedAt: bookmark.updatedAt
      });

      performanceMonitor.recordTiming('bookmark_add', startTime);
      return bookmark;
    } catch (error) {
      performanceMonitor.recordMetric('bookmark_add_error', 1, 'count');
      throw error;
    }
  }

  /**
   * Enhanced bookmark search with caching
   */
  async searchBookmarksOptimized(query: string): Promise<Bookmark[]> {
    const startTime = performance.now();

    try {
      // Check cache first
      const cached = performanceOptimizer.getCachedSearchResults(`bookmarks:${query}`);
      if (cached) {
        performanceMonitor.recordTiming('bookmark_search_cached', startTime);
        performanceMonitor.recordMetric('bookmark_search_cache_hit', 1, 'count');
        return cached;
      }

      // Use optimized search
      const results = this.optimizedBookmarkStore.searchBookmarksOptimized(query);

      // Cache results
      performanceOptimizer.cacheSearchResults(`bookmarks:${query}`, results);

      performanceMonitor.recordTiming('bookmark_search', startTime);
      performanceMonitor.recordMetric('bookmark_search_cache_miss', 1, 'count');
      
      return results;
    } catch (error) {
      performanceMonitor.recordMetric('bookmark_search_error', 1, 'count');
      throw error;
    }
  }

  /**
   * Enhanced history loading with lazy loading
   */
  async getHistoryRangeOptimized(startIndex: number, endIndex: number): Promise<HistoryEntry[]> {
    const startTime = performance.now();

    try {
      const historyStoreAdapter = {
        getAllHistory: async () => await historyStore.getAllHistory()
      };

      const results = await this.lazyHistoryLoader.getHistoryRange(
        startIndex,
        endIndex,
        historyStoreAdapter
      );

      performanceMonitor.recordTiming('history_range_load', startTime);
      return results;
    } catch (error) {
      performanceMonitor.recordMetric('history_load_error', 1, 'count');
      throw error;
    }
  }

  /**
   * Enhanced history search with caching
   */
  async searchHistoryOptimized(query: string): Promise<HistoryEntry[]> {
    const startTime = performance.now();

    try {
      // Check cache first
      const cached = performanceOptimizer.getCachedSearchResults(`history:${query}`);
      if (cached) {
        performanceMonitor.recordTiming('history_search_cached', startTime);
        performanceMonitor.recordMetric('history_search_cache_hit', 1, 'count');
        return cached;
      }

      // Use original search (could be optimized further)
      const results = await historyStore.searchHistory(query);

      // Cache results
      performanceOptimizer.cacheSearchResults(`history:${query}`, results);

      performanceMonitor.recordTiming('history_search', startTime);
      performanceMonitor.recordMetric('history_search_cache_miss', 1, 'count');
      
      return results;
    } catch (error) {
      performanceMonitor.recordMetric('history_search_error', 1, 'count');
      throw error;
    }
  }

  /**
   * Preload history pages around current position
   */
  async preloadHistoryPages(currentPage: number): Promise<void> {
    const historyStoreAdapter = {
      getAllHistory: async () => await historyStore.getAllHistory()
    };

    await this.lazyHistoryLoader.preloadAroundPage(currentPage, historyStoreAdapter, 2);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return performanceOptimizer.getPerformanceStats();
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): string {
    return performanceOptimizer.generatePerformanceReport();
  }

  /**
   * Clear all performance caches
   */
  clearCaches(): void {
    performanceOptimizer.clearAllCaches();
  }

  /**
   * Sync existing bookmarks to optimized store
   */
  private async syncBookmarksToOptimizedStore(): Promise<void> {
    try {
      const existingBookmarks = await bookmarkStore.getAllBookmarks();
      
      for (const bookmark of existingBookmarks) {
        this.optimizedBookmarkStore.addBookmark({
          url: bookmark.url,
          title: bookmark.title,
          tags: bookmark.tags || [],
          updatedAt: bookmark.updatedAt
        });
      }

      console.log(`📚 Synced ${existingBookmarks.length} bookmarks to optimized store`);
    } catch (error) {
      console.error('Error syncing bookmarks to optimized store:', error);
    }
  }
}

// Export singleton instance
export const storeIntegration = new StoreIntegration();