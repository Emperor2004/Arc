import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addBookmark,
  removeBookmark,
  getAllBookmarks,
  getBookmarkById,
  searchBookmarks,
  updateBookmark,
  isBookmarked,
  getBookmarksByTag,
  clearBookmarks,
  getBookmarksSorted,
  exportBookmarks,
  importBookmarks,
} from './bookmarkStore';

describe('BookmarkStore Module', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('addBookmark', () => {
    it('should add a new bookmark', () => {
      const bookmark = addBookmark('https://github.com', 'GitHub');

      expect(bookmark.url).toBe('https://github.com');
      expect(bookmark.title).toBe('GitHub');
      expect(bookmark.id).toBeDefined();
      expect(bookmark.createdAt).toBeDefined();
      expect(bookmark.updatedAt).toBeDefined();
    });

    it('should add tags to bookmark', () => {
      const bookmark = addBookmark('https://github.com', 'GitHub', ['dev', 'coding']);

      expect(bookmark.tags).toEqual(['dev', 'coding']);
    });

    it('should save bookmark to localStorage', () => {
      addBookmark('https://github.com', 'GitHub');

      const stored = localStorage.getItem('arc-browser-bookmarks');
      expect(stored).not.toBeNull();
      
      const bookmarks = JSON.parse(stored!);
      expect(bookmarks.length).toBe(1);
      expect(bookmarks[0].url).toBe('https://github.com');
    });
  });

  describe('removeBookmark', () => {
    it('should remove bookmark by ID', () => {
      const bookmark1 = addBookmark('https://github.com', 'GitHub');
      const bookmark2 = addBookmark('https://example.com', 'Example');

      const removed = removeBookmark(bookmark1.id);

      expect(removed).toBe(true);
      
      const stored = localStorage.getItem('arc-browser-bookmarks');
      const bookmarks = JSON.parse(stored!);
      expect(bookmarks.length).toBe(1);
      expect(bookmarks[0].id).toBe(bookmark2.id);
    });

    it('should return false if bookmark not found', () => {
      const removed = removeBookmark('nonexistent');

      expect(removed).toBe(false);
    });
  });

  describe('getAllBookmarks', () => {
    it('should return all bookmarks', async () => {
      addBookmark('https://github.com', 'GitHub');
      addBookmark('https://example.com', 'Example');

      const all = await getAllBookmarks();

      expect(all.length).toBe(2);
    });

    it('should return empty array when no bookmarks', async () => {
      const all = await getAllBookmarks();

      expect(all).toEqual([]);
    });
  });

  describe('getBookmarkById', () => {
    it('should return bookmark by ID', async () => {
      const added = addBookmark('https://github.com', 'GitHub');

      const bookmark = await getBookmarkById(added.id);

      expect(bookmark).not.toBeNull();
      expect(bookmark?.url).toBe('https://github.com');
    });

    it('should return null if bookmark not found', async () => {
      const bookmark = await getBookmarkById('nonexistent');

      expect(bookmark).toBeNull();
    });
  });

  describe('searchBookmarks', () => {
    it('should search by URL', async () => {
      addBookmark('https://github.com', 'GitHub');
      addBookmark('https://example.com', 'Example');

      const results = await searchBookmarks('github');

      expect(results.length).toBe(1);
      expect(results[0].url).toBe('https://github.com');
    });

    it('should search by title', async () => {
      addBookmark('https://github.com', 'GitHub');
      addBookmark('https://example.com', 'Example');

      const results = await searchBookmarks('example');

      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Example');
    });

    it('should search by tags', async () => {
      addBookmark('https://github.com', 'GitHub', ['dev', 'coding']);
      addBookmark('https://example.com', 'Example', ['test']);

      const results = await searchBookmarks('dev');

      expect(results.length).toBe(1);
      expect(results[0].tags).toContain('dev');
    });

    it('should be case-insensitive', async () => {
      addBookmark('https://GITHUB.COM', 'GitHub');

      const results = await searchBookmarks('github');

      expect(results.length).toBe(1);
    });
  });

  describe('updateBookmark', () => {
    it('should update bookmark', () => {
      const added = addBookmark('https://github.com', 'GitHub');

      const updated = updateBookmark(added.id, { title: 'GitHub - New Title' });

      expect(updated).not.toBeNull();
      expect(updated?.title).toBe('GitHub - New Title');
    });

    it('should preserve ID and creation time', () => {
      const added = addBookmark('https://github.com', 'GitHub');
      const originalCreatedAt = added.createdAt;

      const updated = updateBookmark(added.id, { title: 'New Title' });

      expect(updated?.id).toBe(added.id);
      expect(updated?.createdAt).toBe(originalCreatedAt);
    });

    it('should update modification time', () => {
      const added = addBookmark('https://github.com', 'GitHub');
      const originalUpdatedAt = added.updatedAt;

      // Wait a tiny bit to ensure timestamp changes
      const before = Date.now();
      const updated = updateBookmark(added.id, { title: 'New Title' });
      const after = Date.now();

      expect(updated?.updatedAt).toBeGreaterThanOrEqual(before);
      expect(updated?.updatedAt).toBeLessThanOrEqual(after);
    });

    it('should return null if bookmark not found', () => {
      const updated = updateBookmark('nonexistent', { title: 'New Title' });

      expect(updated).toBeNull();
    });
  });

  describe('isBookmarked', () => {
    it('should return true if URL is bookmarked', async () => {
      addBookmark('https://github.com', 'GitHub');

      const bookmarked = await isBookmarked('https://github.com');

      expect(bookmarked).toBe(true);
    });

    it('should return false if URL is not bookmarked', async () => {
      const bookmarked = await isBookmarked('https://nonexistent.com');

      expect(bookmarked).toBe(false);
    });
  });

  describe('getBookmarksByTag', () => {
    it('should return bookmarks with specific tag', async () => {
      addBookmark('https://github.com', 'GitHub', ['dev', 'coding']);
      addBookmark('https://example.com', 'Example', ['test']);

      const results = await getBookmarksByTag('dev');

      expect(results.length).toBe(1);
      expect(results[0].tags).toContain('dev');
    });
  });

  describe('clearBookmarks', () => {
    it('should clear all bookmarks', () => {
      addBookmark('https://github.com', 'GitHub');
      addBookmark('https://example.com', 'Example');

      clearBookmarks();

      const stored = localStorage.getItem('arc-browser-bookmarks');
      const bookmarks = JSON.parse(stored!);
      expect(bookmarks).toEqual([]);
    });
  });

  describe('getBookmarksSorted', () => {
    it('should return bookmarks sorted by creation date descending', async () => {
      const old = addBookmark('https://old.com', 'Old');
      // Manually set older timestamp
      const stored = localStorage.getItem('arc-browser-bookmarks');
      const bookmarks = JSON.parse(stored!);
      bookmarks[0].createdAt = Date.now() - 86400000;
      localStorage.setItem('arc-browser-bookmarks', JSON.stringify(bookmarks));
      
      const recent = addBookmark('https://recent.com', 'Recent');

      const sorted = await getBookmarksSorted('desc');

      expect(sorted[0].url).toBe('https://recent.com');
      expect(sorted[1].url).toBe('https://old.com');
    });

    it('should return bookmarks sorted by creation date ascending', async () => {
      const old = addBookmark('https://old.com', 'Old');
      // Manually set older timestamp
      const stored = localStorage.getItem('arc-browser-bookmarks');
      const bookmarks = JSON.parse(stored!);
      bookmarks[0].createdAt = Date.now() - 86400000;
      localStorage.setItem('arc-browser-bookmarks', JSON.stringify(bookmarks));
      
      const recent = addBookmark('https://recent.com', 'Recent');

      const sorted = await getBookmarksSorted('asc');

      expect(sorted[0].url).toBe('https://old.com');
      expect(sorted[1].url).toBe('https://recent.com');
    });
  });

  describe('exportBookmarks', () => {
    it('should export bookmarks as JSON string', () => {
      addBookmark('https://github.com', 'GitHub');

      const exported = exportBookmarks();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].url).toBe('https://github.com');
    });
  });

  describe('importBookmarks', () => {
    it('should import bookmarks in merge mode', () => {
      addBookmark('https://github.com', 'GitHub');

      const toImport = JSON.stringify([
        {
          id: '2',
          url: 'https://example.com',
          title: 'Example',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: [],
        },
      ]);

      const result = importBookmarks(toImport, 'merge');

      expect(result.length).toBe(2);
    });

    it('should import bookmarks in replace mode', () => {
      addBookmark('https://github.com', 'GitHub');

      const toImport = JSON.stringify([
        {
          id: '2',
          url: 'https://example.com',
          title: 'Example',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: [],
        },
      ]);

      const result = importBookmarks(toImport, 'replace');

      expect(result.length).toBe(1);
      expect(result[0].url).toBe('https://example.com');
    });

    it('should avoid duplicate URLs in merge mode', () => {
      addBookmark('https://github.com', 'GitHub');

      const toImport = JSON.stringify([
        {
          id: '1',
          url: 'https://github.com',
          title: 'GitHub',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: [],
        },
      ]);

      const result = importBookmarks(toImport, 'merge');

      expect(result.length).toBe(1);
    });

    it('should throw error for invalid JSON', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => importBookmarks('invalid json')).toThrow();
      
      consoleSpy.mockRestore();
    });
  });
});
