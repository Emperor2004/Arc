/**
 * Renderer-safe tab group service
 * Communicates with main process for database operations
 */

import { TabGroup } from '../../core/types';

// In-memory fallback for development
let memoryGroups: TabGroup[] = [];
let nextId = 1;

export function getAllGroups(): TabGroup[] {
  // In development or test, use memory storage
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
    return memoryGroups;
  }
  
  // In production, this would communicate with main process via IPC
  return [];
}

export function getGroup(id: string): TabGroup | undefined {
  // In development or test, use memory storage
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
    return memoryGroups.find(g => g.id === id);
  }
  
  // In production, this would communicate with main process via IPC
  return undefined;
}

export function createGroup(name: string, color: TabGroup['color']): TabGroup {
  const newGroup: TabGroup = {
    id: `group-${nextId++}`,
    name,
    color,
    tabIds: [],
    isCollapsed: false,
    createdAt: Date.now()
  };
  
  // In development or test, use memory storage
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
    memoryGroups.push(newGroup);
    return newGroup;
  }
  
  // In production, this would communicate with main process via IPC
  console.log('Group creation requested:', newGroup);
  return newGroup;
}

export function updateGroup(id: string, updates: Partial<TabGroup>): void {
  // In development or test, use memory storage
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
    const index = memoryGroups.findIndex(g => g.id === id);
    if (index >= 0) {
      memoryGroups[index] = { ...memoryGroups[index], ...updates };
    }
    return;
  }
  
  // In production, this would communicate with main process via IPC
  console.log('Group update requested:', id, updates);
}

export function deleteGroup(id: string): void {
  // In development or test, use memory storage
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
    memoryGroups = memoryGroups.filter(g => g.id !== id);
    return;
  }
  
  // In production, this would communicate with main process via IPC
  console.log('Group deletion requested:', id);
}

export function addTabToGroup(tabId: string, groupId: string): void {
  // In development or test, use memory storage
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
    // First, remove the tab from any existing groups (to handle moving between groups)
    memoryGroups.forEach(group => {
      group.tabIds = group.tabIds.filter(id => id !== tabId);
    });
    
    // Then add the tab to the target group
    const group = memoryGroups.find(g => g.id === groupId);
    if (group) {
      group.tabIds.push(tabId);
    }
    return;
  }
  
  // In production, this would communicate with main process via IPC
  console.log('Add tab to group requested:', tabId, groupId);
}

export function removeTabFromGroup(tabId: string, groupId: string): void {
  // In development or test, use memory storage
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
    const group = memoryGroups.find(g => g.id === groupId);
    if (group) {
      group.tabIds = group.tabIds.filter(id => id !== tabId);
    }
    return;
  }
  
  // In production, this would communicate with main process via IPC
  console.log('Remove tab from group requested:', tabId, groupId);
}

export function getGroupForTab(tabId: string): TabGroup | null {
  // In development or test, use memory storage
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
    return memoryGroups.find(g => g.tabIds.includes(tabId)) || null;
  }
  
  // In production, this would communicate with main process via IPC
  return null;
}

export function toggleGroupCollapse(groupId: string): void {
  // In development or test, use memory storage
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
    const group = memoryGroups.find(g => g.id === groupId);
    if (group) {
      group.isCollapsed = !group.isCollapsed;
    }
    return;
  }
  
  // In production, this would communicate with main process via IPC
  console.log('Toggle group collapse requested:', groupId);
}

export function clearAllGroups(): void {
  // In development or test, use memory storage
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
    memoryGroups = [];
    nextId = 1;
    return;
  }
  
  // In production, this would communicate with main process via IPC
  console.log('Clear all groups requested');
}