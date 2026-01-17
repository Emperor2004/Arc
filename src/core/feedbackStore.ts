import { RecommendationFeedback } from './types';

// Browser-safe feedback storage using localStorage
const FEEDBACK_KEY = 'arc-browser-feedback';

/**
 * Load feedback from localStorage
 */
function loadFeedback(): RecommendationFeedback[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(FEEDBACK_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (error) {
    console.error('Error loading feedback from localStorage:', error);
  }
  return [];
}

/**
 * Save feedback to localStorage
 */
function saveFeedback(feedback: RecommendationFeedback[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedback));
    }
  } catch (error) {
    console.error('Error saving feedback to localStorage:', error);
  }
}

/**
 * Add feedback entry
 */
export function addFeedback(url: string, value: 'like' | 'dislike'): RecommendationFeedback {
  const feedback = loadFeedback();
  const newEntry: RecommendationFeedback = {
    id: feedback.length > 0 ? Math.max(...feedback.map(f => f.id)) + 1 : 1,
    url,
    value,
    created_at: Date.now(),
  };
  feedback.push(newEntry);
  saveFeedback(feedback);
  return newEntry;
}

/**
 * Get all feedback entries
 */
export async function getAllFeedback(): Promise<RecommendationFeedback[]> {
  return loadFeedback();
}

/**
 * Get feedback for a specific URL
 */
export async function getFeedbackByUrl(url: string): Promise<RecommendationFeedback[]> {
  const feedback = loadFeedback();
  return feedback.filter(f => f.url === url);
}

/**
 * Clear all feedback
 */
export function clearFeedback(): void {
  saveFeedback([]);
}

/**
 * Remove feedback entry by ID
 */
export function removeFeedback(id: number): void {
  const feedback = loadFeedback();
  const filtered = feedback.filter(f => f.id !== id);
  saveFeedback(filtered);
}

/**
 * Get feedback statistics for a URL
 */
export async function getFeedbackStats(url: string): Promise<{ likes: number; dislikes: number }> {
  const feedback = await getFeedbackByUrl(url);
  return {
    likes: feedback.filter(f => f.value === 'like').length,
    dislikes: feedback.filter(f => f.value === 'dislike').length,
  };
}
