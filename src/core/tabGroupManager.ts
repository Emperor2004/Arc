import { getDatabase } from './database';
import { TabGroup } from './types';

/**
 * Generate a unique ID for a tab group
 */
function generateGroupId(): string {
  return `group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new tab group
 */
export function createGroup(name: string, color: TabGroup['color']): TabGroup {
  try {
    const db = getDatabase();
    const id = generateGroupId();
    const createdAt = Date.now();

    const stmt = db.prepare(`
      INSERT INTO tab_groups (id, name, color, tabIds, isCollapsed, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, name, color, JSON.stringify([]), 0, createdAt);

    return {
      id,
      name,
      color,
      tabIds: [],
      isCollapsed: false,
      createdAt,
    };
  } catch (error) {
    console.error('Error creating tab group:', error);
    throw error;
  }
}

/**
 * Get a tab group by ID
 */
export function getGroup(groupId: string): TabGroup | null {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT id, name, color, tabIds, isCollapsed, createdAt
      FROM tab_groups
      WHERE id = ?
    `);

    const row = stmt.get(groupId) as any;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      color: row.color,
      tabIds: JSON.parse(row.tabIds),
      isCollapsed: row.isCollapsed === 1,
      createdAt: row.createdAt,
    };
  } catch (error) {
    console.error('Error getting tab group:', error);
    return null;
  }
}

/**
 * Get all tab groups
 */
export function getAllGroups(): TabGroup[] {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT id, name, color, tabIds, isCollapsed, createdAt
      FROM tab_groups
      ORDER BY createdAt DESC
    `);

    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      tabIds: JSON.parse(row.tabIds),
      isCollapsed: row.isCollapsed === 1,
      createdAt: row.createdAt,
    }));
  } catch (error) {
    console.error('Error getting all tab groups:', error);
    return [];
  }
}

/**
 * Add a tab to a group
 */
export function addTabToGroup(tabId: string, groupId: string): void {
  try {
    const db = getDatabase();
    const group = getGroup(groupId);

    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    // Check if tab is already in this group
    if (group.tabIds.includes(tabId)) {
      return; // Already in group, nothing to do
    }

    // Remove tab from any other groups first
    removeTabFromAllGroups(tabId);

    // Add to the specified group
    group.tabIds.push(tabId);

    const stmt = db.prepare(`
      UPDATE tab_groups
      SET tabIds = ?
      WHERE id = ?
    `);

    stmt.run(JSON.stringify(group.tabIds), groupId);
  } catch (error) {
    console.error('Error adding tab to group:', error);
    throw error;
  }
}

/**
 * Remove a tab from a group
 */
export function removeTabFromGroup(tabId: string, groupId: string): void {
  try {
    const db = getDatabase();
    const group = getGroup(groupId);

    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const index = group.tabIds.indexOf(tabId);
    if (index > -1) {
      group.tabIds.splice(index, 1);

      const stmt = db.prepare(`
        UPDATE tab_groups
        SET tabIds = ?
        WHERE id = ?
      `);

      stmt.run(JSON.stringify(group.tabIds), groupId);
    }
  } catch (error) {
    console.error('Error removing tab from group:', error);
    throw error;
  }
}

/**
 * Remove a tab from all groups
 */
export function removeTabFromAllGroups(tabId: string): void {
  try {
    const groups = getAllGroups();

    groups.forEach((group) => {
      const index = group.tabIds.indexOf(tabId);
      if (index > -1) {
        removeTabFromGroup(tabId, group.id);
      }
    });
  } catch (error) {
    console.error('Error removing tab from all groups:', error);
    throw error;
  }
}

/**
 * Delete a tab group
 */
export function deleteGroup(groupId: string): void {
  try {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM tab_groups WHERE id = ?');
    stmt.run(groupId);
  } catch (error) {
    console.error('Error deleting tab group:', error);
    throw error;
  }
}

/**
 * Update a tab group
 */
export function updateGroup(groupId: string, updates: Partial<TabGroup>): void {
  try {
    const db = getDatabase();
    const group = getGroup(groupId);

    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const updated = { ...group, ...updates };

    const stmt = db.prepare(`
      UPDATE tab_groups
      SET name = ?, color = ?, tabIds = ?, isCollapsed = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.name,
      updated.color,
      JSON.stringify(updated.tabIds),
      updated.isCollapsed ? 1 : 0,
      groupId
    );
  } catch (error) {
    console.error('Error updating tab group:', error);
    throw error;
  }
}

/**
 * Toggle group collapse state
 */
export function toggleGroupCollapse(groupId: string): void {
  try {
    const group = getGroup(groupId);

    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    updateGroup(groupId, { isCollapsed: !group.isCollapsed });
  } catch (error) {
    console.error('Error toggling group collapse:', error);
    throw error;
  }
}

/**
 * Get the group containing a specific tab
 */
export function getGroupForTab(tabId: string): TabGroup | null {
  try {
    const groups = getAllGroups();
    return groups.find((group) => group.tabIds.includes(tabId)) || null;
  } catch (error) {
    console.error('Error getting group for tab:', error);
    return null;
  }
}

/**
 * Clear all tab groups
 */
export function clearAllGroups(): void {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM tab_groups').run();
  } catch (error) {
    console.error('Error clearing all tab groups:', error);
    throw error;
  }
}

/**
 * Validate tab group
 */
export function validateTabGroup(group: any): group is TabGroup {
  if (!group || typeof group !== 'object') {
    return false;
  }

  return (
    typeof group.id === 'string' &&
    typeof group.name === 'string' &&
    ['red', 'blue', 'green', 'yellow', 'purple', 'gray'].includes(group.color) &&
    Array.isArray(group.tabIds) &&
    group.tabIds.every((id: any) => typeof id === 'string') &&
    typeof group.isCollapsed === 'boolean' &&
    typeof group.createdAt === 'number'
  );
}
