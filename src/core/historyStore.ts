import { HistoryEntry } from './types';
import * as fs from 'fs';
import * as path from 'path';

const HISTORY_FILE = path.join(process.env.APPDATA || process.env.HOME || '.', 'arc-browser', 'data', 'history.json');

// Ensure directory exists
function ensureDir() {
  const dir = path.dirname(HISTORY_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Load history from file
 */
function loadHistory(): HistoryEntry[] {
  try {
    ensureDir();
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading history:', error);
  }
  return [];
}

/**
 * Save history to file
 */
function saveHistory(history: HistoryEntry[]): void {
  try {
    ensureDir();
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving history:', error);
  }
}

/**
 * Add or update a history entry
 */
export function addHistoryEntry(url: string, title: string): HistoryEntry {
  const history = loadHistory();
  const existingIndex = history.findIndex(h => h.url === url);

  if (existingIndex >= 0) {
    // Update existing entry
    history[existingIndex].visit_count++;
    history[existingIndex].visited_at = Date.now();
    if (title) {
      history[existingIndex].title = title;
    }
  } else {
    // Add new entry
    const newEntry: HistoryEntry = {
      id: history.length > 0 ? Math.max(...history.map(h => h.id)) + 1 : 1,
      url,
      title: title || null,
      visited_at: Date.now(),
      visit_count: 1,
    };
    history.push(newEntry);
  }

  saveHistory(history);
  return history[existingIndex >= 0 ? existingIndex : history.length - 1];
}

/**
 * Get recent history entries
 */
export async function getRecentHistory(limit: number = 200): Promise<HistoryEntry[]> {
  const history = loadHistory();
  return history
    .sort((a, b) => b.visited_at - a.visited_at)
    .slice(0, limit);
}

/**
 * Get all history entries
 */
export async function getAllHistory(): Promise<HistoryEntry[]> {
  return loadHistory();
}

/**
 * Clear all history
 */
export function clearHistory(): void {
  saveHistory([]);
}

/**
 * Remove a specific history entry
 */
export function removeHistoryEntry(url: string): void {
  const history = loadHistory();
  const filtered = history.filter(h => h.url !== url);
  saveHistory(filtered);
}

/**
 * Search history by URL or title
 */
export async function searchHistory(query: string): Promise<HistoryEntry[]> {
  const history = loadHistory();
  const lowerQuery = query.toLowerCase();
  return history.filter(
    h =>
      h.url.toLowerCase().includes(lowerQuery) ||
      (h.title && h.title.toLowerCase().includes(lowerQuery))
  );
}
