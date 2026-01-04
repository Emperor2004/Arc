import { join, dirname } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { HistoryEntry } from './types';

// Use a local data folder in the project root for dev mode
// This avoids issues with Electron's app module not being ready
const DATA_DIR = join(__dirname, '..', '..', 'data');
const HISTORY_FILE = join(DATA_DIR, 'history.json');

// ===== Internal Helpers =====

/**
 * Load history from JSON file
 */
const loadHistory = (): HistoryEntry[] => {
  try {
    if (existsSync(HISTORY_FILE)) {
      const raw = readFileSync(HISTORY_FILE, 'utf-8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.error('Failed to load history:', err);
  }
  return [];
};

/**
 * Save history to JSON file
 */
const saveHistory = (entries: HistoryEntry[]): void => {
  try {
    // Ensure data directory exists
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    writeFileSync(HISTORY_FILE, JSON.stringify(entries, null, 2));
  } catch (err) {
    console.error('Failed to save history:', err);
  }
};

/**
 * Get next available ID (emulates autoincrement)
 */
const getNextId = (entries: HistoryEntry[]): number => {
  if (entries.length === 0) return 1;
  return Math.max(...entries.map(e => e.id)) + 1;
};

// ===== Public API =====

/**
 * Record a page visit. If URL exists, increment visit_count and update visited_at.
 * Otherwise insert a new entry.
 */
export async function recordVisit(url: string, title: string | null): Promise<void> {
  try {
    // Normalize URL
    const normalizedUrl = url?.trim();
    if (!normalizedUrl) {
      console.warn('recordVisit: empty URL, skipping');
      return;
    }

    const entries = loadHistory();
    const visitedAt = Date.now();
    const existingIndex = entries.findIndex(e => e.url === normalizedUrl);

    if (existingIndex >= 0) {
      // Update existing entry
      entries[existingIndex] = {
        ...entries[existingIndex],
        title: title || entries[existingIndex].title,
        visited_at: visitedAt,
        visit_count: entries[existingIndex].visit_count + 1
      };
    } else {
      // Insert new entry
      entries.push({
        id: getNextId(entries),
        url: normalizedUrl,
        title,
        visited_at: visitedAt,
        visit_count: 1
      });
    }

    saveHistory(entries);
    console.log(`Recorded visit: ${normalizedUrl}`);
  } catch (err) {
    console.error('Failed to record visit:', err);
  }
}

/**
 * Get recent history entries ordered by visited_at DESC.
 */
export async function getRecentHistory(limit: number = 50): Promise<HistoryEntry[]> {
  try {
    const entries = loadHistory();
    return entries
      .sort((a, b) => b.visited_at - a.visited_at)
      .slice(0, limit);
  } catch (err) {
    console.error('Failed to get recent history:', err);
    return [];
  }
}
