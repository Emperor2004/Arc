import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { HistorySearchManager, HistoryFilter } from './historySearchManager';
import { HistoryEntry } from './types';
import * as historyStore from './historyStore';

// Mock historyStore module
vi.mock('./historyStore');

describe('HistorySearchManager - Property-Based Tests', () => {
  let manager: HistorySearchManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new HistorySearchManager();
  });

  describe('Property 10.3: History Search Accuracy', () => {
    it('should include all matching entries and exclude non-matching entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random history entries
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              url: fc.webUrl(),
              title: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
              visited_at: fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() }),
              visit_count: fc.integer({ min: 1, max: 100 }),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          // Generate random search query (alphanumeric only)
          fc.string({ minLength: 1, maxLength: 10 })
            .filter(s => /^[a-zA-Z0-9]+$/.test(s)),
          async (historyEntries: HistoryEntry[], query: string) => {
            // Setup mock
            vi.mocked(historyStore.getAllHistory).mockResolvedValue(historyEntries);
            await manager.indexHistory();

            // Perform search
            const results = await manager.search({ query });

            // Verify all results match the query
            const lowerQuery = query.toLowerCase();
            for (const result of results) {
              const urlMatches = result.entry.url.toLowerCase().includes(lowerQuery);
              const titleMatches = result.entry.title?.toLowerCase().includes(lowerQuery) || false;
              
              if (!(urlMatches || titleMatches)) {
                return false;
              }
            }

            // Verify no matching entries are excluded
            const resultUrls = new Set(results.map(r => r.entry.url));
            for (const entry of historyEntries) {
              const urlMatches = entry.url.toLowerCase().includes(lowerQuery);
              const titleMatches = entry.title?.toLowerCase().includes(lowerQuery) || false;
              
              if (urlMatches || titleMatches) {
                if (!resultUrls.has(entry.url)) {
                  return false;
                }
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect date filters correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random history entries
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              url: fc.webUrl(),
              title: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
              visited_at: fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() }),
              visit_count: fc.integer({ min: 1, max: 100 }),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          // Generate random date range (both dates defined)
          fc.record({
            startDate: fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() }),
            endDate: fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() }),
          }),
          async (historyEntries: HistoryEntry[], dateFilter: { startDate: number; endDate: number }) => {
            // Setup mock
            vi.mocked(historyStore.getAllHistory).mockResolvedValue(historyEntries);
            await manager.indexHistory();

            // Perform search with date filters
            const results = await manager.search(dateFilter);

            // Verify all results respect date filters
            for (const result of results) {
              if (result.entry.visited_at < dateFilter.startDate || result.entry.visited_at > dateFilter.endDate) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect domain filters correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random history entries with valid URLs
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              url: fc.webUrl(),
              title: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
              visited_at: fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() }),
              visit_count: fc.integer({ min: 1, max: 100 }),
            }),
            { minLength: 1, maxLength: 50 } // Ensure at least one entry
          ),
          // Generate random domain filters
          fc.array(fc.domain(), { minLength: 1, maxLength: 5 }),
          async (historyEntries: HistoryEntry[], domains: string[]) => {
            // Setup mock
            vi.mocked(historyStore.getAllHistory).mockResolvedValue(historyEntries);
            await manager.indexHistory();

            // Perform search with domain filters
            const results = await manager.search({ domains });

            // Verify all results match domain filters
            for (const result of results) {
              try {
                const entryDomain = new URL(result.entry.url).hostname.toLowerCase();
                const matchesDomain = domains.some(d => entryDomain.includes(d.toLowerCase()));
                if (!matchesDomain) {
                  return false;
                }
              } catch {
                // Invalid URL should not appear in results
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect visit count filters correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random history entries
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              url: fc.webUrl(),
              title: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
              visited_at: fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() }),
              visit_count: fc.integer({ min: 1, max: 100 }),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          // Generate random minimum visit count
          fc.integer({ min: 1, max: 50 }),
          async (historyEntries: HistoryEntry[], minVisits: number) => {
            // Setup mock
            vi.mocked(historyStore.getAllHistory).mockResolvedValue(historyEntries);
            await manager.indexHistory();

            // Perform search with visit count filter
            const results = await manager.search({ minVisits });

            // Verify all results meet minimum visit count
            for (const result of results) {
              if (result.entry.visit_count < minVisits) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain search result consistency across multiple calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random history entries
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              url: fc.webUrl(),
              title: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
              visited_at: fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() }),
              visit_count: fc.integer({ min: 1, max: 100 }),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          // Generate random search filter (with defined values)
          fc.record({
            query: fc.option(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0)),
            startDate: fc.option(fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() })),
            endDate: fc.option(fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() })),
            minVisits: fc.option(fc.integer({ min: 1, max: 50 })),
          }),
          async (historyEntries: HistoryEntry[], filter: HistoryFilter) => {
            // Setup mock
            vi.mocked(historyStore.getAllHistory).mockResolvedValue(historyEntries);
            await manager.indexHistory();

            // Perform search multiple times
            const results1 = await manager.search(filter);
            const results2 = await manager.search(filter);

            // Results should be identical
            if (results1.length !== results2.length) {
              return false;
            }
            
            // Compare each result
            for (let i = 0; i < results1.length; i++) {
              if (results1[i].entry.id !== results2[i].entry.id ||
                  results1[i].entry.url !== results2[i].entry.url ||
                  results1[i].matchType !== results2[i].matchType) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide accurate history statistics', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random history entries with valid URLs
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              url: fc.webUrl(),
              title: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
              visited_at: fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() }),
              visit_count: fc.integer({ min: 1, max: 100 }),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          async (historyEntries: HistoryEntry[]) => {
            // Setup mock
            vi.mocked(historyStore.getAllHistory).mockResolvedValue(historyEntries);
            await manager.indexHistory();

            // Get statistics
            const stats = await manager.getHistoryStats();

            // Verify total entries
            if (stats.totalEntries !== historyEntries.length) {
              return false;
            }

            // Verify date range
            if (historyEntries.length > 0) {
              const minDate = Math.min(...historyEntries.map(h => h.visited_at));
              const maxDate = Math.max(...historyEntries.map(h => h.visited_at));
              if (stats.dateRange.start !== minDate || stats.dateRange.end !== maxDate) {
                return false;
              }
            } else {
              if (stats.dateRange.start !== 0 || stats.dateRange.end !== 0) {
                return false;
              }
            }

            // Verify unique domains count
            const uniqueDomains = new Set();
            historyEntries.forEach(entry => {
              try {
                const domain = new URL(entry.url).hostname.toLowerCase();
                uniqueDomains.add(domain);
              } catch {
                // Invalid URL, skip
              }
            });
            if (stats.uniqueDomains !== uniqueDomains.size) {
              return false;
            }

            // Verify top domains are sorted by count
            for (let i = 1; i < stats.topDomains.length; i++) {
              if (stats.topDomains[i - 1].count < stats.topDomains[i].count) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty search results correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random history entries
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              url: fc.webUrl(),
              title: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
              visited_at: fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() }),
              visit_count: fc.integer({ min: 1, max: 100 }),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          // Generate a query that won't match anything
          fc.constant('xyznonexistentquerythatshouldfindnothing123'),
          async (historyEntries: HistoryEntry[], query: string) => {
            // Setup mock
            vi.mocked(historyStore.getAllHistory).mockResolvedValue(historyEntries);
            await manager.indexHistory();

            // Perform search with non-matching query
            const results = await manager.search({ query });

            // Should return empty results
            return results.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});