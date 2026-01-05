import { ipcMain, BrowserWindow } from 'electron';
import { recordVisit, getRecentHistory } from '../core/historyStore';
import { recordFeedback } from '../core/feedbackStore';
import { getSettings, updateSettings, clearHistory, clearFeedback } from '../core/settingsStore';
import { getJarvisRecommendations } from '../core/recommender';
import { PageLoadedPayload, RecommendationFeedback, ArcSettings } from '../core/types';


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
            
            await recordVisit(data.url, data.title);
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
            await recordFeedback(feedback);
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
};



