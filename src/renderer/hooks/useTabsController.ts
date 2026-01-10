import { useState, useEffect } from 'react';
import { Tab } from '../../core/types';

export interface TabsController {
    tabs: Tab[];
    activeTab: Tab | undefined;
    url: string;
    setUrl: (url: string) => void;
    handleNewTab: () => void;
    handleNewIncognitoTab: () => void;
    handleTabSelect: (tabId: string) => void;
    handleTabClose: (tabId: string) => void;
    handleTabTitleUpdate: (title: string) => void;
    updateActiveTabUrl: (url: string) => void;
    handleTabReorder: (tabIds: string[]) => void;
    restoreTabs: (tabs: Tab[]) => void;
}

export const useTabsController = (): TabsController => {
    const [url, setUrl] = useState('');
    const [tabs, setTabs] = useState<Tab[]>([
        {
            id: 'tab-1',
            title: 'New Tab',
            url: '',
            isActive: true,
            incognito: false
        }
    ]);

    const activeTab = tabs.find(tab => tab.isActive);

    const generateTabId = () => `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Load tab order from settings on mount
    useEffect(() => {
        const loadTabOrder = async () => {
            try {
                if (window.arc && window.arc.getSettings) {
                    const settings = await window.arc.getSettings();
                    const savedTabOrder = settings.tabOrder as string[] | undefined;
                    if (savedTabOrder && savedTabOrder.length > 0) {
                        // Reorder tabs based on saved order
                        setTabs(prevTabs => {
                            const tabMap = new Map(prevTabs.map(tab => [tab.id, tab]));
                            const reorderedTabs = savedTabOrder
                                .map(id => tabMap.get(id))
                                .filter((tab): tab is Tab => tab !== undefined);
                            
                            // Add any tabs that weren't in the saved order
                            prevTabs.forEach(tab => {
                                if (!reorderedTabs.find(t => t.id === tab.id)) {
                                    reorderedTabs.push(tab);
                                }
                            });
                            
                            return reorderedTabs.length > 0 ? reorderedTabs : prevTabs;
                        });
                    }
                }
            } catch (error) {
                console.error('Error loading tab order:', error);
            }
        };
        
        loadTabOrder();
    }, []);

    // Save tab order whenever tabs change
    useEffect(() => {
        const saveTabOrder = async () => {
            try {
                const tabIds = tabs.map(tab => tab.id);
                if (window.arc && window.arc.updateSettings) {
                    await window.arc.updateSettings({ tabOrder: tabIds });
                }
            } catch (error) {
                console.error('Error saving tab order:', error);
            }
        };
        
        saveTabOrder();
    }, [tabs]);

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

    const handleTabTitleUpdate = (title: string) => {
        if (activeTab) {
            setTabs(prevTabs => prevTabs.map(tab => 
                tab.id === activeTab.id ? { ...tab, title } : tab
            ));
        }
    };

    const updateActiveTabUrl = (url: string) => {
        setTabs(prevTabs => prevTabs.map(tab => 
            tab.isActive ? { ...tab, url } : tab
        ));
    };

    const handleTabReorder = (tabIds: string[]) => {
        setTabs(prevTabs => {
            const tabMap = new Map(prevTabs.map(tab => [tab.id, tab]));
            const reorderedTabs = tabIds
                .map(id => tabMap.get(id))
                .filter((tab): tab is Tab => tab !== undefined);
            
            // Add any tabs that weren't in the reordered list
            prevTabs.forEach(tab => {
                if (!reorderedTabs.find(t => t.id === tab.id)) {
                    reorderedTabs.push(tab);
                }
            });
            
            return reorderedTabs;
        });
    };

    const restoreTabs = (newTabs: Tab[]) => {
        if (newTabs.length > 0) {
            setTabs(newTabs);
            const activeTab = newTabs.find(tab => tab.isActive);
            if (activeTab) {
                setUrl(activeTab.url);
            }
        }
    };

    return {
        tabs,
        activeTab,
        url,
        setUrl,
        handleNewTab,
        handleNewIncognitoTab,
        handleTabSelect,
        handleTabClose,
        handleTabTitleUpdate,
        updateActiveTabUrl,
        handleTabReorder,
        restoreTabs
    };
};