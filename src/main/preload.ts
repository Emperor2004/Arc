import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('arc', {
    navigate: (url: string) => ipcRenderer.send('arc:navigate', url),
    onNavigation: (callback: (event: any, url: string) => void) => {
        ipcRenderer.on('navigate-to', callback);
    },
    pageLoaded: (data: { url: string; title: string }) => ipcRenderer.send('arc:pageLoaded', data),
});


