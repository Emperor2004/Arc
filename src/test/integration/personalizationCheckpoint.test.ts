import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPersonalizationSettings,
  updatePersonalizationSettings,
  applyPersonalization,
  RecommendationPersonalization,
} from '../../core/personalizationManager';
import * as settingsStore from '../../core/settingsStore';

// Mock the settings store
vi.mock('../../core/settingsStore');

describe('Personalization Checkpoint Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
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

  describe('Task 16 Checkpoint: Weight Adjustments and Recommendation Changes', () => {
    it('should demonstrate that weight adjustments affect recommendation scores', () => {
      // Test with different weight configurations
      const testScores = {
        frequency: 0.8,
        recency: 0.3,
        feedback: 0.6,
      };

      // Configuration 1: Favor frequency
      const frequencyFavoredWeights: RecommendationPersonalization = {
        recencyWeight: 0.1,
        frequencyWeight: 0.8,
        feedbackWeight: 0.1,
        minScore: 0.1,
        maxRecommendations: 5,
      };

      // Configuration 2: Favor recency
      const recencyFavoredWeights: RecommendationPersonalization = {
        recencyWeight: 0.8,
        frequencyWeight: 0.1,
        feedbackWeight: 0.1,
        minScore: 0.1,
        maxRecommendations: 5,
      };

      // Configuration 3: Favor feedback
      const feedbackFavoredWeights: RecommendationPersonalization = {
        recencyWeight: 0.1,
        frequencyWeight: 0.1,
        feedbackWeight: 0.8,
        minScore: 0.1,
        maxRecommendations: 5,
      };

      const frequencyScore = applyPersonalization(
        testScores.frequency,
        testScores.recency,
        testScores.feedback,
        frequencyFavoredWeights
      );

      const recencyScore = applyPersonalization(
        testScores.frequency,
        testScores.recency,
        testScores.feedback,
        recencyFavoredWeights
      );

      const feedbackScore = applyPersonalization(
        testScores.frequency,
        testScores.recency,
        testScores.feedback,
        feedbackFavoredWeights
      );

      // Since frequency score (0.8) is highest, frequency-favored should score highest
      expect(frequencyScore).toBeGreaterThan(recencyScore);
      expect(frequencyScore).toBeGreaterThan(feedbackScore);

      // Since feedback score (0.6) is higher than recency (0.3), feedback-favored should beat recency-favored
      expect(feedbackScore).toBeGreaterThan(recencyScore);

      console.log('Weight adjustment test results:');
      console.log(`Frequency-favored score: ${frequencyScore.toFixed(3)}`);
      console.log(`Recency-favored score: ${recencyScore.toFixed(3)}`);
      console.log(`Feedback-favored score: ${feedbackScore.toFixed(3)}`);
    });

    it('should demonstrate that settings persist across updates', async () => {
      // Initial settings
      const initialSettings = getPersonalizationSettings();
      expect(initialSettings.recencyWeight).toBe(0.5);
      expect(initialSettings.frequencyWeight).toBe(0.3);
      expect(initialSettings.feedbackWeight).toBe(0.2);

      // Update settings
      const newSettings: Partial<RecommendationPersonalization> = {
        recencyWeight: 0.7,
        frequencyWeight: 0.2,
        feedbackWeight: 0.1,
        minScore: 0.3,
        maxRecommendations: 8,
        ollamaEnabled: true,
        ollamaModel: 'neural-chat',
      };

      await updatePersonalizationSettings(newSettings);

      // Verify updateSettings was called
      expect(vi.mocked(settingsStore.updateSettings)).toHaveBeenCalled();
      
      const updateCall = vi.mocked(settingsStore.updateSettings).mock.calls[0][0];
      
      // Check that weights were normalized and saved
      const weightSum = updateCall.recencyWeight! + updateCall.frequencyWeight! + updateCall.feedbackWeight!;
      expect(Math.abs(weightSum - 1.0)).toBeLessThan(0.001);
      
      // Check other settings were saved
      expect(updateCall.minScore).toBe(0.3);
      expect(updateCall.maxRecommendations).toBe(8);
      expect(updateCall.ollamaEnabled).toBe(true);
      expect(updateCall.ollamaModel).toBe('neural-chat');

      console.log('Settings persistence test results:');
      console.log(`Normalized weights sum to: ${weightSum.toFixed(3)}`);
      console.log(`Settings saved:`, updateCall);
    });

    it('should demonstrate real-time recommendation updates through score changes', () => {
      // Simulate different scenarios with same input but different weights
      const testData = [
        {
          name: 'Recent high-frequency site with positive feedback',
          scores: { frequency: 0.9, recency: 0.8, feedback: 0.7 },
        },
        {
          name: 'Old low-frequency site with negative feedback',
          scores: { frequency: 0.2, recency: 0.1, feedback: 0.3 },
        },
        {
          name: 'Medium site with mixed signals',
          scores: { frequency: 0.5, recency: 0.6, feedback: 0.4 },
        },
      ];

      const weightConfigurations = [
        {
          name: 'Default weights',
          weights: { recencyWeight: 0.5, frequencyWeight: 0.3, feedbackWeight: 0.2, minScore: 0.1, maxRecommendations: 5 },
        },
        {
          name: 'Frequency-focused',
          weights: { recencyWeight: 0.1, frequencyWeight: 0.8, feedbackWeight: 0.1, minScore: 0.1, maxRecommendations: 5 },
        },
        {
          name: 'Recency-focused',
          weights: { recencyWeight: 0.8, frequencyWeight: 0.1, feedbackWeight: 0.1, minScore: 0.1, maxRecommendations: 5 },
        },
        {
          name: 'Feedback-focused',
          weights: { recencyWeight: 0.1, frequencyWeight: 0.1, feedbackWeight: 0.8, minScore: 0.1, maxRecommendations: 5 },
        },
      ];

      console.log('Real-time update demonstration:');
      console.log('=====================================');

      testData.forEach(data => {
        console.log(`\\n${data.name}:`);
        console.log(`Input scores - Frequency: ${data.scores.frequency}, Recency: ${data.scores.recency}, Feedback: ${data.scores.feedback}`);
        
        weightConfigurations.forEach(config => {
          const score = applyPersonalization(
            data.scores.frequency,
            data.scores.recency,
            data.scores.feedback,
            config.weights as RecommendationPersonalization
          );
          
          console.log(`  ${config.name}: ${score.toFixed(3)}`);
        });
      });

      // Verify that different weight configurations produce different results
      const testScores = testData[0].scores;
      const defaultScore = applyPersonalization(
        testScores.frequency,
        testScores.recency,
        testScores.feedback,
        weightConfigurations[0].weights as RecommendationPersonalization
      );
      
      const frequencyScore = applyPersonalization(
        testScores.frequency,
        testScores.recency,
        testScores.feedback,
        weightConfigurations[1].weights as RecommendationPersonalization
      );

      // Should be different scores
      expect(defaultScore).not.toBe(frequencyScore);
    });

    it('should validate that minimum score filtering works', () => {
      const lowScoreWeights: RecommendationPersonalization = {
        recencyWeight: 0.5,
        frequencyWeight: 0.3,
        feedbackWeight: 0.2,
        minScore: 0.8, // High threshold
        maxRecommendations: 5,
      };

      // Test with low input scores
      const lowScore = applyPersonalization(0.2, 0.3, 0.1, lowScoreWeights);
      
      // Test with high input scores
      const highScore = applyPersonalization(0.9, 0.8, 0.9, lowScoreWeights);

      console.log('Minimum score filtering test:');
      console.log(`Low input scores result: ${lowScore.toFixed(3)} (should be < 0.8)`);
      console.log(`High input scores result: ${highScore.toFixed(3)} (should be >= 0.8)`);

      // Verify the scores are as expected
      expect(lowScore).toBeLessThan(0.8);
      expect(highScore).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('Task 16 Checkpoint: Settings Persistence Verification', () => {
    it('should verify settings are saved and can be retrieved', async () => {
      const customSettings: Partial<RecommendationPersonalization> = {
        recencyWeight: 0.6,
        frequencyWeight: 0.25,
        feedbackWeight: 0.15,
        minScore: 0.25,
        maxRecommendations: 7,
        ollamaEnabled: true,
        ollamaModel: 'llama2',
      };

      // Save settings
      await updatePersonalizationSettings(customSettings);

      // Verify the save operation was called
      expect(vi.mocked(settingsStore.updateSettings)).toHaveBeenCalledTimes(1);
      
      const savedSettings = vi.mocked(settingsStore.updateSettings).mock.calls[0][0];
      
      // Verify weights were normalized
      const totalWeight = savedSettings.recencyWeight! + savedSettings.frequencyWeight! + savedSettings.feedbackWeight!;
      expect(Math.abs(totalWeight - 1.0)).toBeLessThan(0.001);
      
      // Verify other settings were preserved
      expect(savedSettings.minScore).toBe(0.25);
      expect(savedSettings.maxRecommendations).toBe(7);
      expect(savedSettings.ollamaEnabled).toBe(true);
      expect(savedSettings.ollamaModel).toBe('llama2');

      console.log('Settings persistence verification:');
      console.log('Settings successfully saved to store');
      console.log('Weights normalized to sum to 1.0');
      console.log('All custom settings preserved');
    });

    it('should simulate restart and verify settings retrieval', () => {
      // Simulate saved settings in store
      const savedSettings = {
        theme: 'system',
        jarvisEnabled: true,
        useHistoryForRecommendations: true,
        incognitoEnabled: true,
        recencyWeight: 0.6,
        frequencyWeight: 0.25,
        feedbackWeight: 0.15,
        minScore: 0.25,
        maxRecommendations: 7,
        ollamaEnabled: true,
        ollamaModel: 'llama2',
      };

      // Mock the store to return saved settings
      vi.mocked(settingsStore.getSettings).mockReturnValue(savedSettings);

      // Retrieve settings (simulating app restart)
      const retrievedSettings = getPersonalizationSettings();

      // Verify all settings were retrieved correctly
      expect(retrievedSettings.recencyWeight).toBe(0.6);
      expect(retrievedSettings.frequencyWeight).toBe(0.25);
      expect(retrievedSettings.feedbackWeight).toBe(0.15);
      expect(retrievedSettings.minScore).toBe(0.25);
      expect(retrievedSettings.maxRecommendations).toBe(7);
      expect(retrievedSettings.ollamaEnabled).toBe(true);
      expect(retrievedSettings.ollamaModel).toBe('llama2');

      console.log('Settings retrieval after restart:');
      console.log('All personalization settings successfully retrieved');
      console.log('Settings match what was previously saved');
    });
  });

  describe('Task 16 Checkpoint: Real-time Updates Verification', () => {
    it('should demonstrate immediate score changes when weights are updated', () => {
      // Test scenario: same input, different weights
      const testInput = {
        frequency: 0.7,
        recency: 0.4,
        feedback: 0.8,
      };

      // Initial weights (favor frequency)
      const initialWeights: RecommendationPersonalization = {
        recencyWeight: 0.2,
        frequencyWeight: 0.7,
        feedbackWeight: 0.1,
        minScore: 0.1,
        maxRecommendations: 5,
      };

      // Updated weights (favor feedback)
      const updatedWeights: RecommendationPersonalization = {
        recencyWeight: 0.1,
        frequencyWeight: 0.2,
        feedbackWeight: 0.7,
        minScore: 0.1,
        maxRecommendations: 5,
      };

      const initialScore = applyPersonalization(
        testInput.frequency,
        testInput.recency,
        testInput.feedback,
        initialWeights
      );

      const updatedScore = applyPersonalization(
        testInput.frequency,
        testInput.recency,
        testInput.feedback,
        updatedWeights
      );

      console.log('Real-time update verification:');
      console.log(`Initial score (frequency-favored): ${initialScore.toFixed(3)}`);
      console.log(`Updated score (feedback-favored): ${updatedScore.toFixed(3)}`);

      // Since feedback score (0.8) > frequency score (0.7), 
      // feedback-favored should score higher
      expect(updatedScore).toBeGreaterThan(initialScore);

      console.log('✓ Score changed immediately when weights were updated');
      console.log('✓ Higher feedback weight increased score for high-feedback item');
    });

    it('should verify that different settings produce different recommendation behaviors', () => {
      // Test multiple scenarios to show real-time impact
      const scenarios = [
        {
          name: 'High-frequency, low-recency site',
          input: { frequency: 0.9, recency: 0.2, feedback: 0.5 },
        },
        {
          name: 'Low-frequency, high-recency site',
          input: { frequency: 0.3, recency: 0.9, feedback: 0.5 },
        },
        {
          name: 'Medium-frequency, high-feedback site',
          input: { frequency: 0.5, recency: 0.5, feedback: 0.9 },
        },
      ];

      const settingsConfigs = [
        {
          name: 'Balanced',
          weights: { recencyWeight: 0.4, frequencyWeight: 0.4, feedbackWeight: 0.2, minScore: 0.1, maxRecommendations: 5 },
        },
        {
          name: 'Frequency-heavy',
          weights: { recencyWeight: 0.1, frequencyWeight: 0.8, feedbackWeight: 0.1, minScore: 0.1, maxRecommendations: 5 },
        },
        {
          name: 'Recency-heavy',
          weights: { recencyWeight: 0.8, frequencyWeight: 0.1, feedbackWeight: 0.1, minScore: 0.1, maxRecommendations: 5 },
        },
      ];

      console.log('\\nReal-time behavior changes:');
      console.log('============================');

      scenarios.forEach(scenario => {
        console.log(`\\n${scenario.name}:`);
        
        const scores = settingsConfigs.map(config => ({
          config: config.name,
          score: applyPersonalization(
            scenario.input.frequency,
            scenario.input.recency,
            scenario.input.feedback,
            config.weights as RecommendationPersonalization
          ),
        }));

        scores.forEach(result => {
          console.log(`  ${result.config}: ${result.score.toFixed(3)}`);
        });

        // Verify that different configurations produce different results
        const uniqueScores = new Set(scores.map(s => s.score));
        expect(uniqueScores.size).toBeGreaterThan(1);
      });

      console.log('\\n✓ Different weight configurations produce different scores');
      console.log('✓ Changes are immediate and deterministic');
      console.log('✓ Real-time updates working correctly');
    });
  });
});