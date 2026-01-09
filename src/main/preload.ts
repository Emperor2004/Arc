import { contextBridge, ipcRenderer } from 'electron';
import { PageLoadedPayload, RecommendationFeedback, ArcSettings } from '../core/types';

contextBridge.exposeInMainWorld('arc', {
    navigate: (url: string) => ipcRenderer.send('arc:navigate', url),
    onNavigation: (callback: (event: any, url: string) => void) => {
        ipcRenderer.on('navigate-to', callback);
    },
    pageLoaded: (data: PageLoadedPayload) => ipcRenderer.send('arc:pageLoaded', data),
    getJarvisRecommendations: (limit?: number) => ipcRenderer.invoke('jarvis:getRecommendations', limit),
    getRecentHistory: (limit?: number) => ipcRenderer.invoke('arc:getRecentHistory', limit),
    sendJarvisFeedback: (feedback: RecommendationFeedback) => ipcRenderer.invoke('jarvis:sendFeedback', feedback),
    
    // Settings methods
    getSettings: () => ipcRenderer.invoke('arc:getSettings'),
    updateSettings: (partial: Partial<ArcSettings>) => ipcRenderer.invoke('arc:updateSettings', partial),
    clearHistory: () => ipcRenderer.invoke('arc:clearHistory'),
    clearFeedback: () => ipcRenderer.invoke('arc:clearFeedback'),

    // Data export/import methods
    exportData: () => ipcRenderer.invoke('arc:exportData'),
    importData: (data: unknown, mode: 'merge' | 'replace') => ipcRenderer.invoke('arc:importData', data, mode),

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





