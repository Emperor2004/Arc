import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import {
  applyPersonalization,
  validatePersonalizationSettings,
  meetsMinimumScore,
  RecommendationPersonalization,
} from './personalizationManager';

describe('PersonalizationManager Properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 10.4: Personalization Determinism', () => {
    it('should produce deterministic results for same inputs', () => {
      // **Validates: Requirement 10.4**
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.record({
            recencyWeight: fc.float({ min: 0, max: 1, noNaN: true }),
            frequencyWeight: fc.float({ min: 0, max: 1, noNaN: true }),
            feedbackWeight: fc.float({ min: 0, max: 1, noNaN: true }),
            minScore: fc.float({ min: 0, max: 1, noNaN: true }),
            maxRecommendations: fc.integer({ min: 1, max: 20 }),
          }),
          (frequencyScore, recencyScore, feedbackScore, weights) => {
            // Normalize weights to sum to 1.0 for valid input
            const totalWeight = weights.recencyWeight + weights.frequencyWeight + weights.feedbackWeight;
            const normalizedWeights = totalWeight > 0 ? {
              ...weights,
              recencyWeight: weights.recencyWeight / totalWeight,
              frequencyWeight: weights.frequencyWeight / totalWeight,
              feedbackWeight: weights.feedbackWeight / totalWeight,
            } : {
              ...weights,
              recencyWeight: 0.5,
              frequencyWeight: 0.3,
              feedbackWeight: 0.2,
            };

            const result1 = applyPersonalization(frequencyScore, recencyScore, feedbackScore, normalizedWeights);
            const result2 = applyPersonalization(frequencyScore, recencyScore, feedbackScore, normalizedWeights);

            expect(result1).toBe(result2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce consistent results across multiple calls', () => {
      // **Validates: Requirement 10.4**
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true }),
          (frequencyScore, recencyScore, feedbackScore) => {
            const weights: RecommendationPersonalization = {
              recencyWeight: 0.5,
              frequencyWeight: 0.3,
              feedbackWeight: 0.2,
              minScore: 0.1,
              maxRecommendations: 5,
            };

            const results = Array.from({ length: 10 }, () => 
              applyPersonalization(frequencyScore, recencyScore, feedbackScore, weights)
            );

            // All results should be identical
            const firstResult = results[0];
            results.forEach(result => {
              expect(result).toBe(firstResult);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 1: Score Bounds Invariant', () => {
    it('should always return scores in [0, 1] range', () => {
      // **Validates: Requirement 10.4**
      fc.assert(
        fc.property(
          fc.float({ min: -10, max: 10, noNaN: true }),
          fc.float({ min: -10, max: 10, noNaN: true }),
          fc.float({ min: -10, max: 10, noNaN: true }),
          fc.record({
            recencyWeight: fc.float({ min: 0, max: 1, noNaN: true }),
            frequencyWeight: fc.float({ min: 0, max: 1, noNaN: true }),
            feedbackWeight: fc.float({ min: 0, max: 1, noNaN: true }),
            minScore: fc.float({ min: 0, max: 1, noNaN: true }),
            maxRecommendations: fc.integer({ min: 1, max: 20 }),
          }),
          (frequencyScore, recencyScore, feedbackScore, weights) => {
            // Normalize weights to sum to 1.0
            const totalWeight = weights.recencyWeight + weights.frequencyWeight + weights.feedbackWeight;
            const normalizedWeights = totalWeight > 0 ? {
              ...weights,
              recencyWeight: weights.recencyWeight / totalWeight,
              frequencyWeight: weights.frequencyWeight / totalWeight,
              feedbackWeight: weights.feedbackWeight / totalWeight,
            } : {
              ...weights,
              recencyWeight: 0.5,
              frequencyWeight: 0.3,
              feedbackWeight: 0.2,
            };

            const result = applyPersonalization(frequencyScore, recencyScore, feedbackScore, normalizedWeights);

            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(1);
            expect(Number.isNaN(result)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Weight Monotonicity', () => {
    it('should increase score when increasing frequency weight with high frequency score', () => {
      // **Validates: Requirement 10.4**
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.7), max: Math.fround(1), noNaN: true }), // High frequency score
          fc.float({ min: Math.fround(0), max: Math.fround(0.5), noNaN: true }), // Low recency score
          fc.float({ min: Math.fround(0), max: Math.fround(0.5), noNaN: true }), // Low feedback score
          fc.float({ min: Math.fround(0.1), max: Math.fround(0.8), noNaN: true }), // Initial frequency weight
          (frequencyScore, recencyScore, feedbackScore, initialFreqWeight) => {
            const remainingWeight = 1 - initialFreqWeight;
            const recencyWeight = remainingWeight * 0.6;
            const feedbackWeight = remainingWeight * 0.4;

            const weights1: RecommendationPersonalization = {
              recencyWeight,
              frequencyWeight: initialFreqWeight,
              feedbackWeight,
              minScore: 0.1,
              maxRecommendations: 5,
            };

            const higherFreqWeight = Math.min(0.9, initialFreqWeight + 0.1);
            const newRemainingWeight = 1 - higherFreqWeight;
            const weights2: RecommendationPersonalization = {
              recencyWeight: newRemainingWeight * 0.6,
              frequencyWeight: higherFreqWeight,
              feedbackWeight: newRemainingWeight * 0.4,
              minScore: 0.1,
              maxRecommendations: 5,
            };

            const result1 = applyPersonalization(frequencyScore, recencyScore, feedbackScore, weights1);
            const result2 = applyPersonalization(frequencyScore, recencyScore, feedbackScore, weights2);

            // With high frequency score, increasing frequency weight should increase overall score
            expect(result2).toBeGreaterThanOrEqual(result1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should increase score when increasing recency weight with high recency score', () => {
      // **Validates: Requirement 10.4**
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(0.5), noNaN: true }), // Low frequency score
          fc.float({ min: Math.fround(0.7), max: Math.fround(1), noNaN: true }), // High recency score
          fc.float({ min: Math.fround(0), max: Math.fround(0.5), noNaN: true }), // Low feedback score
          fc.float({ min: Math.fround(0.1), max: Math.fround(0.8), noNaN: true }), // Initial recency weight
          (frequencyScore, recencyScore, feedbackScore, initialRecencyWeight) => {
            const remainingWeight = 1 - initialRecencyWeight;
            const frequencyWeight = remainingWeight * 0.6;
            const feedbackWeight = remainingWeight * 0.4;

            const weights1: RecommendationPersonalization = {
              recencyWeight: initialRecencyWeight,
              frequencyWeight,
              feedbackWeight,
              minScore: 0.1,
              maxRecommendations: 5,
            };

            const higherRecencyWeight = Math.min(0.9, initialRecencyWeight + 0.1);
            const newRemainingWeight = 1 - higherRecencyWeight;
            const weights2: RecommendationPersonalization = {
              recencyWeight: higherRecencyWeight,
              frequencyWeight: newRemainingWeight * 0.6,
              feedbackWeight: newRemainingWeight * 0.4,
              minScore: 0.1,
              maxRecommendations: 5,
            };

            const result1 = applyPersonalization(frequencyScore, recencyScore, feedbackScore, weights1);
            const result2 = applyPersonalization(frequencyScore, recencyScore, feedbackScore, weights2);

            // With high recency score, increasing recency weight should increase overall score
            expect(result2).toBeGreaterThanOrEqual(result1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Validation Consistency', () => {
    it('should consistently validate settings with same input', () => {
      // **Validates: Requirement 10.4**
      fc.assert(
        fc.property(
          fc.record({
            recencyWeight: fc.float({ min: -1, max: 2, noNaN: true }),
            frequencyWeight: fc.float({ min: -1, max: 2, noNaN: true }),
            feedbackWeight: fc.float({ min: -1, max: 2, noNaN: true }),
            minScore: fc.float({ min: -1, max: 2, noNaN: true }),
            maxRecommendations: fc.integer({ min: -5, max: 25 }),
          }),
          (settings) => {
            const errors1 = validatePersonalizationSettings(settings);
            const errors2 = validatePersonalizationSettings(settings);

            expect(errors1).toEqual(errors2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate weight sum correctly', () => {
      // **Validates: Requirement 10.4**
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true }),
          (w1, w2, w3) => {
            const settings: RecommendationPersonalization = {
              recencyWeight: w1,
              frequencyWeight: w2,
              feedbackWeight: w3,
              minScore: 0.1,
              maxRecommendations: 5,
            };

            const errors = validatePersonalizationSettings(settings);
            const weightSum = w1 + w2 + w3;
            const hasWeightSumError = errors.some(error => error.includes('weights must sum to 1.0'));

            if (Math.abs(weightSum - 1.0) > 0.001) {
              expect(hasWeightSumError).toBe(true);
            } else {
              expect(hasWeightSumError).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Minimum Score Threshold', () => {
    it('should consistently apply minimum score threshold', () => {
      // **Validates: Requirement 10.4**
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true }),
          (score, minScore) => {
            const settings: RecommendationPersonalization = {
              recencyWeight: 0.5,
              frequencyWeight: 0.3,
              feedbackWeight: 0.2,
              minScore,
              maxRecommendations: 5,
            };

            const result = meetsMinimumScore(score, settings);

            if (score >= minScore) {
              expect(result).toBe(true);
            } else {
              expect(result).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Weight Normalization', () => {
    it('should produce equivalent results for proportionally scaled weights', () => {
      // **Validates: Requirement 10.4**
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: Math.fround(0.1), max: Math.fround(1), noNaN: true }),
          fc.float({ min: Math.fround(0.1), max: Math.fround(1), noNaN: true }),
          fc.float({ min: Math.fround(0.1), max: Math.fround(1), noNaN: true }),
          fc.float({ min: Math.fround(1.1), max: Math.fround(5), noNaN: true }),
          (frequencyScore, recencyScore, feedbackScore, w1, w2, w3, scale) => {
            // Normalize original weights
            const totalWeight = w1 + w2 + w3;
            const weights1: RecommendationPersonalization = {
              recencyWeight: w2 / totalWeight,
              frequencyWeight: w1 / totalWeight,
              feedbackWeight: w3 / totalWeight,
              minScore: 0.1,
              maxRecommendations: 5,
            };

            // Scale weights and normalize
            const scaledTotal = (w1 * scale) + (w2 * scale) + (w3 * scale);
            const weights2: RecommendationPersonalization = {
              recencyWeight: (w2 * scale) / scaledTotal,
              frequencyWeight: (w1 * scale) / scaledTotal,
              feedbackWeight: (w3 * scale) / scaledTotal,
              minScore: 0.1,
              maxRecommendations: 5,
            };

            const result1 = applyPersonalization(frequencyScore, recencyScore, feedbackScore, weights1);
            const result2 = applyPersonalization(frequencyScore, recencyScore, feedbackScore, weights2);

            // Results should be very close (allowing for floating point precision)
            expect(Math.abs(result1 - result2)).toBeLessThan(0.0001);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Score Composition', () => {
    it('should produce zero score when all input scores are zero', () => {
      // **Validates: Requirement 10.4**
      fc.assert(
        fc.property(
          fc.record({
            recencyWeight: fc.float({ min: 0, max: 1, noNaN: true }),
            frequencyWeight: fc.float({ min: 0, max: 1, noNaN: true }),
            feedbackWeight: fc.float({ min: 0, max: 1, noNaN: true }),
            minScore: fc.float({ min: 0, max: 1, noNaN: true }),
            maxRecommendations: fc.integer({ min: 1, max: 20 }),
          }),
          (weights) => {
            // Normalize weights
            const totalWeight = weights.recencyWeight + weights.frequencyWeight + weights.feedbackWeight;
            const normalizedWeights = totalWeight > 0 ? {
              ...weights,
              recencyWeight: weights.recencyWeight / totalWeight,
              frequencyWeight: weights.frequencyWeight / totalWeight,
              feedbackWeight: weights.feedbackWeight / totalWeight,
            } : {
              ...weights,
              recencyWeight: 0.5,
              frequencyWeight: 0.3,
              feedbackWeight: 0.2,
            };

            const result = applyPersonalization(0, 0, 0, normalizedWeights);

            expect(result).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce maximum possible score when all input scores are 1', () => {
      // **Validates: Requirement 10.4**
      fc.assert(
        fc.property(
          fc.record({
            recencyWeight: fc.float({ min: 0, max: 1, noNaN: true }),
            frequencyWeight: fc.float({ min: 0, max: 1, noNaN: true }),
            feedbackWeight: fc.float({ min: 0, max: 1, noNaN: true }),
            minScore: fc.float({ min: 0, max: 1, noNaN: true }),
            maxRecommendations: fc.integer({ min: 1, max: 20 }),
          }),
          (weights) => {
            // Normalize weights
            const totalWeight = weights.recencyWeight + weights.frequencyWeight + weights.feedbackWeight;
            const normalizedWeights = totalWeight > 0 ? {
              ...weights,
              recencyWeight: weights.recencyWeight / totalWeight,
              frequencyWeight: weights.frequencyWeight / totalWeight,
              feedbackWeight: weights.feedbackWeight / totalWeight,
            } : {
              ...weights,
              recencyWeight: 0.5,
              frequencyWeight: 0.3,
              feedbackWeight: 0.2,
            };

            const result = applyPersonalization(1, 1, 1, normalizedWeights);

            // With normalized weights summing to 1.0, max score should be 1.0
            expect(result).toBeCloseTo(1.0, 5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});