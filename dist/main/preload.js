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
    getRecentHistory: (limit) => electron_1.ipcRenderer.invoke('arc:getRecentHistory', limit),
    sendJarvisFeedback: (feedback) => electron_1.ipcRenderer.invoke('jarvis:sendFeedback', feedback),
    // Settings methods
    getSettings: () => electron_1.ipcRenderer.invoke('arc:getSettings'),
    updateSettings: (partial) => electron_1.ipcRenderer.invoke('arc:updateSettings', partial),
    clearHistory: () => electron_1.ipcRenderer.invoke('arc:clearHistory'),
    clearFeedback: () => electron_1.ipcRenderer.invoke('arc:clearFeedback'),
    // Data export/import methods
    exportData: () => electron_1.ipcRenderer.invoke('arc:exportData'),
    importData: (data, mode) => electron_1.ipcRenderer.invoke('arc:importData', data, mode),
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
