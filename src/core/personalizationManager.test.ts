import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPersonalizationSettings,
  updatePersonalizationSettings,
  applyPersonalization,
  getOllamaModels,
  meetsMinimumScore,
  validatePersonalizationSettings,
  resetPersonalizationSettings,
  RecommendationPersonalization,
} from './personalizationManager';
import * as settingsStore from './settingsStore';

// Mock the settings store
vi.mock('./settingsStore');

describe('PersonalizationManager Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPersonalizationSettings', () => {
    it('should return default settings when no personalization settings exist', () => {
      vi.mocked(settingsStore.getSettings).mockReturnValue({
        theme: 'system',
        jarvisEnabled: true,
        useHistoryForRecommendations: true,
        incognitoEnabled: true,
      });

      const settings = getPersonalizationSettings();

      expect(settings.recencyWeight).toBe(0.5);
      expect(settings.frequencyWeight).toBe(0.3);
      expect(settings.feedbackWeight).toBe(0.2);
      expect(settings.minScore).toBe(0.1);
      expect(settings.maxRecommendations).toBe(5);
      expect(settings.ollamaModel).toBe('mistral');
      expect(settings.ollamaEnabled).toBe(false);
    });

    it('should return saved personalization settings', () => {
      vi.mocked(settingsStore.getSettings).mockReturnValue({
        theme: 'system',
        jarvisEnabled: true,
        useHistoryForRecommendations: true,
        incognitoEnabled: true,
        recencyWeight: 0.6,
        frequencyWeight: 0.3,
        feedbackWeight: 0.1,
        minScore: 0.2,
        maxRecommendations: 10,
        ollamaModel: 'neural-chat',
        ollamaEnabled: true,
      });

      const settings = getPersonalizationSettings();

      expect(settings.recencyWeight).toBe(0.6);
      expect(settings.frequencyWeight).toBe(0.3);
      expect(settings.feedbackWeight).toBe(0.1);
      expect(settings.minScore).toBe(0.2);
      expect(settings.maxRecommendations).toBe(10);
      expect(settings.ollamaModel).toBe('neural-chat');
      expect(settings.ollamaEnabled).toBe(true);
    });

    it('should merge partial settings with defaults', () => {
      vi.mocked(settingsStore.getSettings).mockReturnValue({
        theme: 'system',
        jarvisEnabled: true,
        useHistoryForRecommendations: true,
        incognitoEnabled: true,
        recencyWeight: 0.7,
        // Other personalization settings missing
      });

      const settings = getPersonalizationSettings();

      expect(settings.recencyWeight).toBe(0.7);
      expect(settings.frequencyWeight).toBe(0.3); // Default
      expect(settings.feedbackWeight).toBe(0.2); // Default
    });
  });

  describe('updatePersonalizationSettings', () => {
    beforeEach(() => {
      vi.mocked(settingsStore.getSettings).mockReturnValue({
        theme: 'system',
        jarvisEnabled: true,
        useHistoryForRecommendations: true,
        incognitoEnabled: true,
        recencyWeight: 0.5,
        frequencyWeight: 0.3,
        feedbackWeight: 0.2,
      });
      vi.mocked(settingsStore.updateSettings).mockImplementation(() => ({}));
    });

    it('should update single weight and normalize all weights', async () => {
      await updatePersonalizationSettings({ recencyWeight: 0.8 });

      const updateCall = vi.mocked(settingsStore.updateSettings).mock.calls[0][0];
      
      // Weights should be normalized to sum to 1.0
      const totalWeight = updateCall.recencyWeight! + updateCall.frequencyWeight! + updateCall.feedbackWeight!;
      expect(Math.abs(totalWeight - 1.0)).toBeLessThan(0.001);
      expect(updateCall.recencyWeight).toBeCloseTo(0.8 / 1.3); // 0.8 / (0.8 + 0.3 + 0.2)
    });

    it('should update multiple weights and normalize', async () => {
      await updatePersonalizationSettings({ 
        recencyWeight: 0.6, 
        frequencyWeight: 0.4 
      });

      const updateCall = vi.mocked(settingsStore.updateSettings).mock.calls[0][0];
      
      const totalWeight = updateCall.recencyWeight! + updateCall.frequencyWeight! + updateCall.feedbackWeight!;
      expect(Math.abs(totalWeight - 1.0)).toBeLessThan(0.001);
    });

    it('should update non-weight settings without normalization', async () => {
      await updatePersonalizationSettings({ 
        maxRecommendations: 10,
        ollamaEnabled: true 
      });

      const updateCall = vi.mocked(settingsStore.updateSettings).mock.calls[0][0];
      
      expect(updateCall.maxRecommendations).toBe(10);
      expect(updateCall.ollamaEnabled).toBe(true);
      expect(updateCall.recencyWeight).toBeUndefined();
    });

    it('should validate weight ranges', async () => {
      await expect(updatePersonalizationSettings({ recencyWeight: -0.1 }))
        .rejects.toThrow('recencyWeight must be between 0 and 1');
      
      await expect(updatePersonalizationSettings({ frequencyWeight: 1.1 }))
        .rejects.toThrow('frequencyWeight must be between 0 and 1');
      
      await expect(updatePersonalizationSettings({ feedbackWeight: -0.5 }))
        .rejects.toThrow('feedbackWeight must be between 0 and 1');
    });

    it('should validate minScore range', async () => {
      await expect(updatePersonalizationSettings({ minScore: -0.1 }))
        .rejects.toThrow('minScore must be between 0 and 1');
      
      await expect(updatePersonalizationSettings({ minScore: 1.1 }))
        .rejects.toThrow('minScore must be between 0 and 1');
    });

    it('should validate maxRecommendations range', async () => {
      await expect(updatePersonalizationSettings({ maxRecommendations: 0 }))
        .rejects.toThrow('maxRecommendations must be between 1 and 20');
      
      await expect(updatePersonalizationSettings({ maxRecommendations: 21 }))
        .rejects.toThrow('maxRecommendations must be between 1 and 20');
    });

    it('should reset to defaults when all weights are zero', async () => {
      await updatePersonalizationSettings({ 
        recencyWeight: 0, 
        frequencyWeight: 0, 
        feedbackWeight: 0 
      });

      const updateCall = vi.mocked(settingsStore.updateSettings).mock.calls[0][0];
      
      expect(updateCall.recencyWeight).toBe(0.5);
      expect(updateCall.frequencyWeight).toBe(0.3);
      expect(updateCall.feedbackWeight).toBe(0.2);
    });
  });

  describe('applyPersonalization', () => {
    const defaultWeights: RecommendationPersonalization = {
      recencyWeight: 0.5,
      frequencyWeight: 0.3,
      feedbackWeight: 0.2,
      minScore: 0.1,
      maxRecommendations: 5,
    };

    it('should apply weighted combination correctly', () => {
      const score = applyPersonalization(0.8, 0.6, 0.4, defaultWeights);
      
      const expected = (0.8 * 0.3) + (0.6 * 0.5) + (0.4 * 0.2);
      expect(score).toBeCloseTo(expected);
    });

    it('should clamp input scores to [0, 1] range', () => {
      const score = applyPersonalization(-0.5, 1.5, 0.5, defaultWeights);
      
      // Should clamp -0.5 to 0 and 1.5 to 1
      const expected = (0 * 0.3) + (1 * 0.5) + (0.5 * 0.2);
      expect(score).toBeCloseTo(expected);
    });

    it('should return score in [0, 1] range', () => {
      const score = applyPersonalization(1, 1, 1, defaultWeights);
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle NaN inputs gracefully', () => {
      const score = applyPersonalization(NaN, 0.5, 0.5, defaultWeights);
      
      expect(Number.isNaN(score)).toBe(false);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should work with different weight combinations', () => {
      const customWeights: RecommendationPersonalization = {
        recencyWeight: 0.7,
        frequencyWeight: 0.2,
        feedbackWeight: 0.1,
        minScore: 0.1,
        maxRecommendations: 5,
      };

      const score = applyPersonalization(0.5, 0.8, 0.3, customWeights);
      
      const expected = (0.5 * 0.2) + (0.8 * 0.7) + (0.3 * 0.1);
      expect(score).toBeCloseTo(expected);
    });
  });

  describe('getOllamaModels', () => {
    it('should return list of available models', async () => {
      const models = await getOllamaModels();
      
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      // Check that at least one expected model is present
      expect(models.some(model => model.includes('mistral'))).toBe(true);
    });
  });

  describe('meetsMinimumScore', () => {
    const settings: RecommendationPersonalization = {
      recencyWeight: 0.5,
      frequencyWeight: 0.3,
      feedbackWeight: 0.2,
      minScore: 0.3,
      maxRecommendations: 5,
    };

    it('should return true for scores above minimum', () => {
      expect(meetsMinimumScore(0.5, settings)).toBe(true);
      expect(meetsMinimumScore(0.3, settings)).toBe(true);
    });

    it('should return false for scores below minimum', () => {
      expect(meetsMinimumScore(0.2, settings)).toBe(false);
      expect(meetsMinimumScore(0.1, settings)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(meetsMinimumScore(0, settings)).toBe(false);
      expect(meetsMinimumScore(1, settings)).toBe(true);
    });
  });

  describe('validatePersonalizationSettings', () => {
    it('should return no errors for valid settings', () => {
      const validSettings: RecommendationPersonalization = {
        recencyWeight: 0.5,
        frequencyWeight: 0.3,
        feedbackWeight: 0.2,
        minScore: 0.1,
        maxRecommendations: 5,
      };

      const errors = validatePersonalizationSettings(validSettings);
      expect(errors).toEqual([]);
    });

    it('should detect invalid weight ranges', () => {
      const invalidSettings: RecommendationPersonalization = {
        recencyWeight: -0.1,
        frequencyWeight: 1.1,
        feedbackWeight: 0.2,
        minScore: 0.1,
        maxRecommendations: 5,
      };

      const errors = validatePersonalizationSettings(invalidSettings);
      expect(errors).toContain('recencyWeight must be between 0 and 1');
      expect(errors).toContain('frequencyWeight must be between 0 and 1');
    });

    it('should detect invalid minScore range', () => {
      const invalidSettings: RecommendationPersonalization = {
        recencyWeight: 0.5,
        frequencyWeight: 0.3,
        feedbackWeight: 0.2,
        minScore: 1.5,
        maxRecommendations: 5,
      };

      const errors = validatePersonalizationSettings(invalidSettings);
      expect(errors).toContain('minScore must be between 0 and 1');
    });

    it('should detect invalid maxRecommendations range', () => {
      const invalidSettings: RecommendationPersonalization = {
        recencyWeight: 0.5,
        frequencyWeight: 0.3,
        feedbackWeight: 0.2,
        minScore: 0.1,
        maxRecommendations: 25,
      };

      const errors = validatePersonalizationSettings(invalidSettings);
      expect(errors).toContain('maxRecommendations must be between 1 and 20');
    });

    it('should detect weights that do not sum to 1.0', () => {
      const invalidSettings: RecommendationPersonalization = {
        recencyWeight: 0.5,
        frequencyWeight: 0.3,
        feedbackWeight: 0.3, // Sum = 1.1
        minScore: 0.1,
        maxRecommendations: 5,
      };

      const errors = validatePersonalizationSettings(invalidSettings);
      expect(errors).toContain('weights must sum to 1.0');
    });
  });

  describe('resetPersonalizationSettings', () => {
    it('should reset all settings to defaults', () => {
      vi.mocked(settingsStore.updateSettings).mockImplementation(() => ({}));

      const reset = resetPersonalizationSettings();

      expect(reset.recencyWeight).toBe(0.5);
      expect(reset.frequencyWeight).toBe(0.3);
      expect(reset.feedbackWeight).toBe(0.2);
      expect(reset.minScore).toBe(0.1);
      expect(reset.maxRecommendations).toBe(5);
      expect(reset.ollamaModel).toBe('mistral');
      expect(reset.ollamaEnabled).toBe(false);
    });

    it('should save reset settings to store', () => {
      vi.mocked(settingsStore.updateSettings).mockImplementation(() => ({}));

      resetPersonalizationSettings();

      const updateCall = vi.mocked(settingsStore.updateSettings).mock.calls[0][0];
      expect(updateCall.recencyWeight).toBe(0.5);
      expect(updateCall.frequencyWeight).toBe(0.3);
      expect(updateCall.feedbackWeight).toBe(0.2);
    });
  });
});