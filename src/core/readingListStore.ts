/**
 * Reading List Storage and Management
 * Provides storage and management for saved articles with optional summarization
 */

import { summarizeText, SummaryResult, SummaryError } from './summarization';
import { extractContentForSummarization, PageContent } from './pageContent';

export interface ReadingItem {
  id: string;
  url: string;
  title: string;
  savedAt: number;
  summary?: SummaryResult;
  tags?: string[];
  readingTime?: number; // in minutes
  progress?: number; // 0-1, reading progress
  isRead?: boolean;
  favicon?: string;
  domain: string;
  wordCount?: number;
  language?: string;
  addedFrom?: 'manual' | 'jarvis' | 'command-palette';
}

export interface ReadingListStats {
  totalItems: number;
  unreadItems: number;
  totalReadingTime: number; // in minutes
  averageReadingTime: number;
  topDomains: Array<{ domain: string; count: number }>;
  topTags: Array<{ tag: string; count: number }>;
  recentlyAdded: number; // items added in last 7 days
}

export interface ReadingListFilter {
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

// In-memory storage for reading list items
let readingListItems: ReadingItem[] = [];
let isLoaded = false;

// Storage file path
const READING_LIST_FILE = 'data/reading-list.json';

/**
 * Generate a unique ID for reading list items
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

/**
 * Load reading list from storage
 */
async function loadReadingList(): Promise<void> {
  if (isLoaded) return;

  try {
    // Check if we're in browser environment
    if (typeof window !== 'undefined' && window.arc) {
      // We're in renderer - this shouldn't happen, but handle gracefully
      console.warn('⚠️ [ReadingList] loadReadingList called in renderer context');
      return;
    }

    // We're in main process - use file system
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');
    
    const filePath = path.resolve(READING_LIST_FILE);
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      
      if (Array.isArray(parsed.items)) {
        readingListItems = parsed.items;
        console.log('📚 [ReadingList] Loaded', readingListItems.length, 'items from storage');
      }
    } catch (fileError) {
      // File doesn't exist or is invalid - start with empty list
      console.log('📚 [ReadingList] Starting with empty reading list');
      readingListItems = [];
    }
    
    isLoaded = true;
  } catch (error) {
    console.error('📚 [ReadingList] Error loading reading list:', error);
    readingListItems = [];
    isLoaded = true;
  }
}

/**
 * Save reading list to storage
 */
async function saveReadingList(): Promise<void> {
  try {
    // Check if we're in browser environment
    if (typeof window !== 'undefined') {
      console.warn('⚠️ [ReadingList] saveReadingList called in renderer context');
      return;
    }

    // We're in main process - use file system
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');
    
    const filePath = path.resolve(READING_LIST_FILE);
    const dir = path.dirname(filePath);
    
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });
    
    const data = {
      version: '1.0.0',
      savedAt: Date.now(),
      items: readingListItems
    };
    
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log('📚 [ReadingList] Saved', readingListItems.length, 'items to storage');
  } catch (error) {
    console.error('📚 [ReadingList] Error saving reading list:', error);
  }
}

/**
 * Add an item to the reading list
 */
export async function addToReadingList(
  url: string,
  title: string,
  options: {
    autoSummarize?: boolean;
    tags?: string[];
    addedFrom?: 'manual' | 'jarvis' | 'command-palette';
    content?: PageContent;
  } = {}
): Promise<{ ok: boolean; item?: ReadingItem; error?: string }> {
  try {
    await loadReadingList();
    
    // Check if item already exists
    const existingItem = readingListItems.find(item => item.url === url);
    if (existingItem) {
      return {
        ok: false,
        error: 'Item already exists in reading list'
      };
    }
    
    const domain = extractDomain(url);
    const now = Date.now();
    
    // Create base item
    const item: ReadingItem = {
      id: generateId(),
      url,
      title: title || 'Untitled',
      savedAt: now,
      tags: options.tags || [],
      domain,
      isRead: false,
      progress: 0,
      addedFrom: options.addedFrom || 'manual'
    };
    
    // Add content metadata if provided
    if (options.content) {
      item.readingTime = options.content.readingTime;
      item.wordCount = options.content.wordCount;
      item.language = options.content.language;
    }
    
    // Auto-summarize if requested
    if (options.autoSummarize) {
      try {
        console.log('📚 [ReadingList] Auto-summarizing item:', title);
        
        let summaryResult;
        if (options.content) {
          // Use provided content
          summaryResult = await summarizeText(
            options.content.text,
            {
              title: options.content.title,
              url: options.content.url,
              language: options.content.language
            },
            {
              type: 'insights',
              includeKeywords: true,
              includeTopics: true
            }
          );
        } else {
          // Extract content from current page
          const content = await extractContentForSummarization();
          if (content) {
            summaryResult = await summarizeText(
              content.text,
              {
                title: content.title,
                url: content.url,
                language: content.language
              },
              {
                type: 'insights',
                includeKeywords: true,
                includeTopics: true
              }
            );
            
            // Update item with content metadata
            item.readingTime = content.readingTime;
            item.wordCount = content.wordCount;
            item.language = content.language;
          }
        }
        
        if (summaryResult && 'summary' in summaryResult) {
          item.summary = summaryResult as SummaryResult;
          console.log('📚 [ReadingList] Auto-summary generated successfully');
        } else {
          console.log('📚 [ReadingList] Auto-summary failed:', (summaryResult as SummaryError)?.error);
        }
      } catch (summaryError) {
        console.error('📚 [ReadingList] Auto-summary error:', summaryError);
        // Continue without summary - don't fail the entire operation
      }
    }
    
    // Add to list and save
    readingListItems.unshift(item); // Add to beginning for recency
    await saveReadingList();
    
    console.log('📚 [ReadingList] Added item:', {
      title: item.title,
      domain: item.domain,
      hasSummary: !!item.summary,
      tags: item.tags?.length || 0
    });
    
    return { ok: true, item };
  } catch (error) {
    console.error('📚 [ReadingList] Error adding item:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Remove an item from the reading list
 */
export async function removeFromReadingList(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await loadReadingList();
    
    const index = readingListItems.findIndex(item => item.id === id);
    if (index === -1) {
      return {
        ok: false,
        error: 'Item not found'
      };
    }
    
    const removedItem = readingListItems.splice(index, 1)[0];
    await saveReadingList();
    
    console.log('📚 [ReadingList] Removed item:', removedItem.title);
    return { ok: true };
  } catch (error) {
    console.error('📚 [ReadingList] Error removing item:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update an item in the reading list
 */
export async function updateReadingListItem(
  id: string,
  updates: Partial<Pick<ReadingItem, 'isRead' | 'progress' | 'tags'>>
): Promise<{ ok: boolean; item?: ReadingItem; error?: string }> {
  try {
    await loadReadingList();
    
    const item = readingListItems.find(item => item.id === id);
    if (!item) {
      return {
        ok: false,
        error: 'Item not found'
      };
    }
    
    // Apply updates
    if (updates.isRead !== undefined) {
      item.isRead = updates.isRead;
      if (updates.isRead && !item.progress) {
        item.progress = 1.0; // Mark as fully read
      }
    }
    
    if (updates.progress !== undefined) {
      item.progress = Math.max(0, Math.min(1, updates.progress));
      if (item.progress >= 1.0) {
        item.isRead = true;
      }
    }
    
    if (updates.tags !== undefined) {
      item.tags = updates.tags;
    }
    
    await saveReadingList();
    
    console.log('📚 [ReadingList] Updated item:', {
      title: item.title,
      isRead: item.isRead,
      progress: item.progress,
      tags: item.tags?.length || 0
    });
    
    return { ok: true, item };
  } catch (error) {
    console.error('📚 [ReadingList] Error updating item:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get all reading list items with optional filtering
 */
export async function getReadingList(filter?: ReadingListFilter): Promise<ReadingItem[]> {
  try {
    await loadReadingList();
    
    let filteredItems = [...readingListItems];
    
    if (filter) {
      if (filter.isRead !== undefined) {
        filteredItems = filteredItems.filter(item => item.isRead === filter.isRead);
      }
      
      if (filter.tags && filter.tags.length > 0) {
        filteredItems = filteredItems.filter(item => 
          item.tags && filter.tags!.some(tag => item.tags!.includes(tag))
        );
      }
      
      if (filter.domain) {
        filteredItems = filteredItems.filter(item => item.domain === filter.domain);
      }
      
      if (filter.dateRange) {
        filteredItems = filteredItems.filter(item => 
          item.savedAt >= filter.dateRange!.start && item.savedAt <= filter.dateRange!.end
        );
      }
      
      if (filter.minReadingTime !== undefined) {
        filteredItems = filteredItems.filter(item => 
          (item.readingTime || 0) >= filter.minReadingTime!
        );
      }
      
      if (filter.maxReadingTime !== undefined) {
        filteredItems = filteredItems.filter(item => 
          (item.readingTime || 0) <= filter.maxReadingTime!
        );
      }
    }
    
    return filteredItems;
  } catch (error) {
    console.error('📚 [ReadingList] Error getting reading list:', error);
    return [];
  }
}

/**
 * Get a specific reading list item by ID
 */
export async function getReadingListItem(id: string): Promise<ReadingItem | null> {
  try {
    await loadReadingList();
    return readingListItems.find(item => item.id === id) || null;
  } catch (error) {
    console.error('📚 [ReadingList] Error getting item:', error);
    return null;
  }
}

/**
 * Search reading list items
 */
export async function searchReadingList(query: string): Promise<ReadingItem[]> {
  try {
    await loadReadingList();
    
    const lowerQuery = query.toLowerCase();
    
    return readingListItems.filter(item => {
      // Search in title, URL, domain, tags, and summary
      const searchFields = [
        item.title,
        item.url,
        item.domain,
        ...(item.tags || []),
        item.summary?.summary || ''
      ];
      
      return searchFields.some(field => 
        field.toLowerCase().includes(lowerQuery)
      );
    });
  } catch (error) {
    console.error('📚 [ReadingList] Error searching:', error);
    return [];
  }
}

/**
 * Get reading list statistics
 */
export async function getReadingListStats(): Promise<ReadingListStats> {
  try {
    await loadReadingList();
    
    const totalItems = readingListItems.length;
    const unreadItems = readingListItems.filter(item => !item.isRead).length;
    
    const totalReadingTime = readingListItems.reduce((sum, item) => 
      sum + (item.readingTime || 0), 0
    );
    
    const averageReadingTime = totalItems > 0 ? totalReadingTime / totalItems : 0;
    
    // Top domains
    const domainCounts = new Map<string, number>();
    readingListItems.forEach(item => {
      domainCounts.set(item.domain, (domainCounts.get(item.domain) || 0) + 1);
    });
    
    const topDomains = Array.from(domainCounts.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Top tags
    const tagCounts = new Map<string, number>();
    readingListItems.forEach(item => {
      item.tags?.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    
    const topTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Recently added (last 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentlyAdded = readingListItems.filter(item => item.savedAt > sevenDaysAgo).length;
    
    return {
      totalItems,
      unreadItems,
      totalReadingTime,
      averageReadingTime,
      topDomains,
      topTags,
      recentlyAdded
    };
  } catch (error) {
    console.error('📚 [ReadingList] Error getting stats:', error);
    return {
      totalItems: 0,
      unreadItems: 0,
      totalReadingTime: 0,
      averageReadingTime: 0,
      topDomains: [],
      topTags: [],
      recentlyAdded: 0
    };
  }
}

/**
 * Re-summarize an existing reading list item
 */
export async function ressummarizeReadingListItem(
  id: string,
  options: {
    type?: 'short' | 'bullets' | 'insights' | 'detailed';
    includeKeywords?: boolean;
    includeTopics?: boolean;
  } = {}
): Promise<{ ok: boolean; item?: ReadingItem; error?: string }> {
  try {
    await loadReadingList();
    
    const item = readingListItems.find(item => item.id === id);
    if (!item) {
      return {
        ok: false,
        error: 'Item not found'
      };
    }
    
    console.log('📚 [ReadingList] Re-summarizing item:', item.title);
    
    // Extract content from the URL (this would need to be implemented)
    // For now, we'll return an error suggesting manual re-summarization
    return {
      ok: false,
      error: 'Re-summarization requires content extraction from URL, which is not yet implemented. Please remove and re-add the item with auto-summarization enabled.'
    };
  } catch (error) {
    console.error('📚 [ReadingList] Error re-summarizing item:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Clear all reading list items
 */
export async function clearReadingList(): Promise<{ ok: boolean; error?: string }> {
  try {
    readingListItems = [];
    await saveReadingList();
    
    console.log('📚 [ReadingList] Cleared all items');
    return { ok: true };
  } catch (error) {
    console.error('📚 [ReadingList] Error clearing reading list:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Export reading list data
 */
export async function exportReadingList(): Promise<{
  ok: boolean;
  data?: {
    version: string;
    exportedAt: number;
    items: ReadingItem[];
    stats: ReadingListStats;
  };
  error?: string;
}> {
  try {
    await loadReadingList();
    
    const stats = await getReadingListStats();
    
    const data = {
      version: '1.0.0',
      exportedAt: Date.now(),
      items: readingListItems,
      stats
    };
    
    console.log('📚 [ReadingList] Exported', readingListItems.length, 'items');
    return { ok: true, data };
  } catch (error) {
    console.error('📚 [ReadingList] Error exporting:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Import reading list data
 */
export async function importReadingList(
  data: any,
  mode: 'merge' | 'replace' = 'merge'
): Promise<{ ok: boolean; imported: number; error?: string }> {
  try {
    if (!data || !Array.isArray(data.items)) {
      return {
        ok: false,
        imported: 0,
        error: 'Invalid import data format'
      };
    }
    
    await loadReadingList();
    
    const importItems: ReadingItem[] = data.items;
    let imported = 0;
    
    if (mode === 'replace') {
      readingListItems = importItems;
      imported = importItems.length;
    } else {
      // Merge mode - avoid duplicates by URL
      const existingUrls = new Set(readingListItems.map(item => item.url));
      
      for (const item of importItems) {
        if (!existingUrls.has(item.url)) {
          // Ensure item has required fields
          if (!item.id) item.id = generateId();
          if (!item.savedAt) item.savedAt = Date.now();
          if (!item.domain) item.domain = extractDomain(item.url);
          
          readingListItems.push(item);
          imported++;
        }
      }
    }
    
    await saveReadingList();
    
    console.log('📚 [ReadingList] Imported', imported, 'items in', mode, 'mode');
    return { ok: true, imported };
  } catch (error) {
    console.error('📚 [ReadingList] Error importing:', error);
    return {
      ok: false,
      imported: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}