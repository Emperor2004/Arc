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
});
