import { getDatabaseManager } from './database';
import { TabGroup } from './types';

// Helper to conditionally log errors (suppress in test environment for expected errors)
const logError = (message: string, error: unknown) => {
  const isTestEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
  // In test environment, suppress "not found" errors (these are expected in error case tests)
  const isExpectedError = error instanceof Error && error.message.includes('not found');
  if (!isTestEnv || !isExpectedError) {
    console.error(message, error);
  }
};

/**
 * Generate a unique ID for a tab group
 */
function generateGroupId(): string {
  return `group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new tab group
 */
export async function createGroup(name: string, color: TabGroup['color']): Promise<TabGroup> {
  try {
    const db = await getDatabaseManager();
    const id = generateGroupId();
    const createdAt = Date.now();

    await db.execute(
      `INSERT INTO tab_groups (id, name, color, tabIds, isCollapsed, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, color, JSON.stringify([]), 0, createdAt]
    );

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
export async function getGroup(groupId: string): Promise<TabGroup | null> {
  try {
    const db = await getDatabaseManager();
    const rows = await db.query<any>(
      `SELECT id, name, color, tabIds, isCollapsed, createdAt
       FROM tab_groups
       WHERE id = ?`,
      [groupId]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
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
export async function getAllGroups(): Promise<TabGroup[]> {
  try {
    const db = await getDatabaseManager();
    const rows = await db.query<any>(
      `SELECT id, name, color, tabIds, isCollapsed, createdAt
       FROM tab_groups
       ORDER BY createdAt DESC`
    );

    return rows.map((row: any) => ({
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
export async function addTabToGroup(tabId: string, groupId: string): Promise<void> {
  try {
    const db = await getDatabaseManager();
    const group = await getGroup(groupId);

    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    // Check if tab is already in this group
    if (group.tabIds.includes(tabId)) {
      return; // Already in group, nothing to do
    }

    // Remove tab from any other groups first
    await removeTabFromAllGroups(tabId);

    // Add to the specified group
    group.tabIds.push(tabId);

    await db.execute(
      `UPDATE tab_groups SET tabIds = ? WHERE id = ?`,
      [JSON.stringify(group.tabIds), groupId]
    );
  } catch (error) {
    logError('Error adding tab to group:', error);
    throw error;
  }
}

/**
 * Remove a tab from a group
 */
export async function removeTabFromGroup(tabId: string, groupId: string): Promise<void> {
  try {
    const db = await getDatabaseManager();
    const group = await getGroup(groupId);

    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const index = group.tabIds.indexOf(tabId);
    if (index > -1) {
      group.tabIds.splice(index, 1);

      await db.execute(
        `UPDATE tab_groups SET tabIds = ? WHERE id = ?`,
        [JSON.stringify(group.tabIds), groupId]
      );
    }
  } catch (error) {
    logError('Error removing tab from group:', error);
    throw error;
  }
}

/**
 * Remove a tab from all groups
 */
export async function removeTabFromAllGroups(tabId: string): Promise<void> {
  try {
    const groups = await getAllGroups();

    for (const group of groups) {
      const index = group.tabIds.indexOf(tabId);
      if (index > -1) {
        await removeTabFromGroup(tabId, group.id);
      }
    }
  } catch (error) {
    console.error('Error removing tab from all groups:', error);
    throw error;
  }
}

/**
 * Delete a tab group
 */
export async function deleteGroup(groupId: string): Promise<void> {
  try {
    const db = await getDatabaseManager();
    await db.execute('DELETE FROM tab_groups WHERE id = ?', [groupId]);
  } catch (error) {
    console.error('Error deleting tab group:', error);
    throw error;
  }
}

/**
 * Update a tab group
 */
export async function updateGroup(groupId: string, updates: Partial<TabGroup>): Promise<void> {
  try {
    const db = await getDatabaseManager();
    const group = await getGroup(groupId);

    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const updated = { ...group, ...updates };

    await db.execute(
      `UPDATE tab_groups
       SET name = ?, color = ?, tabIds = ?, isCollapsed = ?
       WHERE id = ?`,
      [
        updated.name,
        updated.color,
        JSON.stringify(updated.tabIds),
        updated.isCollapsed ? 1 : 0,
        groupId
      ]
    );
  } catch (error) {
    logError('Error updating tab group:', error);
    throw error;
  }
}

/**
 * Toggle group collapse state
 */
export async function toggleGroupCollapse(groupId: string): Promise<void> {
  try {
    const group = await getGroup(groupId);

    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    await updateGroup(groupId, { isCollapsed: !group.isCollapsed });
  } catch (error) {
    logError('Error toggling group collapse:', error);
    throw error;
  }
}

/**
 * Get the group containing a specific tab
 */
export async function getGroupForTab(tabId: string): Promise<TabGroup | null> {
  try {
    const groups = await getAllGroups();
    return groups.find((group) => group.tabIds.includes(tabId)) || null;
  } catch (error) {
    console.error('Error getting group for tab:', error);
    return null;
  }
}

/**
 * Clear all tab groups
 */
export async function clearAllGroups(): Promise<void> {
  try {
    const db = await getDatabaseManager();
    await db.execute('DELETE FROM tab_groups');
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
