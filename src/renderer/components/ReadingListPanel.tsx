/**
 * Reading List Panel Component
 * Provides UI for managing saved articles with summaries and filtering
 */

import React, { useState, useEffect, useCallback } from 'react';

interface ReadingItem {
  id: string;
  url: string;
  title: string;
  savedAt: number;
  summary?: {
    summary: string;
    type: string;
    wordCount: number;
    keyInsights?: string[];
    topics?: string[];
    keywords?: string[];
    readingTime: number;
    confidence: number;
    sourceWordCount: number;
    sourceReadingTime: number;
  };
  tags?: string[];
  readingTime?: number;
  progress?: number;
  isRead?: boolean;
  domain: string;
  wordCount?: number;
  language?: string;
  addedFrom?: 'manual' | 'jarvis' | 'command-palette';
}

interface ReadingListStats {
  totalItems: number;
  unreadItems: number;
  totalReadingTime: number;
  averageReadingTime: number;
  topDomains: Array<{ domain: string; count: number }>;
  topTags: Array<{ tag: string; count: number }>;
  recentlyAdded: number;
}

interface ReadingListFilter {
  isRead?: boolean;
  tags?: string[];
  domain?: string;
  dateRange?: {
    start: number;
    end: number;
  };
  minReadingTime?: number;
  maxReadingTime?: number;
}

export interface ReadingListPanelProps {
  onNavigate?: (url: string) => void;
}

const ReadingListPanel: React.FC<ReadingListPanelProps> = ({ onNavigate }) => {
  const [items, setItems] = useState<ReadingItem[]>([]);
  const [stats, setStats] = useState<ReadingListStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ReadingListFilter>({});
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'domain' | 'readingTime'>('recent');

  // Load reading list and stats
  const loadReadingList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [itemsResult, statsResult] = await Promise.all([
        window.arc.getReadingList(filter),
        window.arc.getReadingListStats()
      ]);

      if (itemsResult.ok) {
        let filteredItems = itemsResult.items;

        // Apply search filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filteredItems = filteredItems.filter((item: ReadingItem) =>
            item.title.toLowerCase().includes(query) ||
            item.url.toLowerCase().includes(query) ||
            item.domain.toLowerCase().includes(query) ||
            (item.tags && item.tags.some(tag => tag.toLowerCase().includes(query))) ||
            (item.summary && item.summary.summary.toLowerCase().includes(query))
          );
        }

        // Apply tag filter
        if (selectedTags.length > 0) {
          filteredItems = filteredItems.filter((item: ReadingItem) =>
            item.tags && selectedTags.some(tag => item.tags!.includes(tag))
          );
        }

        // Sort items
        filteredItems.sort((a: ReadingItem, b: ReadingItem) => {
          switch (sortBy) {
            case 'title':
              return a.title.localeCompare(b.title);
            case 'domain':
              return a.domain.localeCompare(b.domain);
            case 'readingTime':
              return (b.readingTime || 0) - (a.readingTime || 0);
            case 'recent':
            default:
              return b.savedAt - a.savedAt;
          }
        });

        setItems(filteredItems);
      } else {
        setError(itemsResult.error || 'Failed to load reading list');
      }

      if (statsResult.ok) {
        setStats(statsResult.stats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filter, searchQuery, selectedTags, sortBy]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadReadingList();
  }, [loadReadingList]);

  // Handle item actions
  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    try {
      const result = await window.arc.updateReadingListItem(id, { isRead });
      if (result.ok) {
        await loadReadingList(); // Refresh list
      } else {
        setError(result.error || 'Failed to update item');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleRemoveItem = async (id: string) => {
    try {
      const result = await window.arc.removeFromReadingList(id);
      if (result.ok) {
        await loadReadingList(); // Refresh list
      } else {
        setError(result.error || 'Failed to remove item');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleOpenItem = (url: string) => {
    if (onNavigate) {
      onNavigate(url);
    } else {
      window.open(url, '_blank');
    }
  };

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Format reading time
  const formatReadingTime = (minutes: number) => {
    if (minutes < 1) return '< 1 min';
    if (minutes === 1) return '1 min';
    return `${Math.round(minutes)} min`;
  };

  // Get available tags from stats
  const availableTags = stats?.topTags.map(t => t.tag) || [];

  if (loading) {
    return (
      <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Loading reading list...
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card reading-list-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Reading List</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="icon-button icon-button--glass"
              title="Toggle filters"
              aria-label="Toggle filters"
            >
              🔍
            </button>
            <button
              onClick={loadReadingList}
              className="icon-button icon-button--glass"
              title="Refresh"
              aria-label="Refresh reading list"
            >
              ↻
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            {stats.totalItems} articles • {stats.unreadItems} unread • {formatReadingTime(stats.totalReadingTime)} total
          </div>
        )}

        {/* Search and Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Search */}
          <input
            type="text"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pill-input"
            style={{ fontSize: '14px' }}
          />

          {/* Filters */}
          {showFilters && (
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              borderRadius: 'var(--radius-md)', 
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {/* Sort and Read Status */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="pill-input"
                  style={{ fontSize: '12px', minWidth: '120px' }}
                >
                  <option value="recent">Recent</option>
                  <option value="title">Title</option>
                  <option value="domain">Domain</option>
                  <option value="readingTime">Reading Time</option>
                </select>

                <select
                  value={filter.isRead === undefined ? 'all' : filter.isRead ? 'read' : 'unread'}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFilter(prev => ({
                      ...prev,
                      isRead: value === 'all' ? undefined : value === 'read'
                    }));
                  }}
                  className="pill-input"
                  style={{ fontSize: '12px', minWidth: '100px' }}
                >
                  <option value="all">All</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                </select>
              </div>

              {/* Tags */}
              {availableTags.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Filter by tags:
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {availableTags.slice(0, 10).map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          setSelectedTags(prev => 
                            prev.includes(tag) 
                              ? prev.filter(t => t !== tag)
                              : [...prev, tag]
                          );
                        }}
                        className={`btn-secondary ${selectedTags.includes(tag) ? 'btn-secondary--active' : ''}`}
                        style={{
                          fontSize: '11px',
                          padding: '4px 8px',
                          background: selectedTags.includes(tag) ? 'var(--accent)' : 'transparent'
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)', 
          padding: '12px',
          fontSize: '13px',
          color: '#ef4444'
        }}>
          {error}
        </div>
      )}

      {/* Items List */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px' 
      }}>
        {items.length === 0 ? (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            textAlign: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              📚
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                No articles yet
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {searchQuery || selectedTags.length > 0 || filter.isRead !== undefined
                  ? 'No articles match your filters'
                  : 'Save articles to your reading list to see them here'
                }
              </div>
            </div>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                backdropFilter: 'blur(10px)',
                opacity: item.isRead ? 0.7 : 1
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    lineHeight: '1.4',
                    wordBreak: 'break-word'
                  }}>
                    {item.title}
                  </h3>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-secondary)', 
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}>
                    <span>{item.domain}</span>
                    <span>•</span>
                    <span>{formatDate(item.savedAt)}</span>
                    {item.readingTime && (
                      <>
                        <span>•</span>
                        <span>{formatReadingTime(item.readingTime)}</span>
                      </>
                    )}
                    {item.isRead && (
                      <>
                        <span>•</span>
                        <span style={{ color: 'var(--success, #22c55e)' }}>✓ Read</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleMarkAsRead(item.id, !item.isRead)}
                    className="icon-button icon-button--glass"
                    title={item.isRead ? "Mark as unread" : "Mark as read"}
                    style={{ fontSize: '12px' }}
                  >
                    {item.isRead ? '📖' : '✓'}
                  </button>
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="icon-button icon-button--glass"
                    title="Remove from reading list"
                    style={{ fontSize: '12px' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Summary */}
              {item.summary && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                  fontSize: '13px',
                  lineHeight: '1.4'
                }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Summary:</strong>
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    {item.summary.summary}
                  </div>
                  
                  {/* Summary metadata */}
                  <div style={{ 
                    marginTop: '8px', 
                    fontSize: '11px', 
                    color: 'var(--text-tertiary)',
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    <span>{item.summary.wordCount} words</span>
                    <span>•</span>
                    <span>{Math.round(item.summary.confidence * 100)}% confidence</span>
                    {item.summary.topics && item.summary.topics.length > 0 && (
                      <>
                        <span>•</span>
                        <span>Topics: {item.summary.topics.slice(0, 3).join(', ')}</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {item.tags.map(tag => (
                    <span
                      key={tag}
                      style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Open Button */}
              <button
                onClick={() => handleOpenItem(item.url)}
                className="btn-primary"
                style={{
                  fontSize: '12px',
                  padding: '8px 16px',
                  alignSelf: 'flex-start'
                }}
              >
                📖 Open Article
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReadingListPanel;