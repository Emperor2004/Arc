import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  addHistoryEntry,
  getRecentHistory,
  getAllHistory,
  clearHistory,
  removeHistoryEntry,
  searchHistory,
} from './historyStore';

// Mock fs module
vi.mock('fs');
vi.mock('path');

describe('HistoryStore Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock path.join to return a consistent path
    vi.mocked(path.join).mockReturnValue('/mock/history.json');
    // Mock fs.existsSync to return true
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  describe('addHistoryEntry', () => {
    it('should add a new history entry', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('[]');
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const entry = addHistoryEntry('https://github.com', 'GitHub');

      expect(entry.url).toBe('https://github.com');
      expect(entry.title).toBe('GitHub');
      expect(entry.visit_count).toBe(1);
      expect(entry.id).toBe(1);
    });

    it('should increment visit count for existing URL', () => {
      const existingHistory = JSON.stringify([
        {
          id: 1,
          url: 'https://github.com',
          title: 'GitHub',
          visited_at: Date.now() - 86400000,
          visit_count: 5,
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(existingHistory);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const entry = addHistoryEntry('https://github.com', 'GitHub');

      expect(entry.visit_count).toBe(6);
    });

    it('should update title if provided', () => {
      const existingHistory = JSON.stringify([
        {
          id: 1,
          url: 'https://github.com',
          title: 'Old Title',
          visited_at: Date.now() - 86400000,
          visit_count: 5,
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(existingHistory);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const entry = addHistoryEntry('https://github.com', 'New Title');

      expect(entry.title).toBe('New Title');
    });

    it('should handle empty history', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('[]');
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const entry = addHistoryEntry('https://example.com', 'Example');

      expect(entry.id).toBe(1);
      expect(entry.visit_count).toBe(1);
    });
  });

  describe('getRecentHistory', () => {
    it('should return recent history sorted by visited_at', async () => {
      const now = Date.now();
      const history = JSON.stringify([
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
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(history);

      const recent = await getRecentHistory(10);

      expect(recent[0].url).toBe('https://recent.com');
      expect(recent[1].url).toBe('https://old.com');
    });

    it('should respect limit parameter', async () => {
      const history = JSON.stringify(
        Array.from({ length: 20 }, (_, i) => ({
          id: i,
          url: `https://example${i}.com`,
          title: `Example ${i}`,
          visited_at: Date.now() - i * 86400000,
          visit_count: 1,
        }))
      );

      vi.mocked(fs.readFileSync).mockReturnValue(history);

      const recent = await getRecentHistory(5);

      expect(recent.length).toBe(5);
    });

    it('should return empty array when no history', async () => {
      vi.mocked(fs.readFileSync).mockReturnValue('[]');

      const recent = await getRecentHistory(10);

      expect(recent).toEqual([]);
    });
  });

  describe('getAllHistory', () => {
    it('should return all history entries', async () => {
      const history = JSON.stringify([
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
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(history);

      const all = await getAllHistory();

      expect(all.length).toBe(2);
    });
  });

  describe('clearHistory', () => {
    it('should clear all history', () => {
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      clearHistory();

      expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData).toEqual([]);
    });
  });

  describe('removeHistoryEntry', () => {
    it('should remove history entry by URL', () => {
      const history = JSON.stringify([
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
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(history);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      removeHistoryEntry('https://github.com');

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);

      expect(writtenData.length).toBe(1);
      expect(writtenData[0].url).toBe('https://example.com');
    });
  });

  describe('searchHistory', () => {
    it('should search by URL', async () => {
      const history = JSON.stringify([
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
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(history);

      const results = await searchHistory('github');

      expect(results.length).toBe(1);
      expect(results[0].url).toBe('https://github.com');
    });

    it('should search by title', async () => {
      const history = JSON.stringify([
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
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(history);

      const results = await searchHistory('example');

      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Example');
    });

    it('should be case-insensitive', async () => {
      const history = JSON.stringify([
        {
          id: 1,
          url: 'https://GITHUB.COM',
          title: 'GitHub',
          visited_at: Date.now(),
          visit_count: 1,
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(history);

      const results = await searchHistory('github');

      expect(results.length).toBe(1);
    });
  });
});
