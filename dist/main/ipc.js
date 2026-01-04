"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupIpc = void 0;
const electron_1 = require("electron");
const setupIpc = (mainWindow) => {
    electron_1.ipcMain.on('arc:navigate', (event, url) => {
        let targetUrl = url;
        if (!/^https?:\/\//i.test(url)) {
            targetUrl = `https://${url}`;
        }
        console.log(`Navigating to: ${targetUrl}`);
        // mainWindow.webContents.loadURL(targetUrl);
    });
    electron_1.ipcMain.on('arc:pageLoaded', (event, data) => {
        console.log(`Page loaded: ${JSON.stringify(data)}`);
    });
};
exports.setupIpc = setupIpc;
