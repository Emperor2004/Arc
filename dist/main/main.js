"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = require("path");
const ipc_1 = require("./ipc");
const DatabaseManager_1 = require("../core/database/DatabaseManager");
let mainWindow = null;
// Initialize database on app start
async function initializeDatabase() {
    try {
        console.log('Starting database initialization...');
        console.log('Database path:', DatabaseManager_1.DEFAULT_CONFIG.path);
        const dbManager = DatabaseManager_1.DatabaseManager.getInstance(DatabaseManager_1.DEFAULT_CONFIG);
        await dbManager.initialize();
        console.log('✅ Database initialized successfully');
        console.log('Database ready:', dbManager.isReady());
        return dbManager;
    }
    catch (error) {
        console.error('❌ CRITICAL: Failed to initialize database:', error);
        console.error('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            config: DatabaseManager_1.DEFAULT_CONFIG
        });
        throw error; // Re-throw to prevent app from continuing with broken database
    }
}
const createWindow = () => {
    console.log('Creating main window...');
    const isDevelopment = process.env.NODE_ENV === 'development';
    mainWindow = new electron_1.BrowserWindow({
        title: 'Arc',
        width: 1200,
        height: 800,
        show: true, // Explicitly show the window
        webPreferences: {
            preload: (0, path_1.join)(__dirname, 'preload.js'),
            webviewTag: true,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: !isDevelopment, // Enable sandbox in production for security
            devTools: isDevelopment, // Only enable dev tools in development
            webSecurity: true, // Always enable web security for proper authentication
            allowRunningInsecureContent: false,
            experimentalFeatures: true,
        },
    });
    console.log('Window created, setting up IPC...');
    (0, ipc_1.setupIpc)(mainWindow);
    // Set up session permissions for authentication
    const { session } = mainWindow.webContents;
    // Allow all permission requests for webviews (needed for OAuth flows)
    session.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowedPermissions = [
            'media',
            'geolocation',
            'notifications',
            'midiSysex',
            'pointerLock',
            'fullscreen',
            'openExternal',
        ];
        if (allowedPermissions.includes(permission)) {
            callback(true);
        }
        else {
            callback(false);
        }
    });
    // Enable third-party cookies for authentication
    session.webRequest.onBeforeSendHeaders((details, callback) => {
        callback({ requestHeaders: details.requestHeaders });
    });
    console.log('Loading URL...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('__dirname:', __dirname);
    // Always try to load from development server first when in dev mode
    console.log('Loading development URL: http://localhost:3000/index.html');
    mainWindow.loadURL('http://localhost:3000/index.html').catch((error) => {
        console.log('Failed to load development URL, falling back to production:', error);
        const htmlPath = (0, path_1.join)(__dirname, '../renderer/index.html');
        console.log('Loading production file:', htmlPath);
        if (mainWindow) {
            mainWindow.loadFile(htmlPath);
        }
    });
    // Add debugging for window events
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('Window finished loading');
        // Open dev tools only in development mode
        if (isDevelopment) {
            mainWindow?.webContents.openDevTools();
        }
    });
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error('Window failed to load:', errorCode, errorDescription, validatedURL);
    });
    mainWindow.webContents.on('dom-ready', () => {
        console.log('DOM ready');
    });
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`Console [${level}]: ${message} (${sourceId}:${line})`);
    });
    mainWindow.on('ready-to-show', () => {
        console.log('Window ready to show');
        mainWindow?.show();
    });
    // Handle window closed
    mainWindow.on('closed', () => {
        console.log('Window closed');
        mainWindow = null;
    });
};
electron_1.app.whenReady().then(async () => {
    console.log('Electron app ready, initializing database...');
    try {
        const dbManager = await initializeDatabase();
        console.log('Database initialization complete, status:', {
            ready: dbManager.isReady(),
            config: DatabaseManager_1.DEFAULT_CONFIG
        });
    }
    catch (error) {
        console.error('FATAL: Database initialization failed, app may not function correctly');
    }
    console.log('Creating window...');
    createWindow();
    electron_1.app.on('activate', () => {
        console.log('App activated');
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    console.log('All windows closed');
    if (process.platform !== 'darwin') {
        // Close database before quitting
        const dbManager = DatabaseManager_1.DatabaseManager.getInstance();
        dbManager.close().then(() => {
            electron_1.app.quit();
        }).catch(err => {
            console.error('Error closing database:', err);
            electron_1.app.quit();
        });
    }
});
// Handle app quit
electron_1.app.on('before-quit', async () => {
    console.log('App quitting, closing database...');
    const dbManager = DatabaseManager_1.DatabaseManager.getInstance();
    await dbManager.close();
});
console.log('Electron main process started');
