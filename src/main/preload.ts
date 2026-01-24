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
    jarvisChat: (messages: Array<{from: string; text: string}>) => ipcRenderer.invoke('jarvis:chat', messages),
    getCurrentPageText: () => ipcRenderer.invoke('arc:getCurrentPageText'),
    getCurrentTab: () => ipcRenderer.invoke('arc:getCurrentTab'),
    getRecentHistory: (limit?: number) => ipcRenderer.invoke('arc:getRecentHistory', limit),
    sendJarvisFeedback: (feedback: RecommendationFeedback) => ipcRenderer.invoke('jarvis:sendFeedback', feedback),
    
    // Settings methods
    getSettings: () => ipcRenderer.invoke('arc:getSettings'),
    updateSettings: (partial: Partial<ArcSettings>) => ipcRenderer.invoke('arc:updateSettings', partial),
    onSettingsUpdated: (callback: (settings: ArcSettings) => void) => {
        const handler = (_event: any, settings: ArcSettings) => callback(settings);
        ipcRenderer.on('settings:updated', handler);
        
        // Return unsubscribe function
        return () => {
            ipcRenderer.removeListener('settings:updated', handler);
        };
    },
    getOllamaModels: () => ipcRenderer.invoke('arc:getOllamaModels'),
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

    // Cookie management methods
    getCookies: (filter?: { url?: string; domain?: string; name?: string }) => ipcRenderer.invoke('arc:getCookies', filter),
    clearCookies: () => ipcRenderer.invoke('arc:clearCookies'),
    clearCookiesForUrl: (url: string) => ipcRenderer.invoke('arc:clearCookiesForUrl', url),

    // Workspace management methods
    listWorkspaces: () => ipcRenderer.invoke('arc:listWorkspaces'),
    saveWorkspace: (tabs: TabSession[], activeTabId: string, options: { name: string; description?: string; tags?: string[] }) => ipcRenderer.invoke('arc:saveWorkspace', tabs, activeTabId, options),
    loadWorkspace: (workspaceId: string) => ipcRenderer.invoke('arc:loadWorkspace', workspaceId),
    deleteWorkspace: (workspaceId: string) => ipcRenderer.invoke('arc:deleteWorkspace', workspaceId),
    updateWorkspace: (workspaceId: string, options: { name?: string; description?: string; tags?: string[] }) => ipcRenderer.invoke('arc:updateWorkspace', workspaceId, options),
    updateWorkspaceSession: (workspaceId: string, tabs: TabSession[], activeTabId: string) => ipcRenderer.invoke('arc:updateWorkspaceSession', workspaceId, tabs, activeTabId),
    searchWorkspaces: (query: string) => ipcRenderer.invoke('arc:searchWorkspaces', query),
    getWorkspaceStats: () => ipcRenderer.invoke('arc:getWorkspaceStats'),

    // Diagnostics methods
    getDiagnostics: () => ipcRenderer.invoke('arc:getDiagnostics'),

    // Onboarding methods
    isFirstRun: () => ipcRenderer.invoke('arc:isFirstRun'),
    markOnboardingCompleted: () => ipcRenderer.invoke('arc:markOnboardingCompleted'),
    skipOnboarding: () => ipcRenderer.invoke('arc:skipOnboarding'),
    createDemoWorkspace: () => ipcRenderer.invoke('arc:createDemoWorkspace'),

    // Enhanced summarization methods
    summarizePage: (options?: { type?: 'short' | 'bullets' | 'insights' | 'detailed'; includeKeywords?: boolean; includeTopics?: boolean }) => ipcRenderer.invoke('arc:summarizePage', options),
    summarizeText: (text: string, metadata?: { title?: string; url?: string; language?: string }, options?: { type?: 'short' | 'bullets' | 'insights' | 'detailed'; includeKeywords?: boolean; includeTopics?: boolean }) => ipcRenderer.invoke('arc:summarizeText', text, metadata, options),
    getSummaryTypes: () => ipcRenderer.invoke('arc:getSummaryTypes'),
    clearSummaryCache: () => ipcRenderer.invoke('arc:clearSummaryCache'),
    getSummaryCacheStats: () => ipcRenderer.invoke('arc:getSummaryCacheStats'),

    // Reading list methods
    addToReadingList: (url: string, title: string, options?: { autoSummarize?: boolean; tags?: string[]; addedFrom?: 'manual' | 'jarvis' | 'command-palette' }) => ipcRenderer.invoke('arc:addToReadingList', url, title, options),
    removeFromReadingList: (id: string) => ipcRenderer.invoke('arc:removeFromReadingList', id),
    updateReadingListItem: (id: string, updates: { isRead?: boolean; progress?: number; tags?: string[] }) => ipcRenderer.invoke('arc:updateReadingListItem', id, updates),
    getReadingList: (filter?: { isRead?: boolean; tags?: string[]; domain?: string; dateRange?: { start: number; end: number }; minReadingTime?: number; maxReadingTime?: number }) => ipcRenderer.invoke('arc:getReadingList', filter),
    getReadingListItem: (id: string) => ipcRenderer.invoke('arc:getReadingListItem', id),
    searchReadingList: (query: string) => ipcRenderer.invoke('arc:searchReadingList', query),
    getReadingListStats: () => ipcRenderer.invoke('arc:getReadingListStats'),
    clearReadingList: () => ipcRenderer.invoke('arc:clearReadingList'),
    exportReadingList: () => ipcRenderer.invoke('arc:exportReadingList'),
    importReadingList: (data: any, mode: 'merge' | 'replace') => ipcRenderer.invoke('arc:importReadingList', data, mode),

    // Translation methods
    detectLanguage: (text: string) => ipcRenderer.invoke('arc:detectLanguage', text),
    translateText: (text: string, targetLanguage: string, sourceLanguage?: string) => ipcRenderer.invoke('arc:translateText', text, targetLanguage, sourceLanguage),
    translatePageContent: (content: string, targetLanguage: string, sourceLanguage?: string, options?: { chunkSize?: number; preserveFormatting?: boolean }) => ipcRenderer.invoke('arc:translatePageContent', content, targetLanguage, sourceLanguage, options),
    getSupportedLanguages: () => ipcRenderer.invoke('arc:getSupportedLanguages'),
    clearTranslationCache: () => ipcRenderer.invoke('arc:clearTranslationCache'),
    getTranslationCacheStats: () => ipcRenderer.invoke('arc:getTranslationCacheStats'),

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





