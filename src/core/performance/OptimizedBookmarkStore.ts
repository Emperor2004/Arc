import { Bookmark } from '../types';
import { LRUCache } from './LRUCache';

/**
 * Optimized bookmark store with caching and performance improvements
 */
export class OptimizedBookmarkStore {
  private bookmarks: Bookmark[] = [];
  private searchCache: LRUCache<string, Bookmark[]>;
  private tagCache: LRUCache<string, Bookmark[]>;
  private indexCache: Map<string, number>;

  constructor(cacheSize: number = 100) {
    this.searchCache = new LRUCache(cacheSize);
    this.tagCache = new LRUCache(cacheSize);
    this.indexCache = new Map();
  }

  addBookmark(bookmark: Omit<Bookmark, 'id' | 'createdAt'>): Bookmark {
    const newBookmark: Bookmark = {
      id: this.generateId(),
      ...bookmark,
      createdAt: Date.now()
    };

    this.bookmarks.push(newBookmark);
    this.indexCache.set(newBookmark.id, this.bookmarks.length - 1);
    
    // Invalidate caches
    this.invalidateCaches();
    
    return newBookmark;
  }

  getBookmarks(): Bookmark[] {
    return [...this.bookmarks];
  }

  getBookmarkById(id: string): Bookmark | undefined {
    const index = this.indexCache.get(id);
    if (index !== undefined && index < this.bookmarks.length) {
      return this.bookmarks[index];
    }
    
    // Fallback to linear search and update index
    const bookmark = this.bookmarks.find(b => b.id === id);
    if (bookmark) {
      const index = this.bookmarks.indexOf(bookmark);
      this.indexCache.set(id, index);
    }
    
    return bookmark;
  }

  updateBookmark(id: string, updates: Partial<Omit<Bookmark, 'id' | 'createdAt'>>): Bookmark | null {
    const index = this.indexCache.get(id);
    if (index === undefined || index >= this.bookmarks.length) {
      return null;
    }

    this.bookmarks[index] = { ...this.bookmarks[index], ...updates };
    
    // Invalidate caches
    this.invalidateCaches();
    
    return this.bookmarks[index];
  }

  deleteBookmark(id: string): boolean {
    const index = this.indexCache.get(id);
    if (index === undefined || index >= this.bookmarks.length) {
      return false;
    }

    this.bookmarks.splice(index, 1);
    this.indexCache.delete(id);
    
    // Update all indices after the deleted item
    this.rebuildIndexCache();
    
    // Invalidate caches
    this.invalidateCaches();
    
    return true;
  }

  searchBookmarksOptimized(query: string): Bookmark[] {
    const cacheKey = query.toLowerCase();
    
    // Check cache first
    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Perform search
    const lowerQuery = query.toLowerCase();
    const results = this.bookmarks.filter(bookmark =>
      bookmark.title.toLowerCase().includes(lowerQuery) ||
      bookmark.url.toLowerCase().includes(lowerQuery) ||
      (bookmark.tags && bookmark.tags.some((tag: string) => tag.toLowerCase().includes(lowerQuery)))
    );

    // Cache the results
    this.searchCache.set(cacheKey, results);
    
    return results;
  }

  getBookmarksByTagOptimized(tag: string): Bookmark[] {
    const cacheKey = tag.toLowerCase();
    
    // Check cache first
    const cached = this.tagCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Perform tag search
    const results = this.bookmarks.filter(bookmark =>
      bookmark.tags && bookmark.tags.some((t: string) => t.toLowerCase() === tag.toLowerCase())
    );

    // Cache the results
    this.tagCache.set(cacheKey, results);
    
    return results;
  }

  /**
   * Get bookmarks in batches for lazy loading
   */
  getBookmarksBatch(offset: number, limit: number): Bookmark[] {
    return this.bookmarks.slice(offset, offset + limit);
  }

  /**
   * Get total bookmark count
   */
  getBookmarkCount(): number {
    return this.bookmarks.length;
  }

  /**
   * Get all unique tags with counts
   */
  getAllTagsWithCounts(): Map<string, number> {
    const tagCounts = new Map<string, number>();
    
    for (const bookmark of this.bookmarks) {
      if (bookmark.tags) {
        for (const tag of bookmark.tags) {
          const lowerTag = tag.toLowerCase();
          tagCounts.set(lowerTag, (tagCounts.get(lowerTag) || 0) + 1);
        }
      }
    }
    
    return tagCounts;
  }

  clearBookmarks(): void {
    this.bookmarks = [];
    this.indexCache.clear();
    this.invalidateCaches();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    searchCacheSize: number;
    tagCacheSize: number;
    indexCacheSize: number;
  } {
    return {
      searchCacheSize: this.searchCache.size(),
      tagCacheSize: this.tagCache.size(),
      indexCacheSize: this.indexCache.size
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private invalidateCaches(): void {
    this.searchCache.clear();
    this.tagCache.clear();
  }

  private rebuildIndexCache(): void {
    this.indexCache.clear();
    for (let i = 0; i < this.bookmarks.length; i++) {
      this.indexCache.set(this.bookmarks[i].id, i);
    }
  }
}