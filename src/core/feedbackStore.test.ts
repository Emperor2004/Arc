import { describe, it, expect, beforeEach } from 'vitest';
import {
  addFeedback,
  getAllFeedback,
  getFeedbackByUrl,
  clearFeedback,
  removeFeedback,
  getFeedbackStats,
} from './feedbackStore';

describe('FeedbackStore Module', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('addFeedback', () => {
    it('should add a like feedback entry', () => {
      const feedback = addFeedback('https://github.com', 'like');

      expect(feedback.url).toBe('https://github.com');
      expect(feedback.value).toBe('like');
      expect(feedback.id).toBe(1);
    });

    it('should add a dislike feedback entry', () => {
      const feedback = addFeedback('https://example.com', 'dislike');

      expect(feedback.url).toBe('https://example.com');
      expect(feedback.value).toBe('dislike');
    });

    it('should increment ID for multiple entries', () => {
      // Add first feedback
      const feedback1 = addFeedback('https://github.com', 'like');
      expect(feedback1.id).toBe(1);

      // Add second feedback
      const feedback2 = addFeedback('https://example.com', 'dislike');
      expect(feedback2.id).toBe(2);
    });

    it('should set created_at timestamp', () => {
      const before = Date.now();
      const feedback = addFeedback('https://github.com', 'like');
      const after = Date.now();

      expect(feedback.created_at).toBeGreaterThanOrEqual(before);
      expect(feedback.created_at).toBeLessThanOrEqual(after);
    });
  });

  describe('getAllFeedback', () => {
    it('should return all feedback entries', async () => {
      // Add feedback entries
      addFeedback('https://github.com', 'like');
      addFeedback('https://example.com', 'dislike');

      const all = await getAllFeedback();

      expect(all.length).toBe(2);
    });

    it('should return empty array when no feedback', async () => {
      const all = await getAllFeedback();

      expect(all).toEqual([]);
    });
  });

  describe('getFeedbackByUrl', () => {
    it('should return feedback for specific URL', async () => {
      // Add feedback entries
      addFeedback('https://github.com', 'like');
      addFeedback('https://github.com', 'like');
      addFeedback('https://example.com', 'dislike');

      const feedback = await getFeedbackByUrl('https://github.com');

      expect(feedback.length).toBe(2);
      expect(feedback.every(f => f.url === 'https://github.com')).toBe(true);
    });

    it('should return empty array for URL with no feedback', async () => {
      addFeedback('https://github.com', 'like');

      const feedback = await getFeedbackByUrl('https://nonexistent.com');

      expect(feedback).toEqual([]);
    });
  });

  describe('clearFeedback', () => {
    it('should clear all feedback', () => {
      // Add some feedback
      addFeedback('https://github.com', 'like');
      addFeedback('https://example.com', 'dislike');

      // Clear feedback
      clearFeedback();

      // Verify cleared
      const all = getAllFeedback();
      expect(all).resolves.toEqual([]);
    });
  });

  describe('removeFeedback', () => {
    it('should remove feedback entry by ID', async () => {
      // Add feedback entries
      const feedback1 = addFeedback('https://github.com', 'like');
      const feedback2 = addFeedback('https://example.com', 'dislike');

      // Remove first feedback
      removeFeedback(feedback1.id);

      // Verify removal
      const all = await getAllFeedback();
      expect(all.length).toBe(1);
      expect(all[0].id).toBe(feedback2.id);
    });
  });

  describe('getFeedbackStats', () => {
    it('should return feedback statistics for URL', async () => {
      // Add feedback entries
      addFeedback('https://github.com', 'like');
      addFeedback('https://github.com', 'like');
      addFeedback('https://github.com', 'dislike');

      const stats = await getFeedbackStats('https://github.com');

      expect(stats.likes).toBe(2);
      expect(stats.dislikes).toBe(1);
    });

    it('should return zero stats for URL with no feedback', async () => {
      const stats = await getFeedbackStats('https://nonexistent.com');

      expect(stats.likes).toBe(0);
      expect(stats.dislikes).toBe(0);
    });
  });
});
