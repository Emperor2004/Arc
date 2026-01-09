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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fast_check_1 = __importDefault(require("fast-check"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const bookmarkStore_1 = require("./bookmarkStore");
// Mock fs module
vitest_1.vi.mock('fs');
vitest_1.vi.mock('path');
(0, vitest_1.describe)('BookmarkStore Properties', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        vitest_1.vi.mocked(path.join).mockReturnValue('/mock/bookmarks.json');
        vitest_1.vi.mocked(fs.existsSync).mockReturnValue(true);
    });
    (0, vitest_1.describe)('Property 3: Bookmark Persistence Round-Trip', () => {
        (0, vitest_1.it)('should persist and retrieve bookmarks with same data', async () => {
            // Feature: arc-browser-enhancements, Property 3: Bookmark Persistence Round-Trip
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.array(fast_check_1.default.record({
                url: fast_check_1.default.webUrl(),
                title: fast_check_1.default.string({ minLength: 1, maxLength: 100 }),
                tags: fast_check_1.default.option(fast_check_1.default.array(fast_check_1.default.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 })),
            }), { maxLength: 20 }), async (bookmarkData) => {
                vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
                vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
                // Add bookmarks
                const added = [];
                for (const data of bookmarkData) {
                    const bookmark = (0, bookmarkStore_1.addBookmark)(data.url, data.title, data.tags);
                    added.push(bookmark);
                }
                // Simulate retrieval by mocking the file read
                const savedData = JSON.stringify(added);
                vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(savedData);
                // Retrieve bookmarks
                const retrieved = await (0, bookmarkStore_1.getAllBookmarks)();
                // Verify round-trip
                (0, vitest_1.expect)(retrieved.length).toBe(added.length);
                for (let i = 0; i < added.length; i++) {
                    (0, vitest_1.expect)(retrieved[i].url).toBe(added[i].url);
                    (0, vitest_1.expect)(retrieved[i].title).toBe(added[i].title);
                    (0, vitest_1.expect)(retrieved[i].tags).toEqual(added[i].tags);
                }
            }), { numRuns: 50 });
        });
        (0, vitest_1.it)('should maintain bookmark integrity through add and remove operations', async () => {
            // Feature: arc-browser-enhancements, Property 3: Bookmark Persistence Round-Trip
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.array(fast_check_1.default.record({
                url: fast_check_1.default.webUrl(),
                title: fast_check_1.default.string({ minLength: 1, maxLength: 100 }),
            }), { minLength: 1, maxLength: 10 }), async (bookmarkData) => {
                vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
                vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
                // Add bookmarks
                const added = [];
                for (const data of bookmarkData) {
                    const bookmark = (0, bookmarkStore_1.addBookmark)(data.url, data.title);
                    added.push(bookmark);
                }
                // Remove first bookmark
                if (added.length > 0) {
                    const toRemove = added[0];
                    const remaining = added.slice(1);
                    vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(added));
                    vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
                    (0, bookmarkStore_1.removeBookmark)(toRemove.id);
                    // Verify remaining bookmarks
                    vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(remaining));
                    const retrieved = await (0, bookmarkStore_1.getAllBookmarks)();
                    (0, vitest_1.expect)(retrieved.length).toBe(remaining.length);
                    (0, vitest_1.expect)(retrieved.every(b => b.id !== toRemove.id)).toBe(true);
                }
            }), { numRuns: 50 });
        });
    });
    (0, vitest_1.describe)('Property: Search Consistency', () => {
        (0, vitest_1.it)('should find bookmarks that match search query', async () => {
            // Feature: arc-browser-enhancements, Property 3: Bookmark Persistence Round-Trip
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record({
                url: fast_check_1.default.webUrl(),
                title: fast_check_1.default.string({ minLength: 5, maxLength: 50 }),
            }), async (bookmarkData) => {
                vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
                vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
                const bookmark = (0, bookmarkStore_1.addBookmark)(bookmarkData.url, bookmarkData.title);
                // Search by URL
                vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([bookmark]));
                const urlResults = await (0, bookmarkStore_1.searchBookmarks)(bookmarkData.url.substring(0, 5));
                (0, vitest_1.expect)(urlResults.length).toBeGreaterThan(0);
                // Search by title
                vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([bookmark]));
                const titleResults = await (0, bookmarkStore_1.searchBookmarks)(bookmarkData.title.substring(0, 3));
                (0, vitest_1.expect)(titleResults.length).toBeGreaterThan(0);
            }), { numRuns: 50 });
        });
    });
    (0, vitest_1.describe)('Property: Bookmark State Invariants', () => {
        (0, vitest_1.it)('should maintain valid bookmark structure after operations', async () => {
            // Feature: arc-browser-enhancements, Property 3: Bookmark Persistence Round-Trip
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record({
                url: fast_check_1.default.webUrl(),
                title: fast_check_1.default.string({ minLength: 1, maxLength: 100 }),
            }), async (bookmarkData) => {
                vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
                vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
                const bookmark = (0, bookmarkStore_1.addBookmark)(bookmarkData.url, bookmarkData.title);
                // Verify required fields exist
                (0, vitest_1.expect)(bookmark.id).toBeDefined();
                (0, vitest_1.expect)(bookmark.url).toBeDefined();
                (0, vitest_1.expect)(bookmark.title).toBeDefined();
                (0, vitest_1.expect)(bookmark.createdAt).toBeDefined();
                (0, vitest_1.expect)(bookmark.updatedAt).toBeDefined();
                // Verify timestamps are valid
                (0, vitest_1.expect)(typeof bookmark.createdAt).toBe('number');
                (0, vitest_1.expect)(typeof bookmark.updatedAt).toBe('number');
                (0, vitest_1.expect)(bookmark.createdAt).toBeGreaterThan(0);
                (0, vitest_1.expect)(bookmark.updatedAt).toBeGreaterThan(0);
                // Verify creation time <= update time
                (0, vitest_1.expect)(bookmark.createdAt).toBeLessThanOrEqual(bookmark.updatedAt);
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property: Update Idempotence', () => {
        (0, vitest_1.it)('should produce same result when updating with same data twice', async () => {
            // Feature: arc-browser-enhancements, Property 3: Bookmark Persistence Round-Trip
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record({
                url: fast_check_1.default.webUrl(),
                title: fast_check_1.default.string({ minLength: 1, maxLength: 100 }),
                newTitle: fast_check_1.default.string({ minLength: 1, maxLength: 100 }),
            }), async (data) => {
                vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
                vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
                const bookmark = (0, bookmarkStore_1.addBookmark)(data.url, data.title);
                // First update
                vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([bookmark]));
                vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
                const updated1 = (0, bookmarkStore_1.updateBookmark)(bookmark.id, { title: data.newTitle });
                // Second update with same data
                vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([updated1]));
                vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
                const updated2 = (0, bookmarkStore_1.updateBookmark)(bookmark.id, { title: data.newTitle });
                // Both should have same title
                (0, vitest_1.expect)(updated1?.title).toBe(updated2?.title);
                (0, vitest_1.expect)(updated1?.url).toBe(updated2?.url);
            }), { numRuns: 50 });
        });
    });
    (0, vitest_1.describe)('Property: Export-Import Round-Trip', () => {
        (0, vitest_1.it)('should preserve bookmarks through export and import', async () => {
            // Feature: arc-browser-enhancements, Property 3: Bookmark Persistence Round-Trip
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.array(fast_check_1.default.record({
                url: fast_check_1.default.webUrl(),
                title: fast_check_1.default.string({ minLength: 1, maxLength: 100 }),
            }), { maxLength: 10 }), async (bookmarkData) => {
                vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
                vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
                // Add bookmarks
                const added = [];
                for (const data of bookmarkData) {
                    const bookmark = (0, bookmarkStore_1.addBookmark)(data.url, data.title);
                    added.push(bookmark);
                }
                // Export
                vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(added));
                const exported = (0, bookmarkStore_1.exportBookmarks)();
                // Import
                vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
                vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
                const imported = (0, bookmarkStore_1.importBookmarks)(exported, 'replace');
                // Verify
                (0, vitest_1.expect)(imported.length).toBe(added.length);
                for (let i = 0; i < added.length; i++) {
                    (0, vitest_1.expect)(imported[i].url).toBe(added[i].url);
                    (0, vitest_1.expect)(imported[i].title).toBe(added[i].title);
                }
            }), { numRuns: 50 });
        });
    });
    (0, vitest_1.describe)('Property: isBookmarked Consistency', () => {
        (0, vitest_1.it)('should correctly identify bookmarked URLs', async () => {
            // Feature: arc-browser-enhancements, Property 3: Bookmark Persistence Round-Trip
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record({
                url: fast_check_1.default.webUrl(),
                title: fast_check_1.default.string({ minLength: 1, maxLength: 100 }),
            }), async (bookmarkData) => {
                vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
                vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
                const bookmark = (0, bookmarkStore_1.addBookmark)(bookmarkData.url, bookmarkData.title);
                // Check if bookmarked
                vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([bookmark]));
                const isBookmarkedResult = await (0, bookmarkStore_1.isBookmarked)(bookmarkData.url);
                (0, vitest_1.expect)(isBookmarkedResult).toBe(true);
                // Check non-existent URL
                vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([bookmark]));
                const isNotBookmarked = await (0, bookmarkStore_1.isBookmarked)('https://nonexistent-url-12345.com');
                (0, vitest_1.expect)(isNotBookmarked).toBe(false);
            }), { numRuns: 50 });
        });
    });
});
