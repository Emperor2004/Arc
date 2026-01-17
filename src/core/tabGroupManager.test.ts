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
import { initializeDatabase, resetDatabase } from './database';

describe('TabGroupManager', () => {
  beforeEach(async () => {
    await initializeDatabase();
    await resetDatabase();
  });

  afterEach(async () => {
    await clearAllGroups();
  });

  describe('createGroup', () => {
    it('should create a new tab group', async () => {
      const group = await createGroup('Work', 'blue');

      expect(group.id).toBeDefined();
      expect(group.name).toBe('Work');
      expect(group.color).toBe('blue');
      expect(group.tabIds).toEqual([]);
      expect(group.isCollapsed).toBe(false);
      expect(group.createdAt).toBeGreaterThan(0);
    });

    it('should create groups with different colors', async () => {
      const colors: TabGroup['color'][] = ['red', 'blue', 'green', 'yellow', 'purple', 'gray'];

      for (const color of colors) {
        const group = await createGroup(`Group-${color}`, color);
        expect(group.color).toBe(color);
      }
    });

    it('should create groups with unique IDs', async () => {
      const group1 = await createGroup('Group 1', 'red');
      const group2 = await createGroup('Group 2', 'blue');

      expect(group1.id).not.toBe(group2.id);
    });
  });

  describe('getGroup', () => {
    it('should retrieve a created group', async () => {
      const created = await createGroup('Test Group', 'red');
      const retrieved = await getGroup(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Test Group');
      expect(retrieved?.color).toBe('red');
    });

    it('should return null for non-existent group', async () => {
      const retrieved = await getGroup('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('getAllGroups', () => {
    it('should return empty array when no groups exist', async () => {
      const groups = await getAllGroups();
      expect(groups).toEqual([]);
    });

    it('should return all created groups', async () => {
      await createGroup('Group 1', 'red');
      await createGroup('Group 2', 'blue');
      await createGroup('Group 3', 'green');

      const groups = await getAllGroups();
      expect(groups).toHaveLength(3);
    });

    it('should return groups in reverse chronological order', async () => {
      // Mock Date.now to return predictable timestamps
      let mockTime = 1000000000000;
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => mockTime);

      const group1 = await createGroup('Group 1', 'red');
      mockTime += 1000; // Advance time by 1 second
      const group2 = await createGroup('Group 2', 'blue');
      mockTime += 1000; // Advance time by 1 second
      const group3 = await createGroup('Group 3', 'green');

      const groups = await getAllGroups();
      expect(groups[0].id).toBe(group3.id);
      expect(groups[1].id).toBe(group2.id);
      expect(groups[2].id).toBe(group1.id);

      // Restore original Date.now
      Date.now = originalDateNow;
    });
  });

  describe('addTabToGroup', () => {
    it('should add a tab to a group', async () => {
      const group = await createGroup('Test Group', 'red');
      await addTabToGroup('tab-1', group.id);

      const updated = await getGroup(group.id);
      expect(updated?.tabIds).toContain('tab-1');
    });

    it('should add multiple tabs to a group', async () => {
      const group = await createGroup('Test Group', 'red');
      await addTabToGroup('tab-1', group.id);
      await addTabToGroup('tab-2', group.id);
      await addTabToGroup('tab-3', group.id);

      const updated = await getGroup(group.id);
      expect(updated?.tabIds).toEqual(['tab-1', 'tab-2', 'tab-3']);
    });

    it('should not add duplicate tabs', async () => {
      const group = await createGroup('Test Group', 'red');
      await addTabToGroup('tab-1', group.id);
      await addTabToGroup('tab-1', group.id);

      const updated = await getGroup(group.id);
      expect(updated?.tabIds).toEqual(['tab-1']);
    });

    it('should remove tab from other groups when adding to new group', async () => {
      const group1 = await createGroup('Group 1', 'red');
      const group2 = await createGroup('Group 2', 'blue');

      await addTabToGroup('tab-1', group1.id);
      expect((await getGroup(group1.id))?.tabIds).toContain('tab-1');

      await addTabToGroup('tab-1', group2.id);
      expect((await getGroup(group1.id))?.tabIds).not.toContain('tab-1');
      expect((await getGroup(group2.id))?.tabIds).toContain('tab-1');
    });

    it('should throw error when adding to non-existent group', async () => {
      await expect(addTabToGroup('tab-1', 'non-existent-id')).rejects.toThrow();
    });
  });

  describe('removeTabFromGroup', () => {
    it('should remove a tab from a group', async () => {
      const group = await createGroup('Test Group', 'red');
      await addTabToGroup('tab-1', group.id);
      await addTabToGroup('tab-2', group.id);

      await removeTabFromGroup('tab-1', group.id);

      const updated = await getGroup(group.id);
      expect(updated?.tabIds).toEqual(['tab-2']);
    });

    it('should handle removing non-existent tab', async () => {
      const group = await createGroup('Test Group', 'red');
      await addTabToGroup('tab-1', group.id);

      await removeTabFromGroup('tab-999', group.id);

      const updated = await getGroup(group.id);
      expect(updated?.tabIds).toEqual(['tab-1']);
    });

    it('should throw error when removing from non-existent group', async () => {
      await expect(removeTabFromGroup('tab-1', 'non-existent-id')).rejects.toThrow();
    });
  });

  describe('removeTabFromAllGroups', () => {
    it('should remove tab from all groups', async () => {
      const group1 = await createGroup('Group 1', 'red');
      const group2 = await createGroup('Group 2', 'blue');

      await addTabToGroup('tab-1', group1.id);
      await addTabToGroup('tab-1', group2.id);

      await removeTabFromAllGroups('tab-1');

      const g1 = await getGroup(group1.id);
      const g2 = await getGroup(group2.id);
      expect(g1?.tabIds).not.toContain('tab-1');
      expect(g2?.tabIds).not.toContain('tab-1');
    });

    it('should handle removing tab that is not in any group', async () => {
      const group = await createGroup('Test Group', 'red');
      await addTabToGroup('tab-1', group.id);

      await removeTabFromAllGroups('tab-999');

      expect((await getGroup(group.id))?.tabIds).toEqual(['tab-1']);
    });
  });

  describe('deleteGroup', () => {
    it('should delete a group', async () => {
      const group = await createGroup('Test Group', 'red');
      expect(await getGroup(group.id)).not.toBeNull();

      await deleteGroup(group.id);

      expect(await getGroup(group.id)).toBeNull();
    });

    it('should not affect other groups', async () => {
      const group1 = await createGroup('Group 1', 'red');
      const group2 = await createGroup('Group 2', 'blue');

      await deleteGroup(group1.id);

      expect(await getGroup(group1.id)).toBeNull();
      expect(await getGroup(group2.id)).not.toBeNull();
    });
  });

  describe('updateGroup', () => {
    it('should update group name', async () => {
      const group = await createGroup('Original Name', 'red');
      await updateGroup(group.id, { name: 'Updated Name' });

      const updated = await getGroup(group.id);
      expect(updated?.name).toBe('Updated Name');
    });

    it('should update group color', async () => {
      const group = await createGroup('Test Group', 'red');
      await updateGroup(group.id, { color: 'blue' });

      const updated = await getGroup(group.id);
      expect(updated?.color).toBe('blue');
    });

    it('should update group tabIds', async () => {
      const group = await createGroup('Test Group', 'red');
      await updateGroup(group.id, { tabIds: ['tab-1', 'tab-2', 'tab-3'] });

      const updated = await getGroup(group.id);
      expect(updated?.tabIds).toEqual(['tab-1', 'tab-2', 'tab-3']);
    });

    it('should update multiple properties at once', async () => {
      const group = await createGroup('Original', 'red');
      await updateGroup(group.id, {
        name: 'Updated',
        color: 'blue',
        isCollapsed: true,
      });

      const updated = await getGroup(group.id);
      expect(updated?.name).toBe('Updated');
      expect(updated?.color).toBe('blue');
      expect(updated?.isCollapsed).toBe(true);
    });

    it('should throw error when updating non-existent group', async () => {
      await expect(updateGroup('non-existent-id', { name: 'New Name' })).rejects.toThrow();
    });
  });

  describe('toggleGroupCollapse', () => {
    it('should toggle group collapse state from false to true', async () => {
      const group = await createGroup('Test Group', 'red');
      expect((await getGroup(group.id))?.isCollapsed).toBe(false);

      await toggleGroupCollapse(group.id);

      expect((await getGroup(group.id))?.isCollapsed).toBe(true);
    });

    it('should toggle group collapse state from true to false', async () => {
      // Ensure clean state at start of test
      await clearAllGroups();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const group = await createGroup('Test Group', 'red');
      await updateGroup(group.id, { isCollapsed: true });
      
      // Verify the group exists and is collapsed before toggling
      const groupBeforeToggle = await getGroup(group.id);
      if (!groupBeforeToggle) {
        throw new Error(`Group ${group.id} was not found after creation and update`);
      }
      expect(groupBeforeToggle.isCollapsed).toBe(true);

      await toggleGroupCollapse(group.id);

      const groupAfterToggle = await getGroup(group.id);
      expect(groupAfterToggle?.isCollapsed).toBe(false);
    });

    it('should throw error when toggling non-existent group', async () => {
      await expect(toggleGroupCollapse('non-existent-id')).rejects.toThrow();
    });
  });

  describe('getGroupForTab', () => {
    it('should return the group containing a tab', async () => {
      const group = await createGroup('Test Group', 'red');
      await addTabToGroup('tab-1', group.id);

      const found = await getGroupForTab('tab-1');
      expect(found?.id).toBe(group.id);
    });

    it('should return null when tab is not in any group', async () => {
      await createGroup('Test Group', 'red');

      const found = await getGroupForTab('tab-999');
      expect(found).toBeNull();
    });

    it('should return the correct group when tab is in multiple groups (after move)', async () => {
      const group1 = await createGroup('Group 1', 'red');
      const group2 = await createGroup('Group 2', 'blue');

      await addTabToGroup('tab-1', group1.id);
      await addTabToGroup('tab-1', group2.id);

      const found = await getGroupForTab('tab-1');
      expect(found?.id).toBe(group2.id);
    });
  });

  describe('clearAllGroups', () => {
    it('should delete all groups', async () => {
      await createGroup('Group 1', 'red');
      await createGroup('Group 2', 'blue');
      await createGroup('Group 3', 'green');

      expect(await getAllGroups()).toHaveLength(3);

      await clearAllGroups();

      expect(await getAllGroups()).toEqual([]);
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
    it('should persist groups across multiple operations', async () => {
      const group1 = await createGroup('Group 1', 'red');
      await addTabToGroup('tab-1', group1.id);
      await addTabToGroup('tab-2', group1.id);

      const group2 = await createGroup('Group 2', 'blue');
      await addTabToGroup('tab-3', group2.id);

      const retrieved1 = await getGroup(group1.id);
      const retrieved2 = await getGroup(group2.id);

      expect(retrieved1?.tabIds).toEqual(['tab-1', 'tab-2']);
      expect(retrieved2?.tabIds).toEqual(['tab-3']);
    });

    it('should maintain group state after updates', async () => {
      const group = await createGroup('Original', 'red');
      await addTabToGroup('tab-1', group.id);

      await updateGroup(group.id, { name: 'Updated', color: 'blue' });

      const updated = await getGroup(group.id);
      expect(updated?.name).toBe('Updated');
      expect(updated?.color).toBe('blue');
      expect(updated?.tabIds).toEqual(['tab-1']);
    });
  });

  describe('edge cases', () => {
    it('should handle group with empty name', async () => {
      const group = await createGroup('', 'red');
      expect(group.name).toBe('');
      expect((await getGroup(group.id))?.name).toBe('');
    });

    it('should handle group with special characters in name', async () => {
      const group = await createGroup('Group @#$%^&*()', 'red');
      expect((await getGroup(group.id))?.name).toBe('Group @#$%^&*()');
    });

    it('should handle tab IDs with special characters', async () => {
      const group = await createGroup('Test Group', 'red');
      await addTabToGroup('tab-@#$%', group.id);

      expect((await getGroup(group.id))?.tabIds).toContain('tab-@#$%');
    });

    it('should handle large number of tabs in a group', async () => {
      const group = await createGroup('Large Group', 'red');

      // Verify group was created
      const verifyGroup = await getGroup(group.id);
      expect(verifyGroup).toBeTruthy();

      for (let i = 0; i < 100; i++) {
        await addTabToGroup(`tab-${i}`, group.id);
      }

      const updated = await getGroup(group.id);
      expect(updated?.tabIds).toHaveLength(100);
    });
  });
});
