import { Bookmark, BookmarkFolder } from './types';
import { getDatabaseManager } from './database';

// Browser-safe bookmark storage using localStorage as fallback
const BOOKMARKS_KEY = 'arc-browser-bookmarks';
const FOLDERS_KEY = 'arc-browser-bookmark-folders';

/**
 * Check if we're in the main process (can use SQLite)
 */
function isMainProcess(): boolean {
  try {
    return typeof process !== 'undefined' && process.type !== 'renderer';
  } catch {
    return false;
  }
}

/**
 * Generate unique ID for bookmark or folder
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Load bookmarks from localStorage (fallback)
 */
function loadBookmarksFromStorage(): Bookmark[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(BOOKMARKS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (error) {
    console.error('Error loading bookmarks from localStorage:', error);
  }
  return [];
}

/**
 * Save bookmarks to localStorage (fallback)
 */
function saveBookmarksToStorage(bookmarks: Bookmark[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    }
  } catch (error) {
    console.error('Error saving bookmarks to localStorage:', error);
  }
}

/**
 * Load folders from localStorage (fallback)
 */
function loadFoldersFromStorage(): BookmarkFolder[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(FOLDERS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (error) {
    console.error('Error loading folders from localStorage:', error);
  }
  return [];
}

/**
 * Save folders to localStorage (fallback)
 */
function saveFoldersToStorage(folders: BookmarkFolder[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
    }
  } catch (error) {
    console.error('Error saving folders to localStorage:', error);
  }
}

/**
 * Add a new bookmark
 */
export async function addBookmark(url: string, title: string, tags?: string[], folderId?: string): Promise<Bookmark> {
  const now = Date.now();
  const newBookmark: Bookmark = {
    id: generateId(),
    url,
    title,
    createdAt: now,
    updatedAt: now,
    tags: tags || [],
    folderId,
  };

  if (isMainProcess()) {
    try {
      const db = await getDatabaseManager();
      await db.execute(
        `INSERT INTO bookmarks (id, url, title, tags, createdAt, updatedAt, folderId) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          newBookmark.id,
          newBookmark.url,
          newBookmark.title,
          JSON.stringify(newBookmark.tags),
          newBookmark.createdAt,
          newBookmark.updatedAt,
          newBookmark.folderId || null
        ]
      );
      return newBookmark;
    } catch (error) {
      console.error('Error adding bookmark to database:', error);
      // Fall back to localStorage
    }
  }

  // Fallback to localStorage
  const bookmarks = loadBookmarksFromStorage();
  bookmarks.push(newBookmark);
  saveBookmarksToStorage(bookmarks);
  return newBookmark;
}

/**
 * Remove a bookmark by ID
 */
export async function removeBookmark(id: string): Promise<boolean> {
  if (isMainProcess()) {
    try {
      const db = await getDatabaseManager();
      const result = await db.execute('DELETE FROM bookmarks WHERE id = ?', [id]);
      return result.changes > 0;
    } catch (error) {
      console.error('Error removing bookmark from database:', error);
      // Fall back to localStorage
    }
  }

  // Fallback to localStorage
  const bookmarks = loadBookmarksFromStorage();
  const initialLength = bookmarks.length;
  const filtered = bookmarks.filter(b => b.id !== id);

  if (filtered.length < initialLength) {
    saveBookmarksToStorage(filtered);
    return true;
  }
  return false;
}

/**
 * Get all bookmarks
 */
export async function getAllBookmarks(): Promise<Bookmark[]> {
  if (isMainProcess()) {
    try {
      const db = await getDatabaseManager();
      const rows = await db.query<any>(
        'SELECT id, url, title, tags, createdAt, updatedAt, folderId FROM bookmarks ORDER BY createdAt DESC'
      );
      return rows.map(row => ({
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : []
      }));
    } catch (error) {
      console.error('Error loading bookmarks from database:', error);
      // Fall back to localStorage
    }
  }

  return loadBookmarksFromStorage();
}

/**
 * Get bookmark by ID
 */
export async function getBookmarkById(id: string): Promise<Bookmark | null> {
  if (isMainProcess()) {
    try {
      const db = await getDatabaseManager();
      const rows = await db.query<any>(
        'SELECT id, url, title, tags, createdAt, updatedAt, folderId FROM bookmarks WHERE id = ?',
        [id]
      );
      if (rows.length > 0) {
        const row = rows[0];
        return {
          ...row,
          tags: row.tags ? JSON.parse(row.tags) : []
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting bookmark from database:', error);
      // Fall back to localStorage
    }
  }

  const bookmarks = loadBookmarksFromStorage();
  return bookmarks.find(b => b.id === id) || null;
}

/**
 * Search bookmarks by URL or title
 */
export async function searchBookmarks(query: string): Promise<Bookmark[]> {
  const bookmarks = await getAllBookmarks();
  const lowerQuery = query.toLowerCase();

  return bookmarks.filter(
    b =>
      b.url.toLowerCase().includes(lowerQuery) ||
      b.title.toLowerCase().includes(lowerQuery) ||
      (b.tags && b.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
  );
}

/**
 * Update a bookmark
 */
export async function updateBookmark(id: string, updates: Partial<Bookmark>): Promise<Bookmark | null> {
  const now = Date.now();
  const updatedData = {
    ...updates,
    updatedAt: now,
  };

  if (isMainProcess()) {
    try {
      const db = await getDatabaseManager();
      
      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      
      if (updates.title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(updates.title);
      }
      if (updates.url !== undefined) {
        updateFields.push('url = ?');
        updateValues.push(updates.url);
      }
      if (updates.tags !== undefined) {
        updateFields.push('tags = ?');
        updateValues.push(JSON.stringify(updates.tags));
      }
      if (updates.folderId !== undefined) {
        updateFields.push('folderId = ?');
        updateValues.push(updates.folderId);
      }
      
      updateFields.push('updatedAt = ?');
      updateValues.push(now);
      updateValues.push(id);

      const result = await db.execute(
        `UPDATE bookmarks SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      if (result.changes > 0) {
        return await getBookmarkById(id);
      }
      return null;
    } catch (error) {
      console.error('Error updating bookmark in database:', error);
      // Fall back to localStorage
    }
  }

  // Fallback to localStorage
  const bookmarks = loadBookmarksFromStorage();
  const index = bookmarks.findIndex(b => b.id === id);

  if (index === -1) {
    return null;
  }

  const updated: Bookmark = {
    ...bookmarks[index],
    ...updatedData,
    id: bookmarks[index].id, // Preserve ID
    createdAt: bookmarks[index].createdAt, // Preserve creation time
  };

  bookmarks[index] = updated;
  saveBookmarksToStorage(bookmarks);
  return updated;
}

/**
 * Check if URL is bookmarked
 */
export async function isBookmarked(url: string): Promise<boolean> {
  const bookmarks = await getAllBookmarks();
  return bookmarks.some(b => b.url === url);
}

/**
 * Get bookmarks by tag
 */
export async function getBookmarksByTag(tag: string): Promise<Bookmark[]> {
  const bookmarks = await getAllBookmarks();
  return bookmarks.filter(b => b.tags && b.tags.includes(tag));
}

/**
 * Get bookmarks by folder
 */
export async function getBookmarksByFolder(folderId: string): Promise<Bookmark[]> {
  const bookmarks = await getAllBookmarks();
  return bookmarks.filter(b => b.folderId === folderId);
}

/**
 * Get bookmarks without folder (uncategorized)
 */
export async function getUncategorizedBookmarks(): Promise<Bookmark[]> {
  const bookmarks = await getAllBookmarks();
  return bookmarks.filter(b => !b.folderId);
}

/**
 * Clear all bookmarks
 */
export async function clearBookmarks(): Promise<void> {
  if (isMainProcess()) {
    try {
      const db = await getDatabaseManager();
      await db.execute('DELETE FROM bookmarks');
      return;
    } catch (error) {
      console.error('Error clearing bookmarks from database:', error);
      // Fall back to localStorage
    }
  }

  saveBookmarksToStorage([]);
}

/**
 * Get bookmarks sorted by creation date
 */
export async function getBookmarksSorted(order: 'asc' | 'desc' = 'desc'): Promise<Bookmark[]> {
  const bookmarks = await getAllBookmarks();
  return bookmarks.sort((a, b) => {
    return order === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt;
  });
}

/**
 * Export bookmarks to JSON
 */
export async function exportBookmarks(): Promise<string> {
  const bookmarks = await getAllBookmarks();
  const folders = await getAllFolders();
  return JSON.stringify({ bookmarks, folders }, null, 2);
}

/**
 * Import bookmarks from JSON
 */
export async function importBookmarks(jsonData: string, mode: 'merge' | 'replace' = 'merge'): Promise<{ bookmarks: Bookmark[]; folders: BookmarkFolder[] }> {
  try {
    const importedData = JSON.parse(jsonData);
    const importedBookmarks = importedData.bookmarks || [];
    const importedFolders = importedData.folders || [];

    if (!Array.isArray(importedBookmarks)) {
      throw new Error('Invalid bookmark data format');
    }

    if (mode === 'replace') {
      await clearBookmarks();
      await clearFolders();
      
      // Import folders first
      for (const folder of importedFolders) {
        await addFolder(folder.name, folder.color, folder.description);
      }
      
      // Then import bookmarks
      for (const bookmark of importedBookmarks) {
        await addBookmark(bookmark.url, bookmark.title, bookmark.tags, bookmark.folderId);
      }
      
      return { bookmarks: importedBookmarks, folders: importedFolders };
    } else {
      // Merge mode: avoid duplicates by URL
      const existing = await getAllBookmarks();
      const existingUrls = new Set(existing.map(b => b.url));
      const newBookmarks = importedBookmarks.filter((b: Bookmark) => !existingUrls.has(b.url));
      
      // Import new folders
      const existingFolders = await getAllFolders();
      const existingFolderNames = new Set(existingFolders.map(f => f.name));
      const newFolders = importedFolders.filter((f: BookmarkFolder) => !existingFolderNames.has(f.name));
      
      for (const folder of newFolders) {
        await addFolder(folder.name, folder.color, folder.description);
      }
      
      for (const bookmark of newBookmarks) {
        await addBookmark(bookmark.url, bookmark.title, bookmark.tags, bookmark.folderId);
      }
      
      const allBookmarks = await getAllBookmarks();
      const allFolders = await getAllFolders();
      return { bookmarks: allBookmarks, folders: allFolders };
    }
  } catch (error) {
    console.error('Error importing bookmarks:', error);
    throw error;
  }
}

// Folder management functions

/**
 * Add a new bookmark folder
 */
export async function addFolder(name: string, color?: BookmarkFolder['color'], description?: string): Promise<BookmarkFolder> {
  const now = Date.now();
  const newFolder: BookmarkFolder = {
    id: generateId(),
    name,
    createdAt: now,
    color: color || 'blue',
    description,
  };

  if (isMainProcess()) {
    try {
      const db = await getDatabaseManager();
      await db.execute(
        `INSERT INTO bookmark_folders (id, name, createdAt, color, description) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          newFolder.id,
          newFolder.name,
          newFolder.createdAt,
          newFolder.color,
          newFolder.description || null
        ]
      );
      return newFolder;
    } catch (error) {
      console.error('Error adding folder to database:', error);
      // Fall back to localStorage
    }
  }

  // Fallback to localStorage
  const folders = loadFoldersFromStorage();
  folders.push(newFolder);
  saveFoldersToStorage(folders);
  return newFolder;
}

/**
 * Remove a folder by ID
 */
export async function removeFolder(id: string): Promise<boolean> {
  if (isMainProcess()) {
    try {
      const db = await getDatabaseManager();
      
      // First, remove folder reference from bookmarks
      await db.execute('UPDATE bookmarks SET folderId = NULL WHERE folderId = ?', [id]);
      
      // Then remove the folder
      const result = await db.execute('DELETE FROM bookmark_folders WHERE id = ?', [id]);
      return result.changes > 0;
    } catch (error) {
      console.error('Error removing folder from database:', error);
      // Fall back to localStorage
    }
  }

  // Fallback to localStorage
  const folders = loadFoldersFromStorage();
  const bookmarks = loadBookmarksFromStorage();
  
  // Remove folder reference from bookmarks
  const updatedBookmarks = bookmarks.map(b => 
    b.folderId === id ? { ...b, folderId: undefined } : b
  );
  saveBookmarksToStorage(updatedBookmarks);
  
  const initialLength = folders.length;
  const filtered = folders.filter(f => f.id !== id);

  if (filtered.length < initialLength) {
    saveFoldersToStorage(filtered);
    return true;
  }
  return false;
}

/**
 * Get all bookmark folders
 */
export async function getAllFolders(): Promise<BookmarkFolder[]> {
  if (isMainProcess()) {
    try {
      const db = await getDatabaseManager();
      const rows = await db.query<any>(
        'SELECT id, name, createdAt, color, description, smart, rule FROM bookmark_folders ORDER BY createdAt DESC'
      );
      return rows;
    } catch (error) {
      console.error('Error loading folders from database:', error);
      // Fall back to localStorage
    }
  }

  return loadFoldersFromStorage();
}

/**
 * Get folder by ID
 */
export async function getFolderById(id: string): Promise<BookmarkFolder | null> {
  if (isMainProcess()) {
    try {
      const db = await getDatabaseManager();
      const rows = await db.query<any>(
        'SELECT id, name, createdAt, color, description, smart, rule FROM bookmark_folders WHERE id = ?',
        [id]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error getting folder from database:', error);
      // Fall back to localStorage
    }
  }

  const folders = loadFoldersFromStorage();
  return folders.find(f => f.id === id) || null;
}

/**
 * Update a folder
 */
export async function updateFolder(id: string, updates: Partial<BookmarkFolder>): Promise<BookmarkFolder | null> {
  if (isMainProcess()) {
    try {
      const db = await getDatabaseManager();
      
      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      
      if (updates.name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(updates.name);
      }
      if (updates.color !== undefined) {
        updateFields.push('color = ?');
        updateValues.push(updates.color);
      }
      if (updates.description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(updates.description);
      }
      if (updates.smart !== undefined) {
        updateFields.push('smart = ?');
        updateValues.push(updates.smart ? 1 : 0);
      }
      if (updates.rule !== undefined) {
        updateFields.push('rule = ?');
        updateValues.push(updates.rule);
      }
      
      updateValues.push(id);

      const result = await db.execute(
        `UPDATE bookmark_folders SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      if (result.changes > 0) {
        return await getFolderById(id);
      }
      return null;
    } catch (error) {
      console.error('Error updating folder in database:', error);
      // Fall back to localStorage
    }
  }

  // Fallback to localStorage
  const folders = loadFoldersFromStorage();
  const index = folders.findIndex(f => f.id === id);

  if (index === -1) {
    return null;
  }

  const updated: BookmarkFolder = {
    ...folders[index],
    ...updates,
    id: folders[index].id, // Preserve ID
    createdAt: folders[index].createdAt, // Preserve creation time
  };

  folders[index] = updated;
  saveFoldersToStorage(folders);
  return updated;
}

/**
 * Clear all folders
 */
export async function clearFolders(): Promise<void> {
  if (isMainProcess()) {
    try {
      const db = await getDatabaseManager();
      await db.execute('DELETE FROM bookmark_folders');
      return;
    } catch (error) {
      console.error('Error clearing folders from database:', error);
      // Fall back to localStorage
    }
  }

  saveFoldersToStorage([]);
}

/**
 * Assign bookmark to folder
 */
export async function assignBookmarkToFolder(bookmarkId: string, folderId: string | undefined): Promise<boolean> {
  return (await updateBookmark(bookmarkId, { folderId })) !== null;
}
