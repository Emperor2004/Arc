import * as historyStore from './historyStore';
import * as feedbackStore from './feedbackStore';
import * as bookmarkStore from './bookmarkStore';
import * as settingsStore from './settingsStore';

export interface ExportData {
  version: string;
  timestamp: number;
  history: Array<{ url: string; title: string | null; visited_at: number }>;
  feedback: Array<{ url: string; value: 'like' | 'dislike'; created_at: number }>;
  bookmarks: Array<{ url: string; title: string; createdAt: number }>;
  settings: Record<string, unknown>;
}

export type ImportMode = 'merge' | 'replace';

/**
 * Export all data to a JSON object
 */
export async function exportData(): Promise<ExportData> {
  const history = await historyStore.getAllHistory();
  const feedback = await feedbackStore.getAllFeedback();
  const bookmarks = await bookmarkStore.getAllBookmarks();
  const settings = settingsStore.getSettings();

  return {
    version: '1.0.0',
    timestamp: Date.now(),
    history: history.map(entry => ({
      url: entry.url,
      title: entry.title,
      visited_at: entry.visited_at,
    })),
    feedback: feedback.map(entry => ({
      url: entry.url,
      value: entry.value,
      created_at: entry.created_at,
    })),
    bookmarks: bookmarks.map(entry => ({
      url: entry.url,
      title: entry.title,
      createdAt: entry.createdAt,
    })),
    settings: settings as unknown as Record<string, unknown>,
  };
}

/**
 * Validate export data format
 */
export function validateExportData(data: unknown): data is ExportData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Check required fields
  if (typeof obj.version !== 'string') {
    return false;
  }

  if (typeof obj.timestamp !== 'number' || obj.timestamp <= 0) {
    return false;
  }

  // Check arrays
  if (!Array.isArray(obj.history)) {
    return false;
  }

  if (!Array.isArray(obj.feedback)) {
    return false;
  }

  if (!Array.isArray(obj.bookmarks)) {
    return false;
  }

  if (typeof obj.settings !== 'object' || obj.settings === null) {
    return false;
  }

  // Validate history entries
  for (const entry of obj.history as unknown[]) {
    if (typeof entry !== 'object' || entry === null) {
      return false;
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.url !== 'string' || (e.title !== null && typeof e.title !== 'string') || typeof e.visited_at !== 'number') {
      return false;
    }
  }

  // Validate feedback entries
  for (const entry of obj.feedback as unknown[]) {
    if (typeof entry !== 'object' || entry === null) {
      return false;
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.url !== 'string' || (e.value !== 'like' && e.value !== 'dislike') || typeof e.created_at !== 'number') {
      return false;
    }
  }

  // Validate bookmark entries
  for (const entry of obj.bookmarks as unknown[]) {
    if (typeof entry !== 'object' || entry === null) {
      return false;
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.url !== 'string' || typeof e.title !== 'string' || typeof e.createdAt !== 'number') {
      return false;
    }
  }

  return true;
}

/**
 * Import data with merge or replace mode
 */
export async function importData(data: ExportData, mode: ImportMode = 'merge'): Promise<void> {
  if (!validateExportData(data)) {
    throw new Error('Invalid export data format');
  }

  if (mode === 'replace') {
    // Clear existing data
    historyStore.clearHistory();
    feedbackStore.clearFeedback();
    bookmarkStore.clearBookmarks();
  }

  // Import history
  for (const entry of data.history) {
    historyStore.addHistoryEntry(entry.url, entry.title || '');
  }

  // Import feedback
  for (const entry of data.feedback) {
    feedbackStore.addFeedback(entry.url, entry.value);
  }

  // Import bookmarks
  for (const entry of data.bookmarks) {
    bookmarkStore.addBookmark(entry.url, entry.title);
  }

  // Import settings (merge mode only for settings)
  if (mode === 'merge') {
    const updates = data.settings as Record<string, unknown>;
    settingsStore.updateSettings(updates as any);
  } else {
    // Replace mode: reset and set all settings
    settingsStore.resetSettings();
    const updates = data.settings as Record<string, unknown>;
    settingsStore.updateSettings(updates as any);
  }
}
