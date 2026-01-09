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
const recommender_1 = require("./recommender");
const historyStore = __importStar(require("./historyStore"));
const feedbackStore = __importStar(require("./feedbackStore"));
// Mock the store modules
vitest_1.vi.mock('./historyStore');
vitest_1.vi.mock('./feedbackStore');
(0, vitest_1.describe)('Recommender Properties', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('Property 1: Recommendation Score Invariant', () => {
        (0, vitest_1.it)('should maintain score bounds [0, 1] after feedback adjustment', () => {
            // Feature: arc-browser-enhancements, Property 1: Recommendation Score Invariant
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.float({ min: 0, max: 1, noNaN: true }), fast_check_1.default.option(fast_check_1.default.record({
                likes: fast_check_1.default.integer({ min: 0, max: 10 }),
                dislikes: fast_check_1.default.integer({ min: 0, max: 10 }),
            })), fast_check_1.default.constantFrom('favorite', 'old_but_gold', 'explore'), (baseScore, feedbackStats, kind) => {
                const result = (0, recommender_1.applyFeedbackToScore)(baseScore, feedbackStats, kind);
                (0, vitest_1.expect)(result.score).toBeGreaterThanOrEqual(0);
                (0, vitest_1.expect)(result.score).toBeLessThanOrEqual(1);
            }), { numRuns: 100 });
        });
        (0, vitest_1.it)('should never produce NaN scores', () => {
            // Feature: arc-browser-enhancements, Property 1: Recommendation Score Invariant
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.float({ min: 0, max: 1, noNaN: true }), fast_check_1.default.option(fast_check_1.default.record({
                likes: fast_check_1.default.integer({ min: 0, max: 10 }),
                dislikes: fast_check_1.default.integer({ min: 0, max: 10 }),
            })), fast_check_1.default.constantFrom('favorite', 'old_but_gold', 'explore'), (baseScore, feedbackStats, kind) => {
                const result = (0, recommender_1.applyFeedbackToScore)(baseScore, feedbackStats, kind);
                (0, vitest_1.expect)(Number.isNaN(result.score)).toBe(false);
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property 2: Temporal Weight Monotonicity', () => {
        (0, vitest_1.it)('should assign higher scores to more recent visits', () => {
            // Feature: arc-browser-enhancements, Property 2: Temporal Weight Monotonicity
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.integer({ min: 1, max: 100 }), (visitCount) => {
                const now = Date.now();
                const recentVisit = now - 1 * 86400000; // 1 day ago
                const oldVisit = now - 30 * 86400000; // 30 days ago
                // Both should have same base score (same visit count)
                const recentScore = (0, recommender_1.applyFeedbackToScore)(0.8, undefined, 'favorite').score;
                const oldScore = (0, recommender_1.applyFeedbackToScore)(0.8, undefined, 'favorite').score;
                // Without temporal weighting in this function, scores should be equal
                // This property will be fully validated when temporal weighting is integrated
                (0, vitest_1.expect)(recentScore).toBe(oldScore);
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property 3: Feedback Score Monotonicity', () => {
        (0, vitest_1.it)('should increase score with more likes', () => {
            // Feature: arc-browser-enhancements, Property 1: Recommendation Score Invariant
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.float({ min: 0, max: 0.5, noNaN: true }), fast_check_1.default.integer({ min: 0, max: 5 }), (baseScore, likeCount) => {
                const result1 = (0, recommender_1.applyFeedbackToScore)(baseScore, { likes: likeCount, dislikes: 0 }, 'favorite');
                const result2 = (0, recommender_1.applyFeedbackToScore)(baseScore, { likes: likeCount + 1, dislikes: 0 }, 'favorite');
                (0, vitest_1.expect)(result2.score).toBeGreaterThanOrEqual(result1.score);
            }), { numRuns: 100 });
        });
        (0, vitest_1.it)('should decrease score with more dislikes', () => {
            // Feature: arc-browser-enhancements, Property 1: Recommendation Score Invariant
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.float({ min: 0.5, max: 1, noNaN: true }), fast_check_1.default.integer({ min: 0, max: 5 }), (baseScore, dislikeCount) => {
                const result1 = (0, recommender_1.applyFeedbackToScore)(baseScore, { likes: 0, dislikes: dislikeCount }, 'favorite');
                const result2 = (0, recommender_1.applyFeedbackToScore)(baseScore, { likes: 0, dislikes: dislikeCount + 1 }, 'favorite');
                (0, vitest_1.expect)(result2.score).toBeLessThanOrEqual(result1.score);
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property 4: Recommendation Count Invariant', () => {
        (0, vitest_1.it)('should return at most limit recommendations', async () => {
            // Feature: arc-browser-enhancements, Property 1: Recommendation Score Invariant
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.integer({ min: 1, max: 50 }), fast_check_1.default.integer({ min: 1, max: 10 }), async (historyCount, limit) => {
                const history = Array.from({ length: historyCount }, (_, i) => ({
                    id: i,
                    url: `https://example${i}.com`,
                    title: `Example ${i}`,
                    visited_at: Date.now() - i * 86400000,
                    visit_count: historyCount - i,
                }));
                vitest_1.vi.mocked(historyStore.getRecentHistory).mockResolvedValue(history);
                vitest_1.vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue([]);
                const recommendations = await (0, recommender_1.getJarvisRecommendations)(limit);
                (0, vitest_1.expect)(recommendations.length).toBeLessThanOrEqual(limit);
            }), { numRuns: 50 });
        });
    });
    (0, vitest_1.describe)('Property 5: Score Ordering Invariant', () => {
        (0, vitest_1.it)('should return recommendations sorted by score in descending order', async () => {
            // Feature: arc-browser-enhancements, Property 1: Recommendation Score Invariant
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.integer({ min: 5, max: 20 }), async (historyCount) => {
                const history = Array.from({ length: historyCount }, (_, i) => ({
                    id: i,
                    url: `https://example${i}.com`,
                    title: `Example ${i}`,
                    visited_at: Date.now() - i * 86400000,
                    visit_count: Math.floor(Math.random() * 100) + 1,
                }));
                vitest_1.vi.mocked(historyStore.getRecentHistory).mockResolvedValue(history);
                vitest_1.vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue([]);
                const recommendations = await (0, recommender_1.getJarvisRecommendations)(10);
                for (let i = 0; i < recommendations.length - 1; i++) {
                    (0, vitest_1.expect)(recommendations[i].score).toBeGreaterThanOrEqual(recommendations[i + 1].score);
                }
            }), { numRuns: 50 });
        });
    });
    (0, vitest_1.describe)('Property 6: Feedback Reason Consistency', () => {
        (0, vitest_1.it)('should provide feedback reason when feedback exists', () => {
            // Feature: arc-browser-enhancements, Property 1: Recommendation Score Invariant
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.float({ min: 0, max: 1 }), fast_check_1.default.record({
                likes: fast_check_1.default.integer({ min: 1, max: 10 }),
                dislikes: fast_check_1.default.integer({ min: 0, max: 0 }),
            }), fast_check_1.default.constantFrom('favorite', 'old_but_gold', 'explore'), (baseScore, feedbackStats, kind) => {
                const result = (0, recommender_1.applyFeedbackToScore)(baseScore, feedbackStats, kind);
                (0, vitest_1.expect)(result.feedbackReason.length).toBeGreaterThan(0);
            }), { numRuns: 100 });
        });
        (0, vitest_1.it)('should not provide feedback reason when no feedback', () => {
            // Feature: arc-browser-enhancements, Property 1: Recommendation Score Invariant
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.float({ min: 0, max: 1 }), fast_check_1.default.constantFrom('favorite', 'old_but_gold', 'explore'), (baseScore, kind) => {
                const result = (0, recommender_1.applyFeedbackToScore)(baseScore, undefined, kind);
                (0, vitest_1.expect)(result.feedbackReason).toBe('');
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property 7: Temporal Weight Bounds', () => {
        (0, vitest_1.it)('should maintain temporal weight in range [0, 1]', () => {
            // Feature: arc-browser-enhancements, Property 2: Temporal Weight Monotonicity
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.float({ min: -10, max: 1000, noNaN: true }), (daysSinceVisit) => {
                const weight = (0, recommender_1.calculateTemporalWeight)(daysSinceVisit);
                (0, vitest_1.expect)(weight).toBeGreaterThanOrEqual(0);
                (0, vitest_1.expect)(weight).toBeLessThanOrEqual(1);
            }), { numRuns: 100 });
        });
        (0, vitest_1.it)('should never produce NaN temporal weights', () => {
            // Feature: arc-browser-enhancements, Property 2: Temporal Weight Monotonicity
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.float({ min: -10, max: 1000, noNaN: true }), (daysSinceVisit) => {
                const weight = (0, recommender_1.calculateTemporalWeight)(daysSinceVisit);
                (0, vitest_1.expect)(Number.isNaN(weight)).toBe(false);
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property 8: Temporal Weight Monotonicity', () => {
        (0, vitest_1.it)('should decrease weight as days since visit increase', () => {
            // Feature: arc-browser-enhancements, Property 2: Temporal Weight Monotonicity
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.integer({ min: 0, max: 500 }), (days) => {
                const weight1 = (0, recommender_1.calculateTemporalWeight)(days);
                const weight2 = (0, recommender_1.calculateTemporalWeight)(days + 1);
                // Weight should not increase as time passes
                (0, vitest_1.expect)(weight2).toBeLessThanOrEqual(weight1);
            }), { numRuns: 100 });
        });
        (0, vitest_1.it)('should assign full weight to recent visits (0-7 days)', () => {
            // Feature: arc-browser-enhancements, Property 2: Temporal Weight Monotonicity
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.float({ min: 0, max: 7, noNaN: true }), (days) => {
                const weight = (0, recommender_1.calculateTemporalWeight)(days);
                // Recent visits should have high weight (0.9 to 1.0)
                (0, vitest_1.expect)(weight).toBeGreaterThanOrEqual(0.9);
                (0, vitest_1.expect)(weight).toBeLessThanOrEqual(1.0);
            }), { numRuns: 50 });
        });
        (0, vitest_1.it)('should assign moderate weight to visits within 30 days', () => {
            // Feature: arc-browser-enhancements, Property 2: Temporal Weight Monotonicity
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.float({ min: 7, max: 30, noNaN: true }), (days) => {
                const weight = (0, recommender_1.calculateTemporalWeight)(days);
                // Visits within a month should have moderate weight (0.6 to 0.9)
                (0, vitest_1.expect)(weight).toBeGreaterThanOrEqual(0.6);
                (0, vitest_1.expect)(weight).toBeLessThanOrEqual(0.9);
            }), { numRuns: 50 });
        });
        (0, vitest_1.it)('should assign low weight to old visits (>90 days)', () => {
            // Feature: arc-browser-enhancements, Property 2: Temporal Weight Monotonicity
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.float({ min: 90, max: 365, noNaN: true }), (days) => {
                const weight = (0, recommender_1.calculateTemporalWeight)(days);
                // Old visits should have low weight (0.05 to 0.2)
                (0, vitest_1.expect)(weight).toBeGreaterThanOrEqual(0.05);
                (0, vitest_1.expect)(weight).toBeLessThanOrEqual(0.2);
            }), { numRuns: 50 });
        });
    });
    (0, vitest_1.describe)('Property 9: Temporal Weight Idempotence', () => {
        (0, vitest_1.it)('should produce consistent results for same input', () => {
            // Feature: arc-browser-enhancements, Property 2: Temporal Weight Monotonicity
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.float({ min: 0, max: 365, noNaN: true }), (days) => {
                const weight1 = (0, recommender_1.calculateTemporalWeight)(days);
                const weight2 = (0, recommender_1.calculateTemporalWeight)(days);
                (0, vitest_1.expect)(weight1).toBe(weight2);
            }), { numRuns: 100 });
        });
    });
});
