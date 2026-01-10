"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupIpc = void 0;
const electron_1 = require("electron");
const historyStore_1 = require("../core/historyStore");
const feedbackStore_1 = require("../core/feedbackStore");
const settingsStore_1 = require("../core/settingsStore");
const recommender_1 = require("../core/recommender");
const dataManager = __importStar(require("../core/dataManager"));
const bookmarkStore_1 = require("../core/bookmarkStore");
const sessionManager_1 = require("../core/sessionManager");
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
            // Skip history recording for incognito tabs
            if (data.incognito) {
                console.log('Skipping history recording for incognito tab');
                return;
            }
            await (0, historyStore_1.addHistoryEntry)(data.url, data.title);
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
    electron_1.ipcMain.handle('jarvis:clearCache', async () => {
        try {
            (0, recommender_1.clearRecommendationCache)();
            return { ok: true };
        }
        catch (err) {
            console.error('Error in jarvis:clearCache handler:', err);
            return { ok: false };
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
    electron_1.ipcMain.handle('jarvis:sendFeedback', async (_event, feedback) => {
        try {
            (0, feedbackStore_1.addFeedback)(feedback.url, feedback.value);
            return { ok: true };
        }
        catch (err) {
            console.error('Error in jarvis:sendFeedback handler:', err);
            return { ok: false };
        }
    });
    // Settings handlers
    electron_1.ipcMain.handle('arc:getSettings', async () => {
        try {
            return await (0, settingsStore_1.getSettings)();
        }
        catch (err) {
            console.error('Error in arc:getSettings handler:', err);
            throw err;
        }
    });
    electron_1.ipcMain.handle('arc:updateSettings', async (_event, partial) => {
        try {
            return await (0, settingsStore_1.updateSettings)(partial);
        }
        catch (err) {
            console.error('Error in arc:updateSettings handler:', err);
            throw err;
        }
    });
    electron_1.ipcMain.handle('arc:clearHistory', async () => {
        try {
            await (0, historyStore_1.clearHistory)();
            return { ok: true };
        }
        catch (err) {
            console.error('Error in arc:clearHistory handler:', err);
            return { ok: false };
        }
    });
    electron_1.ipcMain.handle('arc:clearFeedback', async () => {
        try {
            await (0, feedbackStore_1.clearFeedback)();
            return { ok: true };
        }
        catch (err) {
            console.error('Error in arc:clearFeedback handler:', err);
            return { ok: false };
        }
    });
    // Bookmark handlers
    electron_1.ipcMain.handle('arc:addBookmark', async (_event, url, title) => {
        try {
            await (0, bookmarkStore_1.addBookmark)(url, title);
            return { ok: true };
        }
        catch (err) {
            console.error('Error in arc:addBookmark handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });
    electron_1.ipcMain.handle('arc:removeBookmark', async (_event, url) => {
        try {
            await (0, bookmarkStore_1.removeBookmark)(url);
            return { ok: true };
        }
        catch (err) {
            console.error('Error in arc:removeBookmark handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });
    electron_1.ipcMain.handle('arc:isBookmarked', async (_event, url) => {
        try {
            const bookmarked = await (0, bookmarkStore_1.isBookmarked)(url);
            return { ok: true, bookmarked };
        }
        catch (err) {
            console.error('Error in arc:isBookmarked handler:', err);
            return { ok: false, bookmarked: false };
        }
    });
    electron_1.ipcMain.handle('arc:getAllBookmarks', async () => {
        try {
            const bookmarks = await (0, bookmarkStore_1.getAllBookmarks)();
            return { ok: true, bookmarks };
        }
        catch (err) {
            console.error('Error in arc:getAllBookmarks handler:', err);
            return { ok: false, bookmarks: [] };
        }
    });
    electron_1.ipcMain.handle('arc:searchBookmarks', async (_event, query) => {
        try {
            const results = await (0, bookmarkStore_1.searchBookmarks)(query);
            return { ok: true, results };
        }
        catch (err) {
            console.error('Error in arc:searchBookmarks handler:', err);
            return { ok: false, results: [] };
        }
    });
    // Data export/import handlers
    electron_1.ipcMain.handle('arc:exportData', async () => {
        try {
            const data = await dataManager.exportData();
            return { ok: true, data };
        }
        catch (err) {
            console.error('Error in arc:exportData handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });
    electron_1.ipcMain.handle('arc:importData', async (_event, data, mode = 'merge') => {
        try {
            await dataManager.importData(data, mode);
            return { ok: true };
        }
        catch (err) {
            console.error('Error in arc:importData handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });
    // Session management handlers
    electron_1.ipcMain.handle('arc:loadSession', async () => {
        try {
            const session = (0, sessionManager_1.loadSession)();
            return { ok: true, session };
        }
        catch (err) {
            console.error('Error in arc:loadSession handler:', err);
            return { ok: false, session: null };
        }
    });
    electron_1.ipcMain.handle('arc:saveSession', async (_event, tabs, activeTabId) => {
        try {
            const sessionState = (0, sessionManager_1.createSessionState)(tabs, activeTabId);
            (0, sessionManager_1.saveSession)(sessionState);
            return { ok: true };
        }
        catch (err) {
            console.error('Error in arc:saveSession handler:', err);
            return { ok: false };
        }
    });
    electron_1.ipcMain.handle('arc:clearSession', async () => {
        try {
            (0, sessionManager_1.clearSession)();
            return { ok: true };
        }
        catch (err) {
            console.error('Error in arc:clearSession handler:', err);
            return { ok: false };
        }
    });
    electron_1.ipcMain.handle('arc:restoreSession', async (_event, tabs) => {
        try {
            // Restore session by creating new tabs with the provided data
            // This is handled by the renderer, we just acknowledge
            return { ok: true };
        }
        catch (err) {
            console.error('Error in arc:restoreSession handler:', err);
            return { ok: false };
        }
    });
};
exports.setupIpc = setupIpc;
