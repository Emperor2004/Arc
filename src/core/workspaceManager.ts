/**
 * Workspace Manager - Lightweight workspaces system
 * Manages workspace creation, storage, and restoration using session snapshots
 */

import { SessionState, TabSession, createSessionState } from './sessionManager';
import { getDatabaseManager } from './database';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  sessionSnapshot: SessionState;
  tags?: string[];
}

export interface WorkspaceCreateOptions {
  name: string;
  description?: string;
  tags?: string[];
}

export interface WorkspaceUpdateOptions {
  name?: string;
  description?: string;
  tags?: string[];
}

/**
 * List all workspaces
 */
export async function listWorkspaces(): Promise<Workspace[]> {
  try {
    const db = await getDatabaseManager();
    const rows = await db.query<any>(
      `SELECT id, name, description, createdAt, updatedAt, sessionSnapshot, tags
       FROM workspaces
       ORDER BY updatedAt DESC`
    );
    
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      sessionSnapshot: JSON.parse(row.sessionSnapshot),
      tags: row.tags ? JSON.parse(row.tags) : [],
    }));
  } catch (error) {
    console.error('Error listing workspaces:', error);
    return [];
  }
}

/**
 * Save current session as a new workspace
 */
export async function saveWorkspaceFromCurrentSession(
  tabs: TabSession[],
  activeTabId: string,
  options: WorkspaceCreateOptions
): Promise<string> {
  try {
    // Validate workspace name
    if (!options.name || options.name.trim().length === 0) {
      throw new Error('Workspace name is required');
    }

    const workspaceName = options.name.trim();
    
    // Check for duplicate names
    const existing = await getWorkspaceByName(workspaceName);
    if (existing) {
      throw new Error(`Workspace with name "${workspaceName}" already exists`);
    }

    // Create session snapshot
    const sessionSnapshot = createSessionState(tabs, activeTabId);
    
    // Generate unique ID
    const workspaceId = `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const workspace: Workspace = {
      id: workspaceId,
      name: workspaceName,
      description: options.description || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sessionSnapshot,
      tags: options.tags || [],
    };

    // Save to database
    const db = await getDatabaseManager();
    await db.execute(
      `INSERT INTO workspaces (id, name, description, createdAt, updatedAt, sessionSnapshot, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        workspace.id,
        workspace.name,
        workspace.description,
        workspace.createdAt,
        workspace.updatedAt,
        JSON.stringify(workspace.sessionSnapshot),
        JSON.stringify(workspace.tags),
      ]
    );

    console.log(`✅ Workspace "${workspaceName}" saved with ${tabs.length} tabs`);
    return workspaceId;
  } catch (error) {
    console.error('Error saving workspace:', error);
    throw error;
  }
}

/**
 * Load a workspace by ID
 */
export async function loadWorkspace(workspaceId: string): Promise<SessionState | null> {
  try {
    const db = await getDatabaseManager();
    const rows = await db.query<any>(
      `SELECT sessionSnapshot FROM workspaces WHERE id = ?`,
      [workspaceId]
    );
    
    if (rows.length === 0) {
      return null;
    }

    const sessionSnapshot = JSON.parse(rows[0].sessionSnapshot);
    console.log(`✅ Workspace loaded with ${sessionSnapshot.tabs.length} tabs`);
    return sessionSnapshot;
  } catch (error) {
    console.error('Error loading workspace:', error);
    return null;
  }
}

/**
 * Get workspace by ID (full workspace object)
 */
export async function getWorkspaceById(workspaceId: string): Promise<Workspace | null> {
  try {
    const db = await getDatabaseManager();
    const rows = await db.query<any>(
      `SELECT id, name, description, createdAt, updatedAt, sessionSnapshot, tags
       FROM workspaces WHERE id = ?`,
      [workspaceId]
    );
    
    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      sessionSnapshot: JSON.parse(row.sessionSnapshot),
      tags: row.tags ? JSON.parse(row.tags) : [],
    };
  } catch (error) {
    console.error('Error getting workspace by ID:', error);
    return null;
  }
}

/**
 * Get workspace by name
 */
export async function getWorkspaceByName(name: string): Promise<Workspace | null> {
  try {
    const db = await getDatabaseManager();
    const rows = await db.query<any>(
      `SELECT id, name, description, createdAt, updatedAt, sessionSnapshot, tags
       FROM workspaces WHERE name = ?`,
      [name]
    );
    
    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      sessionSnapshot: JSON.parse(row.sessionSnapshot),
      tags: row.tags ? JSON.parse(row.tags) : [],
    };
  } catch (error) {
    console.error('Error getting workspace by name:', error);
    return null;
  }
}

/**
 * Update an existing workspace
 */
export async function updateWorkspace(
  workspaceId: string,
  options: WorkspaceUpdateOptions
): Promise<boolean> {
  try {
    const db = await getDatabaseManager();
    
    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    
    if (options.name !== undefined) {
      // Check for duplicate names (excluding current workspace)
      const existing = await getWorkspaceByName(options.name.trim());
      if (existing && existing.id !== workspaceId) {
        throw new Error(`Workspace with name "${options.name}" already exists`);
      }
      updates.push('name = ?');
      values.push(options.name.trim());
    }
    
    if (options.description !== undefined) {
      updates.push('description = ?');
      values.push(options.description);
    }
    
    if (options.tags !== undefined) {
      updates.push('tags = ?');
      values.push(JSON.stringify(options.tags));
    }
    
    if (updates.length === 0) {
      return true; // Nothing to update
    }
    
    updates.push('updatedAt = ?');
    values.push(Date.now());
    values.push(workspaceId);
    
    const result = await db.execute(
      `UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    return result.changes > 0;
  } catch (error) {
    console.error('Error updating workspace:', error);
    throw error;
  }
}

/**
 * Update workspace session snapshot (when user wants to save current state to existing workspace)
 */
export async function updateWorkspaceSession(
  workspaceId: string,
  tabs: TabSession[],
  activeTabId: string
): Promise<boolean> {
  try {
    const sessionSnapshot = createSessionState(tabs, activeTabId);
    
    const db = await getDatabaseManager();
    const result = await db.execute(
      `UPDATE workspaces SET sessionSnapshot = ?, updatedAt = ? WHERE id = ?`,
      [JSON.stringify(sessionSnapshot), Date.now(), workspaceId]
    );
    
    console.log(`✅ Workspace session updated with ${tabs.length} tabs`);
    return result.changes > 0;
  } catch (error) {
    console.error('Error updating workspace session:', error);
    throw error;
  }
}

/**
 * Delete a workspace
 */
export async function deleteWorkspace(workspaceId: string): Promise<boolean> {
  try {
    const db = await getDatabaseManager();
    const result = await db.execute(
      `DELETE FROM workspaces WHERE id = ?`,
      [workspaceId]
    );
    
    console.log(`✅ Workspace deleted: ${workspaceId}`);
    return result.changes > 0;
  } catch (error) {
    console.error('Error deleting workspace:', error);
    throw error;
  }
}

/**
 * Search workspaces by name or tags
 */
export async function searchWorkspaces(query: string): Promise<Workspace[]> {
  try {
    const db = await getDatabaseManager();
    const searchTerm = `%${query.toLowerCase()}%`;
    
    const rows = await db.query<any>(
      `SELECT id, name, description, createdAt, updatedAt, sessionSnapshot, tags
       FROM workspaces
       WHERE LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(tags) LIKE ?
       ORDER BY updatedAt DESC`,
      [searchTerm, searchTerm, searchTerm]
    );
    
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      sessionSnapshot: JSON.parse(row.sessionSnapshot),
      tags: row.tags ? JSON.parse(row.tags) : [],
    }));
  } catch (error) {
    console.error('Error searching workspaces:', error);
    return [];
  }
}

/**
 * Get workspace statistics
 */
export async function getWorkspaceStats(): Promise<{
  totalWorkspaces: number;
  totalTabs: number;
  averageTabsPerWorkspace: number;
}> {
  try {
    const workspaces = await listWorkspaces();
    const totalWorkspaces = workspaces.length;
    const totalTabs = workspaces.reduce((sum, ws) => sum + ws.sessionSnapshot.tabs.length, 0);
    const averageTabsPerWorkspace = totalWorkspaces > 0 ? totalTabs / totalWorkspaces : 0;
    
    return {
      totalWorkspaces,
      totalTabs,
      averageTabsPerWorkspace: Math.round(averageTabsPerWorkspace * 10) / 10,
    };
  } catch (error) {
    console.error('Error getting workspace stats:', error);
    return {
      totalWorkspaces: 0,
      totalTabs: 0,
      averageTabsPerWorkspace: 0,
    };
  }
}

/**
 * Validate workspace data
 */
export function validateWorkspace(workspace: any): workspace is Workspace {
  if (!workspace || typeof workspace !== 'object') {
    return false;
  }

  return (
    typeof workspace.id === 'string' &&
    typeof workspace.name === 'string' &&
    typeof workspace.createdAt === 'number' &&
    typeof workspace.updatedAt === 'number' &&
    workspace.sessionSnapshot &&
    typeof workspace.sessionSnapshot === 'object' &&
    Array.isArray(workspace.sessionSnapshot.tabs) &&
    typeof workspace.sessionSnapshot.activeTabId === 'string'
  );
}

/**
 * Export workspace data (for backup/sharing)
 */
export async function exportWorkspace(workspaceId: string): Promise<Workspace | null> {
  try {
    return await getWorkspaceById(workspaceId);
  } catch (error) {
    console.error('Error exporting workspace:', error);
    return null;
  }
}

/**
 * Import workspace data (from backup/sharing)
 */
export async function importWorkspace(workspaceData: Workspace): Promise<string> {
  try {
    if (!validateWorkspace(workspaceData)) {
      throw new Error('Invalid workspace data');
    }

    // Generate new ID to avoid conflicts
    const newId = `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Check for name conflicts and append suffix if needed
    let workspaceName = workspaceData.name;
    let counter = 1;
    while (await getWorkspaceByName(workspaceName)) {
      workspaceName = `${workspaceData.name} (${counter})`;
      counter++;
    }

    const db = await getDatabaseManager();
    await db.execute(
      `INSERT INTO workspaces (id, name, description, createdAt, updatedAt, sessionSnapshot, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        workspaceName,
        workspaceData.description || '',
        Date.now(),
        Date.now(),
        JSON.stringify(workspaceData.sessionSnapshot),
        JSON.stringify(workspaceData.tags || []),
      ]
    );

    console.log(`✅ Workspace imported: ${workspaceName}`);
    return newId;
  } catch (error) {
    console.error('Error importing workspace:', error);
    throw error;
  }
}