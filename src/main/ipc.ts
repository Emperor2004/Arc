import { ipcMain, BrowserWindow } from 'electron';
import { recordVisit, getRecentHistory } from '../core/historyStore';
import { getJarvisRecommendations } from '../core/recommender';
import { PageLoadedPayload } from '../core/types';


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
};



