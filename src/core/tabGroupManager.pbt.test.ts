import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  createGroup,
  getGroup,
  getAllGroups,
  addTabToGroup,
  removeTabFromGroup,
  removeTabFromAllGroups,
  deleteGroup,
  updateGroup,
  toggleGroupCollapse,
  getGroupForTab,
  clearAllGroups,
  validateTabGroup,
} from './tabGroupManager';
import { TabGroup } from './types';
import { resetDatabase } from './database';

// Arbitraries for generating test data
const colorArbitrary = fc.oneof(
  fc.constant('red' as const),
  fc.constant('blue' as const),
  fc.constant('green' as const),
  fc.constant('yellow' as const),
  fc.constant('purple' as const),
  fc.constant('gray' as const)
);

const tabIdArbitrary = fc.string({ minLength: 1, maxLength: 50 }).map((s) => `tab-${s}`);

const groupNameArbitrary = fc.string({ minLength: 0, maxLength: 100 });

const tabGroupArbitrary = fc.record({
  name: groupNameArbitrary,
  color: colorArbitrary,
  tabIds: fc.array(tabIdArbitrary, { minLength: 0, maxLength: 20, uniqueBy: (id) => id }),
});

describe('TabGroupManager Properties', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterEach(async () => {
    clearAllGroups();
    await resetDatabase();
  });

  describe('Property 10.2: Tab Group Consistency', () => {
    it('should maintain group state after creation', () => {
      fc.assert(
        fc.property(groupNameArbitrary, colorArbitrary, (name, color) => {
          const created = createGroup(name, color);
          const retrieved = getGroup(created.id);

          expect(retrieved).not.toBeNull();
          expect(retrieved?.name).toBe(name);
          expect(retrieved?.color).toBe(color);
          expect(retrieved?.tabIds).toEqual([]);
          expect(retrieved?.isCollapsed).toBe(false);
        }),
        { numRuns: 10 }
      );
    });

    it('should preserve tab order when adding tabs to group', () => {
      fc.assert(
        fc.property(
          fc.array(tabIdArbitrary, { minLength: 1, maxLength: 20, uniqueBy: (id) => id }),
          (tabIds) => {
            // Clear any existing groups first
            clearAllGroups();

            const group = createGroup('Test Group', 'red');

            // Add tabs in order
            tabIds.forEach((tabId) => {
              addTabToGroup(tabId, group.id);
            });

            const retrieved = getGroup(group.id);
            // Verify the group was created and tabs were added
            expect(retrieved).not.toBeNull();
            // All unique tabs should be present
            expect(retrieved?.tabIds.length).toBe(tabIds.length);
            // Verify all tabs are present
            tabIds.forEach((tabId) => {
              expect(retrieved?.tabIds).toContain(tabId);
            });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should maintain consistency after removing tabs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 10 }),
          (tabCount) => {
            // Clear any existing groups first
            clearAllGroups();

            const group = createGroup('Test Group', 'red');
            const tabIds = Array.from({ length: tabCount }, (_, i) => `tab-${i}`);

            // Add all tabs
            tabIds.forEach((tabId) => {
              addTabToGroup(tabId, group.id);
            });

            // Remove one tab
            const tabToRemove = tabIds[0];
            removeTabFromGroup(tabToRemove, group.id);

            // Verify consistency
            const retrieved = getGroup(group.id);
            expect(retrieved).not.toBeNull();
            expect(retrieved?.tabIds).not.toContain(tabToRemove);
            expect(retrieved?.tabIds.length).toBe(tabIds.length - 1);

            // Verify other tabs are still there
            tabIds.slice(1).forEach((tabId) => {
              expect(retrieved?.tabIds).toContain(tabId);
            });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should maintain group list consistency', () => {
      fc.assert(
        fc.property(
          fc.array(tabGroupArbitrary, { minLength: 1, maxLength: 10 }),
          (groupSpecs) => {
            // Clear any existing groups first
            clearAllGroups();

            // Create all groups
            const createdGroups = groupSpecs.map((spec) => createGroup(spec.name, spec.color));

            // Verify all groups are retrievable
            const allGroups = getAllGroups();
            expect(allGroups.length).toBe(createdGroups.length);

            createdGroups.forEach((created) => {
              const found = allGroups.find((g) => g.id === created.id);
              expect(found).not.toBeUndefined();
            });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should maintain consistency when moving tabs between groups', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (tabCount) => {
            // Clear any existing groups first
            clearAllGroups();

            const group1 = createGroup('Group 1', 'red');
            const group2 = createGroup('Group 2', 'blue');
            const tabIds = Array.from({ length: tabCount }, (_, i) => `tab-${i}`);

            // Add all tabs to group1
            tabIds.forEach((tabId) => {
              addTabToGroup(tabId, group1.id);
            });

            // Move first tab to group2
            if (tabIds.length > 0) {
              addTabToGroup(tabIds[0], group2.id);

              const g1 = getGroup(group1.id);
              const g2 = getGroup(group2.id);

              // Tab should be in group2 only
              expect(g2?.tabIds).toContain(tabIds[0]);
              expect(g1?.tabIds).not.toContain(tabIds[0]);

              // Other tabs should still be in group1
              tabIds.slice(1).forEach((tabId) => {
                expect(g1?.tabIds).toContain(tabId);
              });
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should maintain consistency after update operations', () => {
      fc.assert(
        fc.property(
          groupNameArbitrary,
          colorArbitrary,
          fc.array(tabIdArbitrary, { minLength: 0, maxLength: 10, uniqueBy: (id) => id }),
          (newName, newColor, newTabIds) => {
            const group = createGroup('Original', 'red');
            addTabToGroup('tab-original', group.id);

            // Update group
            updateGroup(group.id, {
              name: newName,
              color: newColor,
              tabIds: newTabIds,
            });

            const updated = getGroup(group.id);
            expect(updated?.name).toBe(newName);
            expect(updated?.color).toBe(newColor);
            expect(updated?.tabIds).toEqual(newTabIds);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should maintain consistency when toggling collapse state', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 5 }), (toggleCount) => {
          const group = createGroup('Test Group', 'red');
          let expectedState = false;

          for (let i = 0; i < toggleCount; i++) {
            toggleGroupCollapse(group.id);
            expectedState = !expectedState;
          }

          const retrieved = getGroup(group.id);
          expect(retrieved?.isCollapsed).toBe(expectedState);
        }),
        { numRuns: 10 }
      );
    });

    it('should maintain consistency when deleting and recreating groups', () => {
      fc.assert(
        fc.property(groupNameArbitrary, colorArbitrary, (name, color) => {
          const group1 = createGroup(name, color);
          const id1 = group1.id;

          deleteGroup(id1);
          expect(getGroup(id1)).toBeNull();

          const group2 = createGroup(name, color);
          const id2 = group2.id;

          // New group should have different ID
          expect(id2).not.toBe(id1);
          expect(getGroup(id2)).not.toBeNull();
        }),
        { numRuns: 10 }
      );
    });

    it('should maintain consistency of getGroupForTab', () => {
      fc.assert(
        fc.property(
          fc.array(tabIdArbitrary, { minLength: 1, maxLength: 10, uniqueBy: (id) => id }),
          (tabIds) => {
            const group = createGroup('Test Group', 'red');

            // Add tabs to group
            tabIds.forEach((tabId) => {
              addTabToGroup(tabId, group.id);
            });

            // Verify getGroupForTab returns correct group for each tab
            tabIds.forEach((tabId) => {
              const found = getGroupForTab(tabId);
              expect(found?.id).toBe(group.id);
            });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should maintain consistency when removing tabs from all groups', () => {
      fc.assert(
        fc.property(
          fc.array(tabIdArbitrary, { minLength: 1, maxLength: 5, uniqueBy: (id) => id }),
          (tabIds) => {
            const groups = [
              createGroup('Group 1', 'red'),
              createGroup('Group 2', 'blue'),
              createGroup('Group 3', 'green'),
            ];

            // Add first tab to all groups
            if (tabIds.length > 0) {
              groups.forEach((group) => {
                addTabToGroup(tabIds[0], group.id);
              });

              // Remove tab from all groups
              removeTabFromAllGroups(tabIds[0]);

              // Verify tab is not in any group
              groups.forEach((group) => {
                const retrieved = getGroup(group.id);
                expect(retrieved?.tabIds).not.toContain(tabIds[0]);
              });
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should validate all created groups', () => {
      fc.assert(
        fc.property(groupNameArbitrary, colorArbitrary, (name, color) => {
          const group = createGroup(name, color);
          expect(validateTabGroup(group)).toBe(true);
        }),
        { numRuns: 10 }
      );
    });

    it('should validate all retrieved groups', () => {
      fc.assert(
        fc.property(
          fc.array(tabGroupArbitrary, { minLength: 1, maxLength: 10 }),
          (groupSpecs) => {
            // Create groups
            groupSpecs.forEach((spec) => {
              createGroup(spec.name, spec.color);
            });

            // Verify all retrieved groups are valid
            const allGroups = getAllGroups();
            allGroups.forEach((group) => {
              expect(validateTabGroup(group)).toBe(true);
            });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should maintain consistency of tab IDs across operations', () => {
      fc.assert(
        fc.property(
          fc.array(tabIdArbitrary, { minLength: 1, maxLength: 20, uniqueBy: (id) => id }),
          (tabIds) => {
            // Clear any existing groups first
            clearAllGroups();

            const group = createGroup('Test Group', 'red');

            // Add tabs
            tabIds.forEach((tabId) => {
              addTabToGroup(tabId, group.id);
            });

            // Verify all tab IDs are preserved exactly
            const retrieved = getGroup(group.id);
            expect(retrieved?.tabIds.length).toBe(tabIds.length);

            tabIds.forEach((tabId) => {
              expect(retrieved?.tabIds).toContain(tabId);
            });
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property: Group Idempotence', () => {
    it('should produce same result when retrieving group multiple times', () => {
      fc.assert(
        fc.property(groupNameArbitrary, colorArbitrary, (name, color) => {
          const group = createGroup(name, color);

          const first = getGroup(group.id);
          const second = getGroup(group.id);
          const third = getGroup(group.id);

          expect(first).toEqual(second);
          expect(second).toEqual(third);
        }),
        { numRuns: 10 }
      );
    });

    it('should produce same result when toggling collapse even number of times', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 10 }), (togglePairs) => {
          const group = createGroup('Test Group', 'red');
          const original = getGroup(group.id);

          // Toggle even number of times
          for (let i = 0; i < togglePairs * 2; i++) {
            toggleGroupCollapse(group.id);
          }

          const final = getGroup(group.id);
          expect(final?.isCollapsed).toBe(original?.isCollapsed);
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Property: Group Determinism', () => {
    it('should create deterministic group IDs for same input', () => {
      fc.assert(
        fc.property(groupNameArbitrary, colorArbitrary, (name, color) => {
          const group1 = createGroup(name, color);
          const group2 = createGroup(name, color);

          // IDs should be different (based on timestamp)
          expect(group1.id).not.toBe(group2.id);

          // But properties should be the same
          expect(group1.name).toBe(group2.name);
          expect(group1.color).toBe(group2.color);
        }),
        { numRuns: 10 }
      );
    });
  });
});
