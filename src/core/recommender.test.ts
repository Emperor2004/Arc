import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractDomain,
  extractKeywords,
  buildFeedbackMap,
  applyFeedbackToScore,
  getJarvisRecommendations,
} from './recommender';
import { HistoryEntry, RecommendationFeedback } from './types';
import * as historyStore from './historyStore';
import * as feedbackStore from './feedbackStore';

// Mock the store modules
vi.mock('./historyStore');
vi.mock('./feedbackStore');

describe('Recommender Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractDomain', () => {
    it('should extract domain from valid URL', () => {
      const domain = extractDomain('https://github.com/user/repo');
      expect(domain).toBe('github.com');
    });

    it('should handle URLs with different protocols', () => {
      expect(extractDomain('http://example.com')).toBe('example.com');
      expect(extractDomain('https://example.com')).toBe('example.com');
    });

    it('should handle URLs with subdomains', () => {
      const domain = extractDomain('https://api.github.com');
      expect(domain).toBe('api.github.com');
    });

    it('should return original string for invalid URLs', () => {
      const invalidUrl = 'not a url';
      expect(extractDomain(invalidUrl)).toBe(invalidUrl);
    });

    it('should handle URLs with ports', () => {
      const domain = extractDomain('https://localhost:3000');
      expect(domain).toBe('localhost');
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from string', () => {
      const keywords = extractKeywords('GitHub is a platform for developers');
      expect(keywords.has('github')).toBe(true);
      expect(keywords.has('platform')).toBe(true);
      expect(keywords.has('developers')).toBe(true);
    });

    it('should filter out short words', () => {
      const keywords = extractKeywords('a is the best');
      expect(keywords.size).toBe(1);
      expect(keywords.has('best')).toBe(true);
    });

    it('should convert to lowercase', () => {
      const keywords = extractKeywords('GitHub PLATFORM');
      expect(keywords.has('github')).toBe(true);
      expect(keywords.has('platform')).toBe(true);
    });

    it('should handle special characters', () => {
      const keywords = extractKeywords('hello-world, test@example.com');
      expect(keywords.has('hello')).toBe(true);
      expect(keywords.has('world')).toBe(true);
      expect(keywords.has('test')).toBe(true);
    });

    it('should return empty set for empty string', () => {
      const keywords = extractKeywords('');
      expect(keywords.size).toBe(0);
    });
  });

  describe('buildFeedbackMap', () => {
    it('should build feedback map from feedback entries', () => {
      const feedback: RecommendationFeedback[] = [
        { id: 1, url: 'https://github.com', value: 'like', created_at: Date.now() },
        { id: 2, url: 'https://github.com', value: 'like', created_at: Date.now() },
        { id: 3, url: 'https://example.com', value: 'dislike', created_at: Date.now() },
      ];

      const map = buildFeedbackMap(feedback);

      expect(map.get('https://github.com')).toEqual({ likes: 2, dislikes: 0 });
      expect(map.get('https://example.com')).toEqual({ likes: 0, dislikes: 1 });
    });

    it('should handle mixed feedback for same URL', () => {
      const feedback: RecommendationFeedback[] = [
        { id: 1, url: 'https://github.com', value: 'like', created_at: Date.now() },
        { id: 2, url: 'https://github.com', value: 'dislike', created_at: Date.now() },
      ];

      const map = buildFeedbackMap(feedback);
      expect(map.get('https://github.com')).toEqual({ likes: 1, dislikes: 1 });
    });

    it('should return empty map for empty feedback', () => {
      const map = buildFeedbackMap([]);
      expect(map.size).toBe(0);
    });
  });

  describe('applyFeedbackToScore', () => {
    it('should not modify score when no feedback', () => {
      const result = applyFeedbackToScore(0.5, undefined, 'favorite');
      expect(result.score).toBe(0.5);
      expect(result.feedbackReason).toBe('');
    });

    it('should increase score for positive feedback', () => {
      const result = applyFeedbackToScore(0.5, { likes: 1, dislikes: 0 }, 'favorite');
      expect(result.score).toBeGreaterThan(0.5);
      expect(result.feedbackReason).toContain('liked');
    });

    it('should decrease score for negative feedback', () => {
      const result = applyFeedbackToScore(0.5, { likes: 0, dislikes: 1 }, 'favorite');
      expect(result.score).toBeLessThan(0.5);
      expect(result.feedbackReason).toContain('disliked');
    });

    it('should heavily penalize strong negative feedback', () => {
      const result = applyFeedbackToScore(0.8, { likes: 0, dislikes: 2 }, 'favorite');
      expect(result.score).toBeLessThan(0.1);
      expect(result.feedbackReason).toContain('Muting');
    });

    it('should handle mixed feedback', () => {
      const result = applyFeedbackToScore(0.5, { likes: 2, dislikes: 1 }, 'favorite');
      expect(result.score).toBeGreaterThan(0.5);
      expect(result.feedbackReason).toContain('Mixed');
    });

    it('should never return negative score', () => {
      const result = applyFeedbackToScore(0.1, { likes: 0, dislikes: 5 }, 'favorite');
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getJarvisRecommendations', () => {
    it('should return empty array when history is empty', async () => {
      vi.mocked(historyStore.getRecentHistory).mockResolvedValue([]);
      vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue([]);

      const recommendations = await getJarvisRecommendations();
      expect(recommendations).toEqual([]);
    });

    it('should return recommendations for single history entry', async () => {
      const history: HistoryEntry[] = [
        {
          id: 1,
          url: 'https://github.com',
          title: 'GitHub',
          visited_at: Date.now(),
          visit_count: 10,
        },
      ];

      vi.mocked(historyStore.getRecentHistory).mockResolvedValue(history);
      vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue([]);

      const recommendations = await getJarvisRecommendations(5);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].url).toBe('https://github.com');
    });

    it('should respect limit parameter', async () => {
      const history: HistoryEntry[] = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        url: `https://example${i}.com`,
        title: `Example ${i}`,
        visited_at: Date.now() - i * 86400000,
        visit_count: 20 - i,
      }));

      vi.mocked(historyStore.getRecentHistory).mockResolvedValue(history);
      vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue([]);

      const recommendations = await getJarvisRecommendations(3);
      expect(recommendations.length).toBeLessThanOrEqual(3);
    });

    it('should categorize recommendations by kind', async () => {
      const now = Date.now();
      const history: HistoryEntry[] = [
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

      vi.mocked(historyStore.getRecentHistory).mockResolvedValue(history);
      vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue([]);

      const recommendations = await getJarvisRecommendations(10);
      const kinds = recommendations.map(r => r.kind);
      expect(kinds).toContain('favorite');
    });

    it('should filter out heavily disliked sites', async () => {
      const history: HistoryEntry[] = [
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

      const feedback: RecommendationFeedback[] = [
        { id: 1, url: 'https://disliked.com', value: 'dislike', created_at: Date.now() },
        { id: 2, url: 'https://disliked.com', value: 'dislike', created_at: Date.now() },
      ];

      vi.mocked(historyStore.getRecentHistory).mockResolvedValue(history);
      vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue(feedback);

      const recommendations = await getJarvisRecommendations(10);
      const urls = recommendations.map(r => r.url);
      expect(urls).not.toContain('https://disliked.com');
    });

    it('should sort recommendations by score', async () => {
      const history: HistoryEntry[] = [
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

      vi.mocked(historyStore.getRecentHistory).mockResolvedValue(history);
      vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue([]);

      const recommendations = await getJarvisRecommendations(10);
      for (let i = 0; i < recommendations.length - 1; i++) {
        expect(recommendations[i].score).toBeGreaterThanOrEqual(recommendations[i + 1].score);
      }
    });
  });
});
