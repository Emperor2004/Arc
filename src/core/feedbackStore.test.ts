import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  addFeedback,
  getAllFeedback,
  getFeedbackByUrl,
  clearFeedback,
  removeFeedback,
  getFeedbackStats,
} from './feedbackStore';

// Mock fs module
vi.mock('fs');
vi.mock('path');

describe('FeedbackStore Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock path.join to return a consistent path
    vi.mocked(path.join).mockReturnValue('/mock/feedback.json');
    // Mock fs.existsSync to return true
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  describe('addFeedback', () => {
    it('should add a like feedback entry', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('[]');
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const feedback = addFeedback('https://github.com', 'like');

      expect(feedback.url).toBe('https://github.com');
      expect(feedback.value).toBe('like');
      expect(feedback.id).toBe(1);
    });

    it('should add a dislike feedback entry', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('[]');
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const feedback = addFeedback('https://example.com', 'dislike');

      expect(feedback.url).toBe('https://example.com');
      expect(feedback.value).toBe('dislike');
    });

    it('should increment ID for multiple entries', () => {
      const existingFeedback = JSON.stringify([
        {
          id: 1,
          url: 'https://github.com',
          value: 'like',
          created_at: Date.now(),
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(existingFeedback);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const feedback = addFeedback('https://example.com', 'dislike');

      expect(feedback.id).toBe(2);
    });

    it('should set created_at timestamp', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('[]');
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const before = Date.now();
      const feedback = addFeedback('https://github.com', 'like');
      const after = Date.now();

      expect(feedback.created_at).toBeGreaterThanOrEqual(before);
      expect(feedback.created_at).toBeLessThanOrEqual(after);
    });
  });

  describe('getAllFeedback', () => {
    it('should return all feedback entries', async () => {
      const feedbackData = JSON.stringify([
        {
          id: 1,
          url: 'https://github.com',
          value: 'like',
          created_at: Date.now(),
        },
        {
          id: 2,
          url: 'https://example.com',
          value: 'dislike',
          created_at: Date.now(),
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(feedbackData);

      const all = await getAllFeedback();

      expect(all.length).toBe(2);
    });

    it('should return empty array when no feedback', async () => {
      vi.mocked(fs.readFileSync).mockReturnValue('[]');

      const all = await getAllFeedback();

      expect(all).toEqual([]);
    });
  });

  describe('getFeedbackByUrl', () => {
    it('should return feedback for specific URL', async () => {
      const feedbackData = JSON.stringify([
        {
          id: 1,
          url: 'https://github.com',
          value: 'like',
          created_at: Date.now(),
        },
        {
          id: 2,
          url: 'https://github.com',
          value: 'like',
          created_at: Date.now(),
        },
        {
          id: 3,
          url: 'https://example.com',
          value: 'dislike',
          created_at: Date.now(),
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(feedbackData);

      const feedback = await getFeedbackByUrl('https://github.com');

      expect(feedback.length).toBe(2);
      expect(feedback.every(f => f.url === 'https://github.com')).toBe(true);
    });

    it('should return empty array for URL with no feedback', async () => {
      const feedbackData = JSON.stringify([
        {
          id: 1,
          url: 'https://github.com',
          value: 'like',
          created_at: Date.now(),
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(feedbackData);

      const feedback = await getFeedbackByUrl('https://nonexistent.com');

      expect(feedback).toEqual([]);
    });
  });

  describe('clearFeedback', () => {
    it('should clear all feedback', () => {
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      clearFeedback();

      expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData).toEqual([]);
    });
  });

  describe('removeFeedback', () => {
    it('should remove feedback entry by ID', () => {
      const feedbackData = JSON.stringify([
        {
          id: 1,
          url: 'https://github.com',
          value: 'like',
          created_at: Date.now(),
        },
        {
          id: 2,
          url: 'https://example.com',
          value: 'dislike',
          created_at: Date.now(),
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(feedbackData);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      removeFeedback(1);

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);

      expect(writtenData.length).toBe(1);
      expect(writtenData[0].id).toBe(2);
    });
  });

  describe('getFeedbackStats', () => {
    it('should return feedback statistics for URL', async () => {
      const feedbackData = JSON.stringify([
        {
          id: 1,
          url: 'https://github.com',
          value: 'like',
          created_at: Date.now(),
        },
        {
          id: 2,
          url: 'https://github.com',
          value: 'like',
          created_at: Date.now(),
        },
        {
          id: 3,
          url: 'https://github.com',
          value: 'dislike',
          created_at: Date.now(),
        },
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(feedbackData);

      const stats = await getFeedbackStats('https://github.com');

      expect(stats.likes).toBe(2);
      expect(stats.dislikes).toBe(1);
    });

    it('should return zero stats for URL with no feedback', async () => {
      vi.mocked(fs.readFileSync).mockReturnValue('[]');

      const stats = await getFeedbackStats('https://nonexistent.com');

      expect(stats.likes).toBe(0);
      expect(stats.dislikes).toBe(0);
    });
  });
});
