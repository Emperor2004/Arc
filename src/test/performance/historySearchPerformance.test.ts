import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HistorySearchManager } from '../../core/historySearchManager';
import { HistoryEntry } from '../../core/types';
import * as historyStore from '../../core/historyStore';

// Mock historyStore module
vi.mock('../../core/historyStore');

describe('HistorySearchManager - Performance Tests', () => {
  let manager: HistorySearchManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new HistorySearchManager();
  });

  const generateLargeHistory = (count: number): HistoryEntry[] => {
    const domains = [
      'github.com', 'stackoverflow.com', 'google.com', 'microsoft.com',
      'mozilla.org', 'w3.org', 'npmjs.com', 'typescript.org',
      'reactjs.org', 'nodejs.org', 'developer.mozilla.org', 'docs.microsoft.com'
    ];
    
    const titles = [
      'Documentation', 'Tutorial', 'Guide', 'Reference', 'API',
      'Examples', 'Getting Started', 'Advanced Topics', 'Best Practices',
      'Troubleshooting', 'FAQ', 'Community', 'Blog Post', 'News'
    ];

    const entries: HistoryEntry[] = [];
    const now = Date.now();
    
    for (let i = 0; i < count; i++) {
      const domain = domains[i % domains.length];
      const title = titles[i % titles.length];
      const path = `/page-${i}`;
      
      entries.push({
        id: i + 1,
        url: `https://${domain}${path}`,
        title: `${title} - ${domain}`,
        visited_at: now - (i * 60000), // 1 minute apart
        visit_count: Math.floor(Math.random() * 20) + 1,
      });
    }
    
    return entries;
  };

  it('should index 10,000 history entries within performance limits', async () => {
    const largeHistory = generateLargeHistory(10000);
    vi.mocked(historyStore.getAllHistory).mockResolvedValue(largeHistory);

    const startTime = performance.now();
    await manager.indexHistory();
    const indexTime = performance.now() - startTime;

    // Should index within 2 seconds (requirement from design)
    expect(indexTime).toBeLessThan(2000);
    console.log(`Indexed ${largeHistory.length} entries in ${indexTime.toFixed(2)}ms`);
  });

  it('should search 10,000 entries within performance limits', async () => {
    const largeHistory = generateLargeHistory(10000);
    vi.mocked(historyStore.getAllHistory).mockResolvedValue(largeHistory);
    
    await manager.indexHistory();

    const startTime = performance.now();
    const results = await manager.search({ query: 'github' });
    const searchTime = performance.now() - startTime;

    // Should search within 200ms (requirement from design)
    expect(searchTime).toBeLessThan(200);
    expect(results.length).toBeGreaterThan(0);
    console.log(`Searched ${largeHistory.length} entries in ${searchTime.toFixed(2)}ms, found ${results.length} results`);
  });

  it('should handle complex filters on large dataset efficiently', async () => {
    const largeHistory = generateLargeHistory(10000);
    vi.mocked(historyStore.getAllHistory).mockResolvedValue(largeHistory);
    
    await manager.indexHistory();

    const startTime = performance.now();
    const results = await manager.search({
      query: 'documentation',
      startDate: Date.now() - (30 * 24 * 60 * 60 * 1000), // Last 30 days
      domains: ['github.com', 'stackoverflow.com'],
      minVisits: 5,
    });
    const searchTime = performance.now() - startTime;

    // Should handle complex filters within 200ms
    expect(searchTime).toBeLessThan(200);
    console.log(`Complex filtered search on ${largeHistory.length} entries in ${searchTime.toFixed(2)}ms, found ${results.length} results`);
  });

  it('should generate statistics for large dataset efficiently', async () => {
    const largeHistory = generateLargeHistory(10000);
    vi.mocked(historyStore.getAllHistory).mockResolvedValue(largeHistory);
    
    await manager.indexHistory();

    const startTime = performance.now();
    const stats = await manager.getHistoryStats();
    const statsTime = performance.now() - startTime;

    // Should generate stats within 100ms
    expect(statsTime).toBeLessThan(100);
    expect(stats.totalEntries).toBe(10000);
    expect(stats.uniqueDomains).toBeGreaterThan(0);
    expect(stats.topDomains.length).toBeGreaterThan(0);
    console.log(`Generated stats for ${largeHistory.length} entries in ${statsTime.toFixed(2)}ms`);
  });

  it('should handle multiple concurrent searches efficiently', async () => {
    const largeHistory = generateLargeHistory(5000);
    vi.mocked(historyStore.getAllHistory).mockResolvedValue(largeHistory);
    
    await manager.indexHistory();

    const queries = ['github', 'documentation', 'tutorial', 'api', 'guide'];
    
    const startTime = performance.now();
    const searchPromises = queries.map(query => manager.search({ query }));
    const results = await Promise.all(searchPromises);
    const totalTime = performance.now() - startTime;

    // All searches should complete within 500ms total
    expect(totalTime).toBeLessThan(500);
    expect(results.length).toBe(queries.length);
    results.forEach(result => expect(result.length).toBeGreaterThanOrEqual(0));
    console.log(`Completed ${queries.length} concurrent searches in ${totalTime.toFixed(2)}ms`);
  });

  it('should maintain performance with frequent re-indexing', async () => {
    const baseHistory = generateLargeHistory(1000);
    
    const times: number[] = [];
    
    for (let i = 0; i < 5; i++) {
      const history = [...baseHistory, ...generateLargeHistory(100)]; // Add 100 more each time
      vi.mocked(historyStore.getAllHistory).mockResolvedValue(history);
      
      const startTime = performance.now();
      await manager.indexHistory();
      const indexTime = performance.now() - startTime;
      
      times.push(indexTime);
    }

    // Each re-index should be reasonably fast
    times.forEach(time => expect(time).toBeLessThan(1000));
    
    // Performance should not degrade significantly
    const firstTime = times[0];
    const lastTime = times[times.length - 1];
    expect(lastTime).toBeLessThan(firstTime * 2); // Should not be more than 2x slower
    
    console.log(`Re-indexing times: ${times.map(t => t.toFixed(2)).join('ms, ')}ms`);
  });

  it('should handle edge case searches efficiently', async () => {
    const largeHistory = generateLargeHistory(5000);
    vi.mocked(historyStore.getAllHistory).mockResolvedValue(largeHistory);
    
    await manager.indexHistory();

    // Test various edge cases
    const edgeCases = [
      '', // Empty query
      'a', // Single character
      'nonexistentquerythatshouldfindnothing', // No matches
      'github.com/microsoft/vscode/issues/12345', // Very specific
      'documentation tutorial guide', // Multiple words
    ];

    for (const query of edgeCases) {
      const startTime = performance.now();
      const results = await manager.search({ query });
      const searchTime = performance.now() - startTime;

      expect(searchTime).toBeLessThan(200);
      expect(Array.isArray(results)).toBe(true);
      console.log(`Edge case search "${query}" completed in ${searchTime.toFixed(2)}ms, found ${results.length} results`);
    }
  });
});