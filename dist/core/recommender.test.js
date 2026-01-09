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
const recommender_1 = require("./recommender");
const historyStore = __importStar(require("./historyStore"));
const feedbackStore = __importStar(require("./feedbackStore"));
// Mock the store modules
vitest_1.vi.mock('./historyStore');
vitest_1.vi.mock('./feedbackStore');
(0, vitest_1.describe)('Recommender Module', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('extractDomain', () => {
        (0, vitest_1.it)('should extract domain from valid URL', () => {
            const domain = (0, recommender_1.extractDomain)('https://github.com/user/repo');
            (0, vitest_1.expect)(domain).toBe('github.com');
        });
        (0, vitest_1.it)('should handle URLs with different protocols', () => {
            (0, vitest_1.expect)((0, recommender_1.extractDomain)('http://example.com')).toBe('example.com');
            (0, vitest_1.expect)((0, recommender_1.extractDomain)('https://example.com')).toBe('example.com');
        });
        (0, vitest_1.it)('should handle URLs with subdomains', () => {
            const domain = (0, recommender_1.extractDomain)('https://api.github.com');
            (0, vitest_1.expect)(domain).toBe('api.github.com');
        });
        (0, vitest_1.it)('should return original string for invalid URLs', () => {
            const invalidUrl = 'not a url';
            (0, vitest_1.expect)((0, recommender_1.extractDomain)(invalidUrl)).toBe(invalidUrl);
        });
        (0, vitest_1.it)('should handle URLs with ports', () => {
            const domain = (0, recommender_1.extractDomain)('https://localhost:3000');
            (0, vitest_1.expect)(domain).toBe('localhost');
        });
    });
    (0, vitest_1.describe)('extractKeywords', () => {
        (0, vitest_1.it)('should extract keywords from string', () => {
            const keywords = (0, recommender_1.extractKeywords)('GitHub is a platform for developers');
            (0, vitest_1.expect)(keywords.has('github')).toBe(true);
            (0, vitest_1.expect)(keywords.has('platform')).toBe(true);
            (0, vitest_1.expect)(keywords.has('developers')).toBe(true);
        });
        (0, vitest_1.it)('should filter out short words', () => {
            const keywords = (0, recommender_1.extractKeywords)('a is the best');
            (0, vitest_1.expect)(keywords.size).toBe(1);
            (0, vitest_1.expect)(keywords.has('best')).toBe(true);
        });
        (0, vitest_1.it)('should convert to lowercase', () => {
            const keywords = (0, recommender_1.extractKeywords)('GitHub PLATFORM');
            (0, vitest_1.expect)(keywords.has('github')).toBe(true);
            (0, vitest_1.expect)(keywords.has('platform')).toBe(true);
        });
        (0, vitest_1.it)('should handle special characters', () => {
            const keywords = (0, recommender_1.extractKeywords)('hello-world, test@example.com');
            (0, vitest_1.expect)(keywords.has('hello')).toBe(true);
            (0, vitest_1.expect)(keywords.has('world')).toBe(true);
            (0, vitest_1.expect)(keywords.has('test')).toBe(true);
        });
        (0, vitest_1.it)('should return empty set for empty string', () => {
            const keywords = (0, recommender_1.extractKeywords)('');
            (0, vitest_1.expect)(keywords.size).toBe(0);
        });
    });
    (0, vitest_1.describe)('buildFeedbackMap', () => {
        (0, vitest_1.it)('should build feedback map from feedback entries', () => {
            const feedback = [
                { id: 1, url: 'https://github.com', value: 'like', created_at: Date.now() },
                { id: 2, url: 'https://github.com', value: 'like', created_at: Date.now() },
                { id: 3, url: 'https://example.com', value: 'dislike', created_at: Date.now() },
            ];
            const map = (0, recommender_1.buildFeedbackMap)(feedback);
            (0, vitest_1.expect)(map.get('https://github.com')).toEqual({ likes: 2, dislikes: 0 });
            (0, vitest_1.expect)(map.get('https://example.com')).toEqual({ likes: 0, dislikes: 1 });
        });
        (0, vitest_1.it)('should handle mixed feedback for same URL', () => {
            const feedback = [
                { id: 1, url: 'https://github.com', value: 'like', created_at: Date.now() },
                { id: 2, url: 'https://github.com', value: 'dislike', created_at: Date.now() },
            ];
            const map = (0, recommender_1.buildFeedbackMap)(feedback);
            (0, vitest_1.expect)(map.get('https://github.com')).toEqual({ likes: 1, dislikes: 1 });
        });
        (0, vitest_1.it)('should return empty map for empty feedback', () => {
            const map = (0, recommender_1.buildFeedbackMap)([]);
            (0, vitest_1.expect)(map.size).toBe(0);
        });
    });
    (0, vitest_1.describe)('applyFeedbackToScore', () => {
        (0, vitest_1.it)('should not modify score when no feedback', () => {
            const result = (0, recommender_1.applyFeedbackToScore)(0.5, undefined, 'favorite');
            (0, vitest_1.expect)(result.score).toBe(0.5);
            (0, vitest_1.expect)(result.feedbackReason).toBe('');
        });
        (0, vitest_1.it)('should increase score for positive feedback', () => {
            const result = (0, recommender_1.applyFeedbackToScore)(0.5, { likes: 1, dislikes: 0 }, 'favorite');
            (0, vitest_1.expect)(result.score).toBeGreaterThan(0.5);
            (0, vitest_1.expect)(result.feedbackReason).toContain('liked');
        });
        (0, vitest_1.it)('should decrease score for negative feedback', () => {
            const result = (0, recommender_1.applyFeedbackToScore)(0.5, { likes: 0, dislikes: 1 }, 'favorite');
            (0, vitest_1.expect)(result.score).toBeLessThan(0.5);
            (0, vitest_1.expect)(result.feedbackReason).toContain('disliked');
        });
        (0, vitest_1.it)('should heavily penalize strong negative feedback', () => {
            const result = (0, recommender_1.applyFeedbackToScore)(0.8, { likes: 0, dislikes: 2 }, 'favorite');
            (0, vitest_1.expect)(result.score).toBeLessThan(0.1);
            (0, vitest_1.expect)(result.feedbackReason).toContain('Muting');
        });
        (0, vitest_1.it)('should handle mixed feedback', () => {
            const result = (0, recommender_1.applyFeedbackToScore)(0.5, { likes: 2, dislikes: 1 }, 'favorite');
            (0, vitest_1.expect)(result.score).toBeGreaterThan(0.5);
            (0, vitest_1.expect)(result.feedbackReason).toContain('Mixed');
        });
        (0, vitest_1.it)('should never return negative score', () => {
            const result = (0, recommender_1.applyFeedbackToScore)(0.1, { likes: 0, dislikes: 5 }, 'favorite');
            (0, vitest_1.expect)(result.score).toBeGreaterThanOrEqual(0);
        });
    });
    (0, vitest_1.describe)('getJarvisRecommendations', () => {
        (0, vitest_1.it)('should return empty array when history is empty', async () => {
            vitest_1.vi.mocked(historyStore.getRecentHistory).mockResolvedValue([]);
            vitest_1.vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue([]);
            const recommendations = await (0, recommender_1.getJarvisRecommendations)();
            (0, vitest_1.expect)(recommendations).toEqual([]);
        });
        (0, vitest_1.it)('should return recommendations for single history entry', async () => {
            const history = [
                {
                    id: 1,
                    url: 'https://github.com',
                    title: 'GitHub',
                    visited_at: Date.now(),
                    visit_count: 10,
                },
            ];
            vitest_1.vi.mocked(historyStore.getRecentHistory).mockResolvedValue(history);
            vitest_1.vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue([]);
            const recommendations = await (0, recommender_1.getJarvisRecommendations)(5);
            (0, vitest_1.expect)(recommendations.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(recommendations[0].url).toBe('https://github.com');
        });
        (0, vitest_1.it)('should respect limit parameter', async () => {
            const history = Array.from({ length: 20 }, (_, i) => ({
                id: i,
                url: `https://example${i}.com`,
                title: `Example ${i}`,
                visited_at: Date.now() - i * 86400000,
                visit_count: 20 - i,
            }));
            vitest_1.vi.mocked(historyStore.getRecentHistory).mockResolvedValue(history);
            vitest_1.vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue([]);
            const recommendations = await (0, recommender_1.getJarvisRecommendations)(3);
            (0, vitest_1.expect)(recommendations.length).toBeLessThanOrEqual(3);
        });
        (0, vitest_1.it)('should categorize recommendations by kind', async () => {
            const now = Date.now();
            const history = [
                {
                    id: 1,
                    url: 'https://github.com',
                    title: 'GitHub',
                    visited_at: now,
                    visit_count: 50,
                },
                {
                    id: 2,
                    url: 'https://example.com',
                    title: 'Example',
                    visited_at: now - 30 * 86400000, // 30 days ago
                    visit_count: 40,
                },
            ];
            vitest_1.vi.mocked(historyStore.getRecentHistory).mockResolvedValue(history);
            vitest_1.vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue([]);
            const recommendations = await (0, recommender_1.getJarvisRecommendations)(10);
            const kinds = recommendations.map(r => r.kind);
            (0, vitest_1.expect)(kinds).toContain('favorite');
        });
        (0, vitest_1.it)('should filter out heavily disliked sites', async () => {
            const history = [
                {
                    id: 1,
                    url: 'https://github.com',
                    title: 'GitHub',
                    visited_at: Date.now(),
                    visit_count: 10,
                },
                {
                    id: 2,
                    url: 'https://disliked.com',
                    title: 'Disliked',
                    visited_at: Date.now(),
                    visit_count: 5,
                },
            ];
            const feedback = [
                { id: 1, url: 'https://disliked.com', value: 'dislike', created_at: Date.now() },
                { id: 2, url: 'https://disliked.com', value: 'dislike', created_at: Date.now() },
            ];
            vitest_1.vi.mocked(historyStore.getRecentHistory).mockResolvedValue(history);
            vitest_1.vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue(feedback);
            const recommendations = await (0, recommender_1.getJarvisRecommendations)(10);
            const urls = recommendations.map(r => r.url);
            (0, vitest_1.expect)(urls).not.toContain('https://disliked.com');
        });
        (0, vitest_1.it)('should sort recommendations by score', async () => {
            const history = [
                {
                    id: 1,
                    url: 'https://github.com',
                    title: 'GitHub',
                    visited_at: Date.now(),
                    visit_count: 50,
                },
                {
                    id: 2,
                    url: 'https://example.com',
                    title: 'Example',
                    visited_at: Date.now(),
                    visit_count: 10,
                },
            ];
            vitest_1.vi.mocked(historyStore.getRecentHistory).mockResolvedValue(history);
            vitest_1.vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue([]);
            const recommendations = await (0, recommender_1.getJarvisRecommendations)(10);
            for (let i = 0; i < recommendations.length - 1; i++) {
                (0, vitest_1.expect)(recommendations[i].score).toBeGreaterThanOrEqual(recommendations[i + 1].score);
            }
        });
    });
});
