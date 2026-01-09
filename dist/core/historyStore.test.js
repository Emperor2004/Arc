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
const historyStore_1 = require("./historyStore");
// Mock fs module
vitest_1.vi.mock('fs');
vitest_1.vi.mock('path');
(0, vitest_1.describe)('HistoryStore Module', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        // Mock path.join to return a consistent path
        vitest_1.vi.mocked(path.join).mockReturnValue('/mock/history.json');
        // Mock fs.existsSync to return true
        vitest_1.vi.mocked(fs.existsSync).mockReturnValue(true);
    });
    (0, vitest_1.describe)('addHistoryEntry', () => {
        (0, vitest_1.it)('should add a new history entry', () => {
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            const entry = (0, historyStore_1.addHistoryEntry)('https://github.com', 'GitHub');
            (0, vitest_1.expect)(entry.url).toBe('https://github.com');
            (0, vitest_1.expect)(entry.title).toBe('GitHub');
            (0, vitest_1.expect)(entry.visit_count).toBe(1);
            (0, vitest_1.expect)(entry.id).toBe(1);
        });
        (0, vitest_1.it)('should increment visit count for existing URL', () => {
            const existingHistory = JSON.stringify([
                {
                    id: 1,
                    url: 'https://github.com',
                    title: 'GitHub',
                    visited_at: Date.now() - 86400000,
                    visit_count: 5,
                },
            ]);
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(existingHistory);
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            const entry = (0, historyStore_1.addHistoryEntry)('https://github.com', 'GitHub');
            (0, vitest_1.expect)(entry.visit_count).toBe(6);
        });
        (0, vitest_1.it)('should update title if provided', () => {
            const existingHistory = JSON.stringify([
                {
                    id: 1,
                    url: 'https://github.com',
                    title: 'Old Title',
                    visited_at: Date.now() - 86400000,
                    visit_count: 5,
                },
            ]);
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(existingHistory);
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            const entry = (0, historyStore_1.addHistoryEntry)('https://github.com', 'New Title');
            (0, vitest_1.expect)(entry.title).toBe('New Title');
        });
        (0, vitest_1.it)('should handle empty history', () => {
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            const entry = (0, historyStore_1.addHistoryEntry)('https://example.com', 'Example');
            (0, vitest_1.expect)(entry.id).toBe(1);
            (0, vitest_1.expect)(entry.visit_count).toBe(1);
        });
    });
    (0, vitest_1.describe)('getRecentHistory', () => {
        (0, vitest_1.it)('should return recent history sorted by visited_at', async () => {
            const now = Date.now();
            const history = JSON.stringify([
                {
                    id: 1,
                    url: 'https://old.com',
                    title: 'Old',
                    visited_at: now - 86400000,
                    visit_count: 1,
                },
                {
                    id: 2,
                    url: 'https://recent.com',
                    title: 'Recent',
                    visited_at: now,
                    visit_count: 1,
                },
            ]);
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(history);
            const recent = await (0, historyStore_1.getRecentHistory)(10);
            (0, vitest_1.expect)(recent[0].url).toBe('https://recent.com');
            (0, vitest_1.expect)(recent[1].url).toBe('https://old.com');
        });
        (0, vitest_1.it)('should respect limit parameter', async () => {
            const history = JSON.stringify(Array.from({ length: 20 }, (_, i) => ({
                id: i,
                url: `https://example${i}.com`,
                title: `Example ${i}`,
                visited_at: Date.now() - i * 86400000,
                visit_count: 1,
            })));
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(history);
            const recent = await (0, historyStore_1.getRecentHistory)(5);
            (0, vitest_1.expect)(recent.length).toBe(5);
        });
        (0, vitest_1.it)('should return empty array when no history', async () => {
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
            const recent = await (0, historyStore_1.getRecentHistory)(10);
            (0, vitest_1.expect)(recent).toEqual([]);
        });
    });
    (0, vitest_1.describe)('getAllHistory', () => {
        (0, vitest_1.it)('should return all history entries', async () => {
            const history = JSON.stringify([
                {
                    id: 1,
                    url: 'https://example1.com',
                    title: 'Example 1',
                    visited_at: Date.now(),
                    visit_count: 1,
                },
                {
                    id: 2,
                    url: 'https://example2.com',
                    title: 'Example 2',
                    visited_at: Date.now(),
                    visit_count: 1,
                },
            ]);
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(history);
            const all = await (0, historyStore_1.getAllHistory)();
            (0, vitest_1.expect)(all.length).toBe(2);
        });
    });
    (0, vitest_1.describe)('clearHistory', () => {
        (0, vitest_1.it)('should clear all history', () => {
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            (0, historyStore_1.clearHistory)();
            (0, vitest_1.expect)(vitest_1.vi.mocked(fs.writeFileSync)).toHaveBeenCalled();
            const writeCall = vitest_1.vi.mocked(fs.writeFileSync).mock.calls[0];
            const writtenData = JSON.parse(writeCall[1]);
            (0, vitest_1.expect)(writtenData).toEqual([]);
        });
    });
    (0, vitest_1.describe)('removeHistoryEntry', () => {
        (0, vitest_1.it)('should remove history entry by URL', () => {
            const history = JSON.stringify([
                {
                    id: 1,
                    url: 'https://github.com',
                    title: 'GitHub',
                    visited_at: Date.now(),
                    visit_count: 1,
                },
                {
                    id: 2,
                    url: 'https://example.com',
                    title: 'Example',
                    visited_at: Date.now(),
                    visit_count: 1,
                },
            ]);
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(history);
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            (0, historyStore_1.removeHistoryEntry)('https://github.com');
            const writeCall = vitest_1.vi.mocked(fs.writeFileSync).mock.calls[0];
            const writtenData = JSON.parse(writeCall[1]);
            (0, vitest_1.expect)(writtenData.length).toBe(1);
            (0, vitest_1.expect)(writtenData[0].url).toBe('https://example.com');
        });
    });
    (0, vitest_1.describe)('searchHistory', () => {
        (0, vitest_1.it)('should search by URL', async () => {
            const history = JSON.stringify([
                {
                    id: 1,
                    url: 'https://github.com',
                    title: 'GitHub',
                    visited_at: Date.now(),
                    visit_count: 1,
                },
                {
                    id: 2,
                    url: 'https://example.com',
                    title: 'Example',
                    visited_at: Date.now(),
                    visit_count: 1,
                },
            ]);
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(history);
            const results = await (0, historyStore_1.searchHistory)('github');
            (0, vitest_1.expect)(results.length).toBe(1);
            (0, vitest_1.expect)(results[0].url).toBe('https://github.com');
        });
        (0, vitest_1.it)('should search by title', async () => {
            const history = JSON.stringify([
                {
                    id: 1,
                    url: 'https://github.com',
                    title: 'GitHub',
                    visited_at: Date.now(),
                    visit_count: 1,
                },
                {
                    id: 2,
                    url: 'https://example.com',
                    title: 'Example',
                    visited_at: Date.now(),
                    visit_count: 1,
                },
            ]);
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(history);
            const results = await (0, historyStore_1.searchHistory)('example');
            (0, vitest_1.expect)(results.length).toBe(1);
            (0, vitest_1.expect)(results[0].title).toBe('Example');
        });
        (0, vitest_1.it)('should be case-insensitive', async () => {
            const history = JSON.stringify([
                {
                    id: 1,
                    url: 'https://GITHUB.COM',
                    title: 'GitHub',
                    visited_at: Date.now(),
                    visit_count: 1,
                },
            ]);
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(history);
            const results = await (0, historyStore_1.searchHistory)('github');
            (0, vitest_1.expect)(results.length).toBe(1);
        });
    });
});
