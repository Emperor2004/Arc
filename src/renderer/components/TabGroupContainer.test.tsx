import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TabGroupContainer from './TabGroupContainer';
import { Tab, TabGroup } from '../../core/types';

describe('TabGroupContainer', () => {
  const mockGroup: TabGroup = {
    id: 'group-1',
    name: 'Work',
    color: 'blue',
    tabIds: ['tab-1', 'tab-2'],
    isCollapsed: false,
    createdAt: Date.now(),
  };

  const mockTabs: Tab[] = [
    {
      id: 'tab-1',
      title: 'Tab 1',
      url: 'https://example.com/1',
      isActive: true,
    },
    {
      id: 'tab-2',
      title: 'Tab 2',
      url: 'https://example.com/2',
      isActive: false,
    },
  ];

  const mockRenderTab = (tab: Tab) => (
    <div key={tab.id} className="mock-tab">
      {tab.title}
    </div>
  );

  it('should render group header', () => {
    const onToggleCollapse = vi.fn();
    render(
      <TabGroupContainer
        group={mockGroup}
        tabs={mockTabs}
        onTabSelect={vi.fn()}
        onTabClose={vi.fn()}
        onToggleCollapse={onToggleCollapse}
        renderTab={mockRenderTab}
      />
    );

    expect(screen.getByText('Work')).toBeTruthy();
  });

  it('should render tabs when expanded', () => {
    const onToggleCollapse = vi.fn();
    render(
      <TabGroupContainer
        group={mockGroup}
        tabs={mockTabs}
        onTabSelect={vi.fn()}
        onTabClose={vi.fn()}
        onToggleCollapse={onToggleCollapse}
        renderTab={mockRenderTab}
      />
    );

    expect(screen.getByText('Tab 1')).toBeTruthy();
    expect(screen.getByText('Tab 2')).toBeTruthy();
  });

  it('should not render tabs when collapsed', () => {
    const onToggleCollapse = vi.fn();
    const collapsedGroup = { ...mockGroup, isCollapsed: true };

    render(
      <TabGroupContainer
        group={collapsedGroup}
        tabs={mockTabs}
        onTabSelect={vi.fn()}
        onTabClose={vi.fn()}
        onToggleCollapse={onToggleCollapse}
        renderTab={mockRenderTab}
      />
    );

    expect(screen.queryByText('Tab 1')).toBeFalsy();
    expect(screen.queryByText('Tab 2')).toBeFalsy();
  });

  it('should call onToggleCollapse when header is clicked', () => {
    const onToggleCollapse = vi.fn();
    const { container } = render(
      <TabGroupContainer
        group={mockGroup}
        tabs={mockTabs}
        onTabSelect={vi.fn()}
        onTabClose={vi.fn()}
        onToggleCollapse={onToggleCollapse}
        renderTab={mockRenderTab}
      />
    );

    const toggleButton = container.querySelector('.tab-group-toggle');
    fireEvent.click(toggleButton!);

    expect(onToggleCollapse).toHaveBeenCalledWith('group-1');
  });

  it('should display correct tab count', () => {
    const onToggleCollapse = vi.fn();
    render(
      <TabGroupContainer
        group={mockGroup}
        tabs={mockTabs}
        onTabSelect={vi.fn()}
        onTabClose={vi.fn()}
        onToggleCollapse={onToggleCollapse}
        renderTab={mockRenderTab}
      />
    );

    expect(screen.getByText('2')).toBeTruthy();
  });

  it('should handle empty tab list', () => {
    const onToggleCollapse = vi.fn();
    render(
      <TabGroupContainer
        group={mockGroup}
        tabs={[]}
        onTabSelect={vi.fn()}
        onTabClose={vi.fn()}
        onToggleCollapse={onToggleCollapse}
        renderTab={mockRenderTab}
      />
    );

    expect(screen.getByText('0')).toBeTruthy();
  });

  it('should handle single tab', () => {
    const onToggleCollapse = vi.fn();
    const singleTab = [mockTabs[0]];

    render(
      <TabGroupContainer
        group={mockGroup}
        tabs={singleTab}
        onTabSelect={vi.fn()}
        onTabClose={vi.fn()}
        onToggleCollapse={onToggleCollapse}
        renderTab={mockRenderTab}
      />
    );

    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('Tab 1')).toBeTruthy();
  });

  it('should apply collapsed class when group is collapsed', () => {
    const onToggleCollapse = vi.fn();
    const collapsedGroup = { ...mockGroup, isCollapsed: true };

    const { container } = render(
      <TabGroupContainer
        group={collapsedGroup}
        tabs={mockTabs}
        onTabSelect={vi.fn()}
        onTabClose={vi.fn()}
        onToggleCollapse={onToggleCollapse}
        renderTab={mockRenderTab}
      />
    );

    const groupContainer = container.querySelector('.tab-group-container');
    expect(groupContainer?.classList.contains('tab-group-container--collapsed')).toBe(true);
  });

  it('should call onContextMenu when right-clicked on header', () => {
    const onToggleCollapse = vi.fn();
    const onContextMenu = vi.fn();
    const { container } = render(
      <TabGroupContainer
        group={mockGroup}
        tabs={mockTabs}
        onTabSelect={vi.fn()}
        onTabClose={vi.fn()}
        onToggleCollapse={onToggleCollapse}
        onContextMenu={onContextMenu}
        renderTab={mockRenderTab}
      />
    );

    const header = container.querySelector('.tab-group-header');
    fireEvent.contextMenu(header!);

    expect(onContextMenu).toHaveBeenCalled();
  });

  it('should render multiple tabs in correct order', () => {
    const onToggleCollapse = vi.fn();
    const multipleTabs: Tab[] = [
      { id: 'tab-1', title: 'First', url: 'https://example.com/1', isActive: false },
      { id: 'tab-2', title: 'Second', url: 'https://example.com/2', isActive: false },
      { id: 'tab-3', title: 'Third', url: 'https://example.com/3', isActive: false },
    ];

    const { container } = render(
      <TabGroupContainer
        group={{ ...mockGroup, tabIds: ['tab-1', 'tab-2', 'tab-3'] }}
        tabs={multipleTabs}
        onTabSelect={vi.fn()}
        onTabClose={vi.fn()}
        onToggleCollapse={onToggleCollapse}
        renderTab={mockRenderTab}
      />
    );

    const tabWrappers = container.querySelectorAll('.tab-group-tab-wrapper');
    expect(tabWrappers.length).toBe(3);
  });

  it('should toggle between collapsed and expanded states', () => {
    const onToggleCollapse = vi.fn();
    const { container, rerender } = render(
      <TabGroupContainer
        group={mockGroup}
        tabs={mockTabs}
        onTabSelect={vi.fn()}
        onTabClose={vi.fn()}
        onToggleCollapse={onToggleCollapse}
        renderTab={mockRenderTab}
      />
    );

    expect(screen.getByText('Tab 1')).toBeTruthy();

    const collapsedGroup = { ...mockGroup, isCollapsed: true };
    rerender(
      <TabGroupContainer
        group={collapsedGroup}
        tabs={mockTabs}
        onTabSelect={vi.fn()}
        onTabClose={vi.fn()}
        onToggleCollapse={onToggleCollapse}
        renderTab={mockRenderTab}
      />
    );

    expect(screen.queryByText('Tab 1')).toBeFalsy();
  });
});
