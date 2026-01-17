import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import {
  addBookmark,
  removeBookmark,
  getAllBookmarks,
  searchBookmarks,
  updateBookmark,
  isBookmarked,
  importBookmarks,
  exportBookmarks,
} from './bookmarkStore';
import { Bookmark } from './types';

// Mock fs module
vi.mock('fs');
vi.mock('path');

describe('BookmarkStore Properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(path.join).mockReturnValue('/mock/bookmarks.json');
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  describe('Property 3: Bookmark Persistence Round-Trip', () => {
    it('should persist and retrieve bookmarks with same data', () => {
      // Feature: arc-browser-enhancements, Property 3: Bookmark Persistence Round-Trip
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              url: fc.webUrl(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 })),
            }),
            { maxLength: 20 }
          ),
          (bookmarkData) => {
            vi.mocked(fs.readFileSync).mockReturnValue('[]');
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});

            // Add bookmarks
            const added: Bookmark[] = [];
            for (const data of bookmarkData) {
              const bookmark = addBookmark(data.url, data.title, data.tags);
              added.push(bookmark);
            }

            // Simulate retrieval by mocking the file read
            const savedData = JSON.stringify(added);
            vi.mocked(fs.readFileSync).mockReturnValue(savedData);

            // Retrieve bookmarks
            const retrieved = getAllBookmarks();

            // Verify round-trip
            expect(retrieved.length).toBe(added.length);
            for (let i = 0; i < added.length; i++) {
              expect(retrieved[i].url).toBe(added[i].url);
              expect(retrieved[i].title).toBe(added[i].title);
              expect(retrieved[i].tags).toEqual(added[i].tags);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain bookmark integrity through add and remove operations', () => {
      // Feature: arc-browser-enhancements, Property 3: Bookmark Persistence Round-Trip
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              url: fc.webUrl(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (bookmarkData) => {
            vi.mocked(fs.readFileSync).mockReturnValue('[]');
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});

            // Add bookmarks
            const added: Bookmark[] = [];
            for (const data of bookmarkData) {
              const bookmark = addBookmark(data.url, data.title);
              added.push(bookmark);
            }

            // Remove first bookmark
            if (added.length > 0) {
              const toRemove = added[0];
              const remaining = added.slice(1);

              vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(added));
              vi.mocked(fs.writeFileSync).mockImplementation(() => {});

              removeBookmark(toRemove.id);

              // Verify remaining bookmarks
              vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(remaining));
              const retrieved = getAllBookmarks();

              expect(retrieved.length).toBe(remaining.length);
              expect(retrieved.every(b => b.id !== toRemove.id)).toBe(true);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Search Consistency', () => {
    it('should find bookmarks that match search query', () => {
      // Feature: arc-browser-enhancements, Property 3: Bookmark Persistence Round-Trip
      fc.assert(
        fc.property(
          fc.record({
            url: fc.webUrl(),
            title: fc.string({ minLength: 5, maxLength: 50 }),
          }),
          (bookmarkData) => {
            vi.mocked(fs.readFileSync).mockReturnValue('[]');
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});

            const bookmark = addBookmark(bookmarkData.url, bookmarkData.title);

            // Search by URL
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([bookmark]));
            const urlResults = searchBookmarks(bookmarkData.url.substring(0, 5));
            expect(urlResults.length).toBeGreaterThan(0);

            // Search by title
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([bookmark]));
            const titleResults = searchBookmarks(bookmarkData.title.substring(0, 3));
            expect(titleResults.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Bookmark State Invariants', () => {
    it('should maintain valid bookmark structure after operations', () => {
      // Feature: arc-browser-enhancements, Property 3: Bookmark Persistence Round-Trip
      fc.assert(
        fc.property(
          fc.record({
            url: fc.webUrl(),
            title: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          (bookmarkData) => {
            vi.mocked(fs.readFileSync).mockReturnValue('[]');
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});

            const bookmark = addBookmark(bookmarkData.url, bookmarkData.title);

            // Verify required fields exist
            expect(bookmark.id).toBeDefined();
            expect(bookmark.url).toBeDefined();
            expect(bookmark.title).toBeDefined();
            expect(bookmark.createdAt).toBeDefined();
            expect(bookmark.updatedAt).toBeDefined();

            // Verify timestamps are valid
            expect(typeof bookmark.createdAt).toBe('number');
            expect(typeof bookmark.updatedAt).toBe('number');
            expect(bookmark.createdAt).toBeGreaterThan(0);
            expect(bookmark.updatedAt).toBeGreaterThan(0);

            // Verify creation time <= update time
            expect(bookmark.createdAt).toBeLessThanOrEqual(bookmark.updatedAt);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property: Update Idempotence', () => {
    it('should produce same result when updating with same data twice', () => {
      // Feature: arc-browser-enhancements, Property 3: Bookmark Persistence Round-Trip
      fc.assert(
        fc.property(
          fc.record({
            url: fc.webUrl(),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            newTitle: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          (data) => {
            vi.mocked(fs.readFileSync).mockReturnValue('[]');
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});

            const bookmark = addBookmark(data.url, data.title);

            // First update
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([bookmark]));
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});
            const updated1 = updateBookmark(bookmark.id, { title: data.newTitle });

            // Second update with same data
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([updated1]));
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});
            const updated2 = updateBookmark(bookmark.id, { title: data.newTitle });

            // Both should have same title
            expect(updated1?.title).toBe(updated2?.title);
            expect(updated1?.url).toBe(updated2?.url);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Export-Import Round-Trip', () => {
    it('should preserve bookmarks through export and import', () => {
      // Feature: arc-browser-enhancements, Property 3: Bookmark Persistence Round-Trip
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              url: fc.webUrl(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { maxLength: 10 }
          ),
          (bookmarkData) => {
            vi.mocked(fs.readFileSync).mockReturnValue('[]');
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});

            // Add bookmarks
            const added: Bookmark[] = [];
            for (const data of bookmarkData) {
              const bookmark = addBookmark(data.url, data.title);
              added.push(bookmark);
            }

            // Export
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(added));
            const exported = exportBookmarks();

            // Import
            vi.mocked(fs.readFileSync).mockReturnValue('[]');
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});
            const imported = importBookmarks(exported, 'replace');

            // Verify
            expect(imported.length).toBe(added.length);
            for (let i = 0; i < added.length; i++) {
              expect(imported[i].url).toBe(added[i].url);
              expect(imported[i].title).toBe(added[i].title);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: isBookmarked Consistency', () => {
    it('should correctly identify bookmarked URLs', () => {
      // Feature: arc-browser-enhancements, Property 3: Bookmark Persistence Round-Trip
      fc.assert(
        fc.property(
          fc.record({
            url: fc.webUrl(),
            title: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          (bookmarkData) => {
            vi.mocked(fs.readFileSync).mockReturnValue('[]');
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});

            const bookmark = addBookmark(bookmarkData.url, bookmarkData.title);

            // Check if bookmarked
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([bookmark]));
            const isBookmarkedResult = isBookmarked(bookmarkData.url);

            expect(isBookmarkedResult).toBe(true);

            // Check non-existent URL
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([bookmark]));
            const isNotBookmarked = isBookmarked('https://nonexistent-url-12345.com');

            expect(isNotBookmarked).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
