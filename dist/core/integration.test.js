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
const historyStore = __importStar(require("./historyStore"));
const bookmarkStore = __importStar(require("./bookmarkStore"));
const feedbackStore = __importStar(require("./feedbackStore"));
const settingsStore = __importStar(require("./settingsStore"));
const recommender_1 = require("./recommender");
const searchEngineManager_1 = require("./searchEngineManager");
(0, vitest_1.describe)('Integration Tests - API Contracts', () => {
    (0, vitest_1.describe)('History Store API', () => {
        (0, vitest_1.it)('should have required history store methods', () => {
            (0, vitest_1.expect)(typeof historyStore.addHistoryEntry).toBe('function');
            (0, vitest_1.expect)(typeof historyStore.getAllHistory).toBe('function');
            (0, vitest_1.expect)(typeof historyStore.getRecentHistory).toBe('function');
            (0, vitest_1.expect)(typeof historyStore.clearHistory).toBe('function');
            (0, vitest_1.expect)(typeof historyStore.removeHistoryEntry).toBe('function');
            (0, vitest_1.expect)(typeof historyStore.searchHistory).toBe('function');
        });
        (0, vitest_1.it)('should return correct types from history store', async () => {
            const entry = historyStore.addHistoryEntry('https://example.com', 'Example');
            (0, vitest_1.expect)(entry).toHaveProperty('id');
            (0, vitest_1.expect)(entry).toHaveProperty('url');
            (0, vitest_1.expect)(entry).toHaveProperty('title');
            (0, vitest_1.expect)(entry).toHaveProperty('visited_at');
            (0, vitest_1.expect)(entry).toHaveProperty('visit_count');
            const history = await historyStore.getAllHistory();
            (0, vitest_1.expect)(Array.isArray(history)).toBe(true);
        });
    });
    (0, vitest_1.describe)('Bookmark Store API', () => {
        (0, vitest_1.it)('should have required bookmark store methods', () => {
            (0, vitest_1.expect)(typeof bookmarkStore.addBookmark).toBe('function');
            (0, vitest_1.expect)(typeof bookmarkStore.removeBookmark).toBe('function');
            (0, vitest_1.expect)(typeof bookmarkStore.getAllBookmarks).toBe('function');
            (0, vitest_1.expect)(typeof bookmarkStore.searchBookmarks).toBe('function');
            (0, vitest_1.expect)(typeof bookmarkStore.isBookmarked).toBe('function');
            (0, vitest_1.expect)(typeof bookmarkStore.clearBookmarks).toBe('function');
        });
        (0, vitest_1.it)('should return correct types from bookmark store', async () => {
            const bookmark = bookmarkStore.addBookmark('https://example.com', 'Example');
            (0, vitest_1.expect)(bookmark).toHaveProperty('id');
            (0, vitest_1.expect)(bookmark).toHaveProperty('url');
            (0, vitest_1.expect)(bookmark).toHaveProperty('title');
            (0, vitest_1.expect)(bookmark).toHaveProperty('createdAt');
            (0, vitest_1.expect)(bookmark).toHaveProperty('updatedAt');
            const bookmarks = await bookmarkStore.getAllBookmarks();
            (0, vitest_1.expect)(Array.isArray(bookmarks)).toBe(true);
        });
    });
    (0, vitest_1.describe)('Feedback Store API', () => {
        (0, vitest_1.it)('should have required feedback store methods', () => {
            (0, vitest_1.expect)(typeof feedbackStore.addFeedback).toBe('function');
            (0, vitest_1.expect)(typeof feedbackStore.getAllFeedback).toBe('function');
            (0, vitest_1.expect)(typeof feedbackStore.getFeedbackByUrl).toBe('function');
            (0, vitest_1.expect)(typeof feedbackStore.clearFeedback).toBe('function');
            (0, vitest_1.expect)(typeof feedbackStore.removeFeedback).toBe('function');
            (0, vitest_1.expect)(typeof feedbackStore.getFeedbackStats).toBe('function');
        });
        (0, vitest_1.it)('should return correct types from feedback store', async () => {
            const feedback = feedbackStore.addFeedback('https://example.com', 'like');
            (0, vitest_1.expect)(feedback).toHaveProperty('id');
            (0, vitest_1.expect)(feedback).toHaveProperty('url');
            (0, vitest_1.expect)(feedback).toHaveProperty('value');
            (0, vitest_1.expect)(feedback).toHaveProperty('created_at');
            const allFeedback = await feedbackStore.getAllFeedback();
            (0, vitest_1.expect)(Array.isArray(allFeedback)).toBe(true);
        });
    });
    (0, vitest_1.describe)('Settings Store API', () => {
        (0, vitest_1.it)('should have required settings store methods', () => {
            (0, vitest_1.expect)(typeof settingsStore.getSettings).toBe('function');
            (0, vitest_1.expect)(typeof settingsStore.updateSettings).toBe('function');
            (0, vitest_1.expect)(typeof settingsStore.getSetting).toBe('function');
            (0, vitest_1.expect)(typeof settingsStore.updateSetting).toBe('function');
            (0, vitest_1.expect)(typeof settingsStore.resetSettings).toBe('function');
        });
        (0, vitest_1.it)('should return correct types from settings store', () => {
            const settings = settingsStore.getSettings();
            (0, vitest_1.expect)(settings).toHaveProperty('theme');
            (0, vitest_1.expect)(settings).toHaveProperty('jarvisEnabled');
            (0, vitest_1.expect)(settings).toHaveProperty('useHistoryForRecommendations');
            (0, vitest_1.expect)(settings).toHaveProperty('incognitoEnabled');
        });
    });
    (0, vitest_1.describe)('Recommender API', () => {
        (0, vitest_1.it)('should have recommender function', () => {
            (0, vitest_1.expect)(typeof recommender_1.getJarvisRecommendations).toBe('function');
        });
        (0, vitest_1.it)('should return recommendations with correct structure', async () => {
            const recommendations = await (0, recommender_1.getJarvisRecommendations)(5);
            (0, vitest_1.expect)(Array.isArray(recommendations)).toBe(true);
            if (recommendations.length > 0) {
                const rec = recommendations[0];
                (0, vitest_1.expect)(rec).toHaveProperty('id');
                (0, vitest_1.expect)(rec).toHaveProperty('url');
                (0, vitest_1.expect)(rec).toHaveProperty('title');
                (0, vitest_1.expect)(rec).toHaveProperty('reason');
                (0, vitest_1.expect)(rec).toHaveProperty('score');
                (0, vitest_1.expect)(rec).toHaveProperty('kind');
            }
        });
    });
    (0, vitest_1.describe)('Search Engine Manager API', () => {
        (0, vitest_1.it)('should have search query detection', () => {
            (0, vitest_1.expect)(typeof searchEngineManager_1.isSearchQuery).toBe('function');
            (0, vitest_1.expect)(typeof searchEngineManager_1.buildSearchUrl).toBe('function');
        });
        (0, vitest_1.it)('should detect search queries correctly', () => {
            (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)('hello world')).toBe(true);
            (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)('https://example.com')).toBe(false);
            (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)('example.com')).toBe(false);
        });
        (0, vitest_1.it)('should build search URLs correctly', () => {
            const url = (0, searchEngineManager_1.buildSearchUrl)('test query', 'google');
            (0, vitest_1.expect)(url).toContain('google.com');
            (0, vitest_1.expect)(url).toContain('test%20query');
        });
    });
    (0, vitest_1.describe)('Cross-Component Integration', () => {
        (0, vitest_1.it)('should support complete workflow: add history, bookmark, feedback, get recommendations', async () => {
            // Add history
            const historyEntry = historyStore.addHistoryEntry('https://example.com', 'Example');
            (0, vitest_1.expect)(historyEntry).toBeDefined();
            // Add bookmark
            const bookmark = bookmarkStore.addBookmark('https://example.com', 'Example');
            (0, vitest_1.expect)(bookmark).toBeDefined();
            // Add feedback
            const feedback = feedbackStore.addFeedback('https://example.com', 'like');
            (0, vitest_1.expect)(feedback).toBeDefined();
            // Get recommendations
            const recommendations = await (0, recommender_1.getJarvisRecommendations)(5);
            (0, vitest_1.expect)(Array.isArray(recommendations)).toBe(true);
        });
        (0, vitest_1.it)('should support search workflow: detect query, build URL', () => {
            const query = 'test search';
            const isSearch = (0, searchEngineManager_1.isSearchQuery)(query);
            (0, vitest_1.expect)(isSearch).toBe(true);
            if (isSearch) {
                const url = (0, searchEngineManager_1.buildSearchUrl)(query, 'google');
                (0, vitest_1.expect)(url).toBeDefined();
                (0, vitest_1.expect)(url.length).toBeGreaterThan(0);
            }
        });
        (0, vitest_1.it)('should support settings workflow: get, update, reset', () => {
            // Get initial settings
            const initial = settingsStore.getSettings();
            (0, vitest_1.expect)(initial).toBeDefined();
            // Update settings
            const updated = settingsStore.updateSettings({ theme: 'dark' });
            (0, vitest_1.expect)(updated.theme).toBe('dark');
            // Reset settings
            const reset = settingsStore.resetSettings();
            (0, vitest_1.expect)(reset.theme).toBe('system');
        });
    });
});
