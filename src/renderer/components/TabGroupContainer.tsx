import React, { useState } from 'react';
import { Tab, TabGroup } from '../../core/types';
import TabGroupHeader from './TabGroupHeader';

export interface TabGroupContainerProps {
  group: TabGroup;
  tabs: Tab[];
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onToggleCollapse: (groupId: string) => void;
  onContextMenu?: (e: React.MouseEvent, groupId: string) => void;
  renderTab: (tab: Tab) => React.ReactNode;
}

const TabGroupContainer: React.FC<TabGroupContainerProps> = ({
  group,
  tabs,
  onTabSelect,
  onTabClose,
  onToggleCollapse,
  onContextMenu,
  renderTab,
}) => {
  return (
    <div className={`tab-group-container ${group.isCollapsed ? 'tab-group-container--collapsed' : ''}`}>
      <TabGroupHeader
        group={group}
        tabCount={tabs.length}
        onToggleCollapse={onToggleCollapse}
        onContextMenu={onContextMenu}
      />

      {!group.isCollapsed && (
        <div className="tab-group-tabs">
          {tabs.map((tab) => (
            <div key={tab.id} className="tab-group-tab-wrapper">
              {renderTab(tab)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TabGroupContainer;
