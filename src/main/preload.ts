import { contextBridge, ipcRenderer } from 'electron';
import { PageLoadedPayload } from '../core/types';

contextBridge.exposeInMainWorld('arc', {
    navigate: (url: string) => ipcRenderer.send('arc:navigate', url),
    onNavigation: (callback: (event: any, url: string) => void) => {
        ipcRenderer.on('navigate-to', callback);
    },
    pageLoaded: (data: PageLoadedPayload) => ipcRenderer.send('arc:pageLoaded', data),
});



