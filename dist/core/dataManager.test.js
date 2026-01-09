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
const dataManager = __importStar(require("./dataManager"));
const historyStore = __importStar(require("./historyStore"));
const feedbackStore = __importStar(require("./feedbackStore"));
const bookmarkStore = __importStar(require("./bookmarkStore"));
const settingsStore = __importStar(require("./settingsStore"));
// Mock the stores
vitest_1.vi.mock('./historyStore');
vitest_1.vi.mock('./feedbackStore');
vitest_1.vi.mock('./bookmarkStore');
vitest_1.vi.mock('./settingsStore');
(0, vitest_1.describe)('DataManager', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('exportData', () => {
        (0, vitest_1.it)('should export all data with correct structure', async () => {
            const mockHistory = [
                { id: 1, url: 'https://example.com', title: 'Example', visited_at: 1000, visit_count: 1 },
            ];
            const mockFeedback = [
                { id: 1, url: 'https://example.com', value: 'like', created_at: 1000 },
            ];
            const mockBookmarks = [
                { id: '1', url: 'https://example.com', title: 'Example', createdAt: 1000, updatedAt: 1000 },
            ];
            const mockSettings = { theme: 'dark', jarvisEnabled: true };
            vitest_1.vi.mocked(historyStore.getAllHistory).mockResolvedValue(mockHistory);
            vitest_1.vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue(mockFeedback);
            vitest_1.vi.mocked(bookmarkStore.getAllBookmarks).mockResolvedValue(mockBookmarks);
            vitest_1.vi.mocked(settingsStore.getSettings).mockReturnValue(mockSettings);
            const exported = await dataManager.exportData();
            (0, vitest_1.expect)(exported.version).toBe('1.0.0');
            (0, vitest_1.expect)(exported.timestamp).toBeGreaterThan(0);
            (0, vitest_1.expect)(exported.history).toHaveLength(1);
            (0, vitest_1.expect)(exported.feedback).toHaveLength(1);
            (0, vitest_1.expect)(exported.bookmarks).toHaveLength(1);
            (0, vitest_1.expect)(exported.settings).toEqual(mockSettings);
        });
        (0, vitest_1.it)('should handle empty data', async () => {
            vitest_1.vi.mocked(historyStore.getAllHistory).mockResolvedValue([]);
            vitest_1.vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue([]);
            vitest_1.vi.mocked(bookmarkStore.getAllBookmarks).mockResolvedValue([]);
            vitest_1.vi.mocked(settingsStore.getSettings).mockReturnValue({});
            const exported = await dataManager.exportData();
            (0, vitest_1.expect)(exported.history).toEqual([]);
            (0, vitest_1.expect)(exported.feedback).toEqual([]);
            (0, vitest_1.expect)(exported.bookmarks).toEqual([]);
        });
    });
    (0, vitest_1.describe)('validateExportData', () => {
        (0, vitest_1.it)('should validate correct export data', () => {
            const validData = {
                version: '1.0.0',
                timestamp: Date.now(),
                history: [{ url: 'https://example.com', title: 'Example', visited_at: 1000 }],
                feedback: [{ url: 'https://example.com', value: 'like', created_at: 1000 }],
                bookmarks: [{ url: 'https://example.com', title: 'Example', createdAt: 1000 }],
                settings: { theme: 'dark' },
            };
            (0, vitest_1.expect)(dataManager.validateExportData(validData)).toBe(true);
        });
        (0, vitest_1.it)('should reject invalid version', () => {
            const invalidData = {
                version: 123,
                timestamp: Date.now(),
                history: [],
                feedback: [],
                bookmarks: [],
                settings: {},
            };
            (0, vitest_1.expect)(dataManager.validateExportData(invalidData)).toBe(false);
        });
        (0, vitest_1.it)('should reject invalid timestamp', () => {
            const invalidData = {
                version: '1.0.0',
                timestamp: -1,
                history: [],
                feedback: [],
                bookmarks: [],
                settings: {},
            };
            (0, vitest_1.expect)(dataManager.validateExportData(invalidData)).toBe(false);
        });
        (0, vitest_1.it)('should reject missing arrays', () => {
            const invalidData = {
                version: '1.0.0',
                timestamp: Date.now(),
                history: [],
                feedback: [],
                bookmarks: [],
            };
            (0, vitest_1.expect)(dataManager.validateExportData(invalidData)).toBe(false);
        });
        (0, vitest_1.it)('should reject invalid history entries', () => {
            const invalidData = {
                version: '1.0.0',
                timestamp: Date.now(),
                history: [{ url: 'https://example.com', title: 'Example' }],
                feedback: [],
                bookmarks: [],
                settings: {},
            };
            (0, vitest_1.expect)(dataManager.validateExportData(invalidData)).toBe(false);
        });
        (0, vitest_1.it)('should reject invalid feedback entries', () => {
            const invalidData = {
                version: '1.0.0',
                timestamp: Date.now(),
                history: [],
                feedback: [{ url: 'https://example.com', value: 'invalid', created_at: 1000 }],
                bookmarks: [],
                settings: {},
            };
            (0, vitest_1.expect)(dataManager.validateExportData(invalidData)).toBe(false);
        });
        (0, vitest_1.it)('should reject invalid bookmark entries', () => {
            const invalidData = {
                version: '1.0.0',
                timestamp: Date.now(),
                history: [],
                feedback: [],
                bookmarks: [{ url: 'https://example.com', createdAt: 1000 }],
                settings: {},
            };
            (0, vitest_1.expect)(dataManager.validateExportData(invalidData)).toBe(false);
        });
        (0, vitest_1.it)('should accept null title in history', () => {
            const validData = {
                version: '1.0.0',
                timestamp: Date.now(),
                history: [{ url: 'https://example.com', title: null, visited_at: 1000 }],
                feedback: [],
                bookmarks: [],
                settings: {},
            };
            (0, vitest_1.expect)(dataManager.validateExportData(validData)).toBe(true);
        });
    });
    (0, vitest_1.describe)('importData', () => {
        (0, vitest_1.it)('should import data in merge mode', async () => {
            const data = {
                version: '1.0.0',
                timestamp: Date.now(),
                history: [{ url: 'https://example.com', title: 'Example', visited_at: 1000 }],
                feedback: [{ url: 'https://example.com', value: 'like', created_at: 1000 }],
                bookmarks: [{ url: 'https://example.com', title: 'Example', createdAt: 1000 }],
                settings: { theme: 'dark' },
            };
            await dataManager.importData(data, 'merge');
            (0, vitest_1.expect)(historyStore.addHistoryEntry).toHaveBeenCalledWith('https://example.com', 'Example');
            (0, vitest_1.expect)(feedbackStore.addFeedback).toHaveBeenCalledWith('https://example.com', 'like');
            (0, vitest_1.expect)(bookmarkStore.addBookmark).toHaveBeenCalledWith('https://example.com', 'Example');
            (0, vitest_1.expect)(settingsStore.updateSettings).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should clear data in replace mode', async () => {
            const data = {
                version: '1.0.0',
                timestamp: Date.now(),
                history: [],
                feedback: [],
                bookmarks: [],
                settings: {},
            };
            await dataManager.importData(data, 'replace');
            (0, vitest_1.expect)(historyStore.clearHistory).toHaveBeenCalled();
            (0, vitest_1.expect)(feedbackStore.clearFeedback).toHaveBeenCalled();
            (0, vitest_1.expect)(bookmarkStore.clearBookmarks).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should reject invalid data', async () => {
            const invalidData = {
                version: 123,
                timestamp: Date.now(),
                history: [],
                feedback: [],
                bookmarks: [],
                settings: {},
            };
            await (0, vitest_1.expect)(dataManager.importData(invalidData, 'merge')).rejects.toThrow('Invalid export data format');
        });
        (0, vitest_1.it)('should import multiple entries', async () => {
            const data = {
                version: '1.0.0',
                timestamp: Date.now(),
                history: [
                    { url: 'https://example1.com', title: 'Example 1', visited_at: 1000 },
                    { url: 'https://example2.com', title: 'Example 2', visited_at: 2000 },
                ],
                feedback: [
                    { url: 'https://example1.com', value: 'like', created_at: 1000 },
                    { url: 'https://example2.com', value: 'dislike', created_at: 2000 },
                ],
                bookmarks: [
                    { url: 'https://example1.com', title: 'Example 1', createdAt: 1000 },
                    { url: 'https://example2.com', title: 'Example 2', createdAt: 2000 },
                ],
                settings: {},
            };
            await dataManager.importData(data, 'merge');
            (0, vitest_1.expect)(historyStore.addHistoryEntry).toHaveBeenCalledTimes(2);
            (0, vitest_1.expect)(feedbackStore.addFeedback).toHaveBeenCalledTimes(2);
            (0, vitest_1.expect)(bookmarkStore.addBookmark).toHaveBeenCalledTimes(2);
        });
        (0, vitest_1.it)('should handle null titles in history during import', async () => {
            const data = {
                version: '1.0.0',
                timestamp: Date.now(),
                history: [{ url: 'https://example.com', title: null, visited_at: 1000 }],
                feedback: [],
                bookmarks: [],
                settings: {},
            };
            await dataManager.importData(data, 'merge');
            (0, vitest_1.expect)(historyStore.addHistoryEntry).toHaveBeenCalledWith('https://example.com', '');
        });
        (0, vitest_1.it)('should reset settings in replace mode', async () => {
            const data = {
                version: '1.0.0',
                timestamp: Date.now(),
                history: [],
                feedback: [],
                bookmarks: [],
                settings: { theme: 'light' },
            };
            await dataManager.importData(data, 'replace');
            (0, vitest_1.expect)(settingsStore.resetSettings).toHaveBeenCalled();
            (0, vitest_1.expect)(settingsStore.updateSettings).toHaveBeenCalled();
        });
    });
});
