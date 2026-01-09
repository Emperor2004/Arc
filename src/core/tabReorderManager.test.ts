import { describe, it, expect, beforeEach } from 'vitest';
import { TabReorderManager } from './tabReorderManager';
import { DropResult } from 'react-beautiful-dnd';

describe('TabReorderManager', () => {
  let manager: TabReorderManager;

  beforeEach(() => {
    manager = new TabReorderManager(['tab1', 'tab2', 'tab3']);
  });

  describe('initialization', () => {
    it('should initialize with provided tab order', () => {
      expect(manager.getTabOrder()).toEqual(['tab1', 'tab2', 'tab3']);
    });

    it('should initialize with empty order if not provided', () => {
      const emptyManager = new TabReorderManager();
      expect(manager.getTabOrder()).toEqual(['tab1', 'tab2', 'tab3']);
    });
  });

  describe('handleDragEnd', () => {
    it('should reorder tabs when dragged to different position', () => {
      const result: DropResult = {
        draggableId: 'tab1',
        source: { droppableId: 'tabs', index: 0 },
        destination: { droppableId: 'tabs', index: 2 },
        reason: 'DROP',
        type: 'DEFAULT',
        combine: null,
      };

      const changed = manager.handleDragEnd(result);

      expect(changed).toBe(true);
      expect(manager.getTabOrder()).toEqual(['tab2', 'tab3', 'tab1']);
    });

    it('should not change order when dropped in same position', () => {
      const result: DropResult = {
        draggableId: 'tab1',
        source: { droppableId: 'tabs', index: 0 },
        destination: { droppableId: 'tabs', index: 0 },
        reason: 'DROP',
        type: 'DEFAULT',
        combine: null,
      };

      const changed = manager.handleDragEnd(result);

      expect(changed).toBe(false);
      expect(manager.getTabOrder()).toEqual(['tab1', 'tab2', 'tab3']);
    });

    it('should not change order when dropped outside list', () => {
      const result: DropResult = {
        draggableId: 'tab1',
        source: { droppableId: 'tabs', index: 0 },
        destination: null,
        reason: 'DROP',
        type: 'DEFAULT',
        combine: null,
      };

      const changed = manager.handleDragEnd(result);

      expect(changed).toBe(false);
      expect(manager.getTabOrder()).toEqual(['tab1', 'tab2', 'tab3']);
    });

    it('should move tab to end', () => {
      const result: DropResult = {
        draggableId: 'tab1',
        source: { droppableId: 'tabs', index: 0 },
        destination: { droppableId: 'tabs', index: 2 },
        reason: 'DROP',
        type: 'DEFAULT',
        combine: null,
      };

      manager.handleDragEnd(result);

      expect(manager.getTabOrder()).toEqual(['tab2', 'tab3', 'tab1']);
    });

    it('should move tab to beginning', () => {
      const result: DropResult = {
        draggableId: 'tab3',
        source: { droppableId: 'tabs', index: 2 },
        destination: { droppableId: 'tabs', index: 0 },
        reason: 'DROP',
        type: 'DEFAULT',
        combine: null,
      };

      manager.handleDragEnd(result);

      expect(manager.getTabOrder()).toEqual(['tab3', 'tab1', 'tab2']);
    });
  });

  describe('addTab', () => {
    it('should add tab to end by default', () => {
      manager.addTab('tab4');

      expect(manager.getTabOrder()).toEqual(['tab1', 'tab2', 'tab3', 'tab4']);
    });

    it('should add tab at specific position', () => {
      manager.addTab('tab4', 1);

      expect(manager.getTabOrder()).toEqual(['tab1', 'tab4', 'tab2', 'tab3']);
    });

    it('should not add duplicate tab', () => {
      manager.addTab('tab1');

      expect(manager.getTabOrder()).toEqual(['tab1', 'tab2', 'tab3']);
    });

    it('should add tab at beginning when position is 0', () => {
      manager.addTab('tab0', 0);

      expect(manager.getTabOrder()).toEqual(['tab0', 'tab1', 'tab2', 'tab3']);
    });
  });

  describe('removeTab', () => {
    it('should remove tab from order', () => {
      manager.removeTab('tab2');

      expect(manager.getTabOrder()).toEqual(['tab1', 'tab3']);
    });

    it('should not error when removing non-existent tab', () => {
      expect(() => manager.removeTab('tab99')).not.toThrow();
      expect(manager.getTabOrder()).toEqual(['tab1', 'tab2', 'tab3']);
    });

    it('should remove first tab', () => {
      manager.removeTab('tab1');

      expect(manager.getTabOrder()).toEqual(['tab2', 'tab3']);
    });

    it('should remove last tab', () => {
      manager.removeTab('tab3');

      expect(manager.getTabOrder()).toEqual(['tab1', 'tab2']);
    });
  });

  describe('getTabOrder', () => {
    it('should return copy of tab order', () => {
      const order = manager.getTabOrder();
      order.push('tab4');

      expect(manager.getTabOrder()).toEqual(['tab1', 'tab2', 'tab3']);
    });
  });

  describe('setTabOrder', () => {
    it('should set new tab order', () => {
      manager.setTabOrder(['tab3', 'tab1', 'tab2']);

      expect(manager.getTabOrder()).toEqual(['tab3', 'tab1', 'tab2']);
    });

    it('should notify listeners when setting order', () => {
      const listener = vi.fn();
      manager.subscribe(listener);

      manager.setTabOrder(['tab3', 'tab1', 'tab2']);

      expect(listener).toHaveBeenCalledWith(['tab3', 'tab1', 'tab2']);
    });
  });

  describe('getTabPosition', () => {
    it('should return position of tab', () => {
      expect(manager.getTabPosition('tab1')).toBe(0);
      expect(manager.getTabPosition('tab2')).toBe(1);
      expect(manager.getTabPosition('tab3')).toBe(2);
    });

    it('should return -1 for non-existent tab', () => {
      expect(manager.getTabPosition('tab99')).toBe(-1);
    });
  });

  describe('hasTab', () => {
    it('should return true for existing tab', () => {
      expect(manager.hasTab('tab1')).toBe(true);
      expect(manager.hasTab('tab2')).toBe(true);
    });

    it('should return false for non-existent tab', () => {
      expect(manager.hasTab('tab99')).toBe(false);
    });
  });

  describe('getTabAtPosition', () => {
    it('should return tab at position', () => {
      expect(manager.getTabAtPosition(0)).toBe('tab1');
      expect(manager.getTabAtPosition(1)).toBe('tab2');
      expect(manager.getTabAtPosition(2)).toBe('tab3');
    });

    it('should return undefined for invalid position', () => {
      expect(manager.getTabAtPosition(99)).toBeUndefined();
    });
  });

  describe('subscribe', () => {
    it('should notify listener on tab order change', () => {
      const listener = vi.fn();
      manager.subscribe(listener);

      manager.addTab('tab4');

      expect(listener).toHaveBeenCalledWith(['tab1', 'tab2', 'tab3', 'tab4']);
    });

    it('should return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);

      manager.addTab('tab4');
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      manager.addTab('tab5');

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should support multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      manager.subscribe(listener1);
      manager.subscribe(listener2);

      manager.addTab('tab4');

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear', () => {
    it('should clear all tabs', () => {
      manager.clear();

      expect(manager.getTabOrder()).toEqual([]);
    });

    it('should notify listeners when clearing', () => {
      const listener = vi.fn();
      manager.subscribe(listener);

      manager.clear();

      expect(listener).toHaveBeenCalledWith([]);
    });
  });

  describe('getTabCount', () => {
    it('should return number of tabs', () => {
      expect(manager.getTabCount()).toBe(3);
    });

    it('should update count after adding tab', () => {
      manager.addTab('tab4');

      expect(manager.getTabCount()).toBe(4);
    });

    it('should update count after removing tab', () => {
      manager.removeTab('tab1');

      expect(manager.getTabCount()).toBe(2);
    });
  });

  describe('tab order persistence', () => {
    it('should preserve order through add and remove operations', () => {
      manager.addTab('tab4');
      manager.removeTab('tab2');
      manager.addTab('tab5', 1);

      expect(manager.getTabOrder()).toEqual(['tab1', 'tab5', 'tab3', 'tab4']);
    });

    it('should handle multiple drag operations', () => {
      const result1: DropResult = {
        draggableId: 'tab1',
        source: { droppableId: 'tabs', index: 0 },
        destination: { droppableId: 'tabs', index: 2 },
        reason: 'DROP',
        type: 'DEFAULT',
        combine: null,
      };

      const result2: DropResult = {
        draggableId: 'tab3',
        source: { droppableId: 'tabs', index: 2 },
        destination: { droppableId: 'tabs', index: 0 },
        reason: 'DROP',
        type: 'DEFAULT',
        combine: null,
      };

      manager.handleDragEnd(result1);
      manager.handleDragEnd(result2);

      expect(manager.getTabOrder()).toEqual(['tab3', 'tab2', 'tab1']);
    });
  });
});

// Import vi for mocking
import { vi } from 'vitest';
