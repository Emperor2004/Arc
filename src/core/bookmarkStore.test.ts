import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
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

// Mock fs module
vi.mock('fs');
vi.mock('path');

describe('BookmarkStore Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock path.join to return a consistent path
    vi.mocked(path.join).mockReturnValue('/mock/bookmarks.json');
    // Mock fs.existsSync to return true
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  describe('addBookmark', () => {
    it('should add a new bookmark', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('[]');
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const bookmark = addBookmark('https://github.com', 'GitHub');

      expect(bookmark.url).toBe('https://github.com');
      expect(bookmark.title).toBe('GitHub');
      expect(bookmark.id).toBeDefined();
      expect(bookmark.createdAt).toBeDefined();
      expect(bookmark.updatedAt).toBeDefined();
    });

    it('should add tags to bookmark', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('[]');
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const bookmark = addBookmark('https://github.com', 'GitHub', ['dev', 'coding']);

      expect(bookmark.tags).toEqual(['dev', 'coding']);
    });

    it('should save bookmark to file', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('[]');
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      addBookmark('https://github.com', 'GitHub');

      expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData.length).toBe(1);
      expect(writtenData[0].url).toBe('https://github.com');
    });
  });

  describe('removeBookmark', () => {
    it('should remove bookmark by ID', () => {
      const bookmarks = JSON.stringify([
        {
          id: '1',
          url: 'https://github.com',
          title: 'GitHub',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: '2',
          url: 'https://example.com',
          title: 'Example',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const removed = removeBookmark('1');

      expect(removed).toBe(true);
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData.length).toBe(1);
      expect(writtenData[0].id).toBe('2');
    });

    it('should return false if bookmark not found', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('[]');

      const removed = removeBookmark('nonexistent');

      expect(removed).toBe(false);
    });
  });

  describe('getAllBookmarks', () => {
    it('should return all bookmarks', async () => {
      const bookmarks = JSON.stringify([
        {
          id: '1',
          url: 'https://github.com',
          title: 'GitHub',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: '2',
          url: 'https://example.com',
          title: 'Example',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);

      const all = await getAllBookmarks();

      expect(all.length).toBe(2);
    });

    it('should return empty array when no bookmarks', async () => {
      vi.mocked(fs.readFileSync).mockReturnValue('[]');

      const all = await getAllBookmarks();

      expect(all).toEqual([]);
    });
  });

  describe('getBookmarkById', () => {
    it('should return bookmark by ID', async () => {
      const bookmarks = JSON.stringify([
        {
          id: '1',
          url: 'https://github.com',
          title: 'GitHub',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);

      const bookmark = await getBookmarkById('1');

      expect(bookmark).not.toBeNull();
      expect(bookmark?.url).toBe('https://github.com');
    });

    it('should return null if bookmark not found', async () => {
      vi.mocked(fs.readFileSync).mockReturnValue('[]');

      const bookmark = await getBookmarkById('nonexistent');

      expect(bookmark).toBeNull();
    });
  });

  describe('searchBookmarks', () => {
    it('should search by URL', async () => {
      const bookmarks = JSON.stringify([
        {
          id: '1',
          url: 'https://github.com',
          title: 'GitHub',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: '2',
          url: 'https://example.com',
          title: 'Example',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);

      const results = await searchBookmarks('github');

      expect(results.length).toBe(1);
      expect(results[0].url).toBe('https://github.com');
    });

    it('should search by title', async () => {
      const bookmarks = JSON.stringify([
        {
          id: '1',
          url: 'https://github.com',
          title: 'GitHub',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: '2',
          url: 'https://example.com',
          title: 'Example',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);

      const results = await searchBookmarks('example');

      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Example');
    });

    it('should search by tags', async () => {
      const bookmarks = JSON.stringify([
        {
          id: '1',
          url: 'https://github.com',
          title: 'GitHub',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: ['dev', 'coding'],
        },
        {
          id: '2',
          url: 'https://example.com',
          title: 'Example',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: ['test'],
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);

      const results = await searchBookmarks('dev');

      expect(results.length).toBe(1);
      expect(results[0].tags).toContain('dev');
    });

    it('should be case-insensitive', async () => {
      const bookmarks = JSON.stringify([
        {
          id: '1',
          url: 'https://GITHUB.COM',
          title: 'GitHub',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);

      const results = await searchBookmarks('github');

      expect(results.length).toBe(1);
    });
  });

  describe('updateBookmark', () => {
    it('should update bookmark', () => {
      const bookmarks = JSON.stringify([
        {
          id: '1',
          url: 'https://github.com',
          title: 'GitHub',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const updated = updateBookmark('1', { title: 'GitHub - New Title' });

      expect(updated).not.toBeNull();
      expect(updated?.title).toBe('GitHub - New Title');
    });

    it('should preserve ID and creation time', () => {
      const createdAt = Date.now() - 86400000;
      const bookmarks = JSON.stringify([
        {
          id: '1',
          url: 'https://github.com',
          title: 'GitHub',
          createdAt,
          updatedAt: Date.now(),
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const updated = updateBookmark('1', { title: 'New Title' });

      expect(updated?.id).toBe('1');
      expect(updated?.createdAt).toBe(createdAt);
    });

    it('should update modification time', () => {
      const bookmarks = JSON.stringify([
        {
          id: '1',
          url: 'https://github.com',
          title: 'GitHub',
          createdAt: Date.now(),
          updatedAt: Date.now() - 86400000,
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const before = Date.now();
      const updated = updateBookmark('1', { title: 'New Title' });
      const after = Date.now();

      expect(updated?.updatedAt).toBeGreaterThanOrEqual(before);
      expect(updated?.updatedAt).toBeLessThanOrEqual(after);
    });

    it('should return null if bookmark not found', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('[]');

      const updated = updateBookmark('nonexistent', { title: 'New Title' });

      expect(updated).toBeNull();
    });
  });

  describe('isBookmarked', () => {
    it('should return true if URL is bookmarked', async () => {
      const bookmarks = JSON.stringify([
        {
          id: '1',
          url: 'https://github.com',
          title: 'GitHub',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);

      const bookmarked = await isBookmarked('https://github.com');

      expect(bookmarked).toBe(true);
    });

    it('should return false if URL is not bookmarked', async () => {
      vi.mocked(fs.readFileSync).mockReturnValue('[]');

      const bookmarked = await isBookmarked('https://nonexistent.com');

      expect(bookmarked).toBe(false);
    });
  });

  describe('getBookmarksByTag', () => {
    it('should return bookmarks with specific tag', async () => {
      const bookmarks = JSON.stringify([
        {
          id: '1',
          url: 'https://github.com',
          title: 'GitHub',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: ['dev', 'coding'],
        },
        {
          id: '2',
          url: 'https://example.com',
          title: 'Example',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: ['test'],
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);

      const results = await getBookmarksByTag('dev');

      expect(results.length).toBe(1);
      expect(results[0].tags).toContain('dev');
    });
  });

  describe('clearBookmarks', () => {
    it('should clear all bookmarks', () => {
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      clearBookmarks();

      expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData).toEqual([]);
    });
  });

  describe('getBookmarksSorted', () => {
    it('should return bookmarks sorted by creation date descending', async () => {
      const now = Date.now();
      const bookmarks = JSON.stringify([
        {
          id: '1',
          url: 'https://old.com',
          title: 'Old',
          createdAt: now - 86400000,
          updatedAt: now - 86400000,
        },
        {
          id: '2',
          url: 'https://recent.com',
          title: 'Recent',
          createdAt: now,
          updatedAt: now,
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);

      const sorted = await getBookmarksSorted('desc');

      expect(sorted[0].url).toBe('https://recent.com');
      expect(sorted[1].url).toBe('https://old.com');
    });

    it('should return bookmarks sorted by creation date ascending', async () => {
      const now = Date.now();
      const bookmarks = JSON.stringify([
        {
          id: '1',
          url: 'https://old.com',
          title: 'Old',
          createdAt: now - 86400000,
          updatedAt: now - 86400000,
        },
        {
          id: '2',
          url: 'https://recent.com',
          title: 'Recent',
          createdAt: now,
          updatedAt: now,
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);

      const sorted = await getBookmarksSorted('asc');

      expect(sorted[0].url).toBe('https://old.com');
      expect(sorted[1].url).toBe('https://recent.com');
    });
  });

  describe('exportBookmarks', () => {
    it('should export bookmarks as JSON string', () => {
      const bookmarks = JSON.stringify([
        {
          id: '1',
          url: 'https://github.com',
          title: 'GitHub',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);

      const exported = exportBookmarks();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].url).toBe('https://github.com');
    });
  });

  describe('importBookmarks', () => {
    it('should import bookmarks in merge mode', () => {
      const existing = JSON.stringify([
        {
          id: '1',
          url: 'https://github.com',
          title: 'GitHub',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);

      const toImport = JSON.stringify([
        {
          id: '2',
          url: 'https://example.com',
          title: 'Example',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(existing);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const result = importBookmarks(toImport, 'merge');

      expect(result.length).toBe(2);
    });

    it('should import bookmarks in replace mode', () => {
      const toImport = JSON.stringify([
        {
          id: '2',
          url: 'https://example.com',
          title: 'Example',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);

      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const result = importBookmarks(toImport, 'replace');

      expect(result.length).toBe(1);
      expect(result[0].url).toBe('https://example.com');
    });

    it('should avoid duplicate URLs in merge mode', () => {
      const existing = JSON.stringify([
        {
          id: '1',
          url: 'https://github.com',
          title: 'GitHub',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);

      const toImport = JSON.stringify([
        {
          id: '1',
          url: 'https://github.com',
          title: 'GitHub',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(existing);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

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
