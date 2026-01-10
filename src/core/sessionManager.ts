import { getDatabase } from './database';
import { Tab } from './types';

export interface TabSession {
  id: string;
  url: string;
  title: string;
  scrollPosition: { x: number; y: number };
  formData?: Record<string, any>;
  favicon?: string;
}

export interface SessionState {
  tabs: TabSession[];
  activeTabId: string;
  timestamp: number;
  version: string;
}

const CURRENT_VERSION = '1.0.0';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

let autoSaveTimer: NodeJS.Timeout | null = null;

/**
 * Save session state to database
 */
export function saveSession(state: SessionState): void {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO sessions (tabs, activeTabId, timestamp, version)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      JSON.stringify(state.tabs),
      state.activeTabId,
      state.timestamp,
      state.version
    );
  } catch (error) {
    console.error('Error saving session:', error);
  }
}

/**
 * Load the most recent session state from database
 */
export function loadSession(): SessionState | null {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT tabs, activeTabId, timestamp, version
      FROM sessions
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    const row = stmt.get() as any;
    
    if (!row) {
      return null;
    }

    return {
      tabs: JSON.parse(row.tabs),
      activeTabId: row.activeTabId,
      timestamp: row.timestamp,
      version: row.version,
    };
  } catch (error) {
    console.error('Error loading session:', error);
    return null;
  }
}

/**
 * Clear all sessions from database
 */
export function clearSession(): void {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM sessions').run();
  } catch (error) {
    console.error('Error clearing session:', error);
  }
}

/**
 * Get all sessions (for debugging/recovery)
 */
export function getAllSessions(): SessionState[] {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT tabs, activeTabId, timestamp, version
      FROM sessions
      ORDER BY timestamp DESC
    `);

    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      tabs: JSON.parse(row.tabs),
      activeTabId: row.activeTabId,
      timestamp: row.timestamp,
      version: row.version,
    }));
  } catch (error) {
    console.error('Error getting all sessions:', error);
    return [];
  }
}

/**
 * Delete old sessions (keep only last N sessions)
 */
export function pruneOldSessions(keepCount: number = 10): void {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      DELETE FROM sessions
      WHERE id NOT IN (
        SELECT id FROM sessions
        ORDER BY timestamp DESC
        LIMIT ?
      )
    `);

    stmt.run(keepCount);
  } catch (error) {
    console.error('Error pruning old sessions:', error);
  }
}

/**
 * Start auto-save timer
 */
export function startAutoSave(callback: () => SessionState): void {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
  }

  autoSaveTimer = setInterval(() => {
    try {
      const state = callback();
      saveSession(state);
    } catch (error) {
      console.error('Error in auto-save:', error);
    }
  }, AUTO_SAVE_INTERVAL);
}

/**
 * Stop auto-save timer
 */
export function stopAutoSave(): void {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
}

/**
 * Create a new session state
 */
export function createSessionState(
  tabs: TabSession[],
  activeTabId: string
): SessionState {
  return {
    tabs,
    activeTabId,
    timestamp: Date.now(),
    version: CURRENT_VERSION,
  };
}

/**
 * Validate session state
 */
export function validateSessionState(state: any): state is SessionState {
  if (!state || typeof state !== 'object') {
    return false;
  }

  return (
    Array.isArray(state.tabs) &&
    typeof state.activeTabId === 'string' &&
    typeof state.timestamp === 'number' &&
    typeof state.version === 'string' &&
    state.tabs.every((tab: any) =>
      tab &&
      typeof tab.id === 'string' &&
      typeof tab.url === 'string' &&
      typeof tab.title === 'string' &&
      tab.scrollPosition &&
      typeof tab.scrollPosition.x === 'number' &&
      typeof tab.scrollPosition.y === 'number'
    )
  );
}
