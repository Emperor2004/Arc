"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const bookmarkStore_1 = require("./bookmarkStore");
// Mock fs module
vitest_1.vi.mock('fs');
vitest_1.vi.mock('path');
(0, vitest_1.describe)('BookmarkStore Module', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        // Mock path.join to return a consistent path
        vitest_1.vi.mocked(path.join).mockReturnValue('/mock/bookmarks.json');
        // Mock fs.existsSync to return true
        vitest_1.vi.mocked(fs.existsSync).mockReturnValue(true);
    });
    (0, vitest_1.describe)('addBookmark', () => {
        (0, vitest_1.it)('should add a new bookmark', () => {
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            const bookmark = (0, bookmarkStore_1.addBookmark)('https://github.com', 'GitHub');
            (0, vitest_1.expect)(bookmark.url).toBe('https://github.com');
            (0, vitest_1.expect)(bookmark.title).toBe('GitHub');
            (0, vitest_1.expect)(bookmark.id).toBeDefined();
            (0, vitest_1.expect)(bookmark.createdAt).toBeDefined();
            (0, vitest_1.expect)(bookmark.updatedAt).toBeDefined();
        });
        (0, vitest_1.it)('should add tags to bookmark', () => {
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            const bookmark = (0, bookmarkStore_1.addBookmark)('https://github.com', 'GitHub', ['dev', 'coding']);
            (0, vitest_1.expect)(bookmark.tags).toEqual(['dev', 'coding']);
        });
        (0, vitest_1.it)('should save bookmark to file', () => {
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            (0, bookmarkStore_1.addBookmark)('https://github.com', 'GitHub');
            (0, vitest_1.expect)(vitest_1.vi.mocked(fs.writeFileSync)).toHaveBeenCalled();
            const writeCall = vitest_1.vi.mocked(fs.writeFileSync).mock.calls[0];
            const writtenData = JSON.parse(writeCall[1]);
            (0, vitest_1.expect)(writtenData.length).toBe(1);
            (0, vitest_1.expect)(writtenData[0].url).toBe('https://github.com');
        });
    });
    (0, vitest_1.describe)('removeBookmark', () => {
        (0, vitest_1.it)('should remove bookmark by ID', () => {
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
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            const removed = (0, bookmarkStore_1.removeBookmark)('1');
            (0, vitest_1.expect)(removed).toBe(true);
            const writeCall = vitest_1.vi.mocked(fs.writeFileSync).mock.calls[0];
            const writtenData = JSON.parse(writeCall[1]);
            (0, vitest_1.expect)(writtenData.length).toBe(1);
            (0, vitest_1.expect)(writtenData[0].id).toBe('2');
        });
        (0, vitest_1.it)('should return false if bookmark not found', () => {
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
            const removed = (0, bookmarkStore_1.removeBookmark)('nonexistent');
            (0, vitest_1.expect)(removed).toBe(false);
        });
    });
    (0, vitest_1.describe)('getAllBookmarks', () => {
        (0, vitest_1.it)('should return all bookmarks', async () => {
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
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);
            const all = await (0, bookmarkStore_1.getAllBookmarks)();
            (0, vitest_1.expect)(all.length).toBe(2);
        });
        (0, vitest_1.it)('should return empty array when no bookmarks', async () => {
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
            const all = await (0, bookmarkStore_1.getAllBookmarks)();
            (0, vitest_1.expect)(all).toEqual([]);
        });
    });
    (0, vitest_1.describe)('getBookmarkById', () => {
        (0, vitest_1.it)('should return bookmark by ID', async () => {
            const bookmarks = JSON.stringify([
                {
                    id: '1',
                    url: 'https://github.com',
                    title: 'GitHub',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                },
            ]);
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);
            const bookmark = await (0, bookmarkStore_1.getBookmarkById)('1');
            (0, vitest_1.expect)(bookmark).not.toBeNull();
            (0, vitest_1.expect)(bookmark?.url).toBe('https://github.com');
        });
        (0, vitest_1.it)('should return null if bookmark not found', async () => {
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
            const bookmark = await (0, bookmarkStore_1.getBookmarkById)('nonexistent');
            (0, vitest_1.expect)(bookmark).toBeNull();
        });
    });
    (0, vitest_1.describe)('searchBookmarks', () => {
        (0, vitest_1.it)('should search by URL', async () => {
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
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);
            const results = await (0, bookmarkStore_1.searchBookmarks)('github');
            (0, vitest_1.expect)(results.length).toBe(1);
            (0, vitest_1.expect)(results[0].url).toBe('https://github.com');
        });
        (0, vitest_1.it)('should search by title', async () => {
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
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);
            const results = await (0, bookmarkStore_1.searchBookmarks)('example');
            (0, vitest_1.expect)(results.length).toBe(1);
            (0, vitest_1.expect)(results[0].title).toBe('Example');
        });
        (0, vitest_1.it)('should search by tags', async () => {
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
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);
            const results = await (0, bookmarkStore_1.searchBookmarks)('dev');
            (0, vitest_1.expect)(results.length).toBe(1);
            (0, vitest_1.expect)(results[0].tags).toContain('dev');
        });
        (0, vitest_1.it)('should be case-insensitive', async () => {
            const bookmarks = JSON.stringify([
                {
                    id: '1',
                    url: 'https://GITHUB.COM',
                    title: 'GitHub',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                },
            ]);
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);
            const results = await (0, bookmarkStore_1.searchBookmarks)('github');
            (0, vitest_1.expect)(results.length).toBe(1);
        });
    });
    (0, vitest_1.describe)('updateBookmark', () => {
        (0, vitest_1.it)('should update bookmark', () => {
            const bookmarks = JSON.stringify([
                {
                    id: '1',
                    url: 'https://github.com',
                    title: 'GitHub',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                },
            ]);
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            const updated = (0, bookmarkStore_1.updateBookmark)('1', { title: 'GitHub - New Title' });
            (0, vitest_1.expect)(updated).not.toBeNull();
            (0, vitest_1.expect)(updated?.title).toBe('GitHub - New Title');
        });
        (0, vitest_1.it)('should preserve ID and creation time', () => {
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
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            const updated = (0, bookmarkStore_1.updateBookmark)('1', { title: 'New Title' });
            (0, vitest_1.expect)(updated?.id).toBe('1');
            (0, vitest_1.expect)(updated?.createdAt).toBe(createdAt);
        });
        (0, vitest_1.it)('should update modification time', () => {
            const bookmarks = JSON.stringify([
                {
                    id: '1',
                    url: 'https://github.com',
                    title: 'GitHub',
                    createdAt: Date.now(),
                    updatedAt: Date.now() - 86400000,
                },
            ]);
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            const before = Date.now();
            const updated = (0, bookmarkStore_1.updateBookmark)('1', { title: 'New Title' });
            const after = Date.now();
            (0, vitest_1.expect)(updated?.updatedAt).toBeGreaterThanOrEqual(before);
            (0, vitest_1.expect)(updated?.updatedAt).toBeLessThanOrEqual(after);
        });
        (0, vitest_1.it)('should return null if bookmark not found', () => {
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
            const updated = (0, bookmarkStore_1.updateBookmark)('nonexistent', { title: 'New Title' });
            (0, vitest_1.expect)(updated).toBeNull();
        });
    });
    (0, vitest_1.describe)('isBookmarked', () => {
        (0, vitest_1.it)('should return true if URL is bookmarked', async () => {
            const bookmarks = JSON.stringify([
                {
                    id: '1',
                    url: 'https://github.com',
                    title: 'GitHub',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                },
            ]);
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);
            const bookmarked = await (0, bookmarkStore_1.isBookmarked)('https://github.com');
            (0, vitest_1.expect)(bookmarked).toBe(true);
        });
        (0, vitest_1.it)('should return false if URL is not bookmarked', async () => {
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
            const bookmarked = await (0, bookmarkStore_1.isBookmarked)('https://nonexistent.com');
            (0, vitest_1.expect)(bookmarked).toBe(false);
        });
    });
    (0, vitest_1.describe)('getBookmarksByTag', () => {
        (0, vitest_1.it)('should return bookmarks with specific tag', async () => {
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
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);
            const results = await (0, bookmarkStore_1.getBookmarksByTag)('dev');
            (0, vitest_1.expect)(results.length).toBe(1);
            (0, vitest_1.expect)(results[0].tags).toContain('dev');
        });
    });
    (0, vitest_1.describe)('clearBookmarks', () => {
        (0, vitest_1.it)('should clear all bookmarks', () => {
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            (0, bookmarkStore_1.clearBookmarks)();
            (0, vitest_1.expect)(vitest_1.vi.mocked(fs.writeFileSync)).toHaveBeenCalled();
            const writeCall = vitest_1.vi.mocked(fs.writeFileSync).mock.calls[0];
            const writtenData = JSON.parse(writeCall[1]);
            (0, vitest_1.expect)(writtenData).toEqual([]);
        });
    });
    (0, vitest_1.describe)('getBookmarksSorted', () => {
        (0, vitest_1.it)('should return bookmarks sorted by creation date descending', async () => {
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
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);
            const sorted = await (0, bookmarkStore_1.getBookmarksSorted)('desc');
            (0, vitest_1.expect)(sorted[0].url).toBe('https://recent.com');
            (0, vitest_1.expect)(sorted[1].url).toBe('https://old.com');
        });
        (0, vitest_1.it)('should return bookmarks sorted by creation date ascending', async () => {
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
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);
            const sorted = await (0, bookmarkStore_1.getBookmarksSorted)('asc');
            (0, vitest_1.expect)(sorted[0].url).toBe('https://old.com');
            (0, vitest_1.expect)(sorted[1].url).toBe('https://recent.com');
        });
    });
    (0, vitest_1.describe)('exportBookmarks', () => {
        (0, vitest_1.it)('should export bookmarks as JSON string', () => {
            const bookmarks = JSON.stringify([
                {
                    id: '1',
                    url: 'https://github.com',
                    title: 'GitHub',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                },
            ]);
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(bookmarks);
            const exported = (0, bookmarkStore_1.exportBookmarks)();
            const parsed = JSON.parse(exported);
            (0, vitest_1.expect)(Array.isArray(parsed)).toBe(true);
            (0, vitest_1.expect)(parsed[0].url).toBe('https://github.com');
        });
    });
    (0, vitest_1.describe)('importBookmarks', () => {
        (0, vitest_1.it)('should import bookmarks in merge mode', () => {
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
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(existing);
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            const result = (0, bookmarkStore_1.importBookmarks)(toImport, 'merge');
            (0, vitest_1.expect)(result.length).toBe(2);
        });
        (0, vitest_1.it)('should import bookmarks in replace mode', () => {
            const toImport = JSON.stringify([
                {
                    id: '2',
                    url: 'https://example.com',
                    title: 'Example',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                },
            ]);
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            const result = (0, bookmarkStore_1.importBookmarks)(toImport, 'replace');
            (0, vitest_1.expect)(result.length).toBe(1);
            (0, vitest_1.expect)(result[0].url).toBe('https://example.com');
        });
        (0, vitest_1.it)('should avoid duplicate URLs in merge mode', () => {
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
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(existing);
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            const result = (0, bookmarkStore_1.importBookmarks)(toImport, 'merge');
            (0, vitest_1.expect)(result.length).toBe(1);
        });
        (0, vitest_1.it)('should throw error for invalid JSON', () => {
            // Suppress console.error for this test
            const consoleSpy = vitest_1.vi.spyOn(console, 'error').mockImplementation(() => { });
            (0, vitest_1.expect)(() => (0, bookmarkStore_1.importBookmarks)('invalid json')).toThrow();
            consoleSpy.mockRestore();
        });
    });
});
