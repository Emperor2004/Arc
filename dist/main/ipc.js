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
        console.log(`Page loaded: ${JSON.stringify(data)}`);
        await (0, historyStore_1.recordVisit)(data.url, data.title);
    });
    electron_1.ipcMain.handle('arc:getRecommendations', async () => {
        return await (0, recommender_1.getJarvisRecommendations)();
    });
};
exports.setupIpc = setupIpc;
