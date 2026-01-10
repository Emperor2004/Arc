import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HistorySearchPanel from '../../renderer/components/HistorySearchPanel';
import { historySearchManager } from '../../core/historySearchManager';
import { HistoryEntry } from '../../core/types';

// Mock the historySearchManager but allow real implementation
vi.mock('../../core/historySearchManager', async () => {
  const actual = await vi.importActual('../../core/historySearchManager');
  return {
    ...actual,
    historySearchManager: {
      indexHistory: vi.fn(),
      search: vi.fn(),
      getHistoryStats: vi.fn(),
    },
  };
});

describe('History Search Integration Tests', () => {
  const generateRealisticHistory = (count: number): HistoryEntry[] => {
    const domains = [
      'github.com', 'stackoverflow.com', 'google.com', 'microsoft.com',
      'mozilla.org', 'w3.org', 'npmjs.com', 'typescript.org',
      'reactjs.org', 'nodejs.org', 'developer.mozilla.org', 'docs.microsoft.com',
      'medium.com', 'dev.to', 'hackernews.com', 'reddit.com'
    ];
    
    const pathTemplates = [
      '/docs/{topic}', '/tutorial/{topic}', '/guide/{topic}', '/reference/{topic}',
      '/api/{topic}', '/examples/{topic}', '/blog/{topic}', '/news/{topic}',
      '/questions/{id}', '/issues/{id}', '/pull/{id}', '/search?q={query}'
    ];

    const topics = [
      'javascript', 'typescript', 'react', 'nodejs', 'python', 'java',
      'css', 'html', 'vue', 'angular', 'docker', 'kubernetes', 'aws',
      'git', 'testing', 'performance', 'security', 'database'
    ];

    const entries: HistoryEntry[] = [];
    const now = Date.now();
    
    for (let i = 0; i < count; i++) {
      const domain = domains[i % domains.length];
      const pathTemplate = pathTemplates[i % pathTemplates.length];
      const topic = topics[i % topics.length];
      const id = Math.floor(Math.random() * 10000);
      
      let path = pathTemplate
        .replace('{topic}', topic)
        .replace('{id}', id.toString())
        .replace('{query}', encodeURIComponent(topic));
      
      const title = `${topic.charAt(0).toUpperCase() + topic.slice(1)} - ${domain}`;
      
      entries.push({
        id: i + 1,
        url: `https://${domain}${path}`,
        title: Math.random() > 0.1 ? title : null, // 10% chance of null title
        visited_at: now - (i * 60000) - Math.floor(Math.random() * 86400000), // Random within last day
        visit_count: Math.floor(Math.random() * 50) + 1,
      });
    }
    
    return entries.sort((a, b) => b.visited_at - a.visited_at); // Sort by most recent first
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle large dataset search with UI responsiveness', async () => {
    const largeHistory = generateRealisticHistory(1000);
    const mockStats = {
      totalEntries: largeHistory.length,
      uniqueDomains: 16,
      dateRange: { 
        start: Math.min(...largeHistory.map(h => h.visited_at)), 
        end: Math.max(...largeHistory.map(h => h.visited_at)) 
      },
      topDomains: [
        { domain: 'github.com', count: 150 },
        { domain: 'stackoverflow.com', count: 120 },
        { domain: 'google.com', count: 100 },
        { domain: 'microsoft.com', count: 80 },
        { domain: 'mozilla.org', count: 60 },
      ],
    };

    // Mock the search to return filtered results
    (historySearchManager.indexHistory as any).mockResolvedValue(undefined);
    (historySearchManager.getHistoryStats as any).mockResolvedValue(mockStats);
    (historySearchManager.search as any).mockImplementation(async (filter: any) => {
      let results = largeHistory;
      
      if (filter.query) {
        const query = filter.query.toLowerCase();
        results = results.filter(entry => 
          entry.url.toLowerCase().includes(query) || 
          (entry.title && entry.title.toLowerCase().includes(query))
        );
      }
      
      if (filter.domains) {
        results = results.filter(entry => {
          try {
            const domain = new URL(entry.url).hostname;
            return filter.domains.some((d: string) => domain.includes(d));
          } catch {
            return false;
          }
        });
      }
      
      if (filter.minVisits) {
        results = results.filter(entry => entry.visit_count >= filter.minVisits);
      }
      
      if (filter.startDate) {
        results = results.filter(entry => entry.visited_at >= filter.startDate);
      }
      
      if (filter.endDate) {
        results = results.filter(entry => entry.visited_at <= filter.endDate);
      }
      
      return results.slice(0, 100).map(entry => ({
        entry,
        matchType: 'title' as const,
        highlights: filter.query ? [{ start: 0, end: filter.query.length }] : [],
      }));
    });

    render(React.createElement(HistorySearchPanel));
    
    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByText('History Search')).toBeTruthy();
    });

    // Test search responsiveness
    const searchInput = screen.getByPlaceholderText('Search history...');
    
    const startTime = performance.now();
    fireEvent.change(searchInput, { target: { value: 'javascript' } });
    
    await waitFor(() => {
      expect(historySearchManager.search).toHaveBeenCalledWith({
        query: 'javascript',
      });
    }, { timeout: 500 });
    
    const searchTime = performance.now() - startTime;
    expect(searchTime).toBeLessThan(500); // Should respond within 500ms
    
    console.log(`UI search response time: ${searchTime.toFixed(2)}ms`);
  });

  it('should handle rapid filter changes without performance degradation', async () => {
    const history = generateRealisticHistory(500);
    const mockStats = {
      totalEntries: history.length,
      uniqueDomains: 10,
      dateRange: { start: Date.now() - 86400000, end: Date.now() },
      topDomains: [
        { domain: 'github.com', count: 50 },
        { domain: 'stackoverflow.com', count: 40 },
      ],
    };

    (historySearchManager.indexHistory as any).mockResolvedValue(undefined);
    (historySearchManager.getHistoryStats as any).mockResolvedValue(mockStats);
    (historySearchManager.search as any).mockResolvedValue([]);

    render(React.createElement(HistorySearchPanel));
    
    await waitFor(() => {
      expect(screen.getByText('History Search')).toBeTruthy();
    });

    // Open filters
    const filterButton = screen.getByTitle('Toggle filters');
    fireEvent.click(filterButton);

    // Rapid filter changes
    const startTime = performance.now();
    
    const searchInput = screen.getByPlaceholderText('Search history...');
    const startDateInput = screen.getByLabelText('From:');
    const endDateInput = screen.getByLabelText('To:');
    const minVisitsInput = screen.getByLabelText('Min visits:');

    // Simulate rapid user input
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
    fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });
    fireEvent.change(minVisitsInput, { target: { value: '5' } });
    fireEvent.change(searchInput, { target: { value: 'test query' } });

    await waitFor(() => {
      expect(historySearchManager.search).toHaveBeenCalled();
    }, { timeout: 1000 });

    const totalTime = performance.now() - startTime;
    expect(totalTime).toBeLessThan(1000); // Should handle rapid changes within 1 second
    
    console.log(`Rapid filter changes handled in: ${totalTime.toFixed(2)}ms`);
  });

  it('should maintain UI responsiveness during complex searches', async () => {
    const complexHistory = generateRealisticHistory(2000);
    const mockStats = {
      totalEntries: complexHistory.length,
      uniqueDomains: 20,
      dateRange: { start: Date.now() - 86400000 * 30, end: Date.now() },
      topDomains: Array.from({ length: 10 }, (_, i) => ({
        domain: `domain${i}.com`,
        count: 100 - i * 10,
      })),
    };

    (historySearchManager.indexHistory as any).mockResolvedValue(undefined);
    (historySearchManager.getHistoryStats as any).mockResolvedValue(mockStats);
    
    // Simulate slow search for stress testing
    (historySearchManager.search as any).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      return complexHistory.slice(0, 50).map(entry => ({
        entry,
        matchType: 'title' as const,
        highlights: [],
      }));
    });

    render(React.createElement(HistorySearchPanel));
    
    await waitFor(() => {
      expect(screen.getByText('History Search')).toBeTruthy();
    });

    // Test that UI remains responsive during search
    const searchInput = screen.getByPlaceholderText('Search history...');
    
    fireEvent.change(searchInput, { target: { value: 'complex search query' } });
    
    // UI should show loading state
    await waitFor(() => {
      expect(screen.getByText('Searching...')).toBeTruthy();
    });

    // UI should remain interactive during search
    const filterButton = screen.getByTitle('Toggle filters');
    fireEvent.click(filterButton);
    
    // Should be able to toggle filters even during search
    expect(screen.getByText('From:')).toBeTruthy();

    // Wait for search to complete
    await waitFor(() => {
      expect(screen.queryByText('Searching...')).toBeFalsy();
    }, { timeout: 1000 });
  });

  it('should handle error states gracefully', async () => {
    (historySearchManager.indexHistory as any).mockRejectedValue(new Error('Index failed'));
    (historySearchManager.getHistoryStats as any).mockRejectedValue(new Error('Stats failed'));
    (historySearchManager.search as any).mockRejectedValue(new Error('Search failed'));

    render(React.createElement(HistorySearchPanel));
    
    // Should handle initialization error
    await waitFor(() => {
      expect(screen.getByText('History Search')).toBeTruthy();
    });

    // Should handle search error gracefully
    const searchInput = screen.getByPlaceholderText('Search history...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('No history entries match your search criteria.')).toBeTruthy();
    });

    // UI should remain functional
    expect(searchInput).toBeTruthy();
    expect(screen.getByTitle('Toggle filters')).toBeTruthy();
  });

  it('should display comprehensive statistics correctly', async () => {
    const history = generateRealisticHistory(1500);
    const mockStats = {
      totalEntries: 1500,
      uniqueDomains: 25,
      dateRange: { start: Date.now() - 86400000 * 365, end: Date.now() },
      topDomains: [
        { domain: 'github.com', count: 200 },
        { domain: 'stackoverflow.com', count: 180 },
        { domain: 'google.com', count: 150 },
        { domain: 'microsoft.com', count: 120 },
        { domain: 'mozilla.org', count: 100 },
        { domain: 'w3.org', count: 80 },
        { domain: 'npmjs.com', count: 60 },
        { domain: 'typescript.org', count: 40 },
      ],
    };

    (historySearchManager.indexHistory as any).mockResolvedValue(undefined);
    (historySearchManager.getHistoryStats as any).mockResolvedValue(mockStats);
    (historySearchManager.search as any).mockResolvedValue([]);

    render(React.createElement(HistorySearchPanel));
    
    await waitFor(() => {
      expect(screen.getByText('History Statistics')).toBeTruthy();
    });

    // Check statistics display
    expect(screen.getByText('1,500')).toBeTruthy();
    expect(screen.getByText('Total Entries')).toBeTruthy();
    expect(screen.getByText('25')).toBeTruthy();
    expect(screen.getByText('Unique Domains')).toBeTruthy();
    expect(screen.getByText('365')).toBeTruthy(); // Days of history
    expect(screen.getByText('Days of History')).toBeTruthy();

    // Check top domains
    expect(screen.getByText('Top Domains by Visits')).toBeTruthy();
    expect(screen.getByText('github.com')).toBeTruthy();
    expect(screen.getByText('200 visits')).toBeTruthy();
    expect(screen.getByText('stackoverflow.com')).toBeTruthy();
    expect(screen.getByText('180 visits')).toBeTruthy();
  });

  it('should handle accessibility requirements', async () => {
    const history = generateRealisticHistory(100);
    const mockStats = {
      totalEntries: 100,
      uniqueDomains: 5,
      dateRange: { start: Date.now() - 86400000, end: Date.now() },
      topDomains: [{ domain: 'example.com', count: 20 }],
    };

    (historySearchManager.indexHistory as any).mockResolvedValue(undefined);
    (historySearchManager.getHistoryStats as any).mockResolvedValue(mockStats);
    (historySearchManager.search as any).mockResolvedValue([]);

    render(React.createElement(HistorySearchPanel));
    
    await waitFor(() => {
      expect(screen.getByText('History Search')).toBeTruthy();
    });

    // Check ARIA labels
    expect(screen.getByLabelText('Toggle search filters')).toBeTruthy();
    
    // Open filters to check more accessibility features
    const filterButton = screen.getByTitle('Toggle filters');
    fireEvent.click(filterButton);

    expect(screen.getByLabelText('From:')).toBeTruthy();
    expect(screen.getByLabelText('To:')).toBeTruthy();
    expect(screen.getByLabelText('Min visits:')).toBeTruthy();

    // Test keyboard navigation
    const searchInput = screen.getByPlaceholderText('Search history...');
    searchInput.focus();
    expect(document.activeElement).toBe(searchInput);

    // Test that all interactive elements are focusable
    const interactiveElements = screen.getAllByRole('button');
    interactiveElements.forEach(element => {
      expect(element.tabIndex).toBeGreaterThanOrEqual(0);
    });
  });
});