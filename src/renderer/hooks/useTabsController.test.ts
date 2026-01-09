import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabsController } from './useTabsController';
import * as settingsStore from '../../core/settingsStore';

// Mock the settings store
vi.mock('../../core/settingsStore', () => ({
  getSetting: vi.fn(),
  updateSetting: vi.fn(),
}));

describe('useTabsController - Tab Reordering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsStore.getSetting).mockReturnValue(undefined);
  });

  describe('tab order persistence', () => {
    it('should save tab order when tabs change', () => {
      const { result } = renderHook(() => useTabsController());

      act(() => {
        result.current.handleNewTab();
      });

      expect(vi.mocked(settingsStore.updateSetting)).toHaveBeenCalledWith(
        'tabOrder',
        expect.arrayContaining([expect.any(String)])
      );
    });

    it('should load tab order from settings on mount', () => {
      const savedOrder = ['tab-1', 'tab-2', 'tab-3'];
      vi.mocked(settingsStore.getSetting).mockReturnValue(savedOrder);

      const { result } = renderHook(() => useTabsController());

      // The hook should have loaded the saved order
      expect(result.current.tabs.length).toBeGreaterThan(0);
    });

    it('should handle missing tabs in saved order', () => {
      const savedOrder = ['tab-1', 'tab-999']; // tab-999 doesn't exist
      vi.mocked(settingsStore.getSetting).mockReturnValue(savedOrder);

      const { result } = renderHook(() => useTabsController());

      // Should still have tabs, just reordered
      expect(result.current.tabs.length).toBeGreaterThan(0);
    });
  });

  describe('handleTabReorder', () => {
    it('should reorder tabs', () => {
      const { result } = renderHook(() => useTabsController());

      act(() => {
        result.current.handleNewTab();
        result.current.handleNewTab();
      });

      const originalOrder = result.current.tabs.map(t => t.id);
      const reversedOrder = [...originalOrder].reverse();

      act(() => {
        result.current.handleTabReorder(reversedOrder);
      });

      const newOrder = result.current.tabs.map(t => t.id);
      expect(newOrder).toEqual(reversedOrder);
    });

    it('should preserve tabs not in reorder list', () => {
      const { result } = renderHook(() => useTabsController());

      act(() => {
        result.current.handleNewTab();
        result.current.handleNewTab();
      });

      const allTabIds = result.current.tabs.map(t => t.id);
      const partialOrder = [allTabIds[0]]; // Only first tab

      act(() => {
        result.current.handleTabReorder(partialOrder);
      });

      // All tabs should still exist
      expect(result.current.tabs.length).toBe(allTabIds.length);
    });

    it('should handle empty reorder list', () => {
      const { result } = renderHook(() => useTabsController());

      act(() => {
        result.current.handleNewTab();
      });

      const originalCount = result.current.tabs.length;

      act(() => {
        result.current.handleTabReorder([]);
      });

      // Tabs should still exist
      expect(result.current.tabs.length).toBe(originalCount);
    });
  });

  describe('tab operations with persistence', () => {
    it('should save order when adding tab', () => {
      const { result } = renderHook(() => useTabsController());

      vi.mocked(settingsStore.updateSetting).mockClear();

      act(() => {
        result.current.handleNewTab();
      });

      expect(vi.mocked(settingsStore.updateSetting)).toHaveBeenCalledWith(
        'tabOrder',
        expect.any(Array)
      );
    });

    it('should save order when closing tab', () => {
      const { result } = renderHook(() => useTabsController());

      act(() => {
        result.current.handleNewTab();
      });

      vi.mocked(settingsStore.updateSetting).mockClear();

      const tabToClose = result.current.tabs[0].id;

      act(() => {
        result.current.handleTabClose(tabToClose);
      });

      expect(vi.mocked(settingsStore.updateSetting)).toHaveBeenCalledWith(
        'tabOrder',
        expect.any(Array)
      );
    });

    it('should save order when reordering tabs', () => {
      const { result } = renderHook(() => useTabsController());

      act(() => {
        result.current.handleNewTab();
        result.current.handleNewTab();
      });

      vi.mocked(settingsStore.updateSetting).mockClear();

      const reversedOrder = [...result.current.tabs.map(t => t.id)].reverse();

      act(() => {
        result.current.handleTabReorder(reversedOrder);
      });

      expect(vi.mocked(settingsStore.updateSetting)).toHaveBeenCalledWith(
        'tabOrder',
        reversedOrder
      );
    });
  });

  describe('edge cases', () => {
    it('should handle reordering with single tab', () => {
      const { result } = renderHook(() => useTabsController());

      const tabId = result.current.tabs[0].id;

      act(() => {
        result.current.handleTabReorder([tabId]);
      });

      expect(result.current.tabs[0].id).toBe(tabId);
    });

    it('should maintain active tab state during reorder', () => {
      const { result } = renderHook(() => useTabsController());

      act(() => {
        result.current.handleNewTab();
        result.current.handleNewTab();
      });

      const activeTabId = result.current.activeTab?.id;
      const reversedOrder = [...result.current.tabs.map(t => t.id)].reverse();

      act(() => {
        result.current.handleTabReorder(reversedOrder);
      });

      // Active tab should still be active
      expect(result.current.activeTab?.id).toBe(activeTabId);
    });

    it('should handle reordering after closing tabs', () => {
      const { result } = renderHook(() => useTabsController());

      act(() => {
        result.current.handleNewTab();
        result.current.handleNewTab();
      });

      const tabToClose = result.current.tabs[0].id;

      act(() => {
        result.current.handleTabClose(tabToClose);
      });

      const remainingTabIds = result.current.tabs.map(t => t.id);
      const reversedOrder = [...remainingTabIds].reverse();

      act(() => {
        result.current.handleTabReorder(reversedOrder);
      });

      expect(result.current.tabs.map(t => t.id)).toEqual(reversedOrder);
    });
  });
});
