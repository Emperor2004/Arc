import React from 'react';
import { Tab } from '../../core/types';

interface TabBarProps {
    tabs: Tab[];
    onNewTab: () => void;
    onNewIncognitoTab: () => void;
    onTabSelect: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    incognitoEnabled: boolean;
}

const TabBar: React.FC<TabBarProps> = ({
    tabs,
    onNewTab,
    onNewIncognitoTab,
    onTabSelect,
    onTabClose,
    incognitoEnabled
}) => {
    return (
        <div className="tab-bar">
            <div className="tab-list">
                {tabs.map(tab => (
                    <div
                        key={tab.id}
                        className={`tab ${tab.isActive ? 'tab--active' : ''} ${tab.incognito ? 'tab--incognito' : ''}`}
                        onClick={() => onTabSelect(tab.id)}
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
                ))}
            </div>
            
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
    );
};

export default TabBar;