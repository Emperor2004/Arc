import { getSettings, updateSettings } from './settingsStore';

// Import clearRecommendationCache to invalidate cache when settings change
let clearRecommendationCache: (() => void) | null = null;

// Lazy import to avoid circular dependency
const getClearCacheFunction = async () => {
    if (!clearRecommendationCache) {
        const recommenderModule = await import('./recommender');
        clearRecommendationCache = recommenderModule.clearRecommendationCache;
    }
    return clearRecommendationCache;
};

export interface RecommendationPersonalization {
  recencyWeight: number;      // 0.0 to 1.0, default 0.5
  frequencyWeight: number;    // 0.0 to 1.0, default 0.3
  feedbackWeight: number;     // 0.0 to 1.0, default 0.2
  minScore: number;           // 0.0 to 1.0, default 0.1
  maxRecommendations: number; // 1 to 20, default 5
  ollamaModel?: string;       // Ollama model name (e.g., 'mistral', 'neural-chat')
  ollamaEnabled?: boolean;    // Enable Ollama for enhanced recommendations
}

export interface PersonalizationManager {
  getSettings(): RecommendationPersonalization;
  updateSettings(updates: Partial<RecommendationPersonalization>): Promise<void>;
  applyPersonalization(baseScore: number, weights: RecommendationPersonalization): number;
  getOllamaModels(): Promise<string[]>;
}

const DEFAULT_PERSONALIZATION: RecommendationPersonalization = {
  recencyWeight: 0.5,
  frequencyWeight: 0.3,
  feedbackWeight: 0.2,
  minScore: 0.1,
  maxRecommendations: 5,
  ollamaModel: 'mistral',
  ollamaEnabled: false,
};

/**
 * Get current personalization settings
 */
export function getPersonalizationSettings(): RecommendationPersonalization {
  const settings = getSettings();
  
  // Extract personalization settings from main settings, use defaults if not present
  return {
    recencyWeight: settings.recencyWeight ?? DEFAULT_PERSONALIZATION.recencyWeight,
    frequencyWeight: settings.frequencyWeight ?? DEFAULT_PERSONALIZATION.frequencyWeight,
    feedbackWeight: settings.feedbackWeight ?? DEFAULT_PERSONALIZATION.feedbackWeight,
    minScore: settings.minScore ?? DEFAULT_PERSONALIZATION.minScore,
    maxRecommendations: settings.maxRecommendations ?? DEFAULT_PERSONALIZATION.maxRecommendations,
    ollamaModel: settings.ollamaModel ?? DEFAULT_PERSONALIZATION.ollamaModel,
    ollamaEnabled: settings.ollamaEnabled ?? DEFAULT_PERSONALIZATION.ollamaEnabled,
  };
}

/**
 * Update personalization settings
 */
export async function updatePersonalizationSettings(updates: Partial<RecommendationPersonalization>): Promise<void> {
  // Validate weight values are in range [0, 1]
  if (updates.recencyWeight !== undefined && (updates.recencyWeight < 0 || updates.recencyWeight > 1)) {
    throw new Error('recencyWeight must be between 0 and 1');
  }
  if (updates.frequencyWeight !== undefined && (updates.frequencyWeight < 0 || updates.frequencyWeight > 1)) {
    throw new Error('frequencyWeight must be between 0 and 1');
  }
  if (updates.feedbackWeight !== undefined && (updates.feedbackWeight < 0 || updates.feedbackWeight > 1)) {
    throw new Error('feedbackWeight must be between 0 and 1');
  }
  if (updates.minScore !== undefined && (updates.minScore < 0 || updates.minScore > 1)) {
    throw new Error('minScore must be between 0 and 1');
  }
  if (updates.maxRecommendations !== undefined && (updates.maxRecommendations < 1 || updates.maxRecommendations > 20)) {
    throw new Error('maxRecommendations must be between 1 and 20');
  }

  // Normalize weights to sum to 1.0 if all three are provided
  let normalizedUpdates = { ...updates };
  const current = getPersonalizationSettings();
  
  const newRecency = updates.recencyWeight ?? current.recencyWeight;
  const newFrequency = updates.frequencyWeight ?? current.frequencyWeight;
  const newFeedback = updates.feedbackWeight ?? current.feedbackWeight;
  
  // If any weight is updated, normalize all weights to sum to 1.0
  if (updates.recencyWeight !== undefined || updates.frequencyWeight !== undefined || updates.feedbackWeight !== undefined) {
    const totalWeight = newRecency + newFrequency + newFeedback;
    
    if (totalWeight > 0) {
      normalizedUpdates.recencyWeight = newRecency / totalWeight;
      normalizedUpdates.frequencyWeight = newFrequency / totalWeight;
      normalizedUpdates.feedbackWeight = newFeedback / totalWeight;
    } else {
      // If all weights are 0, reset to defaults
      normalizedUpdates.recencyWeight = DEFAULT_PERSONALIZATION.recencyWeight;
      normalizedUpdates.frequencyWeight = DEFAULT_PERSONALIZATION.frequencyWeight;
      normalizedUpdates.feedbackWeight = DEFAULT_PERSONALIZATION.feedbackWeight;
    }
  }

  // Update the main settings store
  updateSettings(normalizedUpdates);
  
  // Clear recommendation cache since settings changed
  try {
    const clearCache = await getClearCacheFunction();
    clearCache();
  } catch (error) {
    console.warn('Failed to clear recommendation cache:', error);
  }
}

/**
 * Apply personalization weights to a base recommendation score
 * This function combines frequency, recency, and feedback scores using the personalized weights
 */
export function applyPersonalization(
  frequencyScore: number,
  recencyScore: number,
  feedbackScore: number,
  weights: RecommendationPersonalization
): number {
  // Validate input scores are in range [0, 1]
  const clampedFrequency = Math.max(0, Math.min(1, frequencyScore));
  const clampedRecency = Math.max(0, Math.min(1, recencyScore));
  const clampedFeedback = Math.max(0, Math.min(1, feedbackScore));
  
  // Apply weighted combination
  const personalizedScore = 
    (clampedFrequency * weights.frequencyWeight) +
    (clampedRecency * weights.recencyWeight) +
    (clampedFeedback * weights.feedbackWeight);
  
  // Ensure result is in valid range [0, 1]
  const finalScore = Math.max(0, Math.min(1, personalizedScore));
  
  // Handle NaN case
  return Number.isNaN(finalScore) ? 0 : finalScore;
}

/**
 * Get available Ollama models
 * This is a placeholder implementation - in a real system this would query Ollama API
 */
export async function getOllamaModels(): Promise<string[]> {
  // Placeholder implementation - would normally query Ollama API
  // For now, return common model names
  return [
    'mistral',
    'neural-chat',
    'llama2',
    'codellama',
    'vicuna',
    'orca-mini',
  ];
}

/**
 * Check if a score meets the minimum threshold
 */
export function meetsMinimumScore(score: number, settings: RecommendationPersonalization): boolean {
  return score >= settings.minScore;
}

/**
 * Validate personalization settings
 */
export function validatePersonalizationSettings(settings: RecommendationPersonalization): string[] {
  const errors: string[] = [];
  
  if (settings.recencyWeight < 0 || settings.recencyWeight > 1) {
    errors.push('recencyWeight must be between 0 and 1');
  }
  if (settings.frequencyWeight < 0 || settings.frequencyWeight > 1) {
    errors.push('frequencyWeight must be between 0 and 1');
  }
  if (settings.feedbackWeight < 0 || settings.feedbackWeight > 1) {
    errors.push('feedbackWeight must be between 0 and 1');
  }
  if (settings.minScore < 0 || settings.minScore > 1) {
    errors.push('minScore must be between 0 and 1');
  }
  if (settings.maxRecommendations < 1 || settings.maxRecommendations > 20) {
    errors.push('maxRecommendations must be between 1 and 20');
  }
  
  // Check if weights sum to approximately 1.0 (allow small floating point errors)
  const weightSum = settings.recencyWeight + settings.frequencyWeight + settings.feedbackWeight;
  if (Math.abs(weightSum - 1.0) > 0.001) {
    errors.push('weights must sum to 1.0');
  }
  
  return errors;
}

/**
 * Reset personalization settings to defaults
 */
export function resetPersonalizationSettings(): RecommendationPersonalization {
  updateSettings({
    recencyWeight: DEFAULT_PERSONALIZATION.recencyWeight,
    frequencyWeight: DEFAULT_PERSONALIZATION.frequencyWeight,
    feedbackWeight: DEFAULT_PERSONALIZATION.feedbackWeight,
    minScore: DEFAULT_PERSONALIZATION.minScore,
    maxRecommendations: DEFAULT_PERSONALIZATION.maxRecommendations,
    ollamaModel: DEFAULT_PERSONALIZATION.ollamaModel,
    ollamaEnabled: DEFAULT_PERSONALIZATION.ollamaEnabled,
  });
  
  return DEFAULT_PERSONALIZATION;
}