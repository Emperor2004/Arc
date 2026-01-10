import { HistoryEntry } from '../types';
import { LRUCache } from './LRUCache';

/**
 * Lazy loading implementation for history entries to improve performance
 */
export class LazyHistoryLoader {
  private cache: LRUCache<string, HistoryEntry[]>;
  private pageSize: number;
  private loadedPages: Set<number>;

  constructor(pageSize: number = 50, cacheSize: number = 20) {
    this.pageSize = pageSize;
    this.cache = new LRUCache(cacheSize);
    this.loadedPages = new Set();
  }

  /**
   * Load a page of history entries
   */
  async loadPage(pageNumber: number, historyStore: any): Promise<HistoryEntry[]> {
    const cacheKey = `page_${pageNumber}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Load from store
    const offset = pageNumber * this.pageSize;
    const allHistory = await historyStore.getAllHistory();
    const pageData = allHistory.slice(offset, offset + this.pageSize);

    // Cache the result
    this.cache.set(cacheKey, pageData);
    this.loadedPages.add(pageNumber);

    return pageData;
  }

  /**
   * Get history entries with lazy loading
   */
  async getHistoryRange(
    startIndex: number, 
    endIndex: number, 
    historyStore: any
  ): Promise<HistoryEntry[]> {
    const startPage = Math.floor(startIndex / this.pageSize);
    const endPage = Math.floor(endIndex / this.pageSize);
    
    const results: HistoryEntry[] = [];
    
    for (let page = startPage; page <= endPage; page++) {
      const pageData = await this.loadPage(page, historyStore);
      
      // Calculate which items from this page we need
      const pageStartIndex = page * this.pageSize;
      const pageEndIndex = (page + 1) * this.pageSize - 1;
      
      const itemStartIndex = Math.max(0, startIndex - pageStartIndex);
      const itemEndIndex = Math.min(pageData.length - 1, endIndex - pageStartIndex);
      
      if (itemStartIndex <= itemEndIndex) {
        results.push(...pageData.slice(itemStartIndex, itemEndIndex + 1));
      }
    }
    
    return results;
  }

  /**
   * Preload pages around a given page for better UX
   */
  async preloadAroundPage(pageNumber: number, historyStore: any, radius: number = 1): Promise<void> {
    const promises: Promise<HistoryEntry[]>[] = [];
    
    for (let i = pageNumber - radius; i <= pageNumber + radius; i++) {
      if (i >= 0 && !this.loadedPages.has(i)) {
        promises.push(this.loadPage(i, historyStore));
      }
    }
    
    await Promise.all(promises);
  }

  /**
   * Clear cache and reset state
   */
  clear(): void {
    this.cache.clear();
    this.loadedPages.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; capacity: number; loadedPages: number } {
    return {
      size: this.cache.size(),
      capacity: this.pageSize,
      loadedPages: this.loadedPages.size
    };
  }
}