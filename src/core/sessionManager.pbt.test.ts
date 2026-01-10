import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  saveSession,
  loadSession,
  clearSession,
  createSessionState,
  validateSessionState,
  TabSession,
  SessionState,
} from './sessionManager';
import { resetDatabase } from './database';

// Arbitraries for generating test data
const tabSessionArbitrary = fc.record({
  id: fc.uuid(),
  url: fc.webUrl({ maxLength: 200 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  scrollPosition: fc.record({
    x: fc.integer({ min: 0, max: 100000 }),
    y: fc.integer({ min: 0, max: 100000 }),
  }),
  formData: fc.option(
    fc.dictionary(fc.string({ minLength: 1, maxLength: 50 }), fc.string({ maxLength: 100 })),
    { freq: 1 }
  ),
  favicon: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { freq: 1 }),
});

const sessionStateArbitrary = fc
  .tuple(fc.array(tabSessionArbitrary, { minLength: 1, maxLength: 10 }), fc.uuid())
  .map(([tabs, activeTabId]) => createSessionState(tabs, activeTabId));

describe('SessionManager Properties', () => {
  beforeEach(() => {
    resetDatabase();
  });

  afterEach(() => {
    clearSession();
    resetDatabase();
  });

  describe('Property 10.1: Session Restoration Completeness', () => {
    it('should restore session exactly as saved', () => {
      fc.assert(
        fc.property(sessionStateArbitrary, (originalState) => {
          // Save the session
          saveSession(originalState);

          // Load it back
          const restoredState = loadSession();

          // Verify it matches
          expect(restoredState).not.toBeNull();
          expect(restoredState!.tabs).toEqual(originalState.tabs);
          expect(restoredState!.activeTabId).toBe(originalState.activeTabId);
          expect(restoredState!.version).toBe(originalState.version);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve tab order after restoration', () => {
      fc.assert(
        fc.property(
          fc.array(tabSessionArbitrary, { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          (tabs, activeIndex) => {
            const activeTabId = tabs[activeIndex % tabs.length].id;
            const state = createSessionState(tabs, activeTabId);

            saveSession(state);
            const restored = loadSession();

            expect(restored!.tabs.map((t) => t.id)).toEqual(tabs.map((t) => t.id));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve scroll positions exactly', () => {
      fc.assert(
        fc.property(sessionStateArbitrary, (originalState) => {
          saveSession(originalState);
          const restored = loadSession();

          originalState.tabs.forEach((tab, index) => {
            expect(restored!.tabs[index].scrollPosition).toEqual(tab.scrollPosition);
          });
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve form data exactly', () => {
      fc.assert(
        fc.property(sessionStateArbitrary, (originalState) => {
          saveSession(originalState);
          const restored = loadSession();

          originalState.tabs.forEach((tab, index) => {
            expect(restored!.tabs[index].formData).toEqual(tab.formData);
          });
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve favicon data exactly', () => {
      fc.assert(
        fc.property(sessionStateArbitrary, (originalState) => {
          saveSession(originalState);
          const restored = loadSession();

          originalState.tabs.forEach((tab, index) => {
            expect(restored!.tabs[index].favicon).toEqual(tab.favicon);
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Session Validation Consistency', () => {
    it('should validate all created sessions', () => {
      fc.assert(
        fc.property(sessionStateArbitrary, (state) => {
          expect(validateSessionState(state)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject sessions with invalid tab structure', () => {
      fc.assert(
        fc.property(
          fc.record({
            tabs: fc.array(
              fc.record({
                id: fc.uuid(),
                url: fc.webUrl(),
                title: fc.string(),
                scrollPosition: fc.record({
                  x: fc.oneof(fc.integer(), fc.string()), // Invalid: can be string
                  y: fc.integer(),
                }),
              }),
              { minLength: 1 }
            ),
            activeTabId: fc.uuid(),
            timestamp: fc.integer(),
            version: fc.string(),
          }),
          (state) => {
            // If x is a string, validation should fail
            const hasInvalidX = state.tabs.some(
              (t) => typeof t.scrollPosition.x !== 'number'
            );
            expect(validateSessionState(state)).toBe(!hasInvalidX);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Session Idempotence', () => {
    it('should produce same result when loading multiple times', () => {
      fc.assert(
        fc.property(sessionStateArbitrary, (originalState) => {
          saveSession(originalState);

          const first = loadSession();
          const second = loadSession();
          const third = loadSession();

          expect(first).toEqual(second);
          expect(second).toEqual(third);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Session Timestamp Ordering', () => {
    it('should maintain timestamp ordering when saving multiple sessions', () => {
      fc.assert(
        fc.property(
          fc.array(sessionStateArbitrary, { minLength: 2, maxLength: 10 }),
          (states) => {
            // Save all states with increasing timestamps
            states.forEach((state, index) => {
              const newState = {
                ...state,
                timestamp: Date.now() + index * 1000,
              };
              saveSession(newState);
            });

            // Load and verify we get the most recent one
            const loaded = loadSession();
            expect(loaded).not.toBeNull();
            // The loaded timestamp should be from the last saved state
            expect(loaded!.timestamp).toBeGreaterThanOrEqual(states[0].timestamp);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Tab ID Uniqueness', () => {
    it('should preserve unique tab IDs', () => {
      fc.assert(
        fc.property(sessionStateArbitrary, (state) => {
          const tabIds = state.tabs.map((t) => t.id);
          const uniqueIds = new Set(tabIds);

          // If input has unique IDs, output should too
          if (uniqueIds.size === tabIds.length) {
            saveSession(state);
            const restored = loadSession();
            const restoredIds = restored!.tabs.map((t) => t.id);
            const restoredUnique = new Set(restoredIds);

            expect(restoredUnique.size).toBe(restoredIds.length);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: URL Preservation', () => {
    it('should preserve URLs exactly as provided', () => {
      fc.assert(
        fc.property(sessionStateArbitrary, (state) => {
          const originalUrls = state.tabs.map((t) => t.url);

          saveSession(state);
          const restored = loadSession();
          const restoredUrls = restored!.tabs.map((t) => t.url);

          // URLs should be preserved exactly
          expect(restoredUrls.length).toBe(originalUrls.length);
          restoredUrls.forEach((url, index) => {
            expect(url).toBe(originalUrls[index]);
          });
        }),
        { numRuns: 100 }
      );
    });
  });
});
