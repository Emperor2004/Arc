import React, { useState, useEffect } from 'react';
import WebviewContainer from './WebviewContainer';
import TabBar from './TabBar';
import { Tab, ArcSettings, Recommendation, HistoryEntry } from '../../core/types';

// Define the interface for the exposed API
interface ArcAPI {
    navigate: (url: string) => void;
    onNavigation: (callback: (event: any, url: string) => void) => void;
    pageLoaded: (data: { url: string; title: string; tabId?: string; incognito?: boolean }) => void;
    getJarvisRecommendations: (limit?: number) => Promise<Recommendation[]>;
    getRecentHistory: (limit?: number) => Promise<HistoryEntry[]>;
    
    // Settings methods
    getSettings: () => Promise<ArcSettings>;
    updateSettings: (partial: Partial<ArcSettings>) => Promise<ArcSettings>;
    clearHistory: () => Promise<{ ok: boolean }>;
    clearFeedback: () => Promise<{ ok: boolean }>;
}

// Extend Window interface to include arc
declare global {
    interface Window {
        arc: ArcAPI;
    }
}

interface BrowserShellProps {
    onNavigationComplete?: () => void;
    onMaximize?: () => void;
    isMaximized?: boolean;
}

const BrowserShell: React.FC<BrowserShellProps> = ({ onNavigationComplete, onMaximize, isMaximized }) => {
    const [url, setUrl] = useState('');
    const [settings, setSettings] = useState<ArcSettings>({
        theme: 'dark',
        jarvisEnabled: true,
        useHistoryForRecommendations: true,
        incognitoEnabled: true
    });
    const [tabs, setTabs] = useState<Tab[]>([
        {
            id: 'tab-1',
            title: 'New Tab',
            url: '',
            isActive: true,
            incognito: false
        }
    ]);

    // Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                if (window.arc && window.arc.getSettings) {
                    const loadedSettings = await window.arc.getSettings();
                    setSettings(loadedSettings);
                }
            } catch (error) {
                console.error('Failed to load settings in BrowserShell:', error);
            }
        };
        loadSettings();
    }, []);

    const activeTab = tabs.find(tab => tab.isActive);
    const isIncognitoActive = activeTab?.incognito || false;

    const generateTabId = () => `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const handleNewTab = () => {
        const newTab: Tab = {
            id: generateTabId(),
            title: 'New Tab',
            url: '',
            isActive: false,
            incognito: false
        };
        
        setTabs(prevTabs => [
            ...prevTabs.map(tab => ({ ...tab, isActive: false })),
            { ...newTab, isActive: true }
        ]);
        setUrl('');
    };

    const handleNewIncognitoTab = () => {
        const newTab: Tab = {
            id: generateTabId(),
            title: 'New Incognito Tab',
            url: '',
            isActive: false,
            incognito: true
        };
        
        setTabs(prevTabs => [
            ...prevTabs.map(tab => ({ ...tab, isActive: false })),
            { ...newTab, isActive: true }
        ]);
        setUrl('');
    };

    const handleTabSelect = (tabId: string) => {
        setTabs(prevTabs => prevTabs.map(tab => ({
            ...tab,
            isActive: tab.id === tabId
        })));
        
        const selectedTab = tabs.find(tab => tab.id === tabId);
        if (selectedTab) {
            setUrl(selectedTab.url);
        }
    };

    const handleTabClose = (tabId: string) => {
        setTabs(prevTabs => {
            const filteredTabs = prevTabs.filter(tab => tab.id !== tabId);
            
            // If we're closing the active tab, activate another one
            if (prevTabs.find(tab => tab.id === tabId)?.isActive && filteredTabs.length > 0) {
                filteredTabs[filteredTabs.length - 1].isActive = true;
                setUrl(filteredTabs[filteredTabs.length - 1].url);
            }
            
            // If no tabs left, create a new one
            if (filteredTabs.length === 0) {
                return [{
                    id: generateTabId(),
                    title: 'New Tab',
                    url: '',
                    isActive: true,
                    incognito: false
                }];
            }
            
            return filteredTabs;
        });
    };

    const handleNavigate = () => {
        let targetUrl = url;
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = `https://${targetUrl}`;
        }

        if (window.arc && activeTab) {
            window.arc.navigate(targetUrl);
            
            // Update the active tab's URL
            setTabs(prevTabs => prevTabs.map(tab => 
                tab.isActive ? { ...tab, url: targetUrl } : tab
            ));
            
            // Trigger navigation completion callback
            if (onNavigationComplete) {
                onNavigationComplete();
            }
        } else {
            console.warn('window.arc is not defined or no active tab');
        }
    };

    const handleTabTitleUpdate = (title: string) => {
        if (activeTab) {
            setTabs(prevTabs => prevTabs.map(tab => 
                tab.id === activeTab.id ? { ...tab, title } : tab
            ));
        }
    };

    return (
        <div className="browser-shell glass-card">
            {/* Tab Bar */}
            <TabBar
                tabs={tabs}
                onNewTab={handleNewTab}
                onNewIncognitoTab={handleNewIncognitoTab}
                onTabSelect={handleTabSelect}
                onTabClose={handleTabClose}
                incognitoEnabled={settings.incognitoEnabled}
            />

            {/* Incognito Banner */}
            {isIncognitoActive && (
                <div className="incognito-banner">
                    🕶️ Incognito: Arc won't save your history for this tab
                </div>
            )}

            {/* Toolbar with address bar */}
            <div className="browser-toolbar">
                <div className="browser-nav-buttons">
                    <button className="round-btn" onClick={() => { }}>←</button>
                    <button className="round-btn" onClick={() => { }}>→</button>
                    <button className="round-btn" onClick={() => { }}>↻</button>
                </div>

                <div className="browser-address-bar">
                    <input
                        type="text"
                        className="pill-input"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
                        placeholder="Search or enter URL"
                    />
                    <button className="round-btn" onClick={handleNavigate}>Go</button>
                    {onMaximize && (
                        <button 
                            className="icon-button icon-button--glass" 
                            type="button"
                            onClick={onMaximize}
                            title={isMaximized ? "Restore browser" : "Maximize browser"}
                        >
                            ⤢
                        </button>
                    )}
                </div>
            </div>

            {/* Webview content */}
            <div className="browser-content">
                {activeTab && (
                    <WebviewContainer 
                        currentUrl={activeTab.url}
                        tabId={activeTab.id}
                        incognito={activeTab.incognito || false}
                        onPageLoaded={onNavigationComplete}
                        onTitleUpdate={handleTabTitleUpdate}
                    />
                )}
            </div>
        </div>
    );
};

export default BrowserShell;
