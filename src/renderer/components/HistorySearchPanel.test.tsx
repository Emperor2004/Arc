import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HistorySearchPanel from './HistorySearchPanel';
import { historySearchManager } from '../../core/historySearchManager';

// Mock the historySearchManager
vi.mock('../../core/historySearchManager', () => ({
  historySearchManager: {
    indexHistory: vi.fn(),
    search: vi.fn(),
    getHistoryStats: vi.fn(),
  },
}));

describe('HistorySearchPanel', () => {
  const mockHistoryStats = {
    totalEntries: 100,
    uniqueDomains: 25,
    dateRange: { start: Date.now() - 86400000, end: Date.now() },
    topDomains: [
      { domain: 'example.com', count: 10 },
      { domain: 'google.com', count: 8 },
      { domain: 'github.com', count: 5 },
    ],
  };

  const mockSearchResults = [
    {
      entry: {
        id: 1,
        url: 'https://example.com/page1',
        title: 'Example Page 1',
        visited_at: Date.now() - 3600000,
        visit_count: 3,
      },
      matchType: 'title' as const,
      highlights: [{ start: 0, end: 7 }],
    },
    {
      entry: {
        id: 2,
        url: 'https://google.com/search',
        title: 'Google Search',
        visited_at: Date.now() - 7200000,
        visit_count: 1,
      },
      matchType: 'url' as const,
      highlights: [{ start: 8, end: 14 }],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    (historySearchManager.indexHistory as any).mockResolvedValue(undefined);
    (historySearchManager.getHistoryStats as any).mockResolvedValue(mockHistoryStats);
    (historySearchManager.search as any).mockResolvedValue(mockSearchResults);
  });

  it('should render loading state initially', () => {
    render(<HistorySearchPanel />);
    expect(screen.getByText('Indexing history...')).toBeTruthy();
  });

  it('should render search interface after initialization', async () => {
    render(<HistorySearchPanel />);
    
    await waitFor(() => {
      expect(screen.getByText('History Search')).toBeTruthy();
      expect(screen.getByPlaceholderText('Search history...')).toBeTruthy();
    });
  });

  it('should display search results', async () => {
    render(<HistorySearchPanel />);
    
    await waitFor(() => {
      expect(screen.getByText('Example Page 1')).toBeTruthy();
      expect(screen.getByText('Google Search')).toBeTruthy();
    });
  });

  it('should display results count', async () => {
    render(<HistorySearchPanel />);
    
    await waitFor(() => {
      expect(screen.getByText('2 results of 100 total')).toBeTruthy();
    });
  });

  it('should display history stats in footer', async () => {
    render(<HistorySearchPanel />);
    
    await waitFor(() => {
      // Check for the new statistics section
      expect(screen.getByText('History Statistics')).toBeTruthy();
      expect(screen.getByText('100')).toBeTruthy();
      expect(screen.getByText('Total Entries')).toBeTruthy();
      expect(screen.getByText('25')).toBeTruthy();
      expect(screen.getByText('Unique Domains')).toBeTruthy();
      expect(screen.getByText('Top Domains by Visits')).toBeTruthy();
    });
  });

  it('should call onHistoryClick when result is clicked', async () => {
    const onHistoryClick = vi.fn();
    render(<HistorySearchPanel onHistoryClick={onHistoryClick} />);
    
    await waitFor(() => {
      const resultItem = screen.getByText('Example Page 1').closest('.history-search-result-item');
      expect(resultItem).toBeTruthy();
      fireEvent.click(resultItem!);
    });
    
    expect(onHistoryClick).toHaveBeenCalledWith('https://example.com/page1');
  });

  it('should toggle filters when filter button is clicked', async () => {
    render(<HistorySearchPanel />);
    
    await waitFor(() => {
      const filterButton = screen.getByTitle('Toggle filters');
      fireEvent.click(filterButton);
    });
    
    expect(screen.getByText('From:')).toBeTruthy();
    expect(screen.getByText('To:')).toBeTruthy();
    expect(screen.getByText('Min visits:')).toBeTruthy();
  });

  it('should display top domains in filters', async () => {
    render(<HistorySearchPanel />);
    
    await waitFor(() => {
      const filterButton = screen.getByTitle('Toggle filters');
      fireEvent.click(filterButton);
    });
    
    expect(screen.getByText('example.com (10)')).toBeTruthy();
    expect(screen.getByText('google.com (8)')).toBeTruthy();
    expect(screen.getByText('github.com (5)')).toBeTruthy();
  });

  it('should perform search when query is entered', async () => {
    render(<HistorySearchPanel />);
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search history...');
      fireEvent.change(searchInput, { target: { value: 'example' } });
    });
    
    // Wait for debounced search
    await waitFor(() => {
      expect(historySearchManager.search).toHaveBeenCalledWith({
        query: 'example',
      });
    }, { timeout: 500 });
  });

  it('should apply date filters', async () => {
    render(<HistorySearchPanel />);
    
    await waitFor(() => {
      const filterButton = screen.getByTitle('Toggle filters');
      fireEvent.click(filterButton);
    });
    
    const startDateInput = screen.getByLabelText('From:');
    const endDateInput = screen.getByLabelText('To:');
    
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
    fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });
    
    await waitFor(() => {
      expect(historySearchManager.search).toHaveBeenCalledWith({
        startDate: new Date('2024-01-01').getTime(),
        endDate: new Date('2024-01-31').getTime(),
        minVisits: undefined,
      });
    }, { timeout: 500 });
  });

  it('should apply domain filters', async () => {
    render(<HistorySearchPanel />);
    
    await waitFor(() => {
      const filterButton = screen.getByTitle('Toggle filters');
      fireEvent.click(filterButton);
    });
    
    const domainFilter = screen.getByText('example.com (10)');
    fireEvent.click(domainFilter);
    
    await waitFor(() => {
      expect(historySearchManager.search).toHaveBeenCalledWith({
        domains: ['example.com'],
        minVisits: undefined,
      });
    }, { timeout: 500 });
  });

  it('should clear filters when clear button is clicked', async () => {
    render(<HistorySearchPanel />);
    
    await waitFor(() => {
      const filterButton = screen.getByTitle('Toggle filters');
      fireEvent.click(filterButton);
    });
    
    // Set some filters first
    const startDateInput = screen.getByLabelText('From:');
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
    
    const clearButton = screen.getByText('Clear Filters');
    fireEvent.click(clearButton);
    
    expect((startDateInput as HTMLInputElement).value).toBe('');
  });

  it('should display empty state when no results', async () => {
    (historySearchManager.search as any).mockResolvedValue([]);
    
    render(<HistorySearchPanel />);
    
    await waitFor(() => {
      expect(screen.getByText('No history entries found.')).toBeTruthy();
    });
  });

  it('should display no results message when search has no matches', async () => {
    (historySearchManager.search as any).mockResolvedValue([]);
    
    render(<HistorySearchPanel />);
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search history...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    });
    
    await waitFor(() => {
      expect(screen.getByText('No history entries match your search criteria.')).toBeTruthy();
    });
  });

  it('should handle search errors gracefully', async () => {
    (historySearchManager.search as any).mockRejectedValue(new Error('Search failed'));
    
    render(<HistorySearchPanel />);
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search history...');
      fireEvent.change(searchInput, { target: { value: 'test' } });
    });
    
    // Should not crash and should show empty results
    await waitFor(() => {
      expect(screen.getByText('No history entries match your search criteria.')).toBeTruthy();
    });
  });

  it('should format dates correctly', async () => {
    const now = new Date();
    const today = new Date(now.getTime());
    const yesterday = new Date(now.getTime() - 86400000);
    
    const todayResults = [{
      entry: {
        id: 1,
        url: 'https://example.com',
        title: 'Today',
        visited_at: today.getTime(),
        visit_count: 1,
      },
      matchType: 'title' as const,
      highlights: [],
    }];
    
    (historySearchManager.search as any).mockResolvedValue(todayResults);
    
    render(<HistorySearchPanel />);
    
    await waitFor(() => {
      expect(screen.getByText('Today')).toBeTruthy();
      // Should show time for today's entries
      const timeRegex = /\d{1,2}:\d{2}\s?(AM|PM)/;
      expect(screen.getByText(timeRegex)).toBeTruthy();
    });
  });
});