import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveSession,
  loadSession,
  clearSession,
  getAllSessions,
  pruneOldSessions,
  createSessionState,
  validateSessionState,
  TabSession,
  SessionState,
} from './sessionManager';

// Mock the database module
vi.mock('./database', () => {
  // In-memory storage for tests
  let sessions: any[] = [];
  let nextId = 1;

  return {
    getDatabaseManager: () => ({
      execute: vi.fn(async (sql: string, params?: any[]) => {
        if (sql.includes('INSERT INTO sessions')) {
          // Save session
          sessions.push({
            id: nextId++,
            tabs: params![0],
            activeTabId: params![1],
            timestamp: params![2],
            version: params![3],
          });
        } else if (sql.includes('DELETE FROM sessions')) {
          if (sql.includes('WHERE id NOT IN')) {
            // Prune old sessions
            const keepCount = params![0];
            sessions.sort((a, b) => b.timestamp - a.timestamp);
            sessions = sessions.slice(0, keepCount);
          } else {
            // Clear all sessions
            sessions = [];
            nextId = 1;
          }
        }
      }),
      query: vi.fn(async (sql: string, params?: any[]) => {
        if (sql.includes('ORDER BY timestamp DESC LIMIT 1')) {
          // Load most recent session
          if (sessions.length === 0) return [];
          const sorted = [...sessions].sort((a, b) => b.timestamp - a.timestamp);
          return [sorted[0]];
        } else if (sql.includes('ORDER BY timestamp DESC')) {
          // Get all sessions
          return [...sessions].sort((a, b) => b.timestamp - a.timestamp);
        }
        return [];
      }),
    }),
    resetDatabase: vi.fn(async () => {
      sessions = [];
      nextId = 1;
    }),
  };
});

describe('SessionManager', () => {
  beforeEach(async () => {
    const { resetDatabase } = await import('./database');
    await resetDatabase();
  });

  afterEach(async () => {
    await clearSession();
  });

  describe('createSessionState', () => {
    it('should create a valid session state', () => {
      const tabs: TabSession[] = [
        {
          id: 'tab-1',
          url: 'https://example.com',
          title: 'Example',
          scrollPosition: { x: 0, y: 0 },
        },
      ];

      const state = createSessionState(tabs, 'tab-1');

      expect(state.tabs).toEqual(tabs);
      expect(state.activeTabId).toBe('tab-1');
      expect(state.timestamp).toBeGreaterThan(0);
      expect(state.version).toBe('1.0.0');
    });

    it('should create session state with multiple tabs', () => {
      const tabs: TabSession[] = [
        {
          id: 'tab-1',
          url: 'https://example.com',
          title: 'Example',
          scrollPosition: { x: 0, y: 0 },
        },
        {
          id: 'tab-2',
          url: 'https://google.com',
          title: 'Google',
          scrollPosition: { x: 100, y: 200 },
        },
      ];

      const state = createSessionState(tabs, 'tab-2');

      expect(state.tabs).toHaveLength(2);
      expect(state.activeTabId).toBe('tab-2');
    });
  });

  describe('validateSessionState', () => {
    it('should validate a correct session state', () => {
      const state: SessionState = {
        tabs: [
          {
            id: 'tab-1',
            url: 'https://example.com',
            title: 'Example',
            scrollPosition: { x: 0, y: 0 },
          },
        ],
        activeTabId: 'tab-1',
        timestamp: Date.now(),
        version: '1.0.0',
      };

      expect(validateSessionState(state)).toBe(true);
    });

    it('should reject invalid session state (missing tabs)', () => {
      const state = {
        activeTabId: 'tab-1',
        timestamp: Date.now(),
        version: '1.0.0',
      };

      expect(validateSessionState(state)).toBe(false);
    });

    it('should reject invalid session state (invalid tab)', () => {
      const state = {
        tabs: [
          {
            id: 'tab-1',
            url: 'https://example.com',
            title: 'Example',
            scrollPosition: { x: 'invalid', y: 0 },
          },
        ],
        activeTabId: 'tab-1',
        timestamp: Date.now(),
        version: '1.0.0',
      };

      expect(validateSessionState(state)).toBe(false);
    });

    it('should reject null or undefined', () => {
      expect(validateSessionState(null)).toBe(false);
      expect(validateSessionState(undefined)).toBe(false);
    });
  });

  describe('saveSession and loadSession', () => {
    it('should save and load a session', async () => {
      const tabs: TabSession[] = [
        {
          id: 'tab-1',
          url: 'https://example.com',
          title: 'Example',
          scrollPosition: { x: 0, y: 0 },
        },
      ];

      const state = createSessionState(tabs, 'tab-1');
      await saveSession(state);

      const loaded = await loadSession();

      expect(loaded).not.toBeNull();
      expect(loaded?.tabs).toEqual(tabs);
      expect(loaded?.activeTabId).toBe('tab-1');
      expect(loaded?.version).toBe('1.0.0');
    });

    it('should save and load session with form data', async () => {
      const tabs: TabSession[] = [
        {
          id: 'tab-1',
          url: 'https://example.com',
          title: 'Example',
          scrollPosition: { x: 0, y: 0 },
          formData: { username: 'test', password: 'secret' },
        },
      ];

      const state = createSessionState(tabs, 'tab-1');
      await saveSession(state);

      const loaded = await loadSession();

      expect(loaded?.tabs[0].formData).toEqual({ username: 'test', password: 'secret' });
    });

    it('should save and load session with favicon', async () => {
      const tabs: TabSession[] = [
        {
          id: 'tab-1',
          url: 'https://example.com',
          title: 'Example',
          scrollPosition: { x: 0, y: 0 },
          favicon: 'data:image/png;base64,iVBORw0KGgo=',
        },
      ];

      const state = createSessionState(tabs, 'tab-1');
      await saveSession(state);

      const loaded = await loadSession();

      expect(loaded?.tabs[0].favicon).toBe('data:image/png;base64,iVBORw0KGgo=');
    });

    it('should return null when no session exists', async () => {
      const loaded = await loadSession();
      expect(loaded).toBeNull();
    });

    it('should load the most recent session', async () => {
      const tabs1: TabSession[] = [
        {
          id: 'tab-1',
          url: 'https://example.com',
          title: 'Example',
          scrollPosition: { x: 0, y: 0 },
        },
      ];

      const tabs2: TabSession[] = [
        {
          id: 'tab-2',
          url: 'https://google.com',
          title: 'Google',
          scrollPosition: { x: 100, y: 200 },
        },
      ];

      const state1 = createSessionState(tabs1, 'tab-1');
      await saveSession(state1);

      // Wait a bit to ensure different timestamp
      const state2 = createSessionState(tabs2, 'tab-2');
      state2.timestamp = state1.timestamp + 1000;
      await saveSession(state2);

      const loaded = await loadSession();

      expect(loaded?.tabs[0].url).toBe('https://google.com');
    });
  });

  describe('clearSession', () => {
    it('should clear all sessions', async () => {
      const tabs: TabSession[] = [
        {
          id: 'tab-1',
          url: 'https://example.com',
          title: 'Example',
          scrollPosition: { x: 0, y: 0 },
        },
      ];

      const state = createSessionState(tabs, 'tab-1');
      await saveSession(state);

      expect(await loadSession()).not.toBeNull();

      await clearSession();

      expect(await loadSession()).toBeNull();
    });
  });

  describe('getAllSessions', () => {
    it('should return all sessions in reverse chronological order', async () => {
      const tabs1: TabSession[] = [
        {
          id: 'tab-1',
          url: 'https://example.com',
          title: 'Example',
          scrollPosition: { x: 0, y: 0 },
        },
      ];

      const tabs2: TabSession[] = [
        {
          id: 'tab-2',
          url: 'https://google.com',
          title: 'Google',
          scrollPosition: { x: 100, y: 200 },
        },
      ];

      const state1 = createSessionState(tabs1, 'tab-1');
      await saveSession(state1);

      const state2 = createSessionState(tabs2, 'tab-2');
      state2.timestamp = state1.timestamp + 1000;
      await saveSession(state2);

      const all = await getAllSessions();

      expect(all).toHaveLength(2);
      expect(all[0].tabs[0].url).toBe('https://google.com');
      expect(all[1].tabs[0].url).toBe('https://example.com');
    });

    it('should return empty array when no sessions exist', async () => {
      const all = await getAllSessions();
      expect(all).toEqual([]);
    });
  });

  describe('pruneOldSessions', () => {
    it('should keep only the specified number of sessions', async () => {
      // Create 5 sessions
      for (let i = 0; i < 5; i++) {
        const tabs: TabSession[] = [
          {
            id: `tab-${i}`,
            url: `https://example${i}.com`,
            title: `Example ${i}`,
            scrollPosition: { x: 0, y: 0 },
          },
        ];

        const state = createSessionState(tabs, `tab-${i}`);
        state.timestamp = Date.now() + i * 1000;
        await saveSession(state);
      }

      expect((await getAllSessions()).length).toBe(5);

      await pruneOldSessions(2);

      expect((await getAllSessions()).length).toBe(2);
    });

    it('should keep the most recent sessions', async () => {
      // Create 3 sessions
      for (let i = 0; i < 3; i++) {
        const tabs: TabSession[] = [
          {
            id: `tab-${i}`,
            url: `https://example${i}.com`,
            title: `Example ${i}`,
            scrollPosition: { x: 0, y: 0 },
          },
        ];

        const state = createSessionState(tabs, `tab-${i}`);
        state.timestamp = Date.now() + i * 1000;
        await saveSession(state);
      }

      await pruneOldSessions(1);

      const remaining = await getAllSessions();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].tabs[0].url).toBe('https://example2.com');
    });
  });

  describe('edge cases', () => {
    it('should handle session with empty tabs array', async () => {
      const state = createSessionState([], 'tab-1');
      await saveSession(state);

      const loaded = await loadSession();
      expect(loaded?.tabs).toEqual([]);
    });

    it('should handle session with special characters in URL', async () => {
      const tabs: TabSession[] = [
        {
          id: 'tab-1',
          url: 'https://example.com/path?query=value&other=123#anchor',
          title: 'Example with special chars',
          scrollPosition: { x: 0, y: 0 },
        },
      ];

      const state = createSessionState(tabs, 'tab-1');
      await saveSession(state);

      const loaded = await loadSession();
      expect(loaded?.tabs[0].url).toBe('https://example.com/path?query=value&other=123#anchor');
    });

    it('should handle session with large scroll positions', async () => {
      const tabs: TabSession[] = [
        {
          id: 'tab-1',
          url: 'https://example.com',
          title: 'Example',
          scrollPosition: { x: 999999, y: 999999 },
        },
      ];

      const state = createSessionState(tabs, 'tab-1');
      await saveSession(state);

      const loaded = await loadSession();
      expect(loaded?.tabs[0].scrollPosition).toEqual({ x: 999999, y: 999999 });
    });
  });
});
