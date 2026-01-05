import { useState } from 'react';
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
        updateActiveTabUrl
    };
};