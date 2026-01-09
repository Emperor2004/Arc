"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const tabReorderManager_1 = require("./tabReorderManager");
(0, vitest_1.describe)('TabReorderManager', () => {
    let manager;
    (0, vitest_1.beforeEach)(() => {
        manager = new tabReorderManager_1.TabReorderManager(['tab1', 'tab2', 'tab3']);
    });
    (0, vitest_1.describe)('initialization', () => {
        (0, vitest_1.it)('should initialize with provided tab order', () => {
            (0, vitest_1.expect)(manager.getTabOrder()).toEqual(['tab1', 'tab2', 'tab3']);
        });
        (0, vitest_1.it)('should initialize with empty order if not provided', () => {
            const emptyManager = new tabReorderManager_1.TabReorderManager();
            (0, vitest_1.expect)(manager.getTabOrder()).toEqual(['tab1', 'tab2', 'tab3']);
        });
    });
    (0, vitest_1.describe)('handleDragEnd', () => {
        (0, vitest_1.it)('should reorder tabs when dragged to different position', () => {
            const result = {
                draggableId: 'tab1',
                source: { droppableId: 'tabs', index: 0 },
                destination: { droppableId: 'tabs', index: 2 },
                reason: 'DROP',
                type: 'DEFAULT',
                combine: null,
            };
            const changed = manager.handleDragEnd(result);
            (0, vitest_1.expect)(changed).toBe(true);
            (0, vitest_1.expect)(manager.getTabOrder()).toEqual(['tab2', 'tab3', 'tab1']);
        });
        (0, vitest_1.it)('should not change order when dropped in same position', () => {
            const result = {
                draggableId: 'tab1',
                source: { droppableId: 'tabs', index: 0 },
                destination: { droppableId: 'tabs', index: 0 },
                reason: 'DROP',
                type: 'DEFAULT',
                combine: null,
            };
            const changed = manager.handleDragEnd(result);
            (0, vitest_1.expect)(changed).toBe(false);
            (0, vitest_1.expect)(manager.getTabOrder()).toEqual(['tab1', 'tab2', 'tab3']);
        });
        (0, vitest_1.it)('should not change order when dropped outside list', () => {
            const result = {
                draggableId: 'tab1',
                source: { droppableId: 'tabs', index: 0 },
                destination: null,
                reason: 'DROP',
                type: 'DEFAULT',
                combine: null,
            };
            const changed = manager.handleDragEnd(result);
            (0, vitest_1.expect)(changed).toBe(false);
            (0, vitest_1.expect)(manager.getTabOrder()).toEqual(['tab1', 'tab2', 'tab3']);
        });
        (0, vitest_1.it)('should move tab to end', () => {
            const result = {
                draggableId: 'tab1',
                source: { droppableId: 'tabs', index: 0 },
                destination: { droppableId: 'tabs', index: 2 },
                reason: 'DROP',
                type: 'DEFAULT',
                combine: null,
            };
            manager.handleDragEnd(result);
            (0, vitest_1.expect)(manager.getTabOrder()).toEqual(['tab2', 'tab3', 'tab1']);
        });
        (0, vitest_1.it)('should move tab to beginning', () => {
            const result = {
                draggableId: 'tab3',
                source: { droppableId: 'tabs', index: 2 },
                destination: { droppableId: 'tabs', index: 0 },
                reason: 'DROP',
                type: 'DEFAULT',
                combine: null,
            };
            manager.handleDragEnd(result);
            (0, vitest_1.expect)(manager.getTabOrder()).toEqual(['tab3', 'tab1', 'tab2']);
        });
    });
    (0, vitest_1.describe)('addTab', () => {
        (0, vitest_1.it)('should add tab to end by default', () => {
            manager.addTab('tab4');
            (0, vitest_1.expect)(manager.getTabOrder()).toEqual(['tab1', 'tab2', 'tab3', 'tab4']);
        });
        (0, vitest_1.it)('should add tab at specific position', () => {
            manager.addTab('tab4', 1);
            (0, vitest_1.expect)(manager.getTabOrder()).toEqual(['tab1', 'tab4', 'tab2', 'tab3']);
        });
        (0, vitest_1.it)('should not add duplicate tab', () => {
            manager.addTab('tab1');
            (0, vitest_1.expect)(manager.getTabOrder()).toEqual(['tab1', 'tab2', 'tab3']);
        });
        (0, vitest_1.it)('should add tab at beginning when position is 0', () => {
            manager.addTab('tab0', 0);
            (0, vitest_1.expect)(manager.getTabOrder()).toEqual(['tab0', 'tab1', 'tab2', 'tab3']);
        });
    });
    (0, vitest_1.describe)('removeTab', () => {
        (0, vitest_1.it)('should remove tab from order', () => {
            manager.removeTab('tab2');
            (0, vitest_1.expect)(manager.getTabOrder()).toEqual(['tab1', 'tab3']);
        });
        (0, vitest_1.it)('should not error when removing non-existent tab', () => {
            (0, vitest_1.expect)(() => manager.removeTab('tab99')).not.toThrow();
            (0, vitest_1.expect)(manager.getTabOrder()).toEqual(['tab1', 'tab2', 'tab3']);
        });
        (0, vitest_1.it)('should remove first tab', () => {
            manager.removeTab('tab1');
            (0, vitest_1.expect)(manager.getTabOrder()).toEqual(['tab2', 'tab3']);
        });
        (0, vitest_1.it)('should remove last tab', () => {
            manager.removeTab('tab3');
            (0, vitest_1.expect)(manager.getTabOrder()).toEqual(['tab1', 'tab2']);
        });
    });
    (0, vitest_1.describe)('getTabOrder', () => {
        (0, vitest_1.it)('should return copy of tab order', () => {
            const order = manager.getTabOrder();
            order.push('tab4');
            (0, vitest_1.expect)(manager.getTabOrder()).toEqual(['tab1', 'tab2', 'tab3']);
        });
    });
    (0, vitest_1.describe)('setTabOrder', () => {
        (0, vitest_1.it)('should set new tab order', () => {
            manager.setTabOrder(['tab3', 'tab1', 'tab2']);
            (0, vitest_1.expect)(manager.getTabOrder()).toEqual(['tab3', 'tab1', 'tab2']);
        });
        (0, vitest_1.it)('should notify listeners when setting order', () => {
            const listener = vitest_2.vi.fn();
            manager.subscribe(listener);
            manager.setTabOrder(['tab3', 'tab1', 'tab2']);
            (0, vitest_1.expect)(listener).toHaveBeenCalledWith(['tab3', 'tab1', 'tab2']);
        });
    });
    (0, vitest_1.describe)('getTabPosition', () => {
        (0, vitest_1.it)('should return position of tab', () => {
            (0, vitest_1.expect)(manager.getTabPosition('tab1')).toBe(0);
            (0, vitest_1.expect)(manager.getTabPosition('tab2')).toBe(1);
            (0, vitest_1.expect)(manager.getTabPosition('tab3')).toBe(2);
        });
        (0, vitest_1.it)('should return -1 for non-existent tab', () => {
            (0, vitest_1.expect)(manager.getTabPosition('tab99')).toBe(-1);
        });
    });
    (0, vitest_1.describe)('hasTab', () => {
        (0, vitest_1.it)('should return true for existing tab', () => {
            (0, vitest_1.expect)(manager.hasTab('tab1')).toBe(true);
            (0, vitest_1.expect)(manager.hasTab('tab2')).toBe(true);
        });
        (0, vitest_1.it)('should return false for non-existent tab', () => {
            (0, vitest_1.expect)(manager.hasTab('tab99')).toBe(false);
        });
    });
    (0, vitest_1.describe)('getTabAtPosition', () => {
        (0, vitest_1.it)('should return tab at position', () => {
            (0, vitest_1.expect)(manager.getTabAtPosition(0)).toBe('tab1');
            (0, vitest_1.expect)(manager.getTabAtPosition(1)).toBe('tab2');
            (0, vitest_1.expect)(manager.getTabAtPosition(2)).toBe('tab3');
        });
        (0, vitest_1.it)('should return undefined for invalid position', () => {
            (0, vitest_1.expect)(manager.getTabAtPosition(99)).toBeUndefined();
        });
    });
    (0, vitest_1.describe)('subscribe', () => {
        (0, vitest_1.it)('should notify listener on tab order change', () => {
            const listener = vitest_2.vi.fn();
            manager.subscribe(listener);
            manager.addTab('tab4');
            (0, vitest_1.expect)(listener).toHaveBeenCalledWith(['tab1', 'tab2', 'tab3', 'tab4']);
        });
        (0, vitest_1.it)('should return unsubscribe function', () => {
            const listener = vitest_2.vi.fn();
            const unsubscribe = manager.subscribe(listener);
            manager.addTab('tab4');
            (0, vitest_1.expect)(listener).toHaveBeenCalledTimes(1);
            unsubscribe();
            manager.addTab('tab5');
            (0, vitest_1.expect)(listener).toHaveBeenCalledTimes(1);
        });
        (0, vitest_1.it)('should support multiple listeners', () => {
            const listener1 = vitest_2.vi.fn();
            const listener2 = vitest_2.vi.fn();
            manager.subscribe(listener1);
            manager.subscribe(listener2);
            manager.addTab('tab4');
            (0, vitest_1.expect)(listener1).toHaveBeenCalledTimes(1);
            (0, vitest_1.expect)(listener2).toHaveBeenCalledTimes(1);
        });
    });
    (0, vitest_1.describe)('clear', () => {
        (0, vitest_1.it)('should clear all tabs', () => {
            manager.clear();
            (0, vitest_1.expect)(manager.getTabOrder()).toEqual([]);
        });
        (0, vitest_1.it)('should notify listeners when clearing', () => {
            const listener = vitest_2.vi.fn();
            manager.subscribe(listener);
            manager.clear();
            (0, vitest_1.expect)(listener).toHaveBeenCalledWith([]);
        });
    });
    (0, vitest_1.describe)('getTabCount', () => {
        (0, vitest_1.it)('should return number of tabs', () => {
            (0, vitest_1.expect)(manager.getTabCount()).toBe(3);
        });
        (0, vitest_1.it)('should update count after adding tab', () => {
            manager.addTab('tab4');
            (0, vitest_1.expect)(manager.getTabCount()).toBe(4);
        });
        (0, vitest_1.it)('should update count after removing tab', () => {
            manager.removeTab('tab1');
            (0, vitest_1.expect)(manager.getTabCount()).toBe(2);
        });
    });
    (0, vitest_1.describe)('tab order persistence', () => {
        (0, vitest_1.it)('should preserve order through add and remove operations', () => {
            manager.addTab('tab4');
            manager.removeTab('tab2');
            manager.addTab('tab5', 1);
            (0, vitest_1.expect)(manager.getTabOrder()).toEqual(['tab1', 'tab5', 'tab3', 'tab4']);
        });
        (0, vitest_1.it)('should handle multiple drag operations', () => {
            const result1 = {
                draggableId: 'tab1',
                source: { droppableId: 'tabs', index: 0 },
                destination: { droppableId: 'tabs', index: 2 },
                reason: 'DROP',
                type: 'DEFAULT',
                combine: null,
            };
            const result2 = {
                draggableId: 'tab3',
                source: { droppableId: 'tabs', index: 2 },
                destination: { droppableId: 'tabs', index: 0 },
                reason: 'DROP',
                type: 'DEFAULT',
                combine: null,
            };
            manager.handleDragEnd(result1);
            manager.handleDragEnd(result2);
            (0, vitest_1.expect)(manager.getTabOrder()).toEqual(['tab3', 'tab2', 'tab1']);
        });
    });
});
// Import vi for mocking
const vitest_2 = require("vitest");
