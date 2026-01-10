import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TabGroupHeader from './TabGroupHeader';
import { TabGroup } from '../../core/types';

describe('TabGroupHeader', () => {
  const mockGroup: TabGroup = {
    id: 'group-1',
    name: 'Work',
    color: 'blue',
    tabIds: ['tab-1', 'tab-2', 'tab-3'],
    isCollapsed: false,
    createdAt: Date.now(),
  };

  it('should render group name', () => {
    const onToggleCollapse = vi.fn();
    render(
      <TabGroupHeader
        group={mockGroup}
        tabCount={3}
        onToggleCollapse={onToggleCollapse}
      />
    );

    expect(screen.getByText('Work')).toBeTruthy();
  });

  it('should display tab count', () => {
    const onToggleCollapse = vi.fn();
    render(
      <TabGroupHeader
        group={mockGroup}
        tabCount={5}
        onToggleCollapse={onToggleCollapse}
      />
    );

    expect(screen.getByText('5')).toBeTruthy();
  });

  it('should show expand icon when collapsed', () => {
    const onToggleCollapse = vi.fn();
    const collapsedGroup = { ...mockGroup, isCollapsed: true };

    render(
      <TabGroupHeader
        group={collapsedGroup}
        tabCount={3}
        onToggleCollapse={onToggleCollapse}
      />
    );

    const toggleButton = screen.getByRole('button');
    expect(toggleButton.textContent).toContain('▶');
  });

  it('should show collapse icon when expanded', () => {
    const onToggleCollapse = vi.fn();
    const expandedGroup = { ...mockGroup, isCollapsed: false };

    render(
      <TabGroupHeader
        group={expandedGroup}
        tabCount={3}
        onToggleCollapse={onToggleCollapse}
      />
    );

    const toggleButton = screen.getByRole('button');
    expect(toggleButton.textContent).toContain('▼');
  });

  it('should call onToggleCollapse when toggle button is clicked', () => {
    const onToggleCollapse = vi.fn();
    render(
      <TabGroupHeader
        group={mockGroup}
        tabCount={3}
        onToggleCollapse={onToggleCollapse}
      />
    );

    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);

    expect(onToggleCollapse).toHaveBeenCalledWith('group-1');
  });

  it('should display color indicator', () => {
    const onToggleCollapse = vi.fn();
    render(
      <TabGroupHeader
        group={mockGroup}
        tabCount={3}
        onToggleCollapse={onToggleCollapse}
      />
    );

    const colorIndicator = document.querySelector('.tab-group-color-indicator');
    expect(colorIndicator).toBeTruthy();
  });

  it('should render with different colors', () => {
    const colors: TabGroup['color'][] = ['red', 'blue', 'green', 'yellow', 'purple', 'gray'];

    colors.forEach((color) => {
      const group = { ...mockGroup, color };
      const onToggleCollapse = vi.fn();

      const { unmount } = render(
        <TabGroupHeader
          group={group}
          tabCount={3}
          onToggleCollapse={onToggleCollapse}
        />
      );

      const colorIndicator = document.querySelector('.tab-group-color-indicator');
      expect(colorIndicator).toBeTruthy();

      unmount();
    });
  });

  it('should call onContextMenu when right-clicked', () => {
    const onToggleCollapse = vi.fn();
    const onContextMenu = vi.fn();

    const { container } = render(
      <TabGroupHeader
        group={mockGroup}
        tabCount={3}
        onToggleCollapse={onToggleCollapse}
        onContextMenu={onContextMenu}
      />
    );

    const header = container.querySelector('.tab-group-header');
    fireEvent.contextMenu(header!);

    expect(onContextMenu).toHaveBeenCalled();
  });

  it('should have proper accessibility labels', () => {
    const onToggleCollapse = vi.fn();
    render(
      <TabGroupHeader
        group={mockGroup}
        tabCount={3}
        onToggleCollapse={onToggleCollapse}
      />
    );

    const toggleButton = screen.getByRole('button');
    expect(toggleButton.getAttribute('aria-label')).toBeTruthy();
  });

  it('should handle zero tabs', () => {
    const onToggleCollapse = vi.fn();
    render(
      <TabGroupHeader
        group={mockGroup}
        tabCount={0}
        onToggleCollapse={onToggleCollapse}
      />
    );

    expect(screen.getByText('0')).toBeTruthy();
  });

  it('should handle long group names', () => {
    const onToggleCollapse = vi.fn();
    const longNameGroup = {
      ...mockGroup,
      name: 'This is a very long group name that should be truncated',
    };

    render(
      <TabGroupHeader
        group={longNameGroup}
        tabCount={3}
        onToggleCollapse={onToggleCollapse}
      />
    );

    const nameElement = screen.getByText(/This is a very long group name/);
    expect(nameElement).toBeTruthy();
  });
});
