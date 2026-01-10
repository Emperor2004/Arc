import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StoreIntegration } from '../../core/performance/StoreIntegration';
import * as bookmarkStore from '../../core/bookmarkStore';
import * as historyStore from '../../core/historyStore';

// Mock the stores
vi.mock('../../core/bookmarkStore');
vi.mock('../../core/historyStore');

describe('StoreIntegration', () => {
  let integration: StoreIntegration;

  beforeEach(() => {
    integration = new StoreIntegration();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      // Mock existing bookmarks
      vi.mocked(bookmarkStore.getAllBookmarks).mockResolvedValue([
        {
          id: '1',
          url: 'https://example.com',
          title: 'Example',
          tags: ['test'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ]);

      await integration.initialize();
      
      expect(bookmarkStore.getAllBookmarks).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      vi.mocked(bookmarkStore.getAllBookmarks).mockRejectedValue(new Error('Store error'));

      // Should not throw
      await expect(integration.initialize()).resolves.toBeUndefined();
    });
  });

  describe('optimized bookmark operations', () => {
    beforeEach(async () => {
      vi.mocked(bookmarkStore.getAllBookmarks).mockResolvedValue([]);
      await integration.initialize();
    });

    it('should add bookmarks with performance tracking', async () => {
      const mockBookmark = {
        id: '1',
        url: 'https://example.com',
        title: 'Example',
        tags: ['test'],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      vi.mocked(bookmarkStore.addBookmark).mockReturnValue(mockBookmark);

      const result = await integration.addBookmarkOptimized('https://example.com', 'Example', ['test']);

      expect(result).toEqual(mockBookmark);
      expect(bookmarkStore.addBookmark).toHaveBeenCalledWith('https://example.com', 'Example', ['test']);
    });

    it('should search bookmarks with caching', async () => {
      // Clear any existing bookmarks first
      integration.clearCaches();
      
      // First search should return empty results
      let results = await integration.searchBookmarksOptimized('nonexistent');
      expect(results).toEqual([]);

      // Add a bookmark to the optimized store
      await integration.addBookmarkOptimized('https://example.com', 'Example', ['test']);

      // Search for the added bookmark
      results = await integration.searchBookmarksOptimized('example');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toBe('Example');
    });
  });

  describe('optimized history operations', () => {
    beforeEach(async () => {
      vi.mocked(bookmarkStore.getAllBookmarks).mockResolvedValue([]);
      await integration.initialize();
    });

    it('should load history ranges with lazy loading', async () => {
      const mockHistory = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        url: `https://example${i}.com`,
        title: `Example ${i}`,
        visited_at: Date.now() - i * 1000,
        visit_count: 1
      }));

      vi.mocked(historyStore.getAllHistory).mockResolvedValue(mockHistory);

      const results = await integration.getHistoryRangeOptimized(0, 10);

      expect(results.length).toBeLessThanOrEqual(11); // 0-10 inclusive
      expect(historyStore.getAllHistory).toHaveBeenCalled();
    });

    it('should search history with caching', async () => {
      const mockResults = [
        {
          id: 1,
          url: 'https://example.com',
          title: 'Example',
          visited_at: Date.now(),
          visit_count: 1
        }
      ];

      vi.mocked(historyStore.searchHistory).mockResolvedValue(mockResults);

      // First search
      let results = await integration.searchHistoryOptimized('example');
      expect(results).toEqual(mockResults);
      expect(historyStore.searchHistory).toHaveBeenCalledWith('example');

      // Second search should use cache
      results = await integration.searchHistoryOptimized('example');
      expect(results).toEqual(mockResults);
      // Should still only be called once due to caching
      expect(historyStore.searchHistory).toHaveBeenCalledTimes(1);
    });
  });

  describe('performance statistics', () => {
    beforeEach(async () => {
      vi.mocked(bookmarkStore.getAllBookmarks).mockResolvedValue([]);
      await integration.initialize();
    });

    it('should provide performance statistics', () => {
      const stats = integration.getPerformanceStats();

      expect(stats).toHaveProperty('bookmarkCache');
      expect(stats).toHaveProperty('historyCache');
      expect(stats).toHaveProperty('recommendationCache');
      expect(stats).toHaveProperty('searchCache');
    });

    it('should generate performance report', () => {
      const report = integration.generatePerformanceReport();

      expect(typeof report).toBe('string');
      expect(report).toContain('Performance Optimization Report');
    });

    it('should clear caches', () => {
      // Add some data to caches first
      integration.searchBookmarksOptimized('test');
      
      // Clear caches
      integration.clearCaches();

      // Verify caches are cleared by checking stats
      const stats = integration.getPerformanceStats();
      expect(stats.searchCache.size).toBe(0);
    });
  });

  describe('preloading', () => {
    beforeEach(async () => {
      vi.mocked(bookmarkStore.getAllBookmarks).mockResolvedValue([]);
      await integration.initialize();
    });

    it('should preload history pages', async () => {
      const mockHistory = Array.from({ length: 200 }, (_, i) => ({
        id: i + 1,
        url: `https://example${i}.com`,
        title: `Example ${i}`,
        visited_at: Date.now() - i * 1000,
        visit_count: 1
      }));

      vi.mocked(historyStore.getAllHistory).mockResolvedValue(mockHistory);

      // Should not throw
      await expect(integration.preloadHistoryPages(5)).resolves.toBeUndefined();
    });
  });
});