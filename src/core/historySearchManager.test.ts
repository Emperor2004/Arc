import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HistorySearchManager, HistoryFilter } from './historySearchManager';
import { HistoryEntry } from './types';
import * as historyStore from './historyStore';

// Mock historyStore module
vi.mock('./historyStore');

describe('HistorySearchManager', () => {
  let manager: HistorySearchManager;
  let mockHistory: HistoryEntry[];

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new HistorySearchManager();
    
    // Setup mock history data
    mockHistory = [
      {
        id: 1,
        url: 'https://github.com/microsoft/vscode',
        title: 'Visual Studio Code - GitHub',
        visited_at: Date.now() - 86400000, // 1 day ago
        visit_count: 5,
      },
      {
        id: 2,
        url: 'https://stackoverflow.com/questions/typescript',
        title: 'TypeScript Questions - Stack Overflow',
        visited_at: Date.now() - 3600000, // 1 hour ago
        visit_count: 3,
      },
      {
        id: 3,
        url: 'https://docs.microsoft.com/typescript',
        title: 'TypeScript Documentation',
        visited_at: Date.now() - 7200000, // 2 hours ago
        visit_count: 8,
      },
      {
        id: 4,
        url: 'https://example.com/test',
        title: null,
        visited_at: Date.now() - 172800000, // 2 days ago
        visit_count: 1,
      },
    ];

    vi.mocked(historyStore.getAllHistory).mockResolvedValue(mockHistory);
  });

  describe('indexHistory', () => {
    it('should build search index from history entries', async () => {
      await manager.indexHistory();
      
      expect(historyStore.getAllHistory).toHaveBeenCalled();
    });

    it('should handle empty history', async () => {
      vi.mocked(historyStore.getAllHistory).mockResolvedValue([]);
      
      await manager.indexHistory();
      
      const results = await manager.search({ query: 'test' });
      expect(results).toEqual([]);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await manager.indexHistory();
    });

    it('should search by URL', async () => {
      const results = await manager.search({ query: 'github' });
      
      expect(results.length).toBe(1);
      expect(results[0].entry.url).toContain('github.com');
      expect(results[0].matchType).toBe('url');
    });

    it('should search by title', async () => {
      const results = await manager.search({ query: 'TypeScript' });
      
      expect(results.length).toBe(2);
      expect(results.some(r => r.entry.title?.includes('TypeScript'))).toBe(true);
    });

    it('should be case-insensitive', async () => {
      const results = await manager.search({ query: 'GITHUB' });
      
      expect(results.length).toBe(1);
      expect(results[0].entry.url).toContain('github.com');
    });

    it('should return empty results for non-matching query', async () => {
      const results = await manager.search({ query: 'nonexistent' });
      
      expect(results).toEqual([]);
    });

    it('should handle empty query', async () => {
      const results = await manager.search({ query: '' });
      
      expect(results.length).toBe(mockHistory.length);
    });

    it('should handle special characters in query', async () => {
      const results = await manager.search({ query: 'microsoft/vscode' });
      
      expect(results.length).toBe(1);
      expect(results[0].entry.url).toContain('microsoft/vscode');
    });

    it('should provide highlights for matches', async () => {
      const results = await manager.search({ query: 'github' });
      
      expect(results[0].highlights.length).toBeGreaterThan(0);
      expect(results[0].highlights[0].start).toBeGreaterThanOrEqual(0);
      expect(results[0].highlights[0].end).toBeGreaterThan(results[0].highlights[0].start);
    });
  });

  describe('date filtering', () => {
    beforeEach(async () => {
      await manager.indexHistory();
    });

    it('should filter by start date', async () => {
      const oneDayAgo = Date.now() - 86400000;
      const results = await manager.search({ startDate: oneDayAgo });
      
      expect(results.length).toBe(3); // Entries at or newer than 1 day ago (1 day, 2 hours, 1 hour ago)
      expect(results.every(r => r.entry.visited_at >= oneDayAgo)).toBe(true);
    });

    it('should filter by end date', async () => {
      const oneDayAgo = Date.now() - 86400000;
      const results = await manager.search({ endDate: oneDayAgo });
      
      expect(results.length).toBe(2); // Only entries older than 1 day
      expect(results.every(r => r.entry.visited_at <= oneDayAgo)).toBe(true);
    });

    it('should filter by date range', async () => {
      const oneDayAgo = Date.now() - 86400000;
      const oneHourAgo = Date.now() - 3600000;
      
      const results = await manager.search({
        startDate: oneDayAgo,
        endDate: oneHourAgo,
      });
      
      expect(results.length).toBe(3); // Entries at 1 day ago, 2 hours ago, and 1 hour ago (all within range)
      expect(results.every(r => 
        r.entry.visited_at >= oneDayAgo && r.entry.visited_at <= oneHourAgo
      )).toBe(true);
    });
  });

  describe('domain filtering', () => {
    beforeEach(async () => {
      await manager.indexHistory();
    });

    it('should filter by single domain', async () => {
      const results = await manager.search({ domains: ['github.com'] });
      
      expect(results.length).toBe(1);
      expect(results[0].entry.url).toContain('github.com');
    });

    it('should filter by multiple domains', async () => {
      const results = await manager.search({ 
        domains: ['github.com', 'stackoverflow.com'] 
      });
      
      expect(results.length).toBe(2);
      expect(results.some(r => r.entry.url.includes('github.com'))).toBe(true);
      expect(results.some(r => r.entry.url.includes('stackoverflow.com'))).toBe(true);
    });

    it('should handle partial domain matches', async () => {
      const results = await manager.search({ domains: ['microsoft'] });
      
      expect(results.length).toBe(1); // Only docs.microsoft.com (github.com/microsoft is path, not domain)
    });

    it('should handle invalid URLs gracefully', async () => {
      const invalidHistory = [
        {
          id: 1,
          url: 'not-a-valid-url',
          title: 'Invalid URL',
          visited_at: Date.now(),
          visit_count: 1,
        },
      ];
      
      vi.mocked(historyStore.getAllHistory).mockResolvedValue(invalidHistory);
      await manager.indexHistory();
      
      const results = await manager.search({ domains: ['example.com'] });
      expect(results).toEqual([]);
    });
  });

  describe('visit count filtering', () => {
    beforeEach(async () => {
      await manager.indexHistory();
    });

    it('should filter by minimum visits', async () => {
      const results = await manager.search({ minVisits: 5 });
      
      expect(results.length).toBe(2); // Entries with 5 and 8 visits
      expect(results.every(r => r.entry.visit_count >= 5)).toBe(true);
    });

    it('should handle zero minimum visits', async () => {
      const results = await manager.search({ minVisits: 0 });
      
      expect(results.length).toBe(mockHistory.length);
    });
  });

  describe('combined filtering', () => {
    beforeEach(async () => {
      await manager.indexHistory();
    });

    it('should apply multiple filters together', async () => {
      const oneHourAgo = Date.now() - 3600000;
      
      const results = await manager.search({
        query: 'TypeScript',
        startDate: oneHourAgo,
        minVisits: 3,
      });
      
      expect(results.length).toBe(1); // Only the Stack Overflow TypeScript entry (1 hour ago, 3 visits)
      expect(results[0].entry.title).toContain('TypeScript');
      expect(results[0].entry.visited_at).toBeGreaterThanOrEqual(oneHourAgo);
      expect(results[0].entry.visit_count).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getHistoryStats', () => {
    beforeEach(async () => {
      await manager.indexHistory();
    });

    it('should return correct total entries', async () => {
      const stats = await manager.getHistoryStats();
      
      expect(stats.totalEntries).toBe(mockHistory.length);
    });

    it('should count unique domains', async () => {
      const stats = await manager.getHistoryStats();
      
      expect(stats.uniqueDomains).toBe(4); // github.com, stackoverflow.com, docs.microsoft.com, example.com
    });

    it('should calculate date range', async () => {
      const stats = await manager.getHistoryStats();
      
      expect(stats.dateRange.start).toBe(Math.min(...mockHistory.map(h => h.visited_at)));
      expect(stats.dateRange.end).toBe(Math.max(...mockHistory.map(h => h.visited_at)));
    });

    it('should return top domains by visit count', async () => {
      const stats = await manager.getHistoryStats();
      
      expect(stats.topDomains.length).toBeGreaterThan(0);
      expect(stats.topDomains[0].count).toBeGreaterThanOrEqual(stats.topDomains[1]?.count || 0);
    });

    it('should handle empty history for stats', async () => {
      vi.mocked(historyStore.getAllHistory).mockResolvedValue([]);
      const emptyManager = new HistorySearchManager();
      
      const stats = await emptyManager.getHistoryStats();
      
      expect(stats.totalEntries).toBe(0);
      expect(stats.uniqueDomains).toBe(0);
      expect(stats.dateRange.start).toBe(0);
      expect(stats.dateRange.end).toBe(0);
      expect(stats.topDomains).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle entries with null titles', async () => {
      const historyWithNullTitle = [
        {
          id: 1,
          url: 'https://example.com',
          title: null,
          visited_at: Date.now(),
          visit_count: 1,
        },
      ];
      
      vi.mocked(historyStore.getAllHistory).mockResolvedValue(historyWithNullTitle);
      await manager.indexHistory();
      
      const results = await manager.search({ query: 'example' });
      expect(results.length).toBe(1);
      expect(results[0].matchType).toBe('url');
    });

    it('should refresh index when stale', async () => {
      await manager.indexHistory();
      
      // Mock time passing (6 minutes)
      const originalNow = Date.now;
      Date.now = vi.fn(() => originalNow() + 6 * 60 * 1000);
      
      await manager.search({ query: 'test' });
      
      expect(historyStore.getAllHistory).toHaveBeenCalledTimes(2);
      
      // Restore Date.now
      Date.now = originalNow;
    });
  });
});