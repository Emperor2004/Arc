import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { useTabsController } from './useTabsController';
import * as settingsStore from '../../core/settingsStore';

// Mock the settings store
vi.mock('../../core/settingsStore', () => ({
  getSetting: vi.fn(),
  updateSetting: vi.fn(),
}));

describe('useTabsController - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsStore.getSetting).mockReturnValue(undefined);
  });

  describe('Property 1: Tab Order Preservation', () => {
    it('should preserve all tabs after reordering', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
          (incognitoFlags) => {
            const { result } = renderHook(() => useTabsController());

            // Create tabs
            act(() => {
              for (let i = 0; i < incognitoFlags.length; i++) {
                if (incognitoFlags[i]) {
                  result.current.handleNewIncognitoTab();
                } else {
                  result.current.handleNewTab();
                }
              }
            });

            const originalTabIds = new Set(result.current.tabs.map(t => t.id));
            const reorderedIds = [...result.current.tabs.map(t => t.id)].reverse();

            act(() => {
              result.current.handleTabReorder(reorderedIds);
            });

            const finalTabIds = new Set(result.current.tabs.map(t => t.id));

            expect(finalTabIds).toEqual(originalTabIds);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Tab Count Invariant', () => {
    it('should maintain tab count through reordering', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
          (incognitoFlags) => {
            const { result } = renderHook(() => useTabsController());

            act(() => {
              for (let i = 0; i < incognitoFlags.length; i++) {
                if (incognitoFlags[i]) {
                  result.current.handleNewIncognitoTab();
                } else {
                  result.current.handleNewTab();
                }
              }
            });

            const originalCount = result.current.tabs.length;
            const reorderedIds = [...result.current.tabs.map(t => t.id)].reverse();

            act(() => {
              result.current.handleTabReorder(reorderedIds);
            });

            expect(result.current.tabs.length).toBe(originalCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Reorder Idempotence', () => {
    it('should produce same result when reordering twice with same order', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
          (incognitoFlags) => {
            const { result } = renderHook(() => useTabsController());

            // Create tabs
            act(() => {
              for (let i = 0; i < incognitoFlags.length; i++) {
                if (incognitoFlags[i]) {
                  result.current.handleNewIncognitoTab();
                } else {
                  result.current.handleNewTab();
                }
              }
            });

            const reorderedIds = [...result.current.tabs.map(t => t.id)].reverse();

            act(() => {
              result.current.handleTabReorder(reorderedIds);
            });

            const firstReorderResult = result.current.tabs.map(t => t.id);

            act(() => {
              result.current.handleTabReorder(reorderedIds);
            });

            const secondReorderResult = result.current.tabs.map(t => t.id);

            expect(firstReorderResult).toEqual(secondReorderResult);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Reorder Determinism', () => {
    it('should produce deterministic results for same operations', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 2, maxLength: 5 }),
          (incognitoFlags) => {
            const { result } = renderHook(() => useTabsController());

            // Create tabs
            act(() => {
              for (let i = 0; i < incognitoFlags.length; i++) {
                if (incognitoFlags[i]) {
                  result.current.handleNewIncognitoTab();
                } else {
                  result.current.handleNewTab();
                }
              }
            });

            const reorderedIds = [...result.current.tabs.map(t => t.id)].reverse();

            act(() => {
              result.current.handleTabReorder(reorderedIds);
            });

            const result1 = result.current.tabs.map(t => t.id);

            // Reorder back to original
            const originalOrder = [...reorderedIds].reverse();
            act(() => {
              result.current.handleTabReorder(originalOrder);
            });

            // Reorder again to same as first
            act(() => {
              result.current.handleTabReorder(reorderedIds);
            });

            const result2 = result.current.tabs.map(t => t.id);

            expect(result1).toEqual(result2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Persistence Consistency', () => {
    it('should call updateSetting when reordering', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
          (incognitoFlags) => {
            const { result } = renderHook(() => useTabsController());

            act(() => {
              for (let i = 0; i < incognitoFlags.length; i++) {
                if (incognitoFlags[i]) {
                  result.current.handleNewIncognitoTab();
                } else {
                  result.current.handleNewTab();
                }
              }
            });

            vi.mocked(settingsStore.updateSetting).mockClear();

            const reorderedIds = [...result.current.tabs.map(t => t.id)].reverse();

            act(() => {
              result.current.handleTabReorder(reorderedIds);
            });

            expect(vi.mocked(settingsStore.updateSetting)).toHaveBeenCalledWith(
              'tabOrder',
              expect.any(Array)
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Active Tab Preservation', () => {
    it('should preserve active tab state during reordering', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 2, maxLength: 5 }),
          (incognitoFlags) => {
            const { result } = renderHook(() => useTabsController());

            act(() => {
              for (let i = 0; i < incognitoFlags.length; i++) {
                if (incognitoFlags[i]) {
                  result.current.handleNewIncognitoTab();
                } else {
                  result.current.handleNewTab();
                }
              }
            });

            const activeTabId = result.current.activeTab?.id;
            const reorderedIds = [...result.current.tabs.map(t => t.id)].reverse();

            act(() => {
              result.current.handleTabReorder(reorderedIds);
            });

            expect(result.current.activeTab?.id).toBe(activeTabId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
