import { useState, useCallback } from 'react';
import { Tab, TabGroup } from '../../core/types';
import * as tabGroupService from '../services/tabGroupService';

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
  // Initialize with groups immediately (synchronous) to avoid useEffect delay
  const [groups, setGroups] = useState<TabGroup[]>(() => tabGroupService.getAllGroups());

  // Create a map of grouped tabs - computed directly in render
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
    tabGroupService.toggleGroupCollapse(groupId);
    // Refresh entire state from service to ensure consistency
    const updatedGroups = tabGroupService.getAllGroups();
    setGroups(updatedGroups);
  }, []);

  const createNewGroup = useCallback((name: string, color: TabGroup['color']) => {
    const newGroup = tabGroupService.createGroup(name, color);
    // Refresh entire state from service to ensure consistency
    const updatedGroups = tabGroupService.getAllGroups();
    setGroups(updatedGroups);
    return newGroup;
  }, []);

  const deleteGroupHandler = useCallback((groupId: string) => {
    tabGroupService.deleteGroup(groupId);
    // Refresh entire state from service to ensure consistency
    const updatedGroups = tabGroupService.getAllGroups();
    setGroups(updatedGroups);
  }, []);

  const addTabToGroupHandler = useCallback((tabId: string, groupId: string) => {
    tabGroupService.addTabToGroup(tabId, groupId);
    
    // Update all groups since the tab might have been moved from another group
    const updatedGroups = tabGroupService.getAllGroups();
    setGroups(updatedGroups);
  }, []);

  const removeTabFromGroupHandler = useCallback((tabId: string, groupId: string) => {
    tabGroupService.removeTabFromGroup(tabId, groupId);
    // Refresh entire state from service to ensure consistency
    const updatedGroups = tabGroupService.getAllGroups();
    setGroups(updatedGroups);
  }, []);

  const updateGroupHandler = useCallback((groupId: string, updates: Partial<TabGroup>) => {
    tabGroupService.updateGroup(groupId, updates);
    // Refresh entire state from service to ensure consistency
    const updatedGroups = tabGroupService.getAllGroups();
    setGroups(updatedGroups);
  }, []);

  const getGroupForTabHandler = useCallback((tabId: string) => {
    return tabGroupService.getGroupForTab(tabId);
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
