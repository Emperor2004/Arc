import { RecommendationFeedback } from './types';
import * as fs from 'fs';
import * as path from 'path';

const FEEDBACK_FILE = path.join(process.env.APPDATA || process.env.HOME || '.', 'arc-browser', 'data', 'feedback.json');

// Ensure directory exists
function ensureDir() {
  const dir = path.dirname(FEEDBACK_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Load feedback from file
 */
function loadFeedback(): RecommendationFeedback[] {
  try {
    ensureDir();
    if (fs.existsSync(FEEDBACK_FILE)) {
      const data = fs.readFileSync(FEEDBACK_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading feedback:', error);
  }
  return [];
}

/**
 * Save feedback to file
 */
function saveFeedback(feedback: RecommendationFeedback[]): void {
  try {
    ensureDir();
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedback, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving feedback:', error);
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
