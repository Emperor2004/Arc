import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TabContextMenu from './TabContextMenu';
import { TabGroup } from '../../core/types';

describe('TabContextMenu', () => {
  const mockGroups: TabGroup[] = [
    {
      id: 'group-1',
      name: 'Work',
      color: 'blue',
      tabIds: ['tab-1'],
      isCollapsed: false,
      createdAt: Date.now(),
    },
    {
      id: 'group-2',
      name: 'Personal',
      color: 'green',
      tabIds: [],
      isCollapsed: false,
      createdAt: Date.now(),
    },
  ];

  const mockExistingGroup: TabGroup = {
    id: 'group-1',
    name: 'Work',
    color: 'blue',
    tabIds: ['tab-1'],
    isCollapsed: false,
    createdAt: Date.now(),
  };

  const defaultProps = {
    visible: true,
    x: 100,
    y: 100,
    tabId: 'tab-1',
    existingGroup: null,
    groups: mockGroups,
    onCreateGroup: vi.fn(),
    onAddToGroup: vi.fn(),
    onRemoveFromGroup: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when not visible', () => {
    const { container } = render(
      <TabContextMenu {...defaultProps} visible={false} />
    );

    expect(container.querySelector('.context-menu')).toBeNull();
  });

  it('should render context menu when visible', () => {
    const { container } = render(<TabContextMenu {...defaultProps} />);

    expect(container.querySelector('.context-menu')).toBeTruthy();
    expect(container.querySelector('.context-menu--visible')).toBeTruthy();
  });

  it('should display "Create New Group" option', () => {
    render(<TabContextMenu {...defaultProps} />);

    expect(screen.getByText('Create New Group')).toBeTruthy();
  });

  it('should display existing groups', () => {
    render(<TabContextMenu {...defaultProps} />);

    expect(screen.getByText('Work')).toBeTruthy();
    expect(screen.getByText('Personal')).toBeTruthy();
  });

  it('should show "Remove from group" when tab is in a group', () => {
    render(
      <TabContextMenu
        {...defaultProps}
        existingGroup={mockExistingGroup}
      />
    );

    expect(screen.getByText('Remove from "Work"')).toBeTruthy();
  });

  it('should call onAddToGroup when clicking on a group', () => {
    const onAddToGroup = vi.fn();
    render(
      <TabContextMenu
        {...defaultProps}
        onAddToGroup={onAddToGroup}
      />
    );

    const workGroup = screen.getByText('Work');
    fireEvent.click(workGroup);

    expect(onAddToGroup).toHaveBeenCalledWith('tab-1', 'group-1');
  });

  it('should call onRemoveFromGroup when clicking remove option', () => {
    const onRemoveFromGroup = vi.fn();
    render(
      <TabContextMenu
        {...defaultProps}
        existingGroup={mockExistingGroup}
        onRemoveFromGroup={onRemoveFromGroup}
      />
    );

    const removeOption = screen.getByText('Remove from "Work"');
    fireEvent.click(removeOption);

    expect(onRemoveFromGroup).toHaveBeenCalledWith('tab-1', 'group-1');
  });

  it('should create a new group with name and color', async () => {
    const onCreateGroup = vi.fn();
    const { container } = render(
      <TabContextMenu {...defaultProps} onCreateGroup={onCreateGroup} />
    );

    // Open create dialog
    const createButton = screen.getByText('Create New Group');
    fireEvent.click(createButton);

    // Enter group name
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'New Group' } });

    // Click create button
    const createGroupButton = screen.getByText('Create');
    fireEvent.click(createGroupButton);

    expect(onCreateGroup).toHaveBeenCalledWith('New Group', 'blue');
  });

  it('should disable create button when name is empty', async () => {
    const { container } = render(<TabContextMenu {...defaultProps} />);

    // Open create dialog
    const createButton = screen.getByText('Create New Group');
    fireEvent.click(createButton);

    // Check that create button is disabled
    const createGroupButton = screen.getByText('Create') as HTMLButtonElement;
    expect(createGroupButton.disabled).toBe(true);
  });

  it('should allow selecting different colors', async () => {
    const onCreateGroup = vi.fn();
    const { container } = render(
      <TabContextMenu {...defaultProps} onCreateGroup={onCreateGroup} />
    );

    // Open create dialog
    const createButton = screen.getByText('Create New Group');
    fireEvent.click(createButton);

    // Enter group name
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'New Group' } });

    // Click red color button
    const colorButtons = container.querySelectorAll('.tab-group-color-option');
    fireEvent.click(colorButtons[0]); // red

    // Click create button
    const createGroupButton = screen.getByText('Create');
    fireEvent.click(createGroupButton);

    expect(onCreateGroup).toHaveBeenCalledWith('New Group', 'red');
  });

  it('should close menu after adding tab to group', async () => {
    const onClose = vi.fn();
    render(
      <TabContextMenu
        {...defaultProps}
        onClose={onClose}
      />
    );

    const workGroup = screen.getByText('Work');
    fireEvent.click(workGroup);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should close menu after removing tab from group', async () => {
    const onClose = vi.fn();
    render(
      <TabContextMenu
        {...defaultProps}
        existingGroup={mockExistingGroup}
        onClose={onClose}
      />
    );

    const removeOption = screen.getByText('Remove from "Work"');
    fireEvent.click(removeOption);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should position menu correctly', () => {
    const { container } = render(
      <TabContextMenu {...defaultProps} x={200} y={300} />
    );

    const menu = container.querySelector('.context-menu') as HTMLElement;
    expect(menu.style.left).toBe('200px');
    expect(menu.style.top).toBe('300px');
  });

  it('should handle keyboard shortcuts in create dialog', async () => {
    const onCreateGroup = vi.fn();
    const { container } = render(
      <TabContextMenu {...defaultProps} onCreateGroup={onCreateGroup} />
    );

    // Open create dialog
    const createButton = screen.getByText('Create New Group');
    fireEvent.click(createButton);

    // Enter group name
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'New Group' } });

    // Press Enter to create
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onCreateGroup).toHaveBeenCalledWith('New Group', 'blue');
  });
});
