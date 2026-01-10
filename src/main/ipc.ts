import { ipcMain, BrowserWindow } from 'electron';
import { addHistoryEntry, getRecentHistory, clearHistory } from '../core/historyStore';
import { addFeedback, clearFeedback } from '../core/feedbackStore';
import { getSettings, updateSettings } from '../core/settingsStore';
import { getJarvisRecommendations, clearRecommendationCache } from '../core/recommender';
import { PageLoadedPayload, RecommendationFeedback, ArcSettings } from '../core/types';
import * as dataManager from '../core/dataManager';
import { addBookmark, removeBookmark, isBookmarked, getAllBookmarks, searchBookmarks } from '../core/bookmarkStore';
import { loadSession, saveSession, clearSession, createSessionState, TabSession } from '../core/sessionManager';


export const setupIpc = (mainWindow: BrowserWindow) => {
    ipcMain.on('arc:navigate', (event, url: string) => {
        let targetUrl = url;
        if (!/^https?:\/\//i.test(url)) {
            targetUrl = `https://${url}`;
        }
        console.log(`Navigating to: ${targetUrl}`);
        // mainWindow.webContents.loadURL(targetUrl);
    });

    ipcMain.on('arc:pageLoaded', async (event, data: PageLoadedPayload) => {
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
            
            await addHistoryEntry(data.url, data.title);
        } catch (err) {
            console.error('Error in arc:pageLoaded handler:', err);
        }
    });

    ipcMain.handle('jarvis:getRecommendations', async (_event, limit?: number) => {
        try {
            return await getJarvisRecommendations(limit ?? 5);
        } catch (err) {
            console.error('Error in jarvis:getRecommendations handler:', err);
            return [];
        }
    });

    ipcMain.handle('jarvis:clearCache', async () => {
        try {
            clearRecommendationCache();
            return { ok: true };
        } catch (err) {
            console.error('Error in jarvis:clearCache handler:', err);
            return { ok: false };
        }
    });

    ipcMain.handle('arc:getRecentHistory', async (_event, limit?: number) => {
        try {
            return await getRecentHistory(limit ?? 50);
        } catch (err) {
            console.error('Error in arc:getRecentHistory handler:', err);
            return [];
        }
    });

    ipcMain.handle('jarvis:sendFeedback', async (_event, feedback: RecommendationFeedback) => {
        try {
            addFeedback(feedback.url, feedback.value);
            return { ok: true };
        } catch (err) {
            console.error('Error in jarvis:sendFeedback handler:', err);
            return { ok: false };
        }
    });

    // Settings handlers
    ipcMain.handle('arc:getSettings', async () => {
        try {
            return await getSettings();
        } catch (err) {
            console.error('Error in arc:getSettings handler:', err);
            throw err;
        }
    });

    ipcMain.handle('arc:updateSettings', async (_event, partial: Partial<ArcSettings>) => {
        try {
            return await updateSettings(partial);
        } catch (err) {
            console.error('Error in arc:updateSettings handler:', err);
            throw err;
        }
    });

    ipcMain.handle('arc:clearHistory', async () => {
        try {
            await clearHistory();
            return { ok: true };
        } catch (err) {
            console.error('Error in arc:clearHistory handler:', err);
            return { ok: false };
        }
    });

    ipcMain.handle('arc:clearFeedback', async () => {
        try {
            await clearFeedback();
            return { ok: true };
        } catch (err) {
            console.error('Error in arc:clearFeedback handler:', err);
            return { ok: false };
        }
    });

    // Bookmark handlers
    ipcMain.handle('arc:addBookmark', async (_event, url: string, title: string) => {
        try {
            await addBookmark(url, title);
            return { ok: true };
        } catch (err) {
            console.error('Error in arc:addBookmark handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    ipcMain.handle('arc:removeBookmark', async (_event, url: string) => {
        try {
            await removeBookmark(url);
            return { ok: true };
        } catch (err) {
            console.error('Error in arc:removeBookmark handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    ipcMain.handle('arc:isBookmarked', async (_event, url: string) => {
        try {
            const bookmarked = await isBookmarked(url);
            return { ok: true, bookmarked };
        } catch (err) {
            console.error('Error in arc:isBookmarked handler:', err);
            return { ok: false, bookmarked: false };
        }
    });

    ipcMain.handle('arc:getAllBookmarks', async () => {
        try {
            const bookmarks = await getAllBookmarks();
            return { ok: true, bookmarks };
        } catch (err) {
            console.error('Error in arc:getAllBookmarks handler:', err);
            return { ok: false, bookmarks: [] };
        }
    });

    ipcMain.handle('arc:searchBookmarks', async (_event, query: string) => {
        try {
            const results = await searchBookmarks(query);
            return { ok: true, results };
        } catch (err) {
            console.error('Error in arc:searchBookmarks handler:', err);
            return { ok: false, results: [] };
        }
    });

    // Data export/import handlers
    ipcMain.handle('arc:exportData', async () => {
        try {
            const data = await dataManager.exportData();
            return { ok: true, data };
        } catch (err) {
            console.error('Error in arc:exportData handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    ipcMain.handle('arc:importData', async (_event, data: unknown, mode: 'merge' | 'replace' = 'merge') => {
        try {
            await dataManager.importData(data as any, mode);
            return { ok: true };
        } catch (err) {
            console.error('Error in arc:importData handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    // Session management handlers
    ipcMain.handle('arc:loadSession', async () => {
        try {
            const session = loadSession();
            return { ok: true, session };
        } catch (err) {
            console.error('Error in arc:loadSession handler:', err);
            return { ok: false, session: null };
        }
    });

    ipcMain.handle('arc:saveSession', async (_event, tabs: TabSession[], activeTabId: string) => {
        try {
            const sessionState = createSessionState(tabs, activeTabId);
            saveSession(sessionState);
            return { ok: true };
        } catch (err) {
            console.error('Error in arc:saveSession handler:', err);
            return { ok: false };
        }
    });

    ipcMain.handle('arc:clearSession', async () => {
        try {
            clearSession();
            return { ok: true };
        } catch (err) {
            console.error('Error in arc:clearSession handler:', err);
            return { ok: false };
        }
    });

    ipcMain.handle('arc:restoreSession', async (_event, tabs: TabSession[]) => {
        try {
            // Restore session by creating new tabs with the provided data
            // This is handled by the renderer, we just acknowledge
            return { ok: true };
        } catch (err) {
            console.error('Error in arc:restoreSession handler:', err);
            return { ok: false };
        }
    });
};



