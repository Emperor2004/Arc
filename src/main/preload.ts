import { contextBridge, ipcRenderer } from 'electron';
import { PageLoadedPayload, RecommendationFeedback, ArcSettings } from '../core/types';
import { TabSession } from '../core/sessionManager';

contextBridge.exposeInMainWorld('arc', {
    navigate: (url: string) => ipcRenderer.send('arc:navigate', url),
    onNavigation: (callback: (event: any, url: string) => void) => {
        ipcRenderer.on('navigate-to', callback);
    },
    pageLoaded: (data: PageLoadedPayload) => ipcRenderer.send('arc:pageLoaded', data),
    getJarvisRecommendations: (limit?: number) => ipcRenderer.invoke('jarvis:getRecommendations', limit),
    clearJarvisCache: () => ipcRenderer.invoke('jarvis:clearCache'),
    getRecentHistory: (limit?: number) => ipcRenderer.invoke('arc:getRecentHistory', limit),
    sendJarvisFeedback: (feedback: RecommendationFeedback) => ipcRenderer.invoke('jarvis:sendFeedback', feedback),
    
    // Settings methods
    getSettings: () => ipcRenderer.invoke('arc:getSettings'),
    updateSettings: (partial: Partial<ArcSettings>) => ipcRenderer.invoke('arc:updateSettings', partial),
    clearHistory: () => ipcRenderer.invoke('arc:clearHistory'),
    clearFeedback: () => ipcRenderer.invoke('arc:clearFeedback'),

    // Bookmark methods
    addBookmark: (url: string, title: string) => ipcRenderer.invoke('arc:addBookmark', url, title),
    removeBookmark: (url: string) => ipcRenderer.invoke('arc:removeBookmark', url),
    isBookmarked: (url: string) => ipcRenderer.invoke('arc:isBookmarked', url),
    getAllBookmarks: () => ipcRenderer.invoke('arc:getAllBookmarks'),
    searchBookmarks: (query: string) => ipcRenderer.invoke('arc:searchBookmarks', query),

    // Data export/import methods
    exportData: () => ipcRenderer.invoke('arc:exportData'),
    importData: (data: unknown, mode: 'merge' | 'replace') => ipcRenderer.invoke('arc:importData', data, mode),

    // Session management methods
    loadSession: () => ipcRenderer.invoke('arc:loadSession'),
    saveSession: (tabs: TabSession[], activeTabId: string) => ipcRenderer.invoke('arc:saveSession', tabs, activeTabId),
    clearSession: () => ipcRenderer.invoke('arc:clearSession'),
    restoreSession: (tabs: TabSession[]) => ipcRenderer.invoke('arc:restoreSession', tabs),

    // Keyboard shortcut methods
    newTab: () => ipcRenderer.send('arc:newTab'),
    newIncognitoTab: () => ipcRenderer.send('arc:newIncognitoTab'),
    closeTab: () => ipcRenderer.send('arc:closeTab'),
    nextTab: () => ipcRenderer.send('arc:nextTab'),
    previousTab: () => ipcRenderer.send('arc:previousTab'),
    focusAddressBar: () => ipcRenderer.send('arc:focusAddressBar'),
    reloadPage: () => ipcRenderer.send('arc:reloadPage'),
    clearData: () => ipcRenderer.send('arc:clearData'),
});





