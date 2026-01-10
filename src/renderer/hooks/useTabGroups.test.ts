import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabGroups } from './useTabGroups';
import { Tab, TabGroup } from '../../core/types';
import * as tabGroupManager from '../../core/tabGroupManager';
import { resetDatabase } from '../../core/database';

describe('useTabGroups', () => {
  const mockTabs: Tab[] = [
    { id: 'tab-1', title: 'Tab 1', url: 'https://example.com/1', isActive: true },
    { id: 'tab-2', title: 'Tab 2', url: 'https://example.com/2', isActive: false },
    { id: 'tab-3', title: 'Tab 3', url: 'https://example.com/3', isActive: false },
    { id: 'tab-4', title: 'Tab 4', url: 'https://example.com/4', isActive: false },
  ];

  beforeEach(() => {
    resetDatabase();
    tabGroupManager.clearAllGroups();
  });

  afterEach(() => {
    tabGroupManager.clearAllGroups();
  });

  it('should initialize with empty groups', () => {
    const { result } = renderHook(() => useTabGroups(mockTabs));

    expect(result.current.groups).toEqual([]);
    expect(result.current.ungroupedTabs).toEqual(mockTabs);
    expect(result.current.groupedTabs.size).toBe(0);
  });

  it('should create a new group', () => {
    const { result } = renderHook(() => useTabGroups(mockTabs));

    act(() => {
      result.current.createGroup('Work', 'blue');
    });

    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0].name).toBe('Work');
    expect(result.current.groups[0].color).toBe('blue');
  });

  it('should add tab to group', () => {
    const { result } = renderHook(() => useTabGroups(mockTabs));

    let groupId: string;
    act(() => {
      const group = result.current.createGroup('Work', 'blue');
      groupId = group.id;
    });

    act(() => {
      result.current.addTabToGroup('tab-1', groupId!);
    });

    const groupTabs = result.current.groupedTabs.get(groupId!);
    expect(groupTabs).toHaveLength(1);
    expect(groupTabs?.[0].id).toBe('tab-1');
  });

  it('should remove tab from group', () => {
    const { result } = renderHook(() => useTabGroups(mockTabs));

    let groupId: string;
    act(() => {
      const group = result.current.createGroup('Work', 'blue');
      groupId = group.id;
      result.current.addTabToGroup('tab-1', groupId);
      result.current.addTabToGroup('tab-2', groupId);
    });

    act(() => {
      result.current.removeTabFromGroup('tab-1', groupId!);
    });

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
    const { result } = renderHook(() => useTabGroups(mockTabs));

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
    const { result } = renderHook(() => useTabGroups(mockTabs));

    act(() => {
      const group = result.current.createGroup('Work', 'blue');
      result.current.addTabToGroup('tab-1', group.id);
      result.current.addTabToGroup('tab-2', group.id);
    });

    expect(result.current.ungroupedTabs).toHaveLength(2);
    expect(result.current.ungroupedTabs.map((t) => t.id)).toEqual(['tab-3', 'tab-4']);
  });

  it('should handle multiple groups', () => {
    const { result } = renderHook(() => useTabGroups(mockTabs));

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

    expect(result.current.groups).toHaveLength(2);
    expect(result.current.groupedTabs.get(workGroupId!)).toHaveLength(2);
    expect(result.current.groupedTabs.get(personalGroupId!)).toHaveLength(1);
    expect(result.current.ungroupedTabs).toHaveLength(1);
  });

  it('should move tab between groups', () => {
    const { result } = renderHook(() => useTabGroups(mockTabs));

    let workGroupId: string;
    let personalGroupId: string;

    act(() => {
      const workGroup = result.current.createGroup('Work', 'blue');
      const personalGroup = result.current.createGroup('Personal', 'red');
      workGroupId = workGroup.id;
      personalGroupId = personalGroup.id;

      result.current.addTabToGroup('tab-1', workGroupId);
    });

    expect(result.current.groupedTabs.get(workGroupId!)).toHaveLength(1);

    act(() => {
      result.current.addTabToGroup('tab-1', personalGroupId!);
    });

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
    rerender({ tabs: newTabs });

    expect(result.current.groupedTabs.get(groupId!)).toHaveLength(1);
    expect(result.current.ungroupedTabs).toHaveLength(4);
  });
});
