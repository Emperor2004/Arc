import { join, dirname } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { RecommendationFeedback } from './types';

// Use a local data folder in the project root for dev mode
// This avoids issues with Electron's app module not being ready
const DATA_DIR = join(__dirname, '..', '..', 'data');
const FEEDBACK_FILE = join(DATA_DIR, 'feedback.json');

// ===== Internal Helpers =====

/**
 * Load feedback from JSON file
 */
const loadFeedback = (): RecommendationFeedback[] => {
  try {
    if (existsSync(FEEDBACK_FILE)) {
      const raw = readFileSync(FEEDBACK_FILE, 'utf-8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.error('Failed to load feedback:', err);
  }
  return [];
};

/**
 * Save feedback to JSON file
 */
const saveFeedback = (entries: RecommendationFeedback[]): void => {
  try {
    // Ensure data directory exists
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    writeFileSync(FEEDBACK_FILE, JSON.stringify(entries, null, 2));
  } catch (err) {
    console.error('Failed to save feedback:', err);
  }
};

// ===== Public API =====

/**
 * Record feedback for a recommendation.
 * Appends the feedback entry to the existing feedback array.
 */
export async function recordFeedback(entry: RecommendationFeedback): Promise<void> {
  try {
    // Validate entry
    if (!entry || !entry.url || !entry.value) {
      console.warn('recordFeedback: invalid feedback entry, skipping');
      return;
    }

    const entries = loadFeedback();
    
    // Add timestamp if not provided
    const feedbackEntry: RecommendationFeedback = {
      ...entry,
      created_at: entry.created_at || Date.now()
    };

    // Append new feedback entry
    entries.push(feedbackEntry);

    saveFeedback(entries);
    console.log(`Recorded feedback: ${entry.value} for ${entry.url}`);
  } catch (err) {
    console.error('Failed to record feedback:', err);
  }
}

/**
 * Get all feedback entries ordered by created_at DESC.
 */
export async function getAllFeedback(): Promise<RecommendationFeedback[]> {
  try {
    const entries = loadFeedback();
    return entries.sort((a, b) => b.created_at - a.created_at);
  } catch (err) {
    console.error('Failed to get all feedback:', err);
    return [];
  }
}