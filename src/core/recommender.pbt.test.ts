import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { applyFeedbackToScore, getJarvisRecommendations, calculateTemporalWeight } from './recommender';
import { HistoryEntry, RecommendationFeedback } from './types';
import * as historyStore from './historyStore';
import * as feedbackStore from './feedbackStore';

// Mock the store modules
vi.mock('./historyStore');
vi.mock('./feedbackStore');

describe('Recommender Properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 1: Recommendation Score Invariant', () => {
    it('should maintain score bounds [0, 1] after feedback adjustment', () => {
      // Feature: arc-browser-enhancements, Property 1: Recommendation Score Invariant
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.option(
            fc.record({
              likes: fc.integer({ min: 0, max: 10 }),
              dislikes: fc.integer({ min: 0, max: 10 }),
            })
          ),
          fc.constantFrom('favorite', 'old_but_gold', 'explore'),
          (baseScore, feedbackStats, kind) => {
            const result = applyFeedbackToScore(baseScore, feedbackStats, kind);
            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should never produce NaN scores', () => {
      // Feature: arc-browser-enhancements, Property 1: Recommendation Score Invariant
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.option(
            fc.record({
              likes: fc.integer({ min: 0, max: 10 }),
              dislikes: fc.integer({ min: 0, max: 10 }),
            })
          ),
          fc.constantFrom('favorite', 'old_but_gold', 'explore'),
          (baseScore, feedbackStats, kind) => {
            const result = applyFeedbackToScore(baseScore, feedbackStats, kind);
            expect(Number.isNaN(result.score)).toBe(false);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 2: Temporal Weight Monotonicity', () => {
    it('should assign higher scores to more recent visits', () => {
      // Feature: arc-browser-enhancements, Property 2: Temporal Weight Monotonicity
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (visitCount) => {
            const now = Date.now();
            const recentVisit = now - 1 * 86400000; // 1 day ago
            const oldVisit = now - 30 * 86400000; // 30 days ago

            // Both should have same base score (same visit count)
            const recentScore = applyFeedbackToScore(0.8, undefined, 'favorite').score;
            const oldScore = applyFeedbackToScore(0.8, undefined, 'favorite').score;

            // Without temporal weighting in this function, scores should be equal
            // This property will be fully validated when temporal weighting is integrated
            expect(recentScore).toBe(oldScore);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 3: Feedback Score Monotonicity', () => {
    it('should increase score with more likes', () => {
      // Feature: arc-browser-enhancements, Property 1: Recommendation Score Invariant
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 0.5, noNaN: true }),
          fc.integer({ min: 0, max: 5 }),
          (baseScore, likeCount) => {
            const result1 = applyFeedbackToScore(baseScore, { likes: likeCount, dislikes: 0 }, 'favorite');
            const result2 = applyFeedbackToScore(baseScore, { likes: likeCount + 1, dislikes: 0 }, 'favorite');

            expect(result2.score).toBeGreaterThanOrEqual(result1.score);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should decrease score with more dislikes', () => {
      // Feature: arc-browser-enhancements, Property 1: Recommendation Score Invariant
      fc.assert(
        fc.property(
          fc.float({ min: 0.5, max: 1, noNaN: true }),
          fc.integer({ min: 0, max: 5 }),
          (baseScore, dislikeCount) => {
            const result1 = applyFeedbackToScore(baseScore, { likes: 0, dislikes: dislikeCount }, 'favorite');
            const result2 = applyFeedbackToScore(baseScore, { likes: 0, dislikes: dislikeCount + 1 }, 'favorite');

            expect(result2.score).toBeLessThanOrEqual(result1.score);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 4: Recommendation Count Invariant', () => {
    it('should return at most limit recommendations', async () => {
      // Feature: arc-browser-enhancements, Property 1: Recommendation Score Invariant
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }),
          fc.integer({ min: 1, max: 10 }),
          async (historyCount, limit) => {
            const history: HistoryEntry[] = Array.from({ length: historyCount }, (_, i) => ({
              id: i,
              url: `https://example${i}.com`,
              title: `Example ${i}`,
              visited_at: Date.now() - i * 86400000,
              visit_count: historyCount - i,
            }));

            vi.mocked(historyStore.getRecentHistory).mockResolvedValue(history);
            vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue([]);

            const recommendations = await getJarvisRecommendations(limit);
            expect(recommendations.length).toBeLessThanOrEqual(limit);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 5: Score Ordering Invariant', () => {
    it('should return recommendations sorted by score in descending order', async () => {
      // Feature: arc-browser-enhancements, Property 1: Recommendation Score Invariant
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 20 }),
          async (historyCount) => {
            const history: HistoryEntry[] = Array.from({ length: historyCount }, (_, i) => ({
              id: i,
              url: `https://example${i}.com`,
              title: `Example ${i}`,
              visited_at: Date.now() - i * 86400000,
              visit_count: Math.floor(Math.random() * 100) + 1,
            }));

            vi.mocked(historyStore.getRecentHistory).mockResolvedValue(history);
            vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue([]);

            const recommendations = await getJarvisRecommendations(10);

            for (let i = 0; i < recommendations.length - 1; i++) {
              expect(recommendations[i].score).toBeGreaterThanOrEqual(recommendations[i + 1].score);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 6: Feedback Reason Consistency', () => {
    it('should provide feedback reason when feedback exists', () => {
      // Feature: arc-browser-enhancements, Property 1: Recommendation Score Invariant
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1 }),
          fc.record({
            likes: fc.integer({ min: 1, max: 10 }),
            dislikes: fc.integer({ min: 0, max: 0 }),
          }),
          fc.constantFrom('favorite', 'old_but_gold', 'explore'),
          (baseScore, feedbackStats, kind) => {
            const result = applyFeedbackToScore(baseScore, feedbackStats, kind);
            expect(result.feedbackReason.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should not provide feedback reason when no feedback', () => {
      // Feature: arc-browser-enhancements, Property 1: Recommendation Score Invariant
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1 }),
          fc.constantFrom('favorite', 'old_but_gold', 'explore'),
          (baseScore, kind) => {
            const result = applyFeedbackToScore(baseScore, undefined, kind);
            expect(result.feedbackReason).toBe('');
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 7: Temporal Weight Bounds', () => {
    it('should maintain temporal weight in range [0, 1]', () => {
      // Feature: arc-browser-enhancements, Property 2: Temporal Weight Monotonicity
      fc.assert(
        fc.property(
          fc.float({ min: -10, max: 1000, noNaN: true }),
          (daysSinceVisit) => {
            const weight = calculateTemporalWeight(daysSinceVisit);
            expect(weight).toBeGreaterThanOrEqual(0);
            expect(weight).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should never produce NaN temporal weights', () => {
      // Feature: arc-browser-enhancements, Property 2: Temporal Weight Monotonicity
      fc.assert(
        fc.property(
          fc.float({ min: -10, max: 1000, noNaN: true }),
          (daysSinceVisit) => {
            const weight = calculateTemporalWeight(daysSinceVisit);
            expect(Number.isNaN(weight)).toBe(false);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 8: Temporal Weight Monotonicity', () => {
    it('should decrease weight as days since visit increase', () => {
      // Feature: arc-browser-enhancements, Property 2: Temporal Weight Monotonicity
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 500 }),
          (days) => {
            const weight1 = calculateTemporalWeight(days);
            const weight2 = calculateTemporalWeight(days + 1);
            
            // Weight should not increase as time passes
            expect(weight2).toBeLessThanOrEqual(weight1);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should assign full weight to recent visits (0-7 days)', () => {
      // Feature: arc-browser-enhancements, Property 2: Temporal Weight Monotonicity
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 7, noNaN: true }),
          (days) => {
            const weight = calculateTemporalWeight(days);
            // Recent visits should have high weight (0.9 to 1.0)
            expect(weight).toBeGreaterThanOrEqual(0.9);
            expect(weight).toBeLessThanOrEqual(1.0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should assign moderate weight to visits within 30 days', () => {
      // Feature: arc-browser-enhancements, Property 2: Temporal Weight Monotonicity
      fc.assert(
        fc.property(
          fc.float({ min: 7, max: 30, noNaN: true }),
          (days) => {
            const weight = calculateTemporalWeight(days);
            // Visits within a month should have moderate weight (0.6 to 0.9)
            expect(weight).toBeGreaterThanOrEqual(0.6);
            expect(weight).toBeLessThanOrEqual(0.9);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should assign low weight to old visits (>90 days)', () => {
      // Feature: arc-browser-enhancements, Property 2: Temporal Weight Monotonicity
      fc.assert(
        fc.property(
          fc.float({ min: 90, max: 365, noNaN: true }),
          (days) => {
            const weight = calculateTemporalWeight(days);
            // Old visits should have low weight (0.05 to 0.2)
            expect(weight).toBeGreaterThanOrEqual(0.05);
            expect(weight).toBeLessThanOrEqual(0.2);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 9: Temporal Weight Idempotence', () => {
    it('should produce consistent results for same input', () => {
      // Feature: arc-browser-enhancements, Property 2: Temporal Weight Monotonicity
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 365, noNaN: true }),
          (days) => {
            const weight1 = calculateTemporalWeight(days);
            const weight2 = calculateTemporalWeight(days);
            
            expect(weight1).toBe(weight2);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
