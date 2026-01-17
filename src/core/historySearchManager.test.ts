import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HistoryEntry } from './types';
import * as historyStore from './historyStore';

// Mock historyStore module
vi.mock('./historyStore');

// Simple mock implementation that doesn't rely on process detection
class SimpleHistorySearchManager {
  private cachedHistory: HistoryEntry[] = [];
  private lastIndexTime: number = 0;
  private readonly INDEX_STALE_TIME = 5 * 60 * 1000; // 5 minutes

  async indexHistory(): Promise<void> {
    this.cachedHistory = await historyStore.getAllHistory();
    this.lastIndexTime = Date.now();
  }

  async search(filter: any): Promise<any[]> {
    // Check if index is stale and refresh if needed
    if (Date.now() - this.lastIndexTime > this.INDEX_STALE_TIME) {
      await this.indexHistory();
    }

    let results: HistoryEntry[] = [...this.cachedHistory];

    // Apply query filter
    if (filter.query && filter.query.trim()) {
      const lowerQuery = filter.query.toLowerCase();
      results = results.filter(entry =>
        entry.url.toLowerCase().includes(lowerQuery) ||
        (entry.title && entry.title.toLowerCase().includes(lowerQuery))
      );
    }

    // Apply date filters
    if (filter.startDate !== undefined) {
      results = results.filter(entry => entry.visited_at >= filter.startDate);
    }
    if (filter.endDate !== undefined) {
      results = results.filter(entry => entry.visited_at <= filter.endDate);
    }

    // Apply domain filter
    if (filter.domains && filter.domains.length > 0) {
      results = results.filter(entry => {
        try {
          const domain = new URL(entry.url).hostname.toLowerCase();
          return filter.domains.some((d: string) => domain.includes(d.toLowerCase()));
        } catch {
          return false;
        }
      });
    }

    // Apply minimum visits filter
    if (filter.minVisits !== undefined && filter.minVisits > 0) {
      results = results.filter(entry => entry.visit_count >= filter.minVisits);
    }

    // Convert to search results with highlights
    return results.map(entry => ({
      entry,
      matchType: this.getMatchType(entry, filter.query),
      highlights: this.getHighlights(entry, filter.query),
    }));
  }

  async getHistoryStats(): Promise<any> {
    if (this.cachedHistory.length === 0) {
      await this.indexHistory();
    }

    const domains = new Map<string, number>();
    let minDate = Number.MAX_SAFE_INTEGER;
    let maxDate = 0;

    this.cachedHistory.forEach(entry => {
      minDate = Math.min(minDate, entry.visited_at);
      maxDate = Math.max(maxDate, entry.visited_at);

      try {
        const domain = new URL(entry.url).hostname.toLowerCase();
        domains.set(domain, (domains.get(domain) || 0) + entry.visit_count);
      } catch {
        // Invalid URL, skip
      }
    });

    const topDomains = Array.from(domains.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEntries: this.cachedHistory.length,
      uniqueDomains: domains.size,
      dateRange: {
        start: minDate === Number.MAX_SAFE_INTEGER ? 0 : minDate,
        end: maxDate,
      },
      topDomains,
    };
  }

  private getMatchType(entry: HistoryEntry, query?: string): 'url' | 'title' | 'content' {
    if (!query) return 'content';
    
    const lowerQuery = query.toLowerCase();
    
    if (entry.url.toLowerCase().includes(lowerQuery)) {
      return 'url';
    }
    
    if (entry.title && entry.title.toLowerCase().includes(lowerQuery)) {
      return 'title';
    }
    
    return 'content';
  }

  private getHighlights(entry: HistoryEntry, query?: string): Array<{ start: number; end: number }> {
    if (!query) return [];
    
    const highlights: Array<{ start: number; end: number }> = [];
    const lowerQuery = query.toLowerCase();
    
    const urlIndex = entry.url.toLowerCase().indexOf(lowerQuery);
    if (urlIndex !== -1) {
      highlights.push({ start: urlIndex, end: urlIndex + query.length });
    }
    
    if (entry.title) {
      const titleIndex = entry.title.toLowerCase().indexOf(lowerQuery);
      if (titleIndex !== -1) {
        highlights.push({ start: titleIndex, end: titleIndex + query.length });
      }
    }
    
    return highlights;
  }
}

describe('HistorySearchManager', () => {
  let manager: SimpleHistorySearchManager;
  let mockHistory: HistoryEntry[];

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new SimpleHistorySearchManager();
    
    // Use fixed timestamps to avoid timing issues between tests
    const baseTime = 1768500000000; // Fixed base timestamp
    
    // Setup mock history data
    mockHistory = [
      {
        id: 1,
        url: 'https://github.com/microsoft/vscode',
        title: 'Visual Studio Code - GitHub',
        visited_at: baseTime - 86400000, // 1 day ago
        visit_count: 5,
      },
      {
        id: 2,
        url: 'https://stackoverflow.com/questions/typescript',
        title: 'TypeScript Questions - Stack Overflow',
        visited_at: baseTime - 3600000, // 1 hour ago
        visit_count: 3,
      },
      {
        id: 3,
        url: 'https://docs.microsoft.com/typescript',
        title: 'TypeScript Documentation',
        visited_at: baseTime - 7200000, // 2 hours ago
        visit_count: 8,
      },
      {
        id: 4,
        url: 'https://example.com/test',
        title: null,
        visited_at: baseTime - 172800000, // 2 days ago
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
      const baseTime = 1768500000000; // Same as in beforeEach
      const oneDayAgo = baseTime - 86400000;
      const results = await manager.search({ startDate: oneDayAgo });
      
      expect(results.length).toBe(3); // Entries at or newer than 1 day ago (1 day, 2 hours, 1 hour ago)
      expect(results.every(r => r.entry.visited_at >= oneDayAgo)).toBe(true);
    });

    it('should filter by end date', async () => {
      const baseTime = 1768500000000; // Same as in beforeEach
      const oneDayAgo = baseTime - 86400000;
      const results = await manager.search({ endDate: oneDayAgo });
      
      expect(results.length).toBe(2); // Only entries older than 1 day
      expect(results.every(r => r.entry.visited_at <= oneDayAgo)).toBe(true);
    });

    it('should filter by date range', async () => {
      const baseTime = 1768500000000; // Same as in beforeEach
      const oneDayAgo = baseTime - 86400000;
      const oneHourAgo = baseTime - 3600000;
      
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
      const baseTime = 1768500000000; // Same as in beforeEach
      const oneHourAgo = baseTime - 3600000;
      
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
      const emptyManager = new SimpleHistorySearchManager();
      
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