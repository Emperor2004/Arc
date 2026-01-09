import { Bookmark } from './types';
import * as fs from 'fs';
import * as path from 'path';

const BOOKMARKS_FILE = path.join(process.env.APPDATA || process.env.HOME || '.', 'arc-browser', 'data', 'bookmarks.json');

// Ensure directory exists
function ensureDir() {
  const dir = path.dirname(BOOKMARKS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Load bookmarks from file
 */
function loadBookmarks(): Bookmark[] {
  try {
    ensureDir();
    if (fs.existsSync(BOOKMARKS_FILE)) {
      const data = fs.readFileSync(BOOKMARKS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading bookmarks:', error);
  }
  return [];
}

/**
 * Save bookmarks to file
 */
function saveBookmarks(bookmarks: Bookmark[]): void {
  try {
    ensureDir();
    fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify(bookmarks, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving bookmarks:', error);
  }
}

/**
 * Generate unique ID for bookmark
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add a new bookmark
 */
export function addBookmark(url: string, title: string, tags?: string[]): Bookmark {
  const bookmarks = loadBookmarks();
  const now = Date.now();

  const newBookmark: Bookmark = {
    id: generateId(),
    url,
    title,
    createdAt: now,
    updatedAt: now,
    tags: tags || [],
  };

  bookmarks.push(newBookmark);
  saveBookmarks(bookmarks);
  return newBookmark;
}

/**
 * Remove a bookmark by ID
 */
export function removeBookmark(id: string): boolean {
  const bookmarks = loadBookmarks();
  const initialLength = bookmarks.length;
  const filtered = bookmarks.filter(b => b.id !== id);

  if (filtered.length < initialLength) {
    saveBookmarks(filtered);
    return true;
  }
  return false;
}

/**
 * Get all bookmarks
 */
export async function getAllBookmarks(): Promise<Bookmark[]> {
  return loadBookmarks();
}

/**
 * Get bookmark by ID
 */
export async function getBookmarkById(id: string): Promise<Bookmark | null> {
  const bookmarks = loadBookmarks();
  return bookmarks.find(b => b.id === id) || null;
}

/**
 * Search bookmarks by URL or title
 */
export async function searchBookmarks(query: string): Promise<Bookmark[]> {
  const bookmarks = loadBookmarks();
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
export function updateBookmark(id: string, updates: Partial<Bookmark>): Bookmark | null {
  const bookmarks = loadBookmarks();
  const index = bookmarks.findIndex(b => b.id === id);

  if (index === -1) {
    return null;
  }

  const updated: Bookmark = {
    ...bookmarks[index],
    ...updates,
    id: bookmarks[index].id, // Preserve ID
    createdAt: bookmarks[index].createdAt, // Preserve creation time
    updatedAt: Date.now(), // Update modification time
  };

  bookmarks[index] = updated;
  saveBookmarks(bookmarks);
  return updated;
}

/**
 * Check if URL is bookmarked
 */
export async function isBookmarked(url: string): Promise<boolean> {
  const bookmarks = loadBookmarks();
  return bookmarks.some(b => b.url === url);
}

/**
 * Get bookmarks by tag
 */
export async function getBookmarksByTag(tag: string): Promise<Bookmark[]> {
  const bookmarks = loadBookmarks();
  return bookmarks.filter(b => b.tags && b.tags.includes(tag));
}

/**
 * Clear all bookmarks
 */
export function clearBookmarks(): void {
  saveBookmarks([]);
}

/**
 * Get bookmarks sorted by creation date
 */
export async function getBookmarksSorted(order: 'asc' | 'desc' = 'desc'): Promise<Bookmark[]> {
  const bookmarks = loadBookmarks();
  return bookmarks.sort((a, b) => {
    return order === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt;
  });
}

/**
 * Export bookmarks to JSON
 */
export function exportBookmarks(): string {
  const bookmarks = loadBookmarks();
  return JSON.stringify(bookmarks, null, 2);
}

/**
 * Import bookmarks from JSON
 */
export function importBookmarks(jsonData: string, mode: 'merge' | 'replace' = 'merge'): Bookmark[] {
  try {
    const importedBookmarks = JSON.parse(jsonData) as Bookmark[];

    if (!Array.isArray(importedBookmarks)) {
      throw new Error('Invalid bookmark data format');
    }

    if (mode === 'replace') {
      saveBookmarks(importedBookmarks);
      return importedBookmarks;
    } else {
      // Merge mode: avoid duplicates by URL
      const existing = loadBookmarks();
      const existingUrls = new Set(existing.map(b => b.url));
      const newBookmarks = importedBookmarks.filter(b => !existingUrls.has(b.url));
      const merged = [...existing, ...newBookmarks];
      saveBookmarks(merged);
      return merged;
    }
  } catch (error) {
    console.error('Error importing bookmarks:', error);
    throw error;
  }
}
