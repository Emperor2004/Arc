import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as dataManager from './dataManager';
import * as historyStore from './historyStore';
import * as feedbackStore from './feedbackStore';
import * as bookmarkStore from './bookmarkStore';
import * as settingsStore from './settingsStore';

// Mock the stores
vi.mock('./historyStore');
vi.mock('./feedbackStore');
vi.mock('./bookmarkStore');
vi.mock('./settingsStore');

describe('DataManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportData', () => {
    it('should export all data with correct structure', async () => {
      const mockHistory = [
        { id: 1, url: 'https://example.com', title: 'Example', visited_at: 1000, visit_count: 1 },
      ];
      const mockFeedback = [
        { id: 1, url: 'https://example.com', value: 'like' as const, created_at: 1000 },
      ];
      const mockBookmarks = [
        { id: '1', url: 'https://example.com', title: 'Example', createdAt: 1000, updatedAt: 1000 },
      ];
      const mockSettings = { theme: 'dark' as const, jarvisEnabled: true };

      vi.mocked(historyStore.getAllHistory).mockResolvedValue(mockHistory);
      vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue(mockFeedback);
      vi.mocked(bookmarkStore.getAllBookmarks).mockResolvedValue(mockBookmarks);
      vi.mocked(settingsStore.getSettings).mockReturnValue(mockSettings as any);

      const exported = await dataManager.exportData();

      expect(exported.version).toBe('1.0.0');
      expect(exported.timestamp).toBeGreaterThan(0);
      expect(exported.history).toHaveLength(1);
      expect(exported.feedback).toHaveLength(1);
      expect(exported.bookmarks).toHaveLength(1);
      expect(exported.settings).toEqual(mockSettings);
    });

    it('should handle empty data', async () => {
      vi.mocked(historyStore.getAllHistory).mockResolvedValue([]);
      vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue([]);
      vi.mocked(bookmarkStore.getAllBookmarks).mockResolvedValue([]);
      vi.mocked(settingsStore.getSettings).mockReturnValue({} as any);

      const exported = await dataManager.exportData();

      expect(exported.history).toEqual([]);
      expect(exported.feedback).toEqual([]);
      expect(exported.bookmarks).toEqual([]);
    });
  });

  describe('validateExportData', () => {
    it('should validate correct export data', () => {
      const validData: dataManager.ExportData = {
        version: '1.0.0',
        timestamp: Date.now(),
        history: [{ url: 'https://example.com', title: 'Example', visited_at: 1000 }],
        feedback: [{ url: 'https://example.com', value: 'like', created_at: 1000 }],
        bookmarks: [{ url: 'https://example.com', title: 'Example', createdAt: 1000 }],
        settings: { theme: 'dark' },
      };

      expect(dataManager.validateExportData(validData)).toBe(true);
    });

    it('should reject invalid version', () => {
      const invalidData = {
        version: 123,
        timestamp: Date.now(),
        history: [],
        feedback: [],
        bookmarks: [],
        settings: {},
      };

      expect(dataManager.validateExportData(invalidData)).toBe(false);
    });

    it('should reject invalid timestamp', () => {
      const invalidData = {
        version: '1.0.0',
        timestamp: -1,
        history: [],
        feedback: [],
        bookmarks: [],
        settings: {},
      };

      expect(dataManager.validateExportData(invalidData)).toBe(false);
    });

    it('should reject missing arrays', () => {
      const invalidData = {
        version: '1.0.0',
        timestamp: Date.now(),
        history: [],
        feedback: [],
        bookmarks: [],
      };

      expect(dataManager.validateExportData(invalidData)).toBe(false);
    });

    it('should reject invalid history entries', () => {
      const invalidData = {
        version: '1.0.0',
        timestamp: Date.now(),
        history: [{ url: 'https://example.com', title: 'Example' }],
        feedback: [],
        bookmarks: [],
        settings: {},
      };

      expect(dataManager.validateExportData(invalidData)).toBe(false);
    });

    it('should reject invalid feedback entries', () => {
      const invalidData = {
        version: '1.0.0',
        timestamp: Date.now(),
        history: [],
        feedback: [{ url: 'https://example.com', value: 'invalid', created_at: 1000 }],
        bookmarks: [],
        settings: {},
      };

      expect(dataManager.validateExportData(invalidData)).toBe(false);
    });

    it('should reject invalid bookmark entries', () => {
      const invalidData = {
        version: '1.0.0',
        timestamp: Date.now(),
        history: [],
        feedback: [],
        bookmarks: [{ url: 'https://example.com', createdAt: 1000 }],
        settings: {},
      };

      expect(dataManager.validateExportData(invalidData)).toBe(false);
    });

    it('should accept null title in history', () => {
      const validData: dataManager.ExportData = {
        version: '1.0.0',
        timestamp: Date.now(),
        history: [{ url: 'https://example.com', title: null, visited_at: 1000 }],
        feedback: [],
        bookmarks: [],
        settings: {},
      };

      expect(dataManager.validateExportData(validData)).toBe(true);
    });
  });

  describe('importData', () => {
    it('should import data in merge mode', async () => {
      const data: dataManager.ExportData = {
        version: '1.0.0',
        timestamp: Date.now(),
        history: [{ url: 'https://example.com', title: 'Example', visited_at: 1000 }],
        feedback: [{ url: 'https://example.com', value: 'like', created_at: 1000 }],
        bookmarks: [{ url: 'https://example.com', title: 'Example', createdAt: 1000 }],
        settings: { theme: 'dark' },
      };

      await dataManager.importData(data, 'merge');

      expect(historyStore.addHistoryEntry).toHaveBeenCalledWith('https://example.com', 'Example');
      expect(feedbackStore.addFeedback).toHaveBeenCalledWith('https://example.com', 'like');
      expect(bookmarkStore.addBookmark).toHaveBeenCalledWith('https://example.com', 'Example');
      expect(settingsStore.updateSettings).toHaveBeenCalled();
    });

    it('should clear data in replace mode', async () => {
      const data: dataManager.ExportData = {
        version: '1.0.0',
        timestamp: Date.now(),
        history: [],
        feedback: [],
        bookmarks: [],
        settings: {},
      };

      await dataManager.importData(data, 'replace');

      expect(historyStore.clearHistory).toHaveBeenCalled();
      expect(feedbackStore.clearFeedback).toHaveBeenCalled();
      expect(bookmarkStore.clearBookmarks).toHaveBeenCalled();
    });

    it('should reject invalid data', async () => {
      const invalidData = {
        version: 123,
        timestamp: Date.now(),
        history: [],
        feedback: [],
        bookmarks: [],
        settings: {},
      };

      await expect(dataManager.importData(invalidData as any, 'merge')).rejects.toThrow(
        'Invalid export data format'
      );
    });

    it('should import multiple entries', async () => {
      const data: dataManager.ExportData = {
        version: '1.0.0',
        timestamp: Date.now(),
        history: [
          { url: 'https://example1.com', title: 'Example 1', visited_at: 1000 },
          { url: 'https://example2.com', title: 'Example 2', visited_at: 2000 },
        ],
        feedback: [
          { url: 'https://example1.com', value: 'like', created_at: 1000 },
          { url: 'https://example2.com', value: 'dislike', created_at: 2000 },
        ],
        bookmarks: [
          { url: 'https://example1.com', title: 'Example 1', createdAt: 1000 },
          { url: 'https://example2.com', title: 'Example 2', createdAt: 2000 },
        ],
        settings: {},
      };

      await dataManager.importData(data, 'merge');

      expect(historyStore.addHistoryEntry).toHaveBeenCalledTimes(2);
      expect(feedbackStore.addFeedback).toHaveBeenCalledTimes(2);
      expect(bookmarkStore.addBookmark).toHaveBeenCalledTimes(2);
    });

    it('should handle null titles in history during import', async () => {
      const data: dataManager.ExportData = {
        version: '1.0.0',
        timestamp: Date.now(),
        history: [{ url: 'https://example.com', title: null, visited_at: 1000 }],
        feedback: [],
        bookmarks: [],
        settings: {},
      };

      await dataManager.importData(data, 'merge');

      expect(historyStore.addHistoryEntry).toHaveBeenCalledWith('https://example.com', '');
    });

    it('should reset settings in replace mode', async () => {
      const data: dataManager.ExportData = {
        version: '1.0.0',
        timestamp: Date.now(),
        history: [],
        feedback: [],
        bookmarks: [],
        settings: { theme: 'light' },
      };

      await dataManager.importData(data, 'replace');

      expect(settingsStore.resetSettings).toHaveBeenCalled();
      expect(settingsStore.updateSettings).toHaveBeenCalled();
    });
  });
});
