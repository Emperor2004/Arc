import React, { useState, useEffect, useCallback } from 'react';
import { HistoryEntry } from '../../core/types';
import { 
  historySearchManager, 
  HistoryFilter, 
  HistorySearchResult, 
  HistoryStats 
} from '../../core/historySearchManager';

export interface HistorySearchPanelProps {
  onHistoryClick?: (url: string) => void;
}

const HistorySearchPanel: React.FC<HistorySearchPanelProps> = ({
  onHistoryClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HistorySearchResult[]>([]);
  const [historyStats, setHistoryStats] = useState<HistoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [minVisits, setMinVisits] = useState<number>(1);
  const [showFilters, setShowFilters] = useState(false);

  // Initialize history index and stats on mount
  useEffect(() => {
    const initializeHistory = async () => {
      try {
        setIsInitializing(true);
        await historySearchManager.indexHistory();
        const stats = await historySearchManager.getHistoryStats();
        setHistoryStats(stats);
        
        // Load initial results (all history)
        const initialResults = await historySearchManager.search({});
        setSearchResults(Array.isArray(initialResults) ? initialResults.slice(0, 50) : []); // Limit initial results
      } catch (error) {
        // Only log if not in test environment to reduce noise in test output
        const isTestEnv = (typeof process !== 'undefined' && 
          (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true')) ||
          (typeof window !== 'undefined' && (window as any).__VITEST__);
        if (!isTestEnv) {
          console.error('Error initializing history search:', error);
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initializeHistory();
  }, []);

  // Debounced search function
  const performSearch = useCallback(async () => {
    if (isInitializing) return;

    try {
      setIsLoading(true);
      
      const filter: HistoryFilter = {
        query: searchQuery.trim() || undefined,
        startDate: startDate ? new Date(startDate).getTime() : undefined,
        endDate: endDate ? new Date(endDate).getTime() : undefined,
        domains: selectedDomains.length > 0 ? selectedDomains : undefined,
        minVisits: minVisits > 1 ? minVisits : undefined,
      };

      const results = await historySearchManager.search(filter);
      setSearchResults(results?.slice(0, 100) || []); // Limit results for performance
    } catch (error) {
      console.error('Error searching history:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, startDate, endDate, selectedDomains, minVisits, isInitializing]);

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [performSearch]);

  const handleHistoryClick = (url: string) => {
    onHistoryClick?.(url);
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const highlightText = (text: string, query: string, highlights: Array<{ start: number; end: number }>): React.ReactNode => {
    if (!query.trim() || highlights.length === 0) return text;

    // Sort highlights by start position
    const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start);
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedHighlights.forEach((highlight, index) => {
      // Add text before highlight
      if (highlight.start > lastIndex) {
        parts.push(text.substring(lastIndex, highlight.start));
      }
      
      // Add highlighted text
      parts.push(
        <mark key={index} className="history-search-highlight">
          {text.substring(highlight.start, highlight.end)}
        </mark>
      );
      
      lastIndex = highlight.end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  const getDomainFromUrl = (url: string): string => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  const getMatchTypeIcon = (matchType: 'url' | 'title' | 'content'): string => {
    switch (matchType) {
      case 'url': return '🔗';
      case 'title': return '📄';
      case 'content': return '🔍';
      default: return '📄';
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedDomains([]);
    setMinVisits(1);
  };

  const toggleDomainFilter = (domain: string) => {
    setSelectedDomains(prev => 
      prev.includes(domain) 
        ? prev.filter(d => d !== domain)
        : [...prev, domain]
    );
  };

  if (isInitializing) {
    return (
      <div className="history-search-panel glass-card">
        <div className="history-search-header">
          <h2>History Search</h2>
        </div>
        <div className="history-search-loading">
          <div className="history-search-loading-text">Indexing history...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="history-search-panel glass-card">
      <div className="history-search-header">
        <h2>History Search</h2>
        <div className="history-search-controls">
          <div className="history-search-input-container">
            <input
              type="text"
              className="history-search-input pill-input"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              className="history-search-filter-toggle round-btn"
              onClick={() => setShowFilters(!showFilters)}
              title="Toggle filters"
              aria-label="Toggle search filters"
            >
              🔧
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="history-search-filters">
          <div className="history-search-filters-row">
            <div className="history-search-filter-group">
              <label htmlFor="history-start-date" className="history-search-filter-label">From:</label>
              <input
                id="history-start-date"
                type="date"
                className="history-search-date-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="history-search-filter-group">
              <label htmlFor="history-end-date" className="history-search-filter-label">To:</label>
              <input
                id="history-end-date"
                type="date"
                className="history-search-date-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="history-search-filter-group">
              <label htmlFor="history-min-visits" className="history-search-filter-label">Min visits:</label>
              <input
                id="history-min-visits"
                type="number"
                className="history-search-number-input"
                min="1"
                value={minVisits}
                onChange={(e) => setMinVisits(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          
          {historyStats && historyStats.topDomains && historyStats.topDomains.length > 0 && (
            <div className="history-search-filter-group">
              <label className="history-search-filter-label">Top domains:</label>
              <div className="history-search-domain-filters">
                {historyStats.topDomains.slice(0, 8).map(({ domain, count }) => (
                  <button
                    key={domain}
                    className={`history-search-domain-filter ${
                      selectedDomains.includes(domain) ? 'history-search-domain-filter--active' : ''
                    }`}
                    onClick={() => toggleDomainFilter(domain)}
                    title={`${domain} (${count} visits)`}
                  >
                    {domain} ({count})
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="history-search-filters-actions">
            <button
              className="history-search-clear-filters btn-secondary"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      <div className="history-search-results">
        {isLoading ? (
          <div className="history-search-loading">
            <div className="history-search-loading-text">Searching...</div>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="history-search-empty">
            {searchQuery.trim() || startDate || endDate || selectedDomains.length > 0 || minVisits > 1
              ? 'No history entries match your search criteria.'
              : 'No history entries found.'}
          </div>
        ) : (
          <>
            <div className="history-search-results-header">
              <span className="history-search-results-count">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                {historyStats && ` of ${historyStats.totalEntries} total`}
              </span>
            </div>
            <div className="history-search-results-list">
              {searchResults.map((result, index) => (
                <div
                  key={`${result.entry.id}-${index}`}
                  className="history-search-result-item"
                  onClick={() => handleHistoryClick(result.entry.url)}
                >
                  <div className="history-search-result-content">
                    <div className="history-search-result-header">
                      <span className="history-search-result-match-type" title={`Matched in ${result.matchType}`}>
                        {getMatchTypeIcon(result.matchType)}
                      </span>
                      <div className="history-search-result-title">
                        {result.entry.title 
                          ? highlightText(result.entry.title, searchQuery, result.highlights)
                          : 'Untitled'
                        }
                      </div>
                      <div className="history-search-result-visits">
                        {result.entry.visit_count} visit{result.entry.visit_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="history-search-result-url" title={result.entry.url}>
                      {highlightText(getDomainFromUrl(result.entry.url), searchQuery, result.highlights)}
                      <span className="history-search-result-path">
                        {new URL(result.entry.url).pathname !== '/' ? new URL(result.entry.url).pathname : ''}
                      </span>
                    </div>
                    <div className="history-search-result-date">
                      {formatDate(result.entry.visited_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {historyStats && (
        <div className="history-search-footer">
          <div className="history-search-stats-section">
            <h3 className="history-search-stats-title">History Statistics</h3>
            
            <div className="history-search-stats-overview">
              <div className="history-search-stat-card">
                <div className="history-search-stat-value">{historyStats.totalEntries.toLocaleString()}</div>
                <div className="history-search-stat-label">Total Entries</div>
              </div>
              <div className="history-search-stat-card">
                <div className="history-search-stat-value">{historyStats.uniqueDomains.toLocaleString()}</div>
                <div className="history-search-stat-label">Unique Domains</div>
              </div>
              {historyStats.dateRange.start > 0 && (
                <div className="history-search-stat-card">
                  <div className="history-search-stat-value">
                    {Math.ceil((historyStats.dateRange.end - historyStats.dateRange.start) / (1000 * 60 * 60 * 24))}
                  </div>
                  <div className="history-search-stat-label">Days of History</div>
                </div>
              )}
              {historyStats.dateRange.start > 0 && (
                <div className="history-search-stat-card">
                  <div className="history-search-stat-value">{formatDate(historyStats.dateRange.start)}</div>
                  <div className="history-search-stat-label">First Visit</div>
                </div>
              )}
            </div>

            {historyStats && historyStats.topDomains && historyStats.topDomains.length > 0 && (
              <div className="history-search-top-domains">
                <h4 className="history-search-top-domains-title">Top Domains by Visits</h4>
                <div className="history-search-top-domains-list">
                  {historyStats.topDomains.slice(0, 10).map(({ domain, count }, index) => (
                    <div key={domain} className="history-search-top-domain-item">
                      <div className="history-search-top-domain-rank">#{index + 1}</div>
                      <div className="history-search-top-domain-info">
                        <div className="history-search-top-domain-name" title={domain}>
                          {domain}
                        </div>
                        <div className="history-search-top-domain-count">
                          {count.toLocaleString()} visit{count !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="history-search-top-domain-bar">
                        <div 
                          className="history-search-top-domain-bar-fill"
                          style={{ 
                            width: `${(count / historyStats.topDomains[0].count) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HistorySearchPanel;