"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupIpc = void 0;
const electron_1 = require("electron");
const historyStore_1 = require("../core/historyStore");
const recommender_1 = require("../core/recommender");
const setupIpc = (mainWindow) => {
    electron_1.ipcMain.on('arc:navigate', (event, url) => {
        let targetUrl = url;
        if (!/^https?:\/\//i.test(url)) {
            targetUrl = `https://${url}`;
        }
        console.log(`Navigating to: ${targetUrl}`);
        // mainWindow.webContents.loadURL(targetUrl);
    });
    electron_1.ipcMain.on('arc:pageLoaded', async (event, data) => {
        try {
            // Validate payload
            if (!data || !data.url) {
                console.warn('arc:pageLoaded received invalid payload');
                return;
            }
            console.log(`Page loaded: ${JSON.stringify(data)}`);
            await (0, historyStore_1.recordVisit)(data.url, data.title);
        }
        catch (err) {
            console.error('Error in arc:pageLoaded handler:', err);
        }
    });
    electron_1.ipcMain.handle('jarvis:getRecommendations', async (_event, limit) => {
        try {
            return await (0, recommender_1.getJarvisRecommendations)(limit ?? 5);
        }
        catch (err) {
            console.error('Error in jarvis:getRecommendations handler:', err);
            return [];
        }
    });
    electron_1.ipcMain.handle('arc:getRecentHistory', async (_event, limit) => {
        try {
            return await (0, historyStore_1.getRecentHistory)(limit ?? 50);
        }
        catch (err) {
            console.error('Error in arc:getRecentHistory handler:', err);
            return [];
        }
    });
};
exports.setupIpc = setupIpc;
