import { describe, it, expect, beforeEach } from 'vitest';
import { LazyHistoryLoader } from '../../core/performance/LazyHistoryLoader';
import { HistoryEntry } from '../../core/types';

// Mock history store
class MockHistoryStore {
  private history: HistoryEntry[] = [];

  constructor(entries: HistoryEntry[]) {
    this.history = entries;
  }

  getAllHistory(): HistoryEntry[] {
    return this.history;
  }
}

describe('LazyHistoryLoader', () => {
  let loader: LazyHistoryLoader;
  let mockStore: MockHistoryStore;
  let testHistory: HistoryEntry[];

  beforeEach(() => {
    // Create test history data
    testHistory = Array.from({ length: 100 }, (_, i) => ({
      id: `entry_${i}`,
      url: `https://example${i}.com`,
      title: `Entry ${i}`,
      visitedAt: new Date(Date.now() - i * 60000)
    }));

    mockStore = new MockHistoryStore(testHistory);
    loader = new LazyHistoryLoader(10, 5); // Page size 10, cache size 5
  });

  it('should load a page of history entries', async () => {
    const page0 = await loader.loadPage(0, mockStore);
    
    expect(page0).toHaveLength(10);
    expect(page0[0].title).toBe('Entry 0');
    expect(page0[9].title).toBe('Entry 9');
  });

  it('should cache loaded pages', async () => {
    // Load page twice
    const page1_first = await loader.loadPage(1, mockStore);
    const page1_second = await loader.loadPage(1, mockStore);
    
    expect(page1_first).toEqual(page1_second);
    expect(page1_first[0].title).toBe('Entry 10');
  });

  it('should load history range across multiple pages', async () => {
    const range = await loader.getHistoryRange(5, 25, mockStore);
    
    expect(range).toHaveLength(21); // 5 to 25 inclusive
    expect(range[0].title).toBe('Entry 5');
    expect(range[20].title).toBe('Entry 25');
  });

  it('should handle range within single page', async () => {
    const range = await loader.getHistoryRange(2, 7, mockStore);
    
    expect(range).toHaveLength(6); // 2 to 7 inclusive
    expect(range[0].title).toBe('Entry 2');
    expect(range[5].title).toBe('Entry 7');
  });

  it('should preload pages around a given page', async () => {
    await loader.preloadAroundPage(2, mockStore, 1);
    
    const stats = loader.getCacheStats();
    expect(stats.loadedPages).toBeGreaterThanOrEqual(3); // Pages 1, 2, 3
  });

  it('should clear cache and reset state', () => {
    loader.loadPage(0, mockStore);
    loader.clear();
    
    const stats = loader.getCacheStats();
    expect(stats.size).toBe(0);
    expect(stats.loadedPages).toBe(0);
  });

  it('should provide cache statistics', async () => {
    await loader.loadPage(0, mockStore);
    await loader.loadPage(1, mockStore);
    
    const stats = loader.getCacheStats();
    expect(stats.size).toBeGreaterThan(0);
    expect(stats.loadedPages).toBe(2);
    expect(stats.capacity).toBe(10); // Page size
  });

  it('should handle empty history', async () => {
    const emptyStore = new MockHistoryStore([]);
    const page = await loader.loadPage(0, emptyStore);
    
    expect(page).toHaveLength(0);
  });

  it('should handle out of bounds page requests', async () => {
    const page = await loader.loadPage(20, mockStore); // Beyond available data
    
    expect(page).toHaveLength(0);
  });
});