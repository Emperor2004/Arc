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
    getRecentHistory: (limit) => electron_1.ipcRenderer.invoke('arc:getRecentHistory', limit),
    sendJarvisFeedback: (feedback) => electron_1.ipcRenderer.invoke('jarvis:sendFeedback', feedback),
    // Settings methods
    getSettings: () => electron_1.ipcRenderer.invoke('arc:getSettings'),
    updateSettings: (partial) => electron_1.ipcRenderer.invoke('arc:updateSettings', partial),
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
