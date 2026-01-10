import { describe, it, expect, beforeEach } from 'vitest';
import { OptimizedBookmarkStore } from '../../core/performance/OptimizedBookmarkStore';

describe('OptimizedBookmarkStore', () => {
  let store: OptimizedBookmarkStore;

  beforeEach(() => {
    store = new OptimizedBookmarkStore(10); // Small cache for testing
  });

  it('should add and retrieve bookmarks', () => {
    const bookmark = store.addBookmark({
      url: 'https://example.com',
      title: 'Example',
      tags: ['test'],
      updatedAt: Date.now()
    });

    expect(bookmark.id).toBeDefined();
    expect(typeof bookmark.createdAt).toBe('number');

    const retrieved = store.getBookmarkById(bookmark.id);
    expect(retrieved).toEqual(bookmark);
  });

  it('should update bookmarks', () => {
    const bookmark = store.addBookmark({
      url: 'https://example.com',
      title: 'Example',
      tags: ['test'],
      updatedAt: Date.now()
    });

    const updated = store.updateBookmark(bookmark.id, {
      title: 'Updated Example',
      tags: ['test', 'updated']
    });

    expect(updated?.title).toBe('Updated Example');
    expect(updated?.tags).toEqual(['test', 'updated']);
  });

  it('should delete bookmarks', () => {
    const bookmark = store.addBookmark({
      url: 'https://example.com',
      title: 'Example',
      tags: ['test'],
      updatedAt: Date.now()
    });

    const deleted = store.deleteBookmark(bookmark.id);
    expect(deleted).toBe(true);

    const retrieved = store.getBookmarkById(bookmark.id);
    expect(retrieved).toBeUndefined();
  });

  it('should search bookmarks with caching', () => {
    // Add test bookmarks
    store.addBookmark({
      url: 'https://react.dev',
      title: 'React Documentation',
      tags: ['react', 'docs'],
      updatedAt: Date.now()
    });

    store.addBookmark({
      url: 'https://vue.js.org',
      title: 'Vue.js Guide',
      tags: ['vue', 'docs'],
      updatedAt: Date.now()
    });

    // First search (not cached)
    const results1 = store.searchBookmarksOptimized('react');
    expect(results1).toHaveLength(1);
    expect(results1[0].title).toBe('React Documentation');

    // Second search (should be cached)
    const results2 = store.searchBookmarksOptimized('react');
    expect(results2).toEqual(results1);

    // Search by tag
    const results3 = store.searchBookmarksOptimized('docs');
    expect(results3).toHaveLength(2);
  });

  it('should search by tags with caching', () => {
    store.addBookmark({
      url: 'https://react.dev',
      title: 'React Documentation',
      tags: ['react', 'docs'],
      updatedAt: Date.now()
    });

    store.addBookmark({
      url: 'https://vue.js.org',
      title: 'Vue.js Guide',
      tags: ['vue', 'docs'],
      updatedAt: Date.now()
    });

    const docsResults = store.getBookmarksByTagOptimized('docs');
    expect(docsResults).toHaveLength(2);

    const reactResults = store.getBookmarksByTagOptimized('react');
    expect(reactResults).toHaveLength(1);
    expect(reactResults[0].title).toBe('React Documentation');
  });

  it('should support batch loading', () => {
    // Add multiple bookmarks
    for (let i = 0; i < 20; i++) {
      store.addBookmark({
        url: `https://example${i}.com`,
        title: `Example ${i}`,
        tags: ['test'],
        updatedAt: Date.now()
      });
    }

    const batch1 = store.getBookmarksBatch(0, 5);
    expect(batch1).toHaveLength(5);
    expect(batch1[0].title).toBe('Example 0');

    const batch2 = store.getBookmarksBatch(5, 5);
    expect(batch2).toHaveLength(5);
    expect(batch2[0].title).toBe('Example 5');

    const batch3 = store.getBookmarksBatch(15, 10);
    expect(batch3).toHaveLength(5); // Only 5 remaining
  });

  it('should count bookmarks', () => {
    expect(store.getBookmarkCount()).toBe(0);

    store.addBookmark({
      url: 'https://example.com',
      title: 'Example',
      tags: ['test'],
      updatedAt: Date.now()
    });

    expect(store.getBookmarkCount()).toBe(1);
  });

  it('should get all tags with counts', () => {
    store.addBookmark({
      url: 'https://example1.com',
      title: 'Example 1',
      tags: ['react', 'docs'],
      updatedAt: Date.now()
    });

    store.addBookmark({
      url: 'https://example2.com',
      title: 'Example 2',
      tags: ['react', 'tutorial'],
      updatedAt: Date.now()
    });

    store.addBookmark({
      url: 'https://example3.com',
      title: 'Example 3',
      tags: ['vue', 'docs'],
      updatedAt: Date.now()
    });

    const tagCounts = store.getAllTagsWithCounts();
    expect(tagCounts.get('react')).toBe(2);
    expect(tagCounts.get('docs')).toBe(2);
    expect(tagCounts.get('tutorial')).toBe(1);
    expect(tagCounts.get('vue')).toBe(1);
  });

  it('should clear all bookmarks', () => {
    store.addBookmark({
      url: 'https://example.com',
      title: 'Example',
      tags: ['test'],
      updatedAt: Date.now()
    });

    expect(store.getBookmarkCount()).toBe(1);

    store.clearBookmarks();
    expect(store.getBookmarkCount()).toBe(0);
    expect(store.getBookmarks()).toHaveLength(0);
  });

  it('should provide cache statistics', () => {
    // Perform some operations to populate caches
    store.addBookmark({
      url: 'https://example.com',
      title: 'Example',
      tags: ['test'],
      updatedAt: Date.now()
    });

    store.searchBookmarksOptimized('example');
    store.getBookmarksByTagOptimized('test');

    const stats = store.getCacheStats();
    expect(stats.searchCacheSize).toBeGreaterThan(0);
    expect(stats.tagCacheSize).toBeGreaterThan(0);
    expect(stats.indexCacheSize).toBeGreaterThan(0);
  });

  it('should invalidate caches when data changes', () => {
    const bookmark = store.addBookmark({
      url: 'https://example.com',
      title: 'Example',
      tags: ['test'],
      updatedAt: Date.now()
    });

    // Populate search cache
    store.searchBookmarksOptimized('example');
    expect(store.getCacheStats().searchCacheSize).toBeGreaterThan(0);

    // Update bookmark (should invalidate cache)
    store.updateBookmark(bookmark.id, { title: 'Updated Example' });
    expect(store.getCacheStats().searchCacheSize).toBe(0);
  });
});