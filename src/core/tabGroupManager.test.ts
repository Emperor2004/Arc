import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

describe('TabGroupManager', () => {
  beforeEach(() => {
    resetDatabase();
  });

  afterEach(() => {
    clearAllGroups();
  });

  describe('createGroup', () => {
    it('should create a new tab group', () => {
      const group = createGroup('Work', 'blue');

      expect(group.id).toBeDefined();
      expect(group.name).toBe('Work');
      expect(group.color).toBe('blue');
      expect(group.tabIds).toEqual([]);
      expect(group.isCollapsed).toBe(false);
      expect(group.createdAt).toBeGreaterThan(0);
    });

    it('should create groups with different colors', () => {
      const colors: TabGroup['color'][] = ['red', 'blue', 'green', 'yellow', 'purple', 'gray'];

      colors.forEach((color) => {
        const group = createGroup(`Group-${color}`, color);
        expect(group.color).toBe(color);
      });
    });

    it('should create groups with unique IDs', () => {
      const group1 = createGroup('Group 1', 'red');
      const group2 = createGroup('Group 2', 'blue');

      expect(group1.id).not.toBe(group2.id);
    });
  });

  describe('getGroup', () => {
    it('should retrieve a created group', () => {
      const created = createGroup('Test Group', 'red');
      const retrieved = getGroup(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Test Group');
      expect(retrieved?.color).toBe('red');
    });

    it('should return null for non-existent group', () => {
      const retrieved = getGroup('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('getAllGroups', () => {
    it('should return empty array when no groups exist', () => {
      const groups = getAllGroups();
      expect(groups).toEqual([]);
    });

    it('should return all created groups', () => {
      createGroup('Group 1', 'red');
      createGroup('Group 2', 'blue');
      createGroup('Group 3', 'green');

      const groups = getAllGroups();
      expect(groups).toHaveLength(3);
    });

    it('should return groups in reverse chronological order', () => {
      const group1 = createGroup('Group 1', 'red');
      const group2 = createGroup('Group 2', 'blue');
      const group3 = createGroup('Group 3', 'green');

      const groups = getAllGroups();
      expect(groups[0].id).toBe(group3.id);
      expect(groups[1].id).toBe(group2.id);
      expect(groups[2].id).toBe(group1.id);
    });
  });

  describe('addTabToGroup', () => {
    it('should add a tab to a group', () => {
      const group = createGroup('Test Group', 'red');
      addTabToGroup('tab-1', group.id);

      const updated = getGroup(group.id);
      expect(updated?.tabIds).toContain('tab-1');
    });

    it('should add multiple tabs to a group', () => {
      const group = createGroup('Test Group', 'red');
      addTabToGroup('tab-1', group.id);
      addTabToGroup('tab-2', group.id);
      addTabToGroup('tab-3', group.id);

      const updated = getGroup(group.id);
      expect(updated?.tabIds).toEqual(['tab-1', 'tab-2', 'tab-3']);
    });

    it('should not add duplicate tabs', () => {
      const group = createGroup('Test Group', 'red');
      addTabToGroup('tab-1', group.id);
      addTabToGroup('tab-1', group.id);

      const updated = getGroup(group.id);
      expect(updated?.tabIds).toEqual(['tab-1']);
    });

    it('should remove tab from other groups when adding to new group', () => {
      const group1 = createGroup('Group 1', 'red');
      const group2 = createGroup('Group 2', 'blue');

      addTabToGroup('tab-1', group1.id);
      expect(getGroup(group1.id)?.tabIds).toContain('tab-1');

      addTabToGroup('tab-1', group2.id);
      expect(getGroup(group1.id)?.tabIds).not.toContain('tab-1');
      expect(getGroup(group2.id)?.tabIds).toContain('tab-1');
    });

    it('should throw error when adding to non-existent group', () => {
      expect(() => addTabToGroup('tab-1', 'non-existent-id')).toThrow();
    });
  });

  describe('removeTabFromGroup', () => {
    it('should remove a tab from a group', () => {
      const group = createGroup('Test Group', 'red');
      addTabToGroup('tab-1', group.id);
      addTabToGroup('tab-2', group.id);

      removeTabFromGroup('tab-1', group.id);

      const updated = getGroup(group.id);
      expect(updated?.tabIds).toEqual(['tab-2']);
    });

    it('should handle removing non-existent tab', () => {
      const group = createGroup('Test Group', 'red');
      addTabToGroup('tab-1', group.id);

      removeTabFromGroup('tab-999', group.id);

      const updated = getGroup(group.id);
      expect(updated?.tabIds).toEqual(['tab-1']);
    });

    it('should throw error when removing from non-existent group', () => {
      expect(() => removeTabFromGroup('tab-1', 'non-existent-id')).toThrow();
    });
  });

  describe('removeTabFromAllGroups', () => {
    it('should remove tab from all groups', () => {
      const group1 = createGroup('Group 1', 'red');
      const group2 = createGroup('Group 2', 'blue');

      addTabToGroup('tab-1', group1.id);
      addTabToGroup('tab-1', group2.id);

      removeTabFromAllGroups('tab-1');

      const g1 = getGroup(group1.id);
      const g2 = getGroup(group2.id);
      expect(g1?.tabIds).not.toContain('tab-1');
      expect(g2?.tabIds).not.toContain('tab-1');
    });

    it('should handle removing tab that is not in any group', () => {
      const group = createGroup('Test Group', 'red');
      addTabToGroup('tab-1', group.id);

      removeTabFromAllGroups('tab-999');

      expect(getGroup(group.id)?.tabIds).toEqual(['tab-1']);
    });
  });

  describe('deleteGroup', () => {
    it('should delete a group', () => {
      const group = createGroup('Test Group', 'red');
      expect(getGroup(group.id)).not.toBeNull();

      deleteGroup(group.id);

      expect(getGroup(group.id)).toBeNull();
    });

    it('should not affect other groups', () => {
      const group1 = createGroup('Group 1', 'red');
      const group2 = createGroup('Group 2', 'blue');

      deleteGroup(group1.id);

      expect(getGroup(group1.id)).toBeNull();
      expect(getGroup(group2.id)).not.toBeNull();
    });
  });

  describe('updateGroup', () => {
    it('should update group name', () => {
      const group = createGroup('Original Name', 'red');
      updateGroup(group.id, { name: 'Updated Name' });

      const updated = getGroup(group.id);
      expect(updated?.name).toBe('Updated Name');
    });

    it('should update group color', () => {
      const group = createGroup('Test Group', 'red');
      updateGroup(group.id, { color: 'blue' });

      const updated = getGroup(group.id);
      expect(updated?.color).toBe('blue');
    });

    it('should update group tabIds', () => {
      const group = createGroup('Test Group', 'red');
      updateGroup(group.id, { tabIds: ['tab-1', 'tab-2', 'tab-3'] });

      const updated = getGroup(group.id);
      expect(updated?.tabIds).toEqual(['tab-1', 'tab-2', 'tab-3']);
    });

    it('should update multiple properties at once', () => {
      const group = createGroup('Original', 'red');
      updateGroup(group.id, {
        name: 'Updated',
        color: 'blue',
        isCollapsed: true,
      });

      const updated = getGroup(group.id);
      expect(updated?.name).toBe('Updated');
      expect(updated?.color).toBe('blue');
      expect(updated?.isCollapsed).toBe(true);
    });

    it('should throw error when updating non-existent group', () => {
      expect(() => updateGroup('non-existent-id', { name: 'New Name' })).toThrow();
    });
  });

  describe('toggleGroupCollapse', () => {
    it('should toggle group collapse state from false to true', () => {
      const group = createGroup('Test Group', 'red');
      expect(getGroup(group.id)?.isCollapsed).toBe(false);

      toggleGroupCollapse(group.id);

      expect(getGroup(group.id)?.isCollapsed).toBe(true);
    });

    it('should toggle group collapse state from true to false', () => {
      const group = createGroup('Test Group', 'red');
      updateGroup(group.id, { isCollapsed: true });

      toggleGroupCollapse(group.id);

      expect(getGroup(group.id)?.isCollapsed).toBe(false);
    });

    it('should throw error when toggling non-existent group', () => {
      expect(() => toggleGroupCollapse('non-existent-id')).toThrow();
    });
  });

  describe('getGroupForTab', () => {
    it('should return the group containing a tab', () => {
      const group = createGroup('Test Group', 'red');
      addTabToGroup('tab-1', group.id);

      const found = getGroupForTab('tab-1');
      expect(found?.id).toBe(group.id);
    });

    it('should return null when tab is not in any group', () => {
      createGroup('Test Group', 'red');

      const found = getGroupForTab('tab-999');
      expect(found).toBeNull();
    });

    it('should return the correct group when tab is in multiple groups (after move)', () => {
      const group1 = createGroup('Group 1', 'red');
      const group2 = createGroup('Group 2', 'blue');

      addTabToGroup('tab-1', group1.id);
      addTabToGroup('tab-1', group2.id);

      const found = getGroupForTab('tab-1');
      expect(found?.id).toBe(group2.id);
    });
  });

  describe('clearAllGroups', () => {
    it('should delete all groups', () => {
      createGroup('Group 1', 'red');
      createGroup('Group 2', 'blue');
      createGroup('Group 3', 'green');

      expect(getAllGroups()).toHaveLength(3);

      clearAllGroups();

      expect(getAllGroups()).toEqual([]);
    });
  });

  describe('validateTabGroup', () => {
    it('should validate a correct tab group', () => {
      const group: TabGroup = {
        id: 'group-1',
        name: 'Test Group',
        color: 'red',
        tabIds: ['tab-1', 'tab-2'],
        isCollapsed: false,
        createdAt: Date.now(),
      };

      expect(validateTabGroup(group)).toBe(true);
    });

    it('should reject group with invalid color', () => {
      const group = {
        id: 'group-1',
        name: 'Test Group',
        color: 'invalid-color',
        tabIds: ['tab-1'],
        isCollapsed: false,
        createdAt: Date.now(),
      };

      expect(validateTabGroup(group)).toBe(false);
    });

    it('should reject group with invalid tabIds', () => {
      const group = {
        id: 'group-1',
        name: 'Test Group',
        color: 'red',
        tabIds: ['tab-1', 123], // Invalid: number instead of string
        isCollapsed: false,
        createdAt: Date.now(),
      };

      expect(validateTabGroup(group)).toBe(false);
    });

    it('should reject null or undefined', () => {
      expect(validateTabGroup(null)).toBe(false);
      expect(validateTabGroup(undefined)).toBe(false);
    });

    it('should reject group with missing properties', () => {
      const group = {
        id: 'group-1',
        name: 'Test Group',
        // Missing color, tabIds, isCollapsed, createdAt
      };

      expect(validateTabGroup(group)).toBe(false);
    });
  });

  describe('group persistence', () => {
    it('should persist groups across multiple operations', () => {
      const group1 = createGroup('Group 1', 'red');
      addTabToGroup('tab-1', group1.id);
      addTabToGroup('tab-2', group1.id);

      const group2 = createGroup('Group 2', 'blue');
      addTabToGroup('tab-3', group2.id);

      const retrieved1 = getGroup(group1.id);
      const retrieved2 = getGroup(group2.id);

      expect(retrieved1?.tabIds).toEqual(['tab-1', 'tab-2']);
      expect(retrieved2?.tabIds).toEqual(['tab-3']);
    });

    it('should maintain group state after updates', () => {
      const group = createGroup('Original', 'red');
      addTabToGroup('tab-1', group.id);

      updateGroup(group.id, { name: 'Updated', color: 'blue' });

      const updated = getGroup(group.id);
      expect(updated?.name).toBe('Updated');
      expect(updated?.color).toBe('blue');
      expect(updated?.tabIds).toEqual(['tab-1']);
    });
  });

  describe('edge cases', () => {
    it('should handle group with empty name', () => {
      const group = createGroup('', 'red');
      expect(group.name).toBe('');
      expect(getGroup(group.id)?.name).toBe('');
    });

    it('should handle group with special characters in name', () => {
      const group = createGroup('Group @#$%^&*()', 'red');
      expect(getGroup(group.id)?.name).toBe('Group @#$%^&*()');
    });

    it('should handle tab IDs with special characters', () => {
      const group = createGroup('Test Group', 'red');
      addTabToGroup('tab-@#$%', group.id);

      expect(getGroup(group.id)?.tabIds).toContain('tab-@#$%');
    });

    it('should handle large number of tabs in a group', () => {
      const group = createGroup('Large Group', 'red');

      for (let i = 0; i < 100; i++) {
        addTabToGroup(`tab-${i}`, group.id);
      }

      const updated = getGroup(group.id);
      expect(updated?.tabIds).toHaveLength(100);
    });
  });
});
