import { HistoryEntry } from './types';
import { getDatabaseManager } from './database';

/**
 * Add or update a history entry in SQLite database (Node.js main process)
 */
export async function addHistoryEntry(url: string, title: string): Promise<HistoryEntry> {
  try {
    console.log('💾 [History] addHistoryEntry called:', url, title);
    const db = await getDatabaseManager();
    
    // Check if entry exists
    const existing = await db.query<HistoryEntry>(
      'SELECT * FROM history WHERE url = ? LIMIT 1',
      [url]
    );
    
    if (existing.length > 0) {
      // Update existing entry
      const entry = existing[0];
      const newVisitCount = entry.visit_count + 1;
      
      console.log('💾 [History] Updating existing entry, new visit count:', newVisitCount);
      
      await db.execute(
        'UPDATE history SET visit_count = ?, visited_at = ?, title = ? WHERE id = ?',
        [newVisitCount, Date.now(), title || entry.title, entry.id]
      );
      
      // Update FTS index
      await db.execute(
        'INSERT OR REPLACE INTO history_fts(rowid, url, title) VALUES (?, ?, ?)',
        [entry.id, url, title || entry.title || '']
      );
      
      console.log('💾 [History] Entry updated successfully');
      
      return {
        ...entry,
        visit_count: newVisitCount,
        visited_at: Date.now(),
        title: title || entry.title,
      };
    } else {
      // Insert new entry
      console.log('💾 [History] Inserting new entry');
      
      const result = await db.execute(
        'INSERT INTO history (url, title, visited_at, visit_count) VALUES (?, ?, ?, 1)',
        [url, title || null, Date.now()]
      );
      
      const id = result.lastInsertRowid;
      
      // Update FTS index
      await db.execute(
        'INSERT INTO history_fts(rowid, url, title) VALUES (?, ?, ?)',
        [id, url, title || '']
      );
      
      console.log('💾 [History] New entry inserted with id:', id);
      
      return {
        id,
        url,
        title: title || null,
        visited_at: Date.now(),
        visit_count: 1,
      };
    }
  } catch (error) {
    console.error('💾 [History] Error adding history entry:', error);
    throw error;
  }
}

/**
 * Get recent history entries from SQLite database
 */
export async function getRecentHistory(limit: number = 200): Promise<HistoryEntry[]> {
  try {
    console.log('💾 [History] getRecentHistory called with limit:', limit);
    const db = await getDatabaseManager();
    
    const entries = await db.query<HistoryEntry>(
      'SELECT * FROM history ORDER BY visited_at DESC LIMIT ?',
      [limit]
    );
    
    console.log('💾 [History] Returning', entries.length, 'history entries');
    return entries;
  } catch (error) {
    console.error('💾 [History] Error getting recent history:', error);
    return [];
  }
}

/**
 * Get all history entries from SQLite database
 */
export async function getAllHistory(): Promise<HistoryEntry[]> {
  try {
    const db = await getDatabaseManager();
    
    const entries = await db.query<HistoryEntry>(
      'SELECT * FROM history ORDER BY visited_at DESC'
    );
    
    return entries;
  } catch (error) {
    console.error('Error getting all history:', error);
    return [];
  }
}

/**
 * Clear all history from SQLite database
 */
export async function clearHistory(): Promise<void> {
  try {
    const db = await getDatabaseManager();
    
    await db.execute('DELETE FROM history');
    await db.execute('DELETE FROM history_fts');
  } catch (error) {
    console.error('Error clearing history:', error);
    throw error;
  }
}

/**
 * Remove a specific history entry by URL
 */
export async function removeHistoryEntry(url: string): Promise<void> {
  try {
    const db = await getDatabaseManager();
    
    // Get entry ID first
    const entries = await db.query<{ id: number }>(
      'SELECT id FROM history WHERE url = ?',
      [url]
    );
    
    if (entries.length > 0) {
      const id = entries[0].id;
      await db.execute('DELETE FROM history WHERE id = ?', [id]);
      await db.execute('DELETE FROM history_fts WHERE rowid = ?', [id]);
    }
  } catch (error) {
    console.error('Error removing history entry:', error);
    throw error;
  }
}

/**
 * Search history using full-text search
 */
export async function searchHistory(query: string): Promise<HistoryEntry[]> {
  try {
    const db = await getDatabaseManager();
    
    // Use FTS5 for full-text search
    const entries = await db.query<HistoryEntry>(
      `SELECT h.* FROM history h
       JOIN history_fts fts ON h.id = fts.rowid
       WHERE history_fts MATCH ?
       ORDER BY h.visited_at DESC
       LIMIT 100`,
      [query]
    );
    
    return entries;
  } catch (error) {
    console.error('Error searching history:', error);
    // Fallback to simple LIKE search
    try {
      const db = await getDatabaseManager();
      const entries = await db.query<HistoryEntry>(
        `SELECT * FROM history 
         WHERE url LIKE ? OR title LIKE ?
         ORDER BY visited_at DESC
         LIMIT 100`,
        [`%${query}%`, `%${query}%`]
      );
      return entries;
    } catch (fallbackError) {
      console.error('Error in fallback search:', fallbackError);
      return [];
    }
  }
}
