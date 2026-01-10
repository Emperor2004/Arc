import { HistoryEntry } from './types';
import { getAllHistory } from './historyStore';

export interface HistoryFilter {
  query?: string;
  startDate?: number;
  endDate?: number;
  domains?: string[];
  minVisits?: number;
}

export interface HistorySearchResult {
  entry: HistoryEntry;
  matchType: 'url' | 'title' | 'content';
  highlights: Array<{ start: number; end: number }>;
}

export interface HistoryStats {
  totalEntries: number;
  uniqueDomains: number;
  dateRange: { start: number; end: number };
  topDomains: Array<{ domain: string; count: number }>;
}

/**
 * Full-text search index for history entries
 */
class SearchIndex {
  private urlIndex: Map<string, Set<number>> = new Map();
  private titleIndex: Map<string, Set<number>> = new Map();
  private domainIndex: Map<string, Set<number>> = new Map();

  /**
   * Build search index from history entries
   */
  buildIndex(entries: HistoryEntry[]): void {
    this.urlIndex.clear();
    this.titleIndex.clear();
    this.domainIndex.clear();

    entries.forEach((entry, index) => {
      // Index URL
      this.indexText(entry.url.toLowerCase(), index, this.urlIndex);
      
      // Index title
      if (entry.title) {
        this.indexText(entry.title.toLowerCase(), index, this.titleIndex);
      }

      // Index domain
      try {
        const domain = new URL(entry.url).hostname.toLowerCase();
        this.indexText(domain, index, this.domainIndex);
      } catch {
        // Invalid URL, skip domain indexing
      }
    });
  }

  /**
   * Index text by creating n-grams for substring matching
   */
  private indexText(text: string, entryIndex: number, index: Map<string, Set<number>>): void {
    // Index full text
    if (!index.has(text)) {
      index.set(text, new Set());
    }
    index.get(text)!.add(entryIndex);

    // Index words
    const words = text.split(/\s+/).filter(word => word.length > 0);
    words.forEach(word => {
      if (!index.has(word)) {
        index.set(word, new Set());
      }
      index.get(word)!.add(entryIndex);
    });

    // Index prefixes for autocomplete
    for (let i = 1; i <= text.length; i++) {
      const prefix = text.substring(0, i);
      if (!index.has(prefix)) {
        index.set(prefix, new Set());
      }
      index.get(prefix)!.add(entryIndex);
    }
  }

  /**
   * Search for entries matching query
   */
  search(query: string): Array<{ index: number; matchType: 'url' | 'title' | 'content' }> {
    const lowerQuery = query.toLowerCase();
    const results: Array<{ index: number; matchType: 'url' | 'title' | 'content' }> = [];
    const seen = new Set<number>();

    // Search URL index
    for (const [key, indices] of this.urlIndex.entries()) {
      if (key.includes(lowerQuery)) {
        indices.forEach(index => {
          if (!seen.has(index)) {
            results.push({ index, matchType: 'url' });
            seen.add(index);
          }
        });
      }
    }

    // Search title index
    for (const [key, indices] of this.titleIndex.entries()) {
      if (key.includes(lowerQuery)) {
        indices.forEach(index => {
          if (!seen.has(index)) {
            results.push({ index, matchType: 'title' });
            seen.add(index);
          }
        });
      }
    }

    return results;
  }

  /**
   * Get entries by domain
   */
  getByDomain(domain: string): number[] {
    const lowerDomain = domain.toLowerCase();
    return Array.from(this.domainIndex.get(lowerDomain) || []);
  }
}

/**
 * History Search Manager
 */
export class HistorySearchManager {
  private searchIndex: SearchIndex = new SearchIndex();
  private cachedHistory: HistoryEntry[] = [];
  private lastIndexTime: number = 0;

  /**
   * Initialize or refresh the search index
   */
  async indexHistory(): Promise<void> {
    this.cachedHistory = await getAllHistory();
    this.searchIndex.buildIndex(this.cachedHistory);
    this.lastIndexTime = Date.now();
  }

  /**
   * Search history with filters
   */
  async search(filter: HistoryFilter): Promise<HistorySearchResult[]> {
    // Refresh index if needed (older than 5 minutes)
    if (Date.now() - this.lastIndexTime > 5 * 60 * 1000) {
      await this.indexHistory();
    }

    let results: HistoryEntry[] = [...this.cachedHistory];

    // Apply query filter
    if (filter.query && filter.query.trim()) {
      const searchResults = this.searchIndex.search(filter.query.trim());
      results = searchResults.map(result => this.cachedHistory[result.index]);
    }

    // Apply date filters
    if (filter.startDate !== undefined) {
      results = results.filter(entry => entry.visited_at >= filter.startDate!);
    }
    if (filter.endDate !== undefined) {
      results = results.filter(entry => entry.visited_at <= filter.endDate!);
    }

    // Apply domain filter
    if (filter.domains && filter.domains.length > 0) {
      results = results.filter(entry => {
        try {
          const domain = new URL(entry.url).hostname.toLowerCase();
          return filter.domains!.some(d => domain.includes(d.toLowerCase()));
        } catch {
          return false;
        }
      });
    }

    // Apply minimum visits filter
    if (filter.minVisits !== undefined && filter.minVisits > 0) {
      results = results.filter(entry => entry.visit_count >= filter.minVisits!);
    }

    // Convert to search results with highlights
    return results.map(entry => ({
      entry,
      matchType: this.getMatchType(entry, filter.query),
      highlights: this.getHighlights(entry, filter.query),
    }));
  }

  /**
   * Get history statistics
   */
  async getHistoryStats(): Promise<HistoryStats> {
    if (this.cachedHistory.length === 0) {
      await this.indexHistory();
    }

    const domains = new Map<string, number>();
    let minDate = Number.MAX_SAFE_INTEGER;
    let maxDate = 0;

    this.cachedHistory.forEach(entry => {
      // Track date range
      minDate = Math.min(minDate, entry.visited_at);
      maxDate = Math.max(maxDate, entry.visited_at);

      // Count domains
      try {
        const domain = new URL(entry.url).hostname.toLowerCase();
        domains.set(domain, (domains.get(domain) || 0) + entry.visit_count);
      } catch {
        // Invalid URL, skip
      }
    });

    // Sort domains by visit count
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

  /**
   * Determine match type for an entry
   */
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

  /**
   * Get highlight positions for search query
   */
  private getHighlights(entry: HistoryEntry, query?: string): Array<{ start: number; end: number }> {
    if (!query) return [];
    
    const highlights: Array<{ start: number; end: number }> = [];
    const lowerQuery = query.toLowerCase();
    
    // Check URL for highlights
    const urlIndex = entry.url.toLowerCase().indexOf(lowerQuery);
    if (urlIndex !== -1) {
      highlights.push({ start: urlIndex, end: urlIndex + query.length });
    }
    
    // Check title for highlights
    if (entry.title) {
      const titleIndex = entry.title.toLowerCase().indexOf(lowerQuery);
      if (titleIndex !== -1) {
        highlights.push({ start: titleIndex, end: titleIndex + query.length });
      }
    }
    
    return highlights;
  }
}

// Export singleton instance
export const historySearchManager = new HistorySearchManager();