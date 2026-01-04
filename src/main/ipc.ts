import { ipcMain, BrowserWindow } from 'electron';

export const setupIpc = (mainWindow: BrowserWindow) => {
    ipcMain.on('arc:navigate', (event, url: string) => {
        let targetUrl = url;
        if (!/^https?:\/\//i.test(url)) {
            targetUrl = `https://${url}`;
        }
        console.log(`Navigating to: ${targetUrl}`);
        // mainWindow.webContents.loadURL(targetUrl);
    });

    ipcMain.on('arc:pageLoaded', (event, data: { url: string; title: string }) => {
        console.log(`Page loaded: ${JSON.stringify(data)}`);
    });
};
