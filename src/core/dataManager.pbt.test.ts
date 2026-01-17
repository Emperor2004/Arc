import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import * as dataManager from './dataManager';
import * as historyStore from './historyStore';
import * as feedbackStore from './feedbackStore';
import * as bookmarkStore from './bookmarkStore';
import * as settingsStore from './settingsStore';

// Mock the stores
vi.mock('./historyStore');
vi.mock('./feedbackStore');
vi.mock('./bookmarkStore');
vi.mock('./settingsStore');

describe('DataManager - Property-Based Tests', () => {
  describe('Property 7: Data Export-Import Round-Trip', () => {
    it('should preserve data through export-import cycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              url: fc.webUrl(),
              title: fc.oneof(fc.string({ minLength: 1 }), fc.constant(null)),
              visited_at: fc.integer({ min: 1000000000000, max: Date.now() }),
            }),
            { maxLength: 5, uniqueBy: (x) => x.url }
          ),
          fc.array(
            fc.record({
              url: fc.webUrl(),
              value: fc.constantFrom('like' as const, 'dislike' as const),
              created_at: fc.integer({ min: 1000000000000, max: Date.now() }),
            }),
            { maxLength: 5, uniqueBy: (x) => x.url }
          ),
          fc.array(
            fc.record({
              url: fc.webUrl(),
              title: fc.string({ minLength: 1 }),
              createdAt: fc.integer({ min: 1000000000000, max: Date.now() }),
            }),
            { maxLength: 5, uniqueBy: (x) => x.url }
          ),
          async (history, feedback, bookmarks) => {
            // Clear mocks for this iteration
            vi.clearAllMocks();

            // Setup mocks for export
            vi.mocked(historyStore.getAllHistory).mockResolvedValue(
              history.map((h, i) => ({
                id: i,
                url: h.url,
                title: h.title,
                visited_at: h.visited_at,
                visit_count: 1,
              }))
            );

            vi.mocked(feedbackStore.getAllFeedback).mockResolvedValue(
              feedback.map((f, i) => ({
                id: i,
                url: f.url,
                value: f.value,
                created_at: f.created_at,
              }))
            );

            vi.mocked(bookmarkStore.getAllBookmarks).mockResolvedValue(
              bookmarks.map((b, i) => ({
                id: String(i),
                url: b.url,
                title: b.title,
                createdAt: b.createdAt,
                updatedAt: b.createdAt,
              }))
            );

            vi.mocked(settingsStore.getSettings).mockReturnValue({
              theme: 'system',
              jarvisEnabled: true,
              useHistoryForRecommendations: true,
              incognitoEnabled: true,
              searchEngine: 'google',
              tabOrder: [],
              keyboardShortcutsEnabled: true,
            });

            // Export data
            const exported = await dataManager.exportData();

            // Verify export structure
            expect(exported.version).toBe('1.0.0');
            expect(exported.timestamp).toBeGreaterThan(0);
            expect(exported.history).toHaveLength(history.length);
            expect(exported.feedback).toHaveLength(feedback.length);
            expect(exported.bookmarks).toHaveLength(bookmarks.length);

            // Verify data is preserved
            for (let i = 0; i < history.length; i++) {
              expect(exported.history[i].url).toBe(history[i].url);
              expect(exported.history[i].title).toBe(history[i].title);
              expect(exported.history[i].visited_at).toBe(history[i].visited_at);
            }

            for (let i = 0; i < feedback.length; i++) {
              expect(exported.feedback[i].url).toBe(feedback[i].url);
              expect(exported.feedback[i].value).toBe(feedback[i].value);
              expect(exported.feedback[i].created_at).toBe(feedback[i].created_at);
            }

            for (let i = 0; i < bookmarks.length; i++) {
              expect(exported.bookmarks[i].url).toBe(bookmarks[i].url);
              expect(exported.bookmarks[i].title).toBe(bookmarks[i].title);
              expect(exported.bookmarks[i].createdAt).toBe(bookmarks[i].createdAt);
            }

            // Verify validation passes
            expect(dataManager.validateExportData(exported)).toBe(true);

            // Clear mocks before import
            vi.clearAllMocks();

            // Import data
            await dataManager.importData(exported, 'merge');

            // Verify import was called correctly
            expect(historyStore.addHistoryEntry).toHaveBeenCalledTimes(history.length);
            expect(feedbackStore.addFeedback).toHaveBeenCalledTimes(feedback.length);
            expect(bookmarkStore.addBookmark).toHaveBeenCalledTimes(bookmarks.length);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property: Validation Consistency', () => {
    it('should consistently validate generated export data', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              url: fc.webUrl(),
              title: fc.oneof(fc.string({ minLength: 1 }), fc.constant(null)),
              visited_at: fc.integer({ min: 1000000000000, max: Date.now() }),
            }),
            { maxLength: 10 }
          ),
          fc.array(
            fc.record({
              url: fc.webUrl(),
              value: fc.constantFrom('like' as const, 'dislike' as const),
              created_at: fc.integer({ min: 1000000000000, max: Date.now() }),
            }),
            { maxLength: 10 }
          ),
          fc.array(
            fc.record({
              url: fc.webUrl(),
              title: fc.string({ minLength: 1 }),
              createdAt: fc.integer({ min: 1000000000000, max: Date.now() }),
            }),
            { maxLength: 10 }
          ),
          (history, feedback, bookmarks) => {
            const data: dataManager.ExportData = {
              version: '1.0.0',
              timestamp: Date.now(),
              history,
              feedback,
              bookmarks,
              settings: {},
            };

            // Validation should be idempotent
            const result1 = dataManager.validateExportData(data);
            const result2 = dataManager.validateExportData(data);

            expect(result1).toBe(result2);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property: Invalid Data Rejection', () => {
    it('should reject data with invalid structure', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant('string'),
            fc.constant(123),
            fc.constant([]),
            fc.record({
              version: fc.string(),
              timestamp: fc.integer(),
              history: fc.string(),
              feedback: fc.string(),
              bookmarks: fc.string(),
              settings: fc.string(),
            })
          ),
          (data) => {
            const result = dataManager.validateExportData(data);
            // Should be false for invalid data
            if (data === null || data === undefined || typeof data !== 'object' || Array.isArray(data)) {
              expect(result).toBe(false);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property: Empty Data Handling', () => {
    it('should handle empty collections correctly', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const data: dataManager.ExportData = {
            version: '1.0.0',
            timestamp: Date.now(),
            history: [],
            feedback: [],
            bookmarks: [],
            settings: {},
          };

          expect(dataManager.validateExportData(data)).toBe(true);
          expect(data.history).toHaveLength(0);
          expect(data.feedback).toHaveLength(0);
          expect(data.bookmarks).toHaveLength(0);
        }),
        { numRuns: 10 }
      );
    });
  });
});
