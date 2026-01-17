import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTabGroups } from './useTabGroups';
import { Tab, TabGroup } from '../../core/types';
import * as tabGroupService from '../services/tabGroupService';
import { resetDatabase } from '../../core/database';

describe('useTabGroups', () => {
  const mockTabs: Tab[] = [
    { id: 'tab-1', title: 'Tab 1', url: 'https://example.com/1', isActive: true },
    { id: 'tab-2', title: 'Tab 2', url: 'https://example.com/2', isActive: false },
    { id: 'tab-3', title: 'Tab 3', url: 'https://example.com/3', isActive: false },
    { id: 'tab-4', title: 'Tab 4', url: 'https://example.com/4', isActive: false },
  ];

  beforeEach(async () => {
    // Clear groups BEFORE resetting database to ensure clean state
    await tabGroupService.clearAllGroups();
    await resetDatabase();
    // Add a small delay to ensure all async operations complete
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  afterEach(async () => {
    await tabGroupService.clearAllGroups();
  });

  it('should initialize with empty groups', () => {
    const { result } = renderHook(() => useTabGroups(mockTabs));

    expect(result.current.groups).toEqual([]);
    expect(result.current.ungroupedTabs).toEqual(mockTabs);
    expect(result.current.groupedTabs.size).toBe(0);
  });

  it('should create a new group', () => {
    // Ensure clean state at start of test
    tabGroupService.clearAllGroups();
    
    // Debug: Check if service is actually clean
    const initialGroups = tabGroupService.getAllGroups();
    
    // Force re-render with clean state
    const { result, rerender } = renderHook(() => useTabGroups(mockTabs));
    
    // Debug: Check hook state
    
    // Verify clean initial state
    expect(result.current.groups).toHaveLength(0);

    act(() => {
      const newGroup = result.current.createGroup('Work', 'blue');
    });

    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0].name).toBe('Work');
    expect(result.current.groups[0].color).toBe('blue');
  });

  it('should add tab to group', async () => {
    const { result, rerender } = renderHook(() => useTabGroups(mockTabs));

    let groupId: string;
    act(() => {
      const group = result.current.createGroup('Work', 'blue');
      groupId = group.id;
    });

    act(() => {
      result.current.addTabToGroup('tab-1', groupId!);
    });

    // Force a re-render to ensure state updates are applied
    rerender();

    const groupTabs = result.current.groupedTabs.get(groupId!);
    expect(groupTabs).toHaveLength(1);
    expect(groupTabs?.[0].id).toBe('tab-1');
  });

  it('should remove tab from group', () => {
    const { result, rerender } = renderHook(() => useTabGroups(mockTabs));

    let groupId: string;
    act(() => {
      const group = result.current.createGroup('Work', 'blue');
      groupId = group.id;
      result.current.addTabToGroup('tab-1', groupId);
      result.current.addTabToGroup('tab-2', groupId);
    });

    // Force re-render after adding tabs
    rerender();

    act(() => {
      result.current.removeTabFromGroup('tab-1', groupId!);
    });

    // Force re-render after removing tab
    rerender();

    const groupTabs = result.current.groupedTabs.get(groupId!);
    expect(groupTabs).toHaveLength(1);
    expect(groupTabs?.[0].id).toBe('tab-2');
  });

  it('should toggle group collapse state', () => {
    const { result } = renderHook(() => useTabGroups(mockTabs));

    let groupId: string;
    act(() => {
      const group = result.current.createGroup('Work', 'blue');
      groupId = group.id;
    });

    expect(result.current.groups[0].isCollapsed).toBe(false);

    act(() => {
      result.current.toggleGroupCollapse(groupId!);
    });

    expect(result.current.groups[0].isCollapsed).toBe(true);

    act(() => {
      result.current.toggleGroupCollapse(groupId!);
    });

    expect(result.current.groups[0].isCollapsed).toBe(false);
  });

  it('should delete a group', () => {
    // Ensure clean state at start of test
    tabGroupService.clearAllGroups();
    
    const { result } = renderHook(() => useTabGroups(mockTabs));
    
    // Verify clean initial state
    expect(result.current.groups).toHaveLength(0);

    let groupId: string;
    act(() => {
      const group = result.current.createGroup('Work', 'blue');
      groupId = group.id;
    });

    expect(result.current.groups).toHaveLength(1);

    act(() => {
      result.current.deleteGroup(groupId!);
    });

    expect(result.current.groups).toHaveLength(0);
  });

  it('should update group properties', () => {
    const { result } = renderHook(() => useTabGroups(mockTabs));

    let groupId: string;
    act(() => {
      const group = result.current.createGroup('Work', 'blue');
      groupId = group.id;
    });

    act(() => {
      result.current.updateGroup(groupId!, { name: 'Personal', color: 'red' });
    });

    expect(result.current.groups[0].name).toBe('Personal');
    expect(result.current.groups[0].color).toBe('red');
  });

  it('should get group for tab', () => {
    const { result } = renderHook(() => useTabGroups(mockTabs));

    let groupId: string;
    act(() => {
      const group = result.current.createGroup('Work', 'blue');
      groupId = group.id;
      result.current.addTabToGroup('tab-1', groupId);
    });

    const group = result.current.getGroupForTab('tab-1');
    expect(group?.id).toBe(groupId);
  });

  it('should return null for ungrouped tab', () => {
    const { result } = renderHook(() => useTabGroups(mockTabs));

    act(() => {
      result.current.createGroup('Work', 'blue');
    });

    const group = result.current.getGroupForTab('tab-1');
    expect(group).toBeNull();
  });

  it('should separate grouped and ungrouped tabs', () => {
    // Ensure clean state at start of test
    tabGroupService.clearAllGroups();
    
    const { result, rerender } = renderHook(() => useTabGroups(mockTabs));
    
    // Verify clean initial state
    expect(result.current.groups).toHaveLength(0);
    expect(result.current.ungroupedTabs).toHaveLength(4);

    act(() => {
      const group = result.current.createGroup('Work', 'blue');
      result.current.addTabToGroup('tab-1', group.id);
      result.current.addTabToGroup('tab-2', group.id);
    });

    // Force re-render after adding tabs to group
    rerender();

    expect(result.current.ungroupedTabs).toHaveLength(2);
    expect(result.current.ungroupedTabs.map((t) => t.id)).toEqual(['tab-3', 'tab-4']);
  });

  it('should handle multiple groups', () => {
    // Ensure clean state at start of test
    tabGroupService.clearAllGroups();
    
    const { result, rerender } = renderHook(() => useTabGroups(mockTabs));
    
    // Verify clean initial state
    expect(result.current.groups).toHaveLength(0);

    let workGroupId: string;
    let personalGroupId: string;

    act(() => {
      const workGroup = result.current.createGroup('Work', 'blue');
      const personalGroup = result.current.createGroup('Personal', 'red');
      workGroupId = workGroup.id;
      personalGroupId = personalGroup.id;

      result.current.addTabToGroup('tab-1', workGroupId);
      result.current.addTabToGroup('tab-2', workGroupId);
      result.current.addTabToGroup('tab-3', personalGroupId);
    });

    // Force re-render after all operations
    rerender();

    expect(result.current.groups).toHaveLength(2);
    expect(result.current.groupedTabs.get(workGroupId!)).toHaveLength(2);
    expect(result.current.groupedTabs.get(personalGroupId!)).toHaveLength(1);
    expect(result.current.ungroupedTabs).toHaveLength(1);
  });

  it('should move tab between groups', () => {
    // Ensure clean state at start of test
    tabGroupService.clearAllGroups();
    
    const { result, rerender } = renderHook(() => useTabGroups(mockTabs));
    
    // Verify clean initial state
    expect(result.current.groups).toHaveLength(0);

    let workGroupId: string;
    let personalGroupId: string;

    act(() => {
      const workGroup = result.current.createGroup('Work', 'blue');
      const personalGroup = result.current.createGroup('Personal', 'red');
      workGroupId = workGroup.id;
      personalGroupId = personalGroup.id;

      result.current.addTabToGroup('tab-1', workGroupId);
    });

    // Force re-render after adding tab to first group
    rerender();

    expect(result.current.groupedTabs.get(workGroupId!)).toHaveLength(1);

    act(() => {
      result.current.addTabToGroup('tab-1', personalGroupId!);
    });

    // Force re-render after moving tab to second group
    rerender();

    // After moving, the tab should be in the new group and removed from the old one
    const workGroupTabs = result.current.groupedTabs.get(workGroupId!);
    const personalGroupTabs = result.current.groupedTabs.get(personalGroupId!);
    
    expect(workGroupTabs?.length || 0).toBe(0);
    expect(personalGroupTabs).toHaveLength(1);
  });

  it('should handle tab updates', () => {
    const { result } = renderHook(() => useTabGroups(mockTabs));

    let groupId: string;
    act(() => {
      const group = result.current.createGroup('Work', 'blue');
      groupId = group.id;
      result.current.addTabToGroup('tab-1', groupId);
    });

    const updatedTabs: Tab[] = [
      { id: 'tab-1', title: 'Updated Tab 1', url: 'https://updated.com/1', isActive: true },
      ...mockTabs.slice(1),
    ];

    const { result: result2 } = renderHook(() => useTabGroups(updatedTabs));

    // Groups should be loaded immediately since getAllGroups() is synchronous
    expect(result2.current.groups.length).toBeGreaterThan(0);
    expect(result2.current.groupedTabs.get(groupId!)?.[0].title).toBe('Updated Tab 1');
  });

  it('should maintain group state across tab changes', () => {
    const { result, rerender } = renderHook(
      ({ tabs }: { tabs: Tab[] }) => useTabGroups(tabs),
      { initialProps: { tabs: mockTabs } }
    );

    let groupId: string;
    act(() => {
      const group = result.current.createGroup('Work', 'blue');
      groupId = group.id;
      result.current.addTabToGroup('tab-1', groupId);
    });

    const newTabs = [...mockTabs, { id: 'tab-5', title: 'Tab 5', url: 'https://example.com/5', isActive: false }];
    
    act(() => {
      rerender({ tabs: newTabs });
    });

    // State should update immediately after rerender
    expect(result.current.groupedTabs.get(groupId!)).toBeDefined();
    expect(result.current.groupedTabs.get(groupId!)).toHaveLength(1);
    expect(result.current.ungroupedTabs).toHaveLength(4);
  });
});
