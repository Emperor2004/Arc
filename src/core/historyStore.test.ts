import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  addHistoryEntry,
  getRecentHistory,
  getAllHistory,
  clearHistory,
  removeHistoryEntry,
  searchHistory,
} from './historyStore';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('HistoryStore Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('addHistoryEntry', () => {
    it('should add a new history entry', () => {
      const entry = addHistoryEntry('https://github.com', 'GitHub');

      expect(entry.url).toBe('https://github.com');
      expect(entry.title).toBe('GitHub');
      expect(entry.visit_count).toBe(1);
      expect(entry.id).toBe(1);
    });

    it('should increment visit count for existing URL', () => {
      // Add initial entry multiple times to get to visit count 5
      addHistoryEntry('https://github.com', 'GitHub');
      addHistoryEntry('https://github.com', 'GitHub');
      addHistoryEntry('https://github.com', 'GitHub');
      addHistoryEntry('https://github.com', 'GitHub');
      addHistoryEntry('https://github.com', 'GitHub');
      
      // Add one more time to get to 6
      const entry = addHistoryEntry('https://github.com', 'GitHub');

      expect(entry.visit_count).toBe(6);
    });

    it('should update title if provided', () => {
      // Add initial entry
      addHistoryEntry('https://github.com', 'Old Title');
      
      // Update with new title
      const entry = addHistoryEntry('https://github.com', 'New Title');

      expect(entry.title).toBe('New Title');
    });

    it('should handle empty history', () => {
      const entry = addHistoryEntry('https://example.com', 'Example');

      expect(entry.id).toBe(1);
      expect(entry.visit_count).toBe(1);
    });
  });

  describe('getRecentHistory', () => {
    it('should return recent history sorted by visited_at', async () => {
      const now = Date.now();
      const history = [
        {
          id: 1,
          url: 'https://old.com',
          title: 'Old',
          visited_at: now - 86400000,
          visit_count: 1,
        },
        {
          id: 2,
          url: 'https://recent.com',
          title: 'Recent',
          visited_at: now,
          visit_count: 1,
        },
      ];

      localStorageMock.setItem('arc-browser-history', JSON.stringify(history));

      const recent = await getRecentHistory(10);

      expect(recent[0].url).toBe('https://recent.com');
      expect(recent[1].url).toBe('https://old.com');
    });

    it('should respect limit parameter', async () => {
      const history = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        url: `https://example${i}.com`,
        title: `Example ${i}`,
        visited_at: Date.now() - i * 86400000,
        visit_count: 1,
      }));

      localStorageMock.setItem('arc-browser-history', JSON.stringify(history));

      const recent = await getRecentHistory(5);

      expect(recent.length).toBe(5);
    });

    it('should return empty array when no history', async () => {
      localStorageMock.setItem('arc-browser-history', '[]');

      const recent = await getRecentHistory(10);

      expect(recent).toEqual([]);
    });
  });

  describe('getAllHistory', () => {
    it('should return all history entries', async () => {
      const history = [
        {
          id: 1,
          url: 'https://example1.com',
          title: 'Example 1',
          visited_at: Date.now(),
          visit_count: 1,
        },
        {
          id: 2,
          url: 'https://example2.com',
          title: 'Example 2',
          visited_at: Date.now(),
          visit_count: 1,
        },
      ];

      localStorageMock.setItem('arc-browser-history', JSON.stringify(history));

      const all = await getAllHistory();

      expect(all.length).toBe(2);
    });
  });

  describe('clearHistory', () => {
    it('should clear all history', () => {
      // Set some initial history
      localStorageMock.setItem('arc-browser-history', JSON.stringify([
        { id: 1, url: 'https://example.com', title: 'Example', visited_at: Date.now(), visit_count: 1 }
      ]));

      clearHistory();

      const stored = localStorageMock.getItem('arc-browser-history');
      expect(JSON.parse(stored || '[]')).toEqual([]);
    });
  });

  describe('removeHistoryEntry', () => {
    it('should remove history entry by URL', () => {
      const history = [
        {
          id: 1,
          url: 'https://github.com',
          title: 'GitHub',
          visited_at: Date.now(),
          visit_count: 1,
        },
        {
          id: 2,
          url: 'https://example.com',
          title: 'Example',
          visited_at: Date.now(),
          visit_count: 1,
        },
      ];

      localStorageMock.setItem('arc-browser-history', JSON.stringify(history));

      removeHistoryEntry('https://github.com');

      const stored = localStorageMock.getItem('arc-browser-history');
      const writtenData = JSON.parse(stored || '[]');

      expect(writtenData.length).toBe(1);
      expect(writtenData[0].url).toBe('https://example.com');
    });
  });

  describe('searchHistory', () => {
    it('should search by URL', async () => {
      const history = [
        {
          id: 1,
          url: 'https://github.com',
          title: 'GitHub',
          visited_at: Date.now(),
          visit_count: 1,
        },
        {
          id: 2,
          url: 'https://example.com',
          title: 'Example',
          visited_at: Date.now(),
          visit_count: 1,
        },
      ];

      localStorageMock.setItem('arc-browser-history', JSON.stringify(history));

      const results = await searchHistory('github');

      expect(results.length).toBe(1);
      expect(results[0].url).toBe('https://github.com');
    });

    it('should search by title', async () => {
      const history = [
        {
          id: 1,
          url: 'https://github.com',
          title: 'GitHub',
          visited_at: Date.now(),
          visit_count: 1,
        },
        {
          id: 2,
          url: 'https://example.com',
          title: 'Example',
          visited_at: Date.now(),
          visit_count: 1,
        },
      ];

      localStorageMock.setItem('arc-browser-history', JSON.stringify(history));

      const results = await searchHistory('example');

      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Example');
    });

    it('should be case-insensitive', async () => {
      const history = [
        {
          id: 1,
          url: 'https://GITHUB.COM',
          title: 'GitHub',
          visited_at: Date.now(),
          visit_count: 1,
        },
      ];

      localStorageMock.setItem('arc-browser-history', JSON.stringify(history));

      const results = await searchHistory('github');

      expect(results.length).toBe(1);
    });
  });
});
