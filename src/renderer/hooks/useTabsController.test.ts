import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabsController } from './useTabsController';

// Mock window.arc
const mockArc = {
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
};

describe('useTabsController - Tab Reordering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).arc = mockArc;
    mockArc.getSettings.mockResolvedValue({ tabOrder: undefined });
    mockArc.updateSettings.mockResolvedValue({});
  });

  afterEach(() => {
    (window as any).arc = undefined;
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
