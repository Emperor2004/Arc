import React from 'react';
import { TabGroup } from '../../core/types';

export interface TabGroupHeaderProps {
  group: TabGroup;
  tabCount: number;
  onToggleCollapse: (groupId: string) => void;
  onContextMenu?: (e: React.MouseEvent, groupId: string) => void;
}

const colorMap: Record<TabGroup['color'], string> = {
  red: '#ff4757',
  blue: '#2d7ff9',
  green: '#2ed573',
  yellow: '#fbbf24',
  purple: '#a29bfe',
  gray: '#636e72',
};

const TabGroupHeader: React.FC<TabGroupHeaderProps> = ({
  group,
  tabCount,
  onToggleCollapse,
  onContextMenu,
}) => {
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCollapse(group.id);
  };

  return (
    <div
      className="tab-group-header"
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(e, group.id);
      }}
    >
      <button
        className="tab-group-toggle"
        onClick={handleToggle}
        title={group.isCollapsed ? 'Expand group' : 'Collapse group'}
        aria-label={`${group.isCollapsed ? 'Expand' : 'Collapse'} ${group.name}`}
      >
        <span className="tab-group-toggle-icon">
          {group.isCollapsed ? '▶' : '▼'}
        </span>
      </button>

      <div
        className="tab-group-color-indicator"
        style={{ backgroundColor: colorMap[group.color] }}
        title={`Group color: ${group.color}`}
        aria-label={`Group color: ${group.color}`}
      />

      <span className="tab-group-name">{group.name}</span>

      <span className="tab-group-count" aria-label={`${tabCount} tabs in group`}>
        {tabCount}
      </span>
    </div>
  );
};

export default TabGroupHeader;
