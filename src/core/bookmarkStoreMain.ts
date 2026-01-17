import { Bookmark } from './types';
import { getDatabaseManager } from './database';

/**
 * Generate unique ID for bookmark
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add a new bookmark to SQLite database (Node.js main process)
 */
export async function addBookmark(url: string, title: string, tags?: string[]): Promise<Bookmark> {
  try {
    const db = await getDatabaseManager();
    const now = Date.now();
    
    // Check if bookmark already exists
    const existing = await db.query<Bookmark>(
      'SELECT * FROM bookmarks WHERE url = ? LIMIT 1',
      [url]
    );
    
    if (existing.length > 0) {
      // Update existing bookmark
      const bookmark = existing[0];
      const tagsStr = tags ? JSON.stringify(tags) : bookmark.tags || null;
      
      await db.execute(
        'UPDATE bookmarks SET title = ?, tags = ?, updatedAt = ? WHERE id = ?',
        [title, tagsStr, now, bookmark.id]
      );
      
      return {
        ...bookmark,
        title,
        tags: tags || bookmark.tags,
        updatedAt: now,
      };
    }
    
    // Create new bookmark
    const id = generateId();
    const tagsStr = tags ? JSON.stringify(tags) : null;
    
    await db.execute(
      'INSERT INTO bookmarks (id, url, title, tags, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      [id, url, title, tagsStr, now, now]
    );
    
    return {
      id,
      url,
      title,
      tags,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    console.error('Error adding bookmark:', error);
    throw error;
  }
}

/**
 * Remove bookmark by ID from SQLite database
 */
export async function removeBookmark(id: string): Promise<boolean> {
  try {
    const db = await getDatabaseManager();
    
    const result = await db.execute('DELETE FROM bookmarks WHERE id = ?', [id]);
    
    return (result.changes || 0) > 0;
  } catch (error) {
    console.error('Error removing bookmark:', error);
    return false;
  }
}

/**
 * Get all bookmarks from SQLite database
 */
export async function getAllBookmarks(): Promise<Bookmark[]> {
  try {
    const db = await getDatabaseManager();
    
    const rows = await db.query<Bookmark & { tags: string | null }>(
      'SELECT * FROM bookmarks ORDER BY createdAt DESC'
    );
    
    // Parse tags JSON
    return rows.map(row => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
    }));
  } catch (error) {
    console.error('Error getting all bookmarks:', error);
    return [];
  }
}

/**
 * Get bookmark by ID
 */
export async function getBookmarkById(id: string): Promise<Bookmark | null> {
  try {
    const db = await getDatabaseManager();
    
    const rows = await db.query<Bookmark & { tags: string | null }>(
      'SELECT * FROM bookmarks WHERE id = ? LIMIT 1',
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const row = rows[0];
    return {
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
    };
  } catch (error) {
    console.error('Error getting bookmark by ID:', error);
    return null;
  }
}

/**
 * Check if URL is bookmarked
 */
export async function isBookmarked(url: string): Promise<boolean> {
  try {
    const db = await getDatabaseManager();
    
    const rows = await db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM bookmarks WHERE url = ?',
      [url]
    );
    
    return (rows[0]?.count || 0) > 0;
  } catch (error) {
    console.error('Error checking if bookmarked:', error);
    return false;
  }
}

/**
 * Search bookmarks by URL, title, or tags
 */
export async function searchBookmarks(query: string): Promise<Bookmark[]> {
  try {
    const db = await getDatabaseManager();
    const lowerQuery = `%${query.toLowerCase()}%`;
    
    const rows = await db.query<Bookmark & { tags: string | null }>(
      `SELECT * FROM bookmarks 
       WHERE LOWER(url) LIKE ? OR LOWER(title) LIKE ? OR LOWER(tags) LIKE ?
       ORDER BY createdAt DESC`,
      [lowerQuery, lowerQuery, lowerQuery]
    );
    
    // Parse tags JSON
    return rows.map(row => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
    }));
  } catch (error) {
    console.error('Error searching bookmarks:', error);
    return [];
  }
}

/**
 * Update bookmark
 */
export async function updateBookmark(id: string, updates: Partial<Bookmark>): Promise<Bookmark | null> {
  try {
    const db = await getDatabaseManager();
    const existing = await getBookmarkById(id);
    
    if (!existing) {
      return null;
    }
    
    const updated: Bookmark = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };
    
    const tagsStr = updated.tags ? JSON.stringify(updated.tags) : null;
    
    await db.execute(
      'UPDATE bookmarks SET url = ?, title = ?, tags = ?, updatedAt = ? WHERE id = ?',
      [updated.url, updated.title, tagsStr, updated.updatedAt, id]
    );
    
    return updated;
  } catch (error) {
    console.error('Error updating bookmark:', error);
    return null;
  }
}

/**
 * Clear all bookmarks
 */
export async function clearBookmarks(): Promise<void> {
  try {
    const db = await getDatabaseManager();
    await db.execute('DELETE FROM bookmarks');
  } catch (error) {
    console.error('Error clearing bookmarks:', error);
    throw error;
  }
}
