import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { TabReorderManager } from './tabReorderManager';
import { DropResult } from 'react-beautiful-dnd';

describe('TabReorderManager - Property-Based Tests', () => {
  describe('Property 1: Tab Order Preservation', () => {
    it('should preserve all tabs after drag operations', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 10 }),
          fc.array(
            fc.record({
              fromIndex: fc.integer({ min: 0, max: 9 }),
              toIndex: fc.integer({ min: 0, max: 9 }),
            }),
            { maxLength: 5 }
          ),
          (initialTabs, dragOperations) => {
            const manager = new TabReorderManager(initialTabs);
            const originalTabs = new Set(initialTabs);

            for (const op of dragOperations) {
              const order = manager.getTabOrder();
              if (op.fromIndex < order.length && op.toIndex <= order.length) {
                const result: DropResult = {
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
            expect(finalTabs).toEqual(originalTabs);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 2: Tab Count Invariant', () => {
    it('should maintain tab count through operations', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 10 }),
          (initialTabs) => {
            const manager = new TabReorderManager(initialTabs);
            const initialCount = manager.getTabCount();

            expect(manager.getTabCount()).toBe(initialCount);
            expect(manager.getTabOrder().length).toBe(initialCount);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 3: Add Tab Idempotence', () => {
    it('should not add duplicate tabs', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 }),
          fc.string({ minLength: 1, maxLength: 10 }),
          (initialTabs, tabToAdd) => {
            const manager = new TabReorderManager(initialTabs);

            manager.addTab(tabToAdd);
            const countAfterFirst = manager.getTabCount();

            manager.addTab(tabToAdd);
            const countAfterSecond = manager.getTabCount();

            expect(countAfterSecond).toBe(countAfterFirst);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 4: Remove Tab Consistency', () => {
    it('should remove tab consistently', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 2, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          (initialTabs, indexToRemove) => {
            const manager = new TabReorderManager(initialTabs);
            const tabToRemove = manager.getTabAtPosition(indexToRemove);

            if (tabToRemove) {
              manager.removeTab(tabToRemove);

              expect(manager.hasTab(tabToRemove)).toBe(false);
              expect(manager.getTabPosition(tabToRemove)).toBe(-1);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 5: Position Consistency', () => {
    it('should maintain consistent position tracking', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 10 }),
          (initialTabs) => {
            const manager = new TabReorderManager(initialTabs);

            for (let i = 0; i < manager.getTabCount(); i++) {
              const tab = manager.getTabAtPosition(i);
              expect(tab).toBeDefined();
              expect(manager.getTabPosition(tab!)).toBe(i);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 6: Listener Notification Consistency', () => {
    it('should notify listeners on every change', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 }),
          fc.string({ minLength: 1, maxLength: 10 }),
          (initialTabs, newTab) => {
            const manager = new TabReorderManager(initialTabs);
            const notifications: string[][] = [];

            manager.subscribe((order) => {
              notifications.push([...order]);
            });

            manager.addTab(newTab);

            expect(notifications.length).toBeGreaterThan(0);
            expect(notifications[notifications.length - 1]).toContain(newTab);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 7: Drag Operation Determinism', () => {
    it('should produce deterministic results for same drag sequence', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 2, maxLength: 5 }),
          (initialTabs) => {
            const manager1 = new TabReorderManager(initialTabs);
            const manager2 = new TabReorderManager(initialTabs);

            // Perform same operation on both
            if (manager1.getTabCount() >= 2) {
              const result: DropResult = {
                draggableId: manager1.getTabAtPosition(0)!,
                source: { droppableId: 'tabs', index: 0 },
                destination: { droppableId: 'tabs', index: manager1.getTabCount() - 1 },
                reason: 'DROP',
                type: 'DEFAULT',
                combine: null,
              };

              manager1.handleDragEnd(result);
              manager2.handleDragEnd(result);

              expect(manager1.getTabOrder()).toEqual(manager2.getTabOrder());
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 8: Clear Operation Completeness', () => {
    it('should completely clear all tabs', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 10 }),
          (initialTabs) => {
            const manager = new TabReorderManager(initialTabs);

            manager.clear();

            expect(manager.getTabCount()).toBe(0);
            expect(manager.getTabOrder()).toEqual([]);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
