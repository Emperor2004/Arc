import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Tab, TabGroup } from '../../core/types';
import { TabReorderManager } from '../../core/tabReorderManager';
import TabContextMenu from './TabContextMenu';

export interface TabBarProps {
    tabs: Tab[];
    onNewTab: () => void;
    onNewIncognitoTab: () => void;
    onTabSelect: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onTabReorder?: (tabIds: string[]) => void;
    incognitoEnabled: boolean;
    groups?: TabGroup[];
    onCreateGroup?: (name: string, color: TabGroup['color']) => void;
    onAddTabToGroup?: (tabId: string, groupId: string) => void;
    onRemoveTabFromGroup?: (tabId: string, groupId: string) => void;
    getGroupForTab?: (tabId: string) => TabGroup | null;
}

const TabBar: React.FC<TabBarProps> = ({
    tabs,
    onNewTab,
    onNewIncognitoTab,
    onTabSelect,
    onTabClose,
    onTabReorder,
    incognitoEnabled,
    groups = [],
    onCreateGroup,
    onAddTabToGroup,
    onRemoveTabFromGroup,
    getGroupForTab
}) => {
    const [tabOrder, setTabOrder] = useState<string[]>(tabs.map(t => t.id));
    const [reorderManager] = useState(() => new TabReorderManager(tabs.map(t => t.id)));
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        tabId: string;
    }>({ visible: false, x: 0, y: 0, tabId: '' });

    // Update tab order when tabs change
    useEffect(() => {
        const newTabIds = tabs.map(t => t.id);
        setTabOrder(newTabIds);
        reorderManager.setTabOrder(newTabIds);
    }, [tabs, reorderManager]);

    // Subscribe to reorder manager changes
    useEffect(() => {
        const unsubscribe = reorderManager.subscribe((order) => {
            setTabOrder(order);
            if (onTabReorder) {
                onTabReorder(order);
            }
        });

        return unsubscribe;
    }, [reorderManager, onTabReorder]);

    const handleDragEnd = (result: DropResult) => {
        const changed = reorderManager.handleDragEnd(result);
        if (changed && onTabReorder) {
            onTabReorder(reorderManager.getTabOrder());
        }
    };

    const handleTabKeyDown = (e: React.KeyboardEvent, tabId: string, index: number) => {
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                if (index > 0) {
                    const prevTab = orderedTabs[index - 1];
                    if (prevTab) {
                        onTabSelect(prevTab.id);
                        // Focus the previous tab
                        setTimeout(() => {
                            const prevTabElement = document.querySelector(`[data-tab-id="${prevTab.id}"]`) as HTMLElement;
                            if (prevTabElement) prevTabElement.focus();
                        }, 0);
                    }
                }
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (index < orderedTabs.length - 1) {
                    const nextTab = orderedTabs[index + 1];
                    if (nextTab) {
                        onTabSelect(nextTab.id);
                        // Focus the next tab
                        setTimeout(() => {
                            const nextTabElement = document.querySelector(`[data-tab-id="${nextTab.id}"]`) as HTMLElement;
                            if (nextTabElement) nextTabElement.focus();
                        }, 0);
                    }
                }
                break;
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                onTabClose(tabId);
                break;
            case 'Home':
                e.preventDefault();
                if (orderedTabs.length > 0) {
                    onTabSelect(orderedTabs[0].id);
                    setTimeout(() => {
                        const firstTabElement = document.querySelector(`[data-tab-id="${orderedTabs[0].id}"]`) as HTMLElement;
                        if (firstTabElement) firstTabElement.focus();
                    }, 0);
                }
                break;
            case 'End':
                e.preventDefault();
                if (orderedTabs.length > 0) {
                    const lastTab = orderedTabs[orderedTabs.length - 1];
                    onTabSelect(lastTab.id);
                    setTimeout(() => {
                        const lastTabElement = document.querySelector(`[data-tab-id="${lastTab.id}"]`) as HTMLElement;
                        if (lastTabElement) lastTabElement.focus();
                    }, 0);
                }
                break;
        }
    };

    const handleTabContextMenu = (e: React.MouseEvent, tabId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            tabId
        });
    };

    const handleCloseContextMenu = () => {
        setContextMenu({ ...contextMenu, visible: false });
    };

    // Create a map of tab IDs to tab objects for quick lookup
    const tabMap = new Map(tabs.map(tab => [tab.id, tab]));

    // Get tabs in the current order
    const orderedTabs = tabOrder
        .map(id => tabMap.get(id))
        .filter((tab): tab is Tab => tab !== undefined);

    return (
        <>
            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="tab-bar" role="tablist" aria-label="Browser tabs">
                    <Droppable droppableId="tabs" direction="horizontal" type="TAB">
                        {(provided, snapshot) => (
                            <div
                                className={`tab-list ${snapshot.isDraggingOver ? 'tab-list--drag-over' : ''}`}
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                            >
                                {orderedTabs.map((tab, index) => (
                                    <Draggable key={tab.id} draggableId={tab.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className={`tab ${tab.isActive ? 'tab--active' : ''} ${tab.incognito ? 'tab--incognito' : ''} ${snapshot.isDragging ? 'tab--dragging' : ''}`}
                                                onClick={() => onTabSelect(tab.id)}
                                                onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        onTabSelect(tab.id);
                                                    } else {
                                                        handleTabKeyDown(e, tab.id, index);
                                                    }
                                                }}
                                                role="tab"
                                                tabIndex={tab.isActive ? 0 : -1}
                                                aria-selected={tab.isActive}
                                                aria-label={`${tab.title || 'New Tab'}${tab.incognito ? ' (Incognito)' : ''}`}
                                                data-tab-id={tab.id}
                                                style={{
                                                    ...provided.draggableProps.style,
                                                }}
                                            >
                                                <div className="tab-content">
                                                    {tab.incognito && (
                                                        <span className="tab-incognito-icon" title="Incognito" aria-hidden="true">🕶️</span>
                                                    )}
                                                    <span className="tab-title">
                                                        {tab.title || 'New Tab'}
                                                    </span>
                                                </div>
                                                <button
                                                    className="tab-close"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onTabClose(tab.id);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            onTabClose(tab.id);
                                                        }
                                                    }}
                                                    title="Close tab"
                                                    aria-label={`Close tab: ${tab.title || 'New Tab'}`}
                                                    tabIndex={-1}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                    
                    <div className="tab-actions" role="toolbar" aria-label="Tab actions">
                        <button
                            className="tab-new-btn"
                            onClick={onNewTab}
                            title="New tab"
                            aria-label="Create new tab"
                        >
                            +
                        </button>
                        <button
                            className={`tab-new-btn tab-new-btn--incognito ${!incognitoEnabled ? 'tab-new-btn--disabled' : ''}`}
                            onClick={incognitoEnabled ? onNewIncognitoTab : undefined}
                            title={incognitoEnabled ? "New incognito tab" : "Incognito mode is disabled in settings"}
                            aria-label={incognitoEnabled ? "Create new incognito tab" : "Incognito mode is disabled in settings"}
                            disabled={!incognitoEnabled}
                        >
                            🕶️
                        </button>
                    </div>
                </div>
            </DragDropContext>

            <TabContextMenu
                visible={contextMenu.visible}
                x={contextMenu.x}
                y={contextMenu.y}
                tabId={contextMenu.tabId}
                existingGroup={getGroupForTab ? getGroupForTab(contextMenu.tabId) : null}
                groups={groups}
                onCreateGroup={(name, color) => {
                    if (onCreateGroup) {
                        const newGroup = onCreateGroup(name, color);
                        if (onAddTabToGroup) {
                            onAddTabToGroup(contextMenu.tabId, newGroup.id);
                        }
                    }
                }}
                onAddToGroup={(tabId, groupId) => {
                    if (onAddTabToGroup) {
                        onAddTabToGroup(tabId, groupId);
                    }
                }}
                onRemoveFromGroup={(tabId, groupId) => {
                    if (onRemoveTabFromGroup) {
                        onRemoveTabFromGroup(tabId, groupId);
                    }
                }}
                onClose={handleCloseContextMenu}
            />
        </>
    );
};

export default TabBar;