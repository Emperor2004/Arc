import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPersonalizationSettings,
  updatePersonalizationSettings,
  applyPersonalization,
  RecommendationPersonalization,
} from '../../core/personalizationManager';
import { getJarvisRecommendations, clearRecommendationCache } from '../../core/recommender';
import * as settingsStore from '../../core/settingsStore';
import * as historyStore from '../../core/historyStore';
import * as feedbackStore from '../../core/feedbackStore';
import { HistoryEntry, RecommendationFeedback } from '../../core/types';

// Mock the stores
vi.mock('../../core/settingsStore');
vi.mock('../../core/historyStore');
vi.mock('../../core/feedbackStore');

describe('Personalization Integration Tests', () => {
  const mockHistory: HistoryEntry[] = [
    {
      id: 1,
      url: 'https://github.com/user/repo',
      title: 'GitHub Repository',
      visited_at: Date.now() - 86400000, // 1 day ago
      visit_count: 10,
    },
    {
      id: 2,
      url: 'https://stackoverflow.com/questions/123',
      title: 'Stack Overflow Question',
      visited_at: Date.now() - 86400000 * 7, // 1 week ago
      visit_count: 5,
    },
    {
      id: 3,
      url: 'https://docs.example.com/api',
      title: 'API Documentation',
      visited_at: Date.now() - 86400000 * 30, // 1 month ago
      visit_count: 15,
    },
  ];

  const mockFeedback: RecommendationFeedback[] = [
    {
      id: 1,
      url: 'https://github.com/user/repo',
      value: 'like',
      created_at: Date.now() - 86400000,
    },
    {
      id: 2,
      url: 'https://stackoverflow.com/questions/123',
      value: 'dislike',
      created_at: Date.now() - 86400000 * 2,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    clearRecommendationCache();
    
    // Mock history store
    vi.mocked(historyStore.getRecentHistory).mockResolvedValue(mockHistory);
    
    // Mock feedback store
    vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue(mockFeedback);
    
    // Mock settings store with default personalization settings
    vi.mocked(settingsStore.getSettings).mockReturnValue({
      theme: 'system',
      jarvisEnabled: true,
      useHistoryForRecommendations: true,
      incognitoEnabled: true,
      recencyWeight: 0.5,
      frequencyWeight: 0.3,
      feedbackWeight: 0.2,
      minScore: 0.1,
      maxRecommendations: 5,
    });
    
    vi.mocked(settingsStore.updateSettings).mockImplementation(() => ({}));
  });

  describe('Weight Adjustments Affect Recommendations', () => {
    it('should change recommendation scores when recency weight is increased', async () => {
      // Get baseline recommendations with default weights
      const baselineRecommendations = await getJarvisRecommendations(5);
      
      // Update to favor recency heavily
      await updatePersonalizationSettings({
        recencyWeight: 0.8,
        frequencyWeight: 0.1,
        feedbackWeight: 0.1,
      });
      
      // Clear cache to force fresh recommendations
      clearRecommendationCache();
      
      // Get new recommendations
      const recencyFavoredRecommendations = await getJarvisRecommendations(5);
      
      // Find the recent GitHub entry in both sets
      const baselineGitHub = baselineRecommendations.find(r => r.url.includes('github.com'));
      const recencyGitHub = recencyFavoredRecommendations.find(r => r.url.includes('github.com'));
      
      if (baselineGitHub && recencyGitHub) {
        // The recent GitHub entry should have a higher score with increased recency weight
        expect(recencyGitHub.score).toBeGreaterThan(baselineGitHub.score);
        
        // Check that personalized scores are included
        expect(recencyGitHub.personalizedScores).toBeDefined();
        expect(recencyGitHub.personalizedScores?.recency).toBeGreaterThan(0);
      }
    });

    it('should change recommendation scores when frequency weight is increased', async () => {
      // Get baseline recommendations
      const baselineRecommendations = await getJarvisRecommendations(5);
      
      // Update to favor frequency heavily
      await updatePersonalizationSettings({
        recencyWeight: 0.1,
        frequencyWeight: 0.8,
        feedbackWeight: 0.1,
      });
      
      clearRecommendationCache();
      
      // Get new recommendations
      const frequencyFavoredRecommendations = await getJarvisRecommendations(5);
      
      // Find the high-frequency docs entry (15 visits)
      const baselineDocs = baselineRecommendations.find(r => r.url.includes('docs.example.com'));
      const frequencyDocs = frequencyFavoredRecommendations.find(r => r.url.includes('docs.example.com'));
      
      if (baselineDocs && frequencyDocs) {
        // The high-frequency docs entry should have a higher score
        expect(frequencyDocs.score).toBeGreaterThan(baselineDocs.score);
        
        // Check personalized scores
        expect(frequencyDocs.personalizedScores).toBeDefined();
        expect(frequencyDocs.personalizedScores?.frequency).toBeGreaterThan(0);
      }
    });

    it('should change recommendation scores when feedback weight is increased', async () => {
      // Get baseline recommendations
      const baselineRecommendations = await getJarvisRecommendations(5);
      
      // Update to favor feedback heavily
      await updatePersonalizationSettings({
        recencyWeight: 0.1,
        frequencyWeight: 0.1,
        feedbackWeight: 0.8,
      });
      
      clearRecommendationCache();
      
      // Get new recommendations
      const feedbackFavoredRecommendations = await getJarvisRecommendations(5);
      
      // Find the liked GitHub entry and disliked StackOverflow entry
      const baselineGitHub = baselineRecommendations.find(r => r.url.includes('github.com'));
      const feedbackGitHub = feedbackFavoredRecommendations.find(r => r.url.includes('github.com'));
      
      const baselineStackOverflow = baselineRecommendations.find(r => r.url.includes('stackoverflow.com'));
      const feedbackStackOverflow = feedbackFavoredRecommendations.find(r => r.url.includes('stackoverflow.com'));
      
      if (baselineGitHub && feedbackGitHub) {
        // Liked GitHub should have higher score with increased feedback weight
        expect(feedbackGitHub.score).toBeGreaterThan(baselineGitHub.score);
        expect(feedbackGitHub.personalizedScores?.feedback).toBeGreaterThan(0.5);
      }
      
      if (baselineStackOverflow && feedbackStackOverflow) {
        // Disliked StackOverflow should have lower score
        expect(feedbackStackOverflow.score).toBeLessThan(baselineStackOverflow.score);
        expect(feedbackStackOverflow.personalizedScores?.feedback).toBeLessThan(0.5);
      }
    });
  });

  describe('Settings Persistence', () => {
    it('should persist settings across simulated restart', async () => {
      const customSettings: Partial<RecommendationPersonalization> = {
        recencyWeight: 0.7,
        frequencyWeight: 0.2,
        feedbackWeight: 0.1,
        minScore: 0.3,
        maxRecommendations: 8,
        ollamaEnabled: true,
        ollamaModel: 'neural-chat',
      };
      
      // Update settings
      await updatePersonalizationSettings(customSettings);
      
      // Verify updateSettings was called with correct values
      const updateCall = vi.mocked(settingsStore.updateSettings).mock.calls[0][0];
      expect(updateCall.recencyWeight).toBeCloseTo(0.7);
      expect(updateCall.frequencyWeight).toBeCloseTo(0.2);
      expect(updateCall.feedbackWeight).toBeCloseTo(0.1);
      expect(updateCall.minScore).toBe(0.3);
      expect(updateCall.maxRecommendations).toBe(8);
      expect(updateCall.ollamaEnabled).toBe(true);
      expect(updateCall.ollamaModel).toBe('neural-chat');
      
      // Simulate restart by mocking getSettings to return the updated values
      vi.mocked(settingsStore.getSettings).mockReturnValue({
        theme: 'system',
        jarvisEnabled: true,
        useHistoryForRecommendations: true,
        incognitoEnabled: true,
        ...updateCall,
      });
      
      // Get settings after "restart"
      const retrievedSettings = getPersonalizationSettings();
      
      expect(retrievedSettings.recencyWeight).toBeCloseTo(0.7);
      expect(retrievedSettings.frequencyWeight).toBeCloseTo(0.2);
      expect(retrievedSettings.feedbackWeight).toBeCloseTo(0.1);
      expect(retrievedSettings.minScore).toBe(0.3);
      expect(retrievedSettings.maxRecommendations).toBe(8);
      expect(retrievedSettings.ollamaEnabled).toBe(true);
      expect(retrievedSettings.ollamaModel).toBe('neural-chat');
    });
  });

  describe('Real-time Updates', () => {
    it('should clear cache and update recommendations when settings change', async () => {
      // Get initial recommendations
      const initialRecommendations = await getJarvisRecommendations(5);
      
      // Change settings significantly
      await updatePersonalizationSettings({
        recencyWeight: 0.9,
        frequencyWeight: 0.05,
        feedbackWeight: 0.05,
        minScore: 0.4, // Higher threshold
      });
      
      // Get updated recommendations (cache should be cleared automatically)
      const updatedRecommendations = await getJarvisRecommendations(5);
      
      // Recommendations should be different due to:
      // 1. Different scoring weights
      // 2. Higher minimum score threshold
      expect(updatedRecommendations).not.toEqual(initialRecommendations);
      
      // Should have fewer recommendations due to higher minScore
      expect(updatedRecommendations.length).toBeLessThanOrEqual(initialRecommendations.length);
      
      // All returned recommendations should meet the new minimum score
      updatedRecommendations.forEach(rec => {
        expect(rec.score).toBeGreaterThanOrEqual(0.4);
      });
    });

    it('should respect maxRecommendations setting', async () => {
      // Set a low limit
      await updatePersonalizationSettings({
        maxRecommendations: 2,
      });
      
      clearRecommendationCache();
      
      const recommendations = await getJarvisRecommendations(10); // Request more than limit
      
      // Should only return up to maxRecommendations
      expect(recommendations.length).toBeLessThanOrEqual(2);
    });

    it('should filter out recommendations below minScore', async () => {
      // Set a high minimum score
      await updatePersonalizationSettings({
        minScore: 0.8,
      });
      
      clearRecommendationCache();
      
      const recommendations = await getJarvisRecommendations(5);
      
      // All recommendations should meet the minimum score
      recommendations.forEach(rec => {
        expect(rec.score).toBeGreaterThanOrEqual(0.8);
      });
    });
  });

  describe('Personalized Score Components', () => {
    it('should include personalized score breakdown in recommendations', async () => {
      const recommendations = await getJarvisRecommendations(5);
      
      recommendations.forEach(rec => {
        expect(rec.personalizedScores).toBeDefined();
        expect(rec.personalizedScores?.frequency).toBeGreaterThanOrEqual(0);
        expect(rec.personalizedScores?.frequency).toBeLessThanOrEqual(1);
        expect(rec.personalizedScores?.recency).toBeGreaterThanOrEqual(0);
        expect(rec.personalizedScores?.recency).toBeLessThanOrEqual(1);
        expect(rec.personalizedScores?.feedback).toBeGreaterThanOrEqual(0);
        expect(rec.personalizedScores?.feedback).toBeLessThanOrEqual(1);
        expect(rec.personalizedScores?.combined).toBe(rec.score);
      });
    });

    it('should show different component scores for different URLs', async () => {
      const recommendations = await getJarvisRecommendations(5);
      
      if (recommendations.length >= 2) {
        const rec1 = recommendations[0];
        const rec2 = recommendations[1];
        
        // At least one component should be different between recommendations
        const componentsMatch = 
          rec1.personalizedScores?.frequency === rec2.personalizedScores?.frequency &&
          rec1.personalizedScores?.recency === rec2.personalizedScores?.recency &&
          rec1.personalizedScores?.feedback === rec2.personalizedScores?.feedback;
        
        expect(componentsMatch).toBe(false);
      }
    });
  });

  describe('Weight Normalization', () => {
    it('should normalize weights to sum to 1.0', async () => {
      // Provide weights that don't sum to 1.0
      await updatePersonalizationSettings({
        recencyWeight: 0.6,
        frequencyWeight: 0.6,
        feedbackWeight: 0.6, // Sum = 1.8
      });
      
      const updateCall = vi.mocked(settingsStore.updateSettings).mock.calls[0][0];
      const weightSum = updateCall.recencyWeight! + updateCall.frequencyWeight! + updateCall.feedbackWeight!;
      
      expect(Math.abs(weightSum - 1.0)).toBeLessThan(0.001);
    });

    it('should handle zero weights by resetting to defaults', async () => {
      await updatePersonalizationSettings({
        recencyWeight: 0,
        frequencyWeight: 0,
        feedbackWeight: 0,
      });
      
      const updateCall = vi.mocked(settingsStore.updateSettings).mock.calls[0][0];
      
      expect(updateCall.recencyWeight).toBe(0.5);
      expect(updateCall.frequencyWeight).toBe(0.3);
      expect(updateCall.feedbackWeight).toBe(0.2);
    });
  });
});