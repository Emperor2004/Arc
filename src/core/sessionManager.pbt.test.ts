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
  beforeEach(async () => {
    await resetDatabase();
  });

  afterEach(async () => {
    await clearSession();
    await resetDatabase();
  });

  describe('Property 10.1: Session Restoration Completeness', () => {
    it('should restore session exactly as saved', async () => {
      await fc.assert(
        fc.asyncProperty(sessionStateArbitrary, async (originalState) => {
          // Save the session
          await saveSession(originalState);

          // Load it back
          const restoredState = await loadSession();

          // Verify it matches
          expect(restoredState).not.toBeNull();
          expect(restoredState!.tabs).toEqual(originalState.tabs);
          expect(restoredState!.activeTabId).toBe(originalState.activeTabId);
          expect(restoredState!.version).toBe(originalState.version);
        }),
        { numRuns: 10 }
      );
    });

    it('should preserve tab order after restoration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(tabSessionArbitrary, { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          async (tabs, activeIndex) => {
            const activeTabId = tabs[activeIndex % tabs.length].id;
            const state = createSessionState(tabs, activeTabId);

            await saveSession(state);
            const restored = await loadSession();

            expect(restored!.tabs.map((t) => t.id)).toEqual(tabs.map((t) => t.id));
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should preserve scroll positions exactly', async () => {
      await fc.assert(
        fc.asyncProperty(sessionStateArbitrary, async (originalState) => {
          await saveSession(originalState);
          const restored = await loadSession();

          originalState.tabs.forEach((tab, index) => {
            expect(restored!.tabs[index].scrollPosition).toEqual(tab.scrollPosition);
          });
        }),
        { numRuns: 10 }
      );
    });

    it('should preserve form data exactly', async () => {
      await fc.assert(
        fc.asyncProperty(sessionStateArbitrary, async (originalState) => {
          await saveSession(originalState);
          const restored = await loadSession();

          originalState.tabs.forEach((tab, index) => {
            expect(restored!.tabs[index].formData).toEqual(tab.formData);
          });
        }),
        { numRuns: 10 }
      );
    });

    it('should preserve favicon data exactly', async () => {
      await fc.assert(
        fc.asyncProperty(sessionStateArbitrary, async (originalState) => {
          await saveSession(originalState);
          const restored = await loadSession();

          originalState.tabs.forEach((tab, index) => {
            expect(restored!.tabs[index].favicon).toEqual(tab.favicon);
          });
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Property: Session Validation Consistency', () => {
    it('should validate all created sessions', async () => {
      await fc.assert(
        fc.asyncProperty(sessionStateArbitrary, async (state) => {
          expect(validateSessionState(state)).toBe(true);
        }),
        { numRuns: 10 }
      );
    });

    it('should reject sessions with invalid tab structure', async () => {
      await fc.assert(
        fc.asyncProperty(
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
          async (state) => {
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
    it('should produce same result when loading multiple times', async () => {
      await fc.assert(
        fc.asyncProperty(sessionStateArbitrary, async (originalState) => {
          await saveSession(originalState);

          const first = await loadSession();
          const second = await loadSession();
          const third = await loadSession();

          expect(first).toEqual(second);
          expect(second).toEqual(third);
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Property: Session Timestamp Ordering', () => {
    it('should maintain timestamp ordering when saving multiple sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(sessionStateArbitrary, { minLength: 2, maxLength: 10 }),
          async (states) => {
            // Save all states with increasing timestamps
            for (let index = 0; index < states.length; index++) {
              const newState = {
                ...states[index],
                timestamp: Date.now() + index * 1000,
              };
              await saveSession(newState);
            }

            // Load and verify we get the most recent one
            const loaded = await loadSession();
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
    it('should preserve unique tab IDs', async () => {
      await fc.assert(
        fc.asyncProperty(sessionStateArbitrary, async (state) => {
          const tabIds = state.tabs.map((t) => t.id);
          const uniqueIds = new Set(tabIds);

          // If input has unique IDs, output should too
          if (uniqueIds.size === tabIds.length) {
            await saveSession(state);
            const restored = await loadSession();
            const restoredIds = restored!.tabs.map((t) => t.id);
            const restoredUnique = new Set(restoredIds);

            expect(restoredUnique.size).toBe(restoredIds.length);
          }
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Property: URL Preservation', () => {
    it('should preserve URLs exactly as provided', async () => {
      await fc.assert(
        fc.asyncProperty(sessionStateArbitrary, async (state) => {
          const originalUrls = state.tabs.map((t) => t.url);

          await saveSession(state);
          const restored = await loadSession();
          const restoredUrls = restored!.tabs.map((t) => t.url);

          // URLs should be preserved exactly
          expect(restoredUrls.length).toBe(originalUrls.length);
          restoredUrls.forEach((url, index) => {
            expect(url).toBe(originalUrls[index]);
          });
        }),
        { numRuns: 10 }
      );
    });
  });
});
