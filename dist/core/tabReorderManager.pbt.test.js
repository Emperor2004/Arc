"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fast_check_1 = __importDefault(require("fast-check"));
const tabReorderManager_1 = require("./tabReorderManager");
(0, vitest_1.describe)('TabReorderManager - Property-Based Tests', () => {
    (0, vitest_1.describe)('Property 1: Tab Order Preservation', () => {
        (0, vitest_1.it)('should preserve all tabs after drag operations', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.uniqueArray(fast_check_1.default.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 10 }), fast_check_1.default.array(fast_check_1.default.record({
                fromIndex: fast_check_1.default.integer({ min: 0, max: 9 }),
                toIndex: fast_check_1.default.integer({ min: 0, max: 9 }),
            }), { maxLength: 5 }), (initialTabs, dragOperations) => {
                const manager = new tabReorderManager_1.TabReorderManager(initialTabs);
                const originalTabs = new Set(initialTabs);
                for (const op of dragOperations) {
                    const order = manager.getTabOrder();
                    if (op.fromIndex < order.length && op.toIndex <= order.length) {
                        const result = {
                            draggableId: order[op.fromIndex],
                            source: { droppableId: 'tabs', index: op.fromIndex },
                            destination: { droppableId: 'tabs', index: op.toIndex },
                            reason: 'DROP',
                            type: 'DEFAULT',
                            combine: null,
                        };
                        manager.handleDragEnd(result);
                    }
                }
                const finalTabs = new Set(manager.getTabOrder());
                (0, vitest_1.expect)(finalTabs).toEqual(originalTabs);
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property 2: Tab Count Invariant', () => {
        (0, vitest_1.it)('should maintain tab count through operations', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.uniqueArray(fast_check_1.default.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 10 }), (initialTabs) => {
                const manager = new tabReorderManager_1.TabReorderManager(initialTabs);
                const initialCount = manager.getTabCount();
                (0, vitest_1.expect)(manager.getTabCount()).toBe(initialCount);
                (0, vitest_1.expect)(manager.getTabOrder().length).toBe(initialCount);
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property 3: Add Tab Idempotence', () => {
        (0, vitest_1.it)('should not add duplicate tabs', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.uniqueArray(fast_check_1.default.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 }), fast_check_1.default.string({ minLength: 1, maxLength: 10 }), (initialTabs, tabToAdd) => {
                const manager = new tabReorderManager_1.TabReorderManager(initialTabs);
                manager.addTab(tabToAdd);
                const countAfterFirst = manager.getTabCount();
                manager.addTab(tabToAdd);
                const countAfterSecond = manager.getTabCount();
                (0, vitest_1.expect)(countAfterSecond).toBe(countAfterFirst);
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property 4: Remove Tab Consistency', () => {
        (0, vitest_1.it)('should remove tab consistently', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.uniqueArray(fast_check_1.default.string({ minLength: 1, maxLength: 10 }), { minLength: 2, maxLength: 10 }), fast_check_1.default.integer({ min: 0, max: 9 }), (initialTabs, indexToRemove) => {
                const manager = new tabReorderManager_1.TabReorderManager(initialTabs);
                const tabToRemove = manager.getTabAtPosition(indexToRemove);
                if (tabToRemove) {
                    manager.removeTab(tabToRemove);
                    (0, vitest_1.expect)(manager.hasTab(tabToRemove)).toBe(false);
                    (0, vitest_1.expect)(manager.getTabPosition(tabToRemove)).toBe(-1);
                }
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property 5: Position Consistency', () => {
        (0, vitest_1.it)('should maintain consistent position tracking', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.uniqueArray(fast_check_1.default.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 10 }), (initialTabs) => {
                const manager = new tabReorderManager_1.TabReorderManager(initialTabs);
                for (let i = 0; i < manager.getTabCount(); i++) {
                    const tab = manager.getTabAtPosition(i);
                    (0, vitest_1.expect)(tab).toBeDefined();
                    (0, vitest_1.expect)(manager.getTabPosition(tab)).toBe(i);
                }
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property 6: Listener Notification Consistency', () => {
        (0, vitest_1.it)('should notify listeners on every change', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.uniqueArray(fast_check_1.default.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 }), fast_check_1.default.string({ minLength: 1, maxLength: 10 }), (initialTabs, newTab) => {
                const manager = new tabReorderManager_1.TabReorderManager(initialTabs);
                const notifications = [];
                manager.subscribe((order) => {
                    notifications.push([...order]);
                });
                manager.addTab(newTab);
                (0, vitest_1.expect)(notifications.length).toBeGreaterThan(0);
                (0, vitest_1.expect)(notifications[notifications.length - 1]).toContain(newTab);
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property 7: Drag Operation Determinism', () => {
        (0, vitest_1.it)('should produce deterministic results for same drag sequence', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.uniqueArray(fast_check_1.default.string({ minLength: 1, maxLength: 10 }), { minLength: 2, maxLength: 5 }), (initialTabs) => {
                const manager1 = new tabReorderManager_1.TabReorderManager(initialTabs);
                const manager2 = new tabReorderManager_1.TabReorderManager(initialTabs);
                // Perform same operation on both
                if (manager1.getTabCount() >= 2) {
                    const result = {
                        draggableId: manager1.getTabAtPosition(0),
                        source: { droppableId: 'tabs', index: 0 },
                        destination: { droppableId: 'tabs', index: manager1.getTabCount() - 1 },
                        reason: 'DROP',
                        type: 'DEFAULT',
                        combine: null,
                    };
                    manager1.handleDragEnd(result);
                    manager2.handleDragEnd(result);
                    (0, vitest_1.expect)(manager1.getTabOrder()).toEqual(manager2.getTabOrder());
                }
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property 8: Clear Operation Completeness', () => {
        (0, vitest_1.it)('should completely clear all tabs', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.uniqueArray(fast_check_1.default.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 10 }), (initialTabs) => {
                const manager = new tabReorderManager_1.TabReorderManager(initialTabs);
                manager.clear();
                (0, vitest_1.expect)(manager.getTabCount()).toBe(0);
                (0, vitest_1.expect)(manager.getTabOrder()).toEqual([]);
            }), { numRuns: 100 });
        });
    });
});
