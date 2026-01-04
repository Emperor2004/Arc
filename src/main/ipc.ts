import { ipcMain, BrowserWindow } from 'electron';
import { recordVisit } from '../core/historyStore';
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
        console.log(`Page loaded: ${JSON.stringify(data)}`);
        await recordVisit(data.url, data.title);
    });

    ipcMain.handle('jarvis:getRecommendations', async (_event, limit?: number) => {
        return await getJarvisRecommendations(limit ?? 5);
    });
};


