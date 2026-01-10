import { useState, useCallback, useEffect } from 'react';
import { Tab, TabGroup } from '../../core/types';
import * as tabGroupManager from '../../core/tabGroupManager';

export interface UseTabGroupsResult {
  groups: TabGroup[];
  groupedTabs: Map<string, Tab[]>;
  ungroupedTabs: Tab[];
  toggleGroupCollapse: (groupId: string) => void;
  createGroup: (name: string, color: TabGroup['color']) => TabGroup;
  deleteGroup: (groupId: string) => void;
  addTabToGroup: (tabId: string, groupId: string) => void;
  removeTabFromGroup: (tabId: string, groupId: string) => void;
  updateGroup: (groupId: string, updates: Partial<TabGroup>) => void;
  getGroupForTab: (tabId: string) => TabGroup | null;
}

export function useTabGroups(tabs: Tab[]): UseTabGroupsResult {
  const [groups, setGroups] = useState<TabGroup[]>([]);

  // Load groups on mount
  useEffect(() => {
    const loadedGroups = tabGroupManager.getAllGroups();
    setGroups(loadedGroups);
  }, []);

  // Create a map of grouped tabs
  const groupedTabs = new Map<string, Tab[]>();
  const ungroupedTabs: Tab[] = [];

  groups.forEach((group) => {
    const groupTabs = tabs.filter((tab) => group.tabIds.includes(tab.id));
    groupedTabs.set(group.id, groupTabs);
  });

  tabs.forEach((tab) => {
    const inGroup = groups.some((group) => group.tabIds.includes(tab.id));
    if (!inGroup) {
      ungroupedTabs.push(tab);
    }
  });

  const toggleGroupCollapse = useCallback((groupId: string) => {
    tabGroupManager.toggleGroupCollapse(groupId);
    const updated = tabGroupManager.getGroup(groupId);
    if (updated) {
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? updated : g))
      );
    }
  }, []);

  const createNewGroup = useCallback((name: string, color: TabGroup['color']) => {
    const newGroup = tabGroupManager.createGroup(name, color);
    setGroups((prev) => [newGroup, ...prev]);
    return newGroup;
  }, []);

  const deleteGroupHandler = useCallback((groupId: string) => {
    tabGroupManager.deleteGroup(groupId);
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  }, []);

  const addTabToGroupHandler = useCallback((tabId: string, groupId: string) => {
    tabGroupManager.addTabToGroup(tabId, groupId);
    
    // Update all groups since the tab might have been moved from another group
    const updatedGroups = tabGroupManager.getAllGroups();
    setGroups(updatedGroups);
  }, []);

  const removeTabFromGroupHandler = useCallback((tabId: string, groupId: string) => {
    tabGroupManager.removeTabFromGroup(tabId, groupId);
    const updated = tabGroupManager.getGroup(groupId);
    if (updated) {
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? updated : g))
      );
    }
  }, []);

  const updateGroupHandler = useCallback((groupId: string, updates: Partial<TabGroup>) => {
    tabGroupManager.updateGroup(groupId, updates);
    const updated = tabGroupManager.getGroup(groupId);
    if (updated) {
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? updated : g))
      );
    }
  }, []);

  const getGroupForTabHandler = useCallback((tabId: string) => {
    return tabGroupManager.getGroupForTab(tabId);
  }, []);

  return {
    groups,
    groupedTabs,
    ungroupedTabs,
    toggleGroupCollapse,
    createGroup: createNewGroup,
    deleteGroup: deleteGroupHandler,
    addTabToGroup: addTabToGroupHandler,
    removeTabFromGroup: removeTabFromGroupHandler,
    updateGroup: updateGroupHandler,
    getGroupForTab: getGroupForTabHandler,
  };
}
