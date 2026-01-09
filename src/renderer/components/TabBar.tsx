import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Tab } from '../../core/types';
import { TabReorderManager } from '../../core/tabReorderManager';

export interface TabBarProps {
    tabs: Tab[];
    onNewTab: () => void;
    onNewIncognitoTab: () => void;
    onTabSelect: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onTabReorder?: (tabIds: string[]) => void;
    incognitoEnabled: boolean;
}

const TabBar: React.FC<TabBarProps> = ({
    tabs,
    onNewTab,
    onNewIncognitoTab,
    onTabSelect,
    onTabClose,
    onTabReorder,
    incognitoEnabled
}) => {
    const [tabOrder, setTabOrder] = useState<string[]>(tabs.map(t => t.id));
    const [reorderManager] = useState(() => new TabReorderManager(tabs.map(t => t.id)));

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

    // Create a map of tab IDs to tab objects for quick lookup
    const tabMap = new Map(tabs.map(tab => [tab.id, tab]));

    // Get tabs in the current order
    const orderedTabs = tabOrder
        .map(id => tabMap.get(id))
        .filter((tab): tab is Tab => tab !== undefined);

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="tab-bar">
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
                                            style={{
                                                ...provided.draggableProps.style,
                                            }}
                                        >
                                            <div className="tab-content">
                                                {tab.incognito && (
                                                    <span className="tab-incognito-icon" title="Incognito">🕶️</span>
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
                                                title="Close tab"
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
                
                <div className="tab-actions">
                    <button
                        className="tab-new-btn"
                        onClick={onNewTab}
                        title="New tab"
                    >
                        +
                    </button>
                    <button
                        className={`tab-new-btn tab-new-btn--incognito ${!incognitoEnabled ? 'tab-new-btn--disabled' : ''}`}
                        onClick={incognitoEnabled ? onNewIncognitoTab : undefined}
                        title={incognitoEnabled ? "New incognito tab" : "Incognito mode is disabled in settings"}
                        disabled={!incognitoEnabled}
                    >
                        🕶️
                    </button>
                </div>
            </div>
        </DragDropContext>
    );
};

export default TabBar;