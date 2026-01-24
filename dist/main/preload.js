"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('arc', {
    navigate: (url) => electron_1.ipcRenderer.send('arc:navigate', url),
    onNavigation: (callback) => {
        electron_1.ipcRenderer.on('navigate-to', callback);
    },
    pageLoaded: (data) => electron_1.ipcRenderer.send('arc:pageLoaded', data),
    getJarvisRecommendations: (limit) => electron_1.ipcRenderer.invoke('jarvis:getRecommendations', limit),
    clearJarvisCache: () => electron_1.ipcRenderer.invoke('jarvis:clearCache'),
    jarvisChat: (messages) => electron_1.ipcRenderer.invoke('jarvis:chat', messages),
    getCurrentPageText: () => electron_1.ipcRenderer.invoke('arc:getCurrentPageText'),
    getCurrentTab: () => electron_1.ipcRenderer.invoke('arc:getCurrentTab'),
    getRecentHistory: (limit) => electron_1.ipcRenderer.invoke('arc:getRecentHistory', limit),
    sendJarvisFeedback: (feedback) => electron_1.ipcRenderer.invoke('jarvis:sendFeedback', feedback),
    // Settings methods
    getSettings: () => electron_1.ipcRenderer.invoke('arc:getSettings'),
    updateSettings: (partial) => electron_1.ipcRenderer.invoke('arc:updateSettings', partial),
    onSettingsUpdated: (callback) => {
        const handler = (_event, settings) => callback(settings);
        electron_1.ipcRenderer.on('settings:updated', handler);
        // Return unsubscribe function
        return () => {
            electron_1.ipcRenderer.removeListener('settings:updated', handler);
        };
    },
    getOllamaModels: () => electron_1.ipcRenderer.invoke('arc:getOllamaModels'),
    clearHistory: () => electron_1.ipcRenderer.invoke('arc:clearHistory'),
    clearFeedback: () => electron_1.ipcRenderer.invoke('arc:clearFeedback'),
    // Bookmark methods
    addBookmark: (url, title) => electron_1.ipcRenderer.invoke('arc:addBookmark', url, title),
    removeBookmark: (url) => electron_1.ipcRenderer.invoke('arc:removeBookmark', url),
    isBookmarked: (url) => electron_1.ipcRenderer.invoke('arc:isBookmarked', url),
    getAllBookmarks: () => electron_1.ipcRenderer.invoke('arc:getAllBookmarks'),
    searchBookmarks: (query) => electron_1.ipcRenderer.invoke('arc:searchBookmarks', query),
    // Data export/import methods
    exportData: () => electron_1.ipcRenderer.invoke('arc:exportData'),
    importData: (data, mode) => electron_1.ipcRenderer.invoke('arc:importData', data, mode),
    // Session management methods
    loadSession: () => electron_1.ipcRenderer.invoke('arc:loadSession'),
    saveSession: (tabs, activeTabId) => electron_1.ipcRenderer.invoke('arc:saveSession', tabs, activeTabId),
    clearSession: () => electron_1.ipcRenderer.invoke('arc:clearSession'),
    restoreSession: (tabs) => electron_1.ipcRenderer.invoke('arc:restoreSession', tabs),
    // Cookie management methods
    getCookies: (filter) => electron_1.ipcRenderer.invoke('arc:getCookies', filter),
    clearCookies: () => electron_1.ipcRenderer.invoke('arc:clearCookies'),
    clearCookiesForUrl: (url) => electron_1.ipcRenderer.invoke('arc:clearCookiesForUrl', url),
    // Workspace management methods
    listWorkspaces: () => electron_1.ipcRenderer.invoke('arc:listWorkspaces'),
    saveWorkspace: (tabs, activeTabId, options) => electron_1.ipcRenderer.invoke('arc:saveWorkspace', tabs, activeTabId, options),
    loadWorkspace: (workspaceId) => electron_1.ipcRenderer.invoke('arc:loadWorkspace', workspaceId),
    deleteWorkspace: (workspaceId) => electron_1.ipcRenderer.invoke('arc:deleteWorkspace', workspaceId),
    updateWorkspace: (workspaceId, options) => electron_1.ipcRenderer.invoke('arc:updateWorkspace', workspaceId, options),
    updateWorkspaceSession: (workspaceId, tabs, activeTabId) => electron_1.ipcRenderer.invoke('arc:updateWorkspaceSession', workspaceId, tabs, activeTabId),
    searchWorkspaces: (query) => electron_1.ipcRenderer.invoke('arc:searchWorkspaces', query),
    getWorkspaceStats: () => electron_1.ipcRenderer.invoke('arc:getWorkspaceStats'),
    // Diagnostics methods
    getDiagnostics: () => electron_1.ipcRenderer.invoke('arc:getDiagnostics'),
    // Onboarding methods
    isFirstRun: () => electron_1.ipcRenderer.invoke('arc:isFirstRun'),
    markOnboardingCompleted: () => electron_1.ipcRenderer.invoke('arc:markOnboardingCompleted'),
    skipOnboarding: () => electron_1.ipcRenderer.invoke('arc:skipOnboarding'),
    createDemoWorkspace: () => electron_1.ipcRenderer.invoke('arc:createDemoWorkspace'),
    // Enhanced summarization methods
    summarizePage: (options) => electron_1.ipcRenderer.invoke('arc:summarizePage', options),
    summarizeText: (text, metadata, options) => electron_1.ipcRenderer.invoke('arc:summarizeText', text, metadata, options),
    getSummaryTypes: () => electron_1.ipcRenderer.invoke('arc:getSummaryTypes'),
    clearSummaryCache: () => electron_1.ipcRenderer.invoke('arc:clearSummaryCache'),
    getSummaryCacheStats: () => electron_1.ipcRenderer.invoke('arc:getSummaryCacheStats'),
    // Reading list methods
    addToReadingList: (url, title, options) => electron_1.ipcRenderer.invoke('arc:addToReadingList', url, title, options),
    removeFromReadingList: (id) => electron_1.ipcRenderer.invoke('arc:removeFromReadingList', id),
    updateReadingListItem: (id, updates) => electron_1.ipcRenderer.invoke('arc:updateReadingListItem', id, updates),
    getReadingList: (filter) => electron_1.ipcRenderer.invoke('arc:getReadingList', filter),
    getReadingListItem: (id) => electron_1.ipcRenderer.invoke('arc:getReadingListItem', id),
    searchReadingList: (query) => electron_1.ipcRenderer.invoke('arc:searchReadingList', query),
    getReadingListStats: () => electron_1.ipcRenderer.invoke('arc:getReadingListStats'),
    clearReadingList: () => electron_1.ipcRenderer.invoke('arc:clearReadingList'),
    exportReadingList: () => electron_1.ipcRenderer.invoke('arc:exportReadingList'),
    importReadingList: (data, mode) => electron_1.ipcRenderer.invoke('arc:importReadingList', data, mode),
    // Translation methods
    detectLanguage: (text) => electron_1.ipcRenderer.invoke('arc:detectLanguage', text),
    translateText: (text, targetLanguage, sourceLanguage) => electron_1.ipcRenderer.invoke('arc:translateText', text, targetLanguage, sourceLanguage),
    translatePageContent: (content, targetLanguage, sourceLanguage, options) => electron_1.ipcRenderer.invoke('arc:translatePageContent', content, targetLanguage, sourceLanguage, options),
    getSupportedLanguages: () => electron_1.ipcRenderer.invoke('arc:getSupportedLanguages'),
    clearTranslationCache: () => electron_1.ipcRenderer.invoke('arc:clearTranslationCache'),
    getTranslationCacheStats: () => electron_1.ipcRenderer.invoke('arc:getTranslationCacheStats'),
    // Keyboard shortcut methods
    newTab: () => electron_1.ipcRenderer.send('arc:newTab'),
    newIncognitoTab: () => electron_1.ipcRenderer.send('arc:newIncognitoTab'),
    closeTab: () => electron_1.ipcRenderer.send('arc:closeTab'),
    nextTab: () => electron_1.ipcRenderer.send('arc:nextTab'),
    previousTab: () => electron_1.ipcRenderer.send('arc:previousTab'),
    focusAddressBar: () => electron_1.ipcRenderer.send('arc:focusAddressBar'),
    reloadPage: () => electron_1.ipcRenderer.send('arc:reloadPage'),
    clearData: () => electron_1.ipcRenderer.send('arc:clearData'),
});
