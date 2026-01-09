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
(0, vitest_1.describe)('DataManager - Property-Based Tests', () => {
    (0, vitest_1.describe)('Property 7: Data Export-Import Round-Trip', () => {
        (0, vitest_1.it)('should preserve data through export-import cycle', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.array(fast_check_1.default.record({
                url: fast_check_1.default.webUrl(),
                title: fast_check_1.default.oneof(fast_check_1.default.string({ minLength: 1 }), fast_check_1.default.constant(null)),
                visited_at: fast_check_1.default.integer({ min: 1000000000000, max: Date.now() }),
            }), { maxLength: 5, uniqueBy: (x) => x.url }), fast_check_1.default.array(fast_check_1.default.record({
                url: fast_check_1.default.webUrl(),
                value: fast_check_1.default.constantFrom('like', 'dislike'),
                created_at: fast_check_1.default.integer({ min: 1000000000000, max: Date.now() }),
            }), { maxLength: 5, uniqueBy: (x) => x.url }), fast_check_1.default.array(fast_check_1.default.record({
                url: fast_check_1.default.webUrl(),
                title: fast_check_1.default.string({ minLength: 1 }),
                createdAt: fast_check_1.default.integer({ min: 1000000000000, max: Date.now() }),
            }), { maxLength: 5, uniqueBy: (x) => x.url }), async (history, feedback, bookmarks) => {
                // Clear mocks for this iteration
                vitest_1.vi.clearAllMocks();
                // Setup mocks for export
                vitest_1.vi.mocked(historyStore.getAllHistory).mockResolvedValue(history.map((h, i) => ({
                    id: i,
                    url: h.url,
                    title: h.title,
                    visited_at: h.visited_at,
                    visit_count: 1,
                })));
                vitest_1.vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue(feedback.map((f, i) => ({
                    id: i,
                    url: f.url,
                    value: f.value,
                    created_at: f.created_at,
                })));
                vitest_1.vi.mocked(bookmarkStore.getAllBookmarks).mockResolvedValue(bookmarks.map((b, i) => ({
                    id: String(i),
                    url: b.url,
                    title: b.title,
                    createdAt: b.createdAt,
                    updatedAt: b.createdAt,
                })));
                vitest_1.vi.mocked(settingsStore.getSettings).mockReturnValue({
                    theme: 'system',
                    jarvisEnabled: true,
                    useHistoryForRecommendations: true,
                    incognitoEnabled: true,
                    searchEngine: 'google',
                    tabOrder: [],
                    keyboardShortcutsEnabled: true,
                });
                // Export data
                const exported = await dataManager.exportData();
                // Verify export structure
                (0, vitest_1.expect)(exported.version).toBe('1.0.0');
                (0, vitest_1.expect)(exported.timestamp).toBeGreaterThan(0);
                (0, vitest_1.expect)(exported.history).toHaveLength(history.length);
                (0, vitest_1.expect)(exported.feedback).toHaveLength(feedback.length);
                (0, vitest_1.expect)(exported.bookmarks).toHaveLength(bookmarks.length);
                // Verify data is preserved
                for (let i = 0; i < history.length; i++) {
                    (0, vitest_1.expect)(exported.history[i].url).toBe(history[i].url);
                    (0, vitest_1.expect)(exported.history[i].title).toBe(history[i].title);
                    (0, vitest_1.expect)(exported.history[i].visited_at).toBe(history[i].visited_at);
                }
                for (let i = 0; i < feedback.length; i++) {
                    (0, vitest_1.expect)(exported.feedback[i].url).toBe(feedback[i].url);
                    (0, vitest_1.expect)(exported.feedback[i].value).toBe(feedback[i].value);
                    (0, vitest_1.expect)(exported.feedback[i].created_at).toBe(feedback[i].created_at);
                }
                for (let i = 0; i < bookmarks.length; i++) {
                    (0, vitest_1.expect)(exported.bookmarks[i].url).toBe(bookmarks[i].url);
                    (0, vitest_1.expect)(exported.bookmarks[i].title).toBe(bookmarks[i].title);
                    (0, vitest_1.expect)(exported.bookmarks[i].createdAt).toBe(bookmarks[i].createdAt);
                }
                // Verify validation passes
                (0, vitest_1.expect)(dataManager.validateExportData(exported)).toBe(true);
                // Clear mocks before import
                vitest_1.vi.clearAllMocks();
                // Import data
                await dataManager.importData(exported, 'merge');
                // Verify import was called correctly
                (0, vitest_1.expect)(historyStore.addHistoryEntry).toHaveBeenCalledTimes(history.length);
                (0, vitest_1.expect)(feedbackStore.addFeedback).toHaveBeenCalledTimes(feedback.length);
                (0, vitest_1.expect)(bookmarkStore.addBookmark).toHaveBeenCalledTimes(bookmarks.length);
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property: Validation Consistency', () => {
        (0, vitest_1.it)('should consistently validate generated export data', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.array(fast_check_1.default.record({
                url: fast_check_1.default.webUrl(),
                title: fast_check_1.default.oneof(fast_check_1.default.string({ minLength: 1 }), fast_check_1.default.constant(null)),
                visited_at: fast_check_1.default.integer({ min: 1000000000000, max: Date.now() }),
            }), { maxLength: 10 }), fast_check_1.default.array(fast_check_1.default.record({
                url: fast_check_1.default.webUrl(),
                value: fast_check_1.default.constantFrom('like', 'dislike'),
                created_at: fast_check_1.default.integer({ min: 1000000000000, max: Date.now() }),
            }), { maxLength: 10 }), fast_check_1.default.array(fast_check_1.default.record({
                url: fast_check_1.default.webUrl(),
                title: fast_check_1.default.string({ minLength: 1 }),
                createdAt: fast_check_1.default.integer({ min: 1000000000000, max: Date.now() }),
            }), { maxLength: 10 }), (history, feedback, bookmarks) => {
                const data = {
                    version: '1.0.0',
                    timestamp: Date.now(),
                    history,
                    feedback,
                    bookmarks,
                    settings: {},
                };
                // Validation should be idempotent
                const result1 = dataManager.validateExportData(data);
                const result2 = dataManager.validateExportData(data);
                (0, vitest_1.expect)(result1).toBe(result2);
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property: Invalid Data Rejection', () => {
        (0, vitest_1.it)('should reject data with invalid structure', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.oneof(fast_check_1.default.constant(null), fast_check_1.default.constant(undefined), fast_check_1.default.constant('string'), fast_check_1.default.constant(123), fast_check_1.default.constant([]), fast_check_1.default.record({
                version: fast_check_1.default.string(),
                timestamp: fast_check_1.default.integer(),
                history: fast_check_1.default.string(),
                feedback: fast_check_1.default.string(),
                bookmarks: fast_check_1.default.string(),
                settings: fast_check_1.default.string(),
            })), (data) => {
                const result = dataManager.validateExportData(data);
                // Should be false for invalid data
                if (data === null || data === undefined || typeof data !== 'object' || Array.isArray(data)) {
                    (0, vitest_1.expect)(result).toBe(false);
                }
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property: Empty Data Handling', () => {
        (0, vitest_1.it)('should handle empty collections correctly', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.constant(null), () => {
                const data = {
                    version: '1.0.0',
                    timestamp: Date.now(),
                    history: [],
                    feedback: [],
                    bookmarks: [],
                    settings: {},
                };
                (0, vitest_1.expect)(dataManager.validateExportData(data)).toBe(true);
                (0, vitest_1.expect)(data.history).toHaveLength(0);
                (0, vitest_1.expect)(data.feedback).toHaveLength(0);
                (0, vitest_1.expect)(data.bookmarks).toHaveLength(0);
            }), { numRuns: 100 });
        });
    });
});
