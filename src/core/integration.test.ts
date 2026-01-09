import { describe, it, expect } from 'vitest';
import * as historyStore from './historyStore';
import * as bookmarkStore from './bookmarkStore';
import * as feedbackStore from './feedbackStore';
import * as settingsStore from './settingsStore';
import { getJarvisRecommendations } from './recommender';
import { isSearchQuery, buildSearchUrl } from './searchEngineManager';

describe('Integration Tests - API Contracts', () => {
  describe('History Store API', () => {
    it('should have required history store methods', () => {
      expect(typeof historyStore.addHistoryEntry).toBe('function');
      expect(typeof historyStore.getAllHistory).toBe('function');
      expect(typeof historyStore.getRecentHistory).toBe('function');
      expect(typeof historyStore.clearHistory).toBe('function');
      expect(typeof historyStore.removeHistoryEntry).toBe('function');
      expect(typeof historyStore.searchHistory).toBe('function');
    });

    it('should return correct types from history store', async () => {
      const entry = historyStore.addHistoryEntry('https://example.com', 'Example');
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('url');
      expect(entry).toHaveProperty('title');
      expect(entry).toHaveProperty('visited_at');
      expect(entry).toHaveProperty('visit_count');

      const history = await historyStore.getAllHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Bookmark Store API', () => {
    it('should have required bookmark store methods', () => {
      expect(typeof bookmarkStore.addBookmark).toBe('function');
      expect(typeof bookmarkStore.removeBookmark).toBe('function');
      expect(typeof bookmarkStore.getAllBookmarks).toBe('function');
      expect(typeof bookmarkStore.searchBookmarks).toBe('function');
      expect(typeof bookmarkStore.isBookmarked).toBe('function');
      expect(typeof bookmarkStore.clearBookmarks).toBe('function');
    });

    it('should return correct types from bookmark store', async () => {
      const bookmark = bookmarkStore.addBookmark('https://example.com', 'Example');
      expect(bookmark).toHaveProperty('id');
      expect(bookmark).toHaveProperty('url');
      expect(bookmark).toHaveProperty('title');
      expect(bookmark).toHaveProperty('createdAt');
      expect(bookmark).toHaveProperty('updatedAt');

      const bookmarks = await bookmarkStore.getAllBookmarks();
      expect(Array.isArray(bookmarks)).toBe(true);
    });
  });

  describe('Feedback Store API', () => {
    it('should have required feedback store methods', () => {
      expect(typeof feedbackStore.addFeedback).toBe('function');
      expect(typeof feedbackStore.getAllFeedback).toBe('function');
      expect(typeof feedbackStore.getFeedbackByUrl).toBe('function');
      expect(typeof feedbackStore.clearFeedback).toBe('function');
      expect(typeof feedbackStore.removeFeedback).toBe('function');
      expect(typeof feedbackStore.getFeedbackStats).toBe('function');
    });

    it('should return correct types from feedback store', async () => {
      const feedback = feedbackStore.addFeedback('https://example.com', 'like');
      expect(feedback).toHaveProperty('id');
      expect(feedback).toHaveProperty('url');
      expect(feedback).toHaveProperty('value');
      expect(feedback).toHaveProperty('created_at');

      const allFeedback = await feedbackStore.getAllFeedback();
      expect(Array.isArray(allFeedback)).toBe(true);
    });
  });

  describe('Settings Store API', () => {
    it('should have required settings store methods', () => {
      expect(typeof settingsStore.getSettings).toBe('function');
      expect(typeof settingsStore.updateSettings).toBe('function');
      expect(typeof settingsStore.getSetting).toBe('function');
      expect(typeof settingsStore.updateSetting).toBe('function');
      expect(typeof settingsStore.resetSettings).toBe('function');
    });

    it('should return correct types from settings store', () => {
      const settings = settingsStore.getSettings();
      expect(settings).toHaveProperty('theme');
      expect(settings).toHaveProperty('jarvisEnabled');
      expect(settings).toHaveProperty('useHistoryForRecommendations');
      expect(settings).toHaveProperty('incognitoEnabled');
    });
  });

  describe('Recommender API', () => {
    it('should have recommender function', () => {
      expect(typeof getJarvisRecommendations).toBe('function');
    });

    it('should return recommendations with correct structure', async () => {
      const recommendations = await getJarvisRecommendations(5);
      expect(Array.isArray(recommendations)).toBe(true);

      if (recommendations.length > 0) {
        const rec = recommendations[0];
        expect(rec).toHaveProperty('id');
        expect(rec).toHaveProperty('url');
        expect(rec).toHaveProperty('title');
        expect(rec).toHaveProperty('reason');
        expect(rec).toHaveProperty('score');
        expect(rec).toHaveProperty('kind');
      }
    });
  });

  describe('Search Engine Manager API', () => {
    it('should have search query detection', () => {
      expect(typeof isSearchQuery).toBe('function');
      expect(typeof buildSearchUrl).toBe('function');
    });

    it('should detect search queries correctly', () => {
      expect(isSearchQuery('hello world')).toBe(true);
      expect(isSearchQuery('https://example.com')).toBe(false);
      expect(isSearchQuery('example.com')).toBe(false);
    });

    it('should build search URLs correctly', () => {
      const url = buildSearchUrl('test query', 'google');
      expect(url).toContain('google.com');
      expect(url).toContain('test%20query');
    });
  });

  describe('Cross-Component Integration', () => {
    it('should support complete workflow: add history, bookmark, feedback, get recommendations', async () => {
      // Add history
      const historyEntry = historyStore.addHistoryEntry('https://example.com', 'Example');
      expect(historyEntry).toBeDefined();

      // Add bookmark
      const bookmark = bookmarkStore.addBookmark('https://example.com', 'Example');
      expect(bookmark).toBeDefined();

      // Add feedback
      const feedback = feedbackStore.addFeedback('https://example.com', 'like');
      expect(feedback).toBeDefined();

      // Get recommendations
      const recommendations = await getJarvisRecommendations(5);
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should support search workflow: detect query, build URL', () => {
      const query = 'test search';
      const isSearch = isSearchQuery(query);
      expect(isSearch).toBe(true);

      if (isSearch) {
        const url = buildSearchUrl(query, 'google');
        expect(url).toBeDefined();
        expect(url.length).toBeGreaterThan(0);
      }
    });

    it('should support settings workflow: get, update, reset', () => {
      // Get initial settings
      const initial = settingsStore.getSettings();
      expect(initial).toBeDefined();

      // Update settings
      const updated = settingsStore.updateSettings({ theme: 'dark' });
      expect(updated.theme).toBe('dark');

      // Reset settings
      const reset = settingsStore.resetSettings();
      expect(reset.theme).toBe('system');
    });
  });
});
