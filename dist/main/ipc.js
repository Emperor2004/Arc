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
const historyStoreMain_1 = require("../core/historyStoreMain");
const feedbackStore_1 = require("../core/feedbackStore");
const settingsStoreMain_1 = require("../core/settingsStoreMain");
const recommender_1 = require("../core/recommender");
const dataManager = __importStar(require("../core/dataManager"));
const bookmarkStoreMain_1 = require("../core/bookmarkStoreMain");
const sessionManager_1 = require("../core/sessionManager");
// Cookie Manager Helper Functions
function getSessionForContext(incognito = false) {
    if (incognito) {
        // Return incognito session partition (non-persistent)
        return electron_1.session.fromPartition('incognito', { cache: false });
    }
    // Return default session for normal browsing
    return electron_1.session.defaultSession;
}
function constructCookieUrl(cookie) {
    const protocol = cookie.secure ? 'https' : 'http';
    const domain = cookie.domain && cookie.domain.startsWith('.')
        ? cookie.domain.substring(1)
        : (cookie.domain || 'localhost');
    return `${protocol}://${domain}${cookie.path}`;
}
async function getCookies(filter, incognito = false) {
    const targetSession = getSessionForContext(incognito);
    const cookies = await targetSession.cookies.get(filter || {});
    return cookies;
}
async function clearAllCookies(incognito = false) {
    try {
        console.log('🍪 [Cookies] clearAllCookies called, incognito:', incognito);
        const targetSession = getSessionForContext(incognito);
        const cookies = await targetSession.cookies.get({});
        console.log('🍪 [Cookies] Found', cookies.length, 'cookies to clear');
        let cleared = 0;
        for (const cookie of cookies) {
            const url = constructCookieUrl(cookie);
            console.log('🍪 [Cookies] Removing cookie:', cookie.name, 'from URL:', url);
            try {
                await targetSession.cookies.remove(url, cookie.name);
                cleared++;
                console.log('🍪 [Cookies] Successfully removed:', cookie.name);
            }
            catch (removeError) {
                console.error('🍪 [Cookies] Failed to remove cookie:', cookie.name, removeError);
            }
        }
        console.log('🍪 [Cookies] Cleared', cleared, 'out of', cookies.length, 'cookies');
        return { ok: true, cleared };
    }
    catch (error) {
        console.error('🍪 [Cookies] Error in clearAllCookies:', error);
        return {
            ok: false,
            cleared: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
async function clearCookiesForUrl(url, incognito = false) {
    try {
        // Validate URL format before processing
        if (!url || typeof url !== 'string' || url.trim() === '') {
            return {
                ok: false,
                cleared: 0,
                error: 'Invalid URL: URL must be a non-empty string'
            };
        }
        // Parse and validate URL structure
        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        }
        catch (urlError) {
            return {
                ok: false,
                cleared: 0,
                error: `Invalid URL format: ${urlError instanceof Error ? urlError.message : 'Malformed URL'}`
            };
        }
        const domain = parsedUrl.hostname;
        // Validate that we have a valid domain
        if (!domain) {
            return {
                ok: false,
                cleared: 0,
                error: 'Invalid URL: No hostname found in URL'
            };
        }
        const targetSession = getSessionForContext(incognito);
        // Get cookies matching the domain
        const cookies = await targetSession.cookies.get({ domain });
        for (const cookie of cookies) {
            const cookieUrl = constructCookieUrl(cookie);
            await targetSession.cookies.remove(cookieUrl, cookie.name);
        }
        return { ok: true, cleared: cookies.length };
    }
    catch (error) {
        return {
            ok: false,
            cleared: 0,
            error: error instanceof Error ? error.message : 'Cookie operation failed'
        };
    }
}
const setupIpc = (mainWindow) => {
    electron_1.ipcMain.on('arc:navigate', (event, url) => {
        console.log(`🔗 [IPC] arc:navigate called with URL: ${url}`);
        let targetUrl = url;
        if (!/^https?:\/\//i.test(url)) {
            targetUrl = `https://${url}`;
            console.log(`🔗 [IPC] Normalized URL to: ${targetUrl}`);
        }
        // Get the sender's webContents (the renderer that sent the message)
        const senderWebContents = event.sender;
        // Find the BrowserWindow that contains this webContents
        const window = electron_1.BrowserWindow.fromWebContents(senderWebContents);
        if (window) {
            // Send navigation event to the renderer
            console.log(`🔗 [IPC] Sending navigate-to event to renderer`);
            window.webContents.send('navigate-to', targetUrl);
        }
        else {
            console.error('❌ Could not find window for navigation');
        }
    });
    electron_1.ipcMain.on('arc:pageLoaded', async (event, data) => {
        try {
            // Validate payload
            if (!data || !data.url) {
                console.warn('⚠️ arc:pageLoaded received invalid payload');
                return;
            }
            console.log(`📄 [IPC] Page loaded: ${data.url} (${data.title || 'no title'})`);
            // Skip history recording for incognito tabs
            if (data.incognito) {
                console.log('🔒 Skipping history recording for incognito tab');
                return;
            }
            await (0, historyStoreMain_1.addHistoryEntry)(data.url, data.title);
            console.log(`📚 History entry recorded for: ${data.url}`);
        }
        catch (err) {
            console.error('❌ Error in arc:pageLoaded handler:', err);
        }
    });
    electron_1.ipcMain.handle('jarvis:getRecommendations', async (_event, limit) => {
        try {
            console.log(`💡 [IPC] jarvis:getRecommendations called with limit: ${limit ?? 5}`);
            const recommendations = await (0, recommender_1.getJarvisRecommendations)(limit ?? 5);
            console.log(`💡 [IPC] Returning ${recommendations.length} recommendations`);
            return recommendations;
        }
        catch (err) {
            console.error('❌ Error in jarvis:getRecommendations handler:', err);
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
    // Jarvis chat handler
    electron_1.ipcMain.handle('jarvis:chat', async (_event, messages) => {
        try {
            console.log('🔌 [IPC] jarvis:chat received:', messages.length, 'messages');
            // Get settings to check if Ollama is enabled
            const settings = await (0, settingsStoreMain_1.getSettings)();
            if (!settings.ollamaEnabled) {
                console.log('🔌 [IPC] Ollama disabled, returning fallback indicator');
                return {
                    ok: true,
                    reply: null,
                    useFallback: true
                };
            }
            // Get Ollama endpoint and model from settings
            const ollamaEndpoint = settings.ollamaEndpoint || 'http://localhost:11434';
            const ollamaModel = settings.ollamaModel || 'llama3:latest';
            console.log('🔌 [IPC] Settings:', { ollamaEnabled: settings.ollamaEnabled, endpoint: ollamaEndpoint, model: ollamaModel });
            // Get Ollama client
            const { getOllamaClient } = await Promise.resolve().then(() => __importStar(require('../core/ollamaClient')));
            const ollamaClient = getOllamaClient(ollamaEndpoint);
            // Check Ollama status
            console.log('🔌 [IPC] Checking Ollama status...');
            const status = await ollamaClient.getStatus();
            console.log('🔌 [IPC] Status check complete:', {
                available: status.available,
                hasModels: status.hasModels,
                modelCount: status.models.length,
                modelNames: status.models.map(m => m.name)
            });
            if (!status.available) {
                console.log('🔌 [IPC] Ollama server not available');
                return {
                    ok: true,
                    reply: 'Ollama is not running. Start it with: ollama serve',
                    useFallback: true
                };
            }
            if (!status.hasModels) {
                console.log('🔌 [IPC] Ollama has no models installed');
                return {
                    ok: true,
                    reply: 'Ollama has no models installed. Install one with: ollama pull llama3',
                    useFallback: true
                };
            }
            // Validate model exists and select appropriate model
            const modelExists = status.models.some(m => m.name === ollamaModel ||
                m.name.startsWith(ollamaModel.split(':')[0]));
            let effectiveModel = ollamaModel;
            if (!modelExists) {
                console.log('🔌 [IPC] Configured model not found, using first available');
                effectiveModel = status.models[0].name;
            }
            console.log('🔌 [IPC] Using model:', effectiveModel);
            // Get recent history and recommendations for context
            const recentHistory = await (0, historyStoreMain_1.getRecentHistory)(5);
            const recommendations = await (0, recommender_1.getJarvisRecommendations)(3);
            // Get the last user message
            const userMessage = messages[messages.length - 1]?.text || '';
            console.log('🔌 [IPC] Calling Ollama chat:', {
                model: effectiveModel,
                messageLength: userMessage.length,
                historyCount: recentHistory.length,
                recCount: recommendations.length
            });
            // Call Ollama
            const result = await ollamaClient.chatWithJarvis(userMessage, {
                recentHistory: recentHistory.map(h => ({
                    url: h.url,
                    title: h.title || h.url
                })),
                recommendations: recommendations.map(r => ({
                    url: r.url,
                    title: r.title || r.url,
                    reason: r.reason
                }))
            }, effectiveModel);
            console.log('🔌 [IPC] Ollama response received:', {
                length: result.reply.length,
                preview: result.reply.substring(0, 100) + (result.reply.length > 100 ? '...' : ''),
                usedModel: result.usedModel,
                hasFallbackNotice: !!result.fallbackNotice
            });
            // Prepend fallback notice to reply if present
            let finalReply = result.reply;
            if (result.fallbackNotice) {
                finalReply = `ℹ️ ${result.fallbackNotice}\n\n${result.reply}`;
            }
            return {
                ok: true,
                reply: finalReply,
                usedModel: result.usedModel,
                useFallback: false
            };
        }
        catch (err) {
            console.error('❌ [IPC] Error in jarvis:chat:', {
                error: err instanceof Error ? err.message : String(err),
                type: err instanceof Error ? err.name : typeof err,
                stack: err instanceof Error ? err.stack : undefined
            });
            // Check if it's an OllamaError
            if (err && typeof err === 'object' && 'type' in err) {
                const ollamaError = err;
                console.log('🔌 [IPC] Returning OllamaError as fallback:', ollamaError.message);
                return {
                    ok: true,
                    reply: ollamaError.message,
                    useFallback: true
                };
            }
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.log('🔌 [IPC] Returning generic error:', errorMessage);
            return {
                ok: false,
                error: errorMessage,
                useFallback: true
            };
        }
    });
    // Get Ollama models handler
    electron_1.ipcMain.handle('arc:getOllamaModels', async () => {
        try {
            console.log('🔌 [IPC] arc:getOllamaModels called');
            // Get settings to check Ollama endpoint
            const settings = await (0, settingsStoreMain_1.getSettings)();
            const ollamaEndpoint = settings.ollamaEndpoint || 'http://localhost:11434';
            // Get Ollama client
            const { getOllamaClient } = await Promise.resolve().then(() => __importStar(require('../core/ollamaClient')));
            const ollamaClient = getOllamaClient(ollamaEndpoint);
            // Get installed models
            const models = await ollamaClient.getInstalledModels();
            console.log('🔌 [IPC] Returning', models.length, 'models');
            return {
                ok: true,
                models
            };
        }
        catch (err) {
            console.error('🔌 [IPC] Error in arc:getOllamaModels:', err);
            return {
                ok: false,
                models: [],
                error: err instanceof Error ? err.message : String(err)
            };
        }
    });
    electron_1.ipcMain.handle('arc:getRecentHistory', async (_event, limit) => {
        try {
            return await (0, historyStoreMain_1.getRecentHistory)(limit ?? 50);
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
            return await (0, settingsStoreMain_1.getSettings)();
        }
        catch (err) {
            console.error('Error in arc:getSettings handler:', err);
            throw err;
        }
    });
    electron_1.ipcMain.handle('arc:updateSettings', async (_event, partial) => {
        try {
            return await (0, settingsStoreMain_1.updateSettings)(partial);
        }
        catch (err) {
            console.error('Error in arc:updateSettings handler:', err);
            throw err;
        }
    });
    electron_1.ipcMain.handle('arc:clearHistory', async () => {
        try {
            await (0, historyStoreMain_1.clearHistory)();
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
            await (0, bookmarkStoreMain_1.addBookmark)(url, title);
            return { ok: true };
        }
        catch (err) {
            console.error('Error in arc:addBookmark handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });
    electron_1.ipcMain.handle('arc:removeBookmark', async (_event, url) => {
        try {
            await (0, bookmarkStoreMain_1.removeBookmark)(url);
            return { ok: true };
        }
        catch (err) {
            console.error('Error in arc:removeBookmark handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });
    electron_1.ipcMain.handle('arc:isBookmarked', async (_event, url) => {
        try {
            const bookmarked = await (0, bookmarkStoreMain_1.isBookmarked)(url);
            return { ok: true, bookmarked };
        }
        catch (err) {
            console.error('Error in arc:isBookmarked handler:', err);
            return { ok: false, bookmarked: false };
        }
    });
    electron_1.ipcMain.handle('arc:getAllBookmarks', async () => {
        try {
            const bookmarks = await (0, bookmarkStoreMain_1.getAllBookmarks)();
            return { ok: true, bookmarks };
        }
        catch (err) {
            console.error('Error in arc:getAllBookmarks handler:', err);
            return { ok: false, bookmarks: [] };
        }
    });
    electron_1.ipcMain.handle('arc:searchBookmarks', async (_event, query) => {
        try {
            const results = await (0, bookmarkStoreMain_1.searchBookmarks)(query);
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
            const session = await (0, sessionManager_1.loadSession)();
            return { ok: true, session };
        }
        catch (err) {
            console.error('Error in arc:loadSession handler:', err);
            return { ok: false, session: null, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });
    electron_1.ipcMain.handle('arc:saveSession', async (_event, tabs, activeTabId) => {
        try {
            const sessionState = (0, sessionManager_1.createSessionState)(tabs, activeTabId);
            await (0, sessionManager_1.saveSession)(sessionState);
            return { ok: true };
        }
        catch (err) {
            console.error('Error in arc:saveSession handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });
    electron_1.ipcMain.handle('arc:clearSession', async () => {
        try {
            await (0, sessionManager_1.clearSession)();
            return { ok: true };
        }
        catch (err) {
            console.error('Error in arc:clearSession handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
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
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });
    // Page content extraction handler
    electron_1.ipcMain.handle('arc:getCurrentPageText', async (event) => {
        try {
            console.log('📄 [IPC] arc:getCurrentPageText called');
            // Get the sender's webContents (the renderer that sent the message)
            const senderWebContents = event.sender;
            // Find the BrowserWindow that contains this webContents
            const window = electron_1.BrowserWindow.fromWebContents(senderWebContents);
            if (!window) {
                console.error('❌ Could not find window for page content extraction');
                return { ok: false, error: 'No active window found' };
            }
            // Execute JavaScript in the renderer to get the active webview content
            const result = await window.webContents.executeJavaScript(`
                (function() {
                    try {
                        // Find the active webview element
                        const webview = document.querySelector('webview');
                        if (!webview) {
                            return { ok: false, error: 'No active webview found' };
                        }
                        
                        // Execute JavaScript in the webview to get page content
                        return new Promise((resolve) => {
                            try {
                                webview.executeJavaScript(\`
                                    (function() {
                                        try {
                                            const text = document.body ? document.body.innerText : '';
                                            return text.slice(0, 8000); // Limit to 8000 characters
                                        } catch (e) {
                                            return '';
                                        }
                                    })()
                                \`).then((text) => {
                                    resolve({ ok: true, text: text || '' });
                                }).catch((error) => {
                                    resolve({ ok: false, error: 'Failed to extract page content: ' + error.message });
                                });
                            } catch (error) {
                                resolve({ ok: false, error: 'Failed to execute script in webview: ' + error.message });
                            }
                        });
                    } catch (error) {
                        return { ok: false, error: 'Failed to access webview: ' + error.message };
                    }
                })()
            `);
            console.log('📄 [IPC] Page content extraction result:', {
                ok: result.ok,
                textLength: result.text ? result.text.length : 0,
                error: result.error
            });
            return result;
        }
        catch (err) {
            console.error('❌ [IPC] Error in arc:getCurrentPageText:', err);
            return {
                ok: false,
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    });
    // Workspace management handlers
    electron_1.ipcMain.handle('arc:listWorkspaces', async () => {
        try {
            const { listWorkspaces } = await Promise.resolve().then(() => __importStar(require('../core/workspaceManager')));
            const workspaces = await listWorkspaces();
            return { ok: true, workspaces };
        }
        catch (err) {
            console.error('Error in arc:listWorkspaces handler:', err);
            return { ok: false, workspaces: [], error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });
    electron_1.ipcMain.handle('arc:saveWorkspace', async (_event, tabs, activeTabId, options) => {
        try {
            const { saveWorkspaceFromCurrentSession } = await Promise.resolve().then(() => __importStar(require('../core/workspaceManager')));
            const workspaceId = await saveWorkspaceFromCurrentSession(tabs, activeTabId, options);
            return { ok: true, workspaceId };
        }
        catch (err) {
            console.error('Error in arc:saveWorkspace handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });
    electron_1.ipcMain.handle('arc:loadWorkspace', async (_event, workspaceId) => {
        try {
            const { loadWorkspace } = await Promise.resolve().then(() => __importStar(require('../core/workspaceManager')));
            const sessionSnapshot = await loadWorkspace(workspaceId);
            return { ok: true, sessionSnapshot };
        }
        catch (err) {
            console.error('Error in arc:loadWorkspace handler:', err);
            return { ok: false, sessionSnapshot: null, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });
    electron_1.ipcMain.handle('arc:deleteWorkspace', async (_event, workspaceId) => {
        try {
            const { deleteWorkspace } = await Promise.resolve().then(() => __importStar(require('../core/workspaceManager')));
            const success = await deleteWorkspace(workspaceId);
            return { ok: success };
        }
        catch (err) {
            console.error('Error in arc:deleteWorkspace handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });
    electron_1.ipcMain.handle('arc:updateWorkspace', async (_event, workspaceId, options) => {
        try {
            const { updateWorkspace } = await Promise.resolve().then(() => __importStar(require('../core/workspaceManager')));
            const success = await updateWorkspace(workspaceId, options);
            return { ok: success };
        }
        catch (err) {
            console.error('Error in arc:updateWorkspace handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });
    electron_1.ipcMain.handle('arc:updateWorkspaceSession', async (_event, workspaceId, tabs, activeTabId) => {
        try {
            const { updateWorkspaceSession } = await Promise.resolve().then(() => __importStar(require('../core/workspaceManager')));
            const success = await updateWorkspaceSession(workspaceId, tabs, activeTabId);
            return { ok: success };
        }
        catch (err) {
            console.error('Error in arc:updateWorkspaceSession handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });
    electron_1.ipcMain.handle('arc:searchWorkspaces', async (_event, query) => {
        try {
            const { searchWorkspaces } = await Promise.resolve().then(() => __importStar(require('../core/workspaceManager')));
            const workspaces = await searchWorkspaces(query);
            return { ok: true, workspaces };
        }
        catch (err) {
            console.error('Error in arc:searchWorkspaces handler:', err);
            return { ok: false, workspaces: [], error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });
    electron_1.ipcMain.handle('arc:getWorkspaceStats', async () => {
        try {
            const { getWorkspaceStats } = await Promise.resolve().then(() => __importStar(require('../core/workspaceManager')));
            const stats = await getWorkspaceStats();
            return { ok: true, stats };
        }
        catch (err) {
            console.error('Error in arc:getWorkspaceStats handler:', err);
            return { ok: false, stats: null, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });
    // Diagnostics handler
    electron_1.ipcMain.handle('arc:getDiagnostics', async () => {
        try {
            const { getDiagnosticsSnapshot } = await Promise.resolve().then(() => __importStar(require('../core/diagnosticsProvider')));
            const diagnostics = await getDiagnosticsSnapshot();
            return { ok: true, diagnostics };
        }
        catch (err) {
            console.error('Error in arc:getDiagnostics handler:', err);
            return { ok: false, diagnostics: null, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });
    // Onboarding handlers
    electron_1.ipcMain.handle('arc:isFirstRun', async () => {
        try {
            const { isFirstRun } = await Promise.resolve().then(() => __importStar(require('../core/onboardingManager')));
            const firstRun = await isFirstRun();
            return { ok: true, isFirstRun: firstRun };
        }
        catch (err) {
            console.error('Error in arc:isFirstRun handler:', err);
            return { ok: false, isFirstRun: true, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });
    electron_1.ipcMain.handle('arc:markOnboardingCompleted', async () => {
        try {
            const { markOnboardingCompleted } = await Promise.resolve().then(() => __importStar(require('../core/onboardingManager')));
            await markOnboardingCompleted();
            return { ok: true };
        }
        catch (err) {
            console.error('Error in arc:markOnboardingCompleted handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });
    electron_1.ipcMain.handle('arc:skipOnboarding', async () => {
        try {
            const { skipOnboarding } = await Promise.resolve().then(() => __importStar(require('../core/onboardingManager')));
            await skipOnboarding();
            return { ok: true };
        }
        catch (err) {
            console.error('Error in arc:skipOnboarding handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });
    electron_1.ipcMain.handle('arc:createDemoWorkspace', async () => {
        try {
            const { createDemoWorkspace } = await Promise.resolve().then(() => __importStar(require('../core/onboardingManager')));
            const workspaceId = await createDemoWorkspace();
            return { ok: true, workspaceId };
        }
        catch (err) {
            console.error('Error in arc:createDemoWorkspace handler:', err);
            return { ok: false, workspaceId: null, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });
    // Cookie management handlers
    electron_1.ipcMain.handle('arc:getCookies', async (_event, filter) => {
        try {
            const cookies = await getCookies(filter);
            return { ok: true, cookies };
        }
        catch (err) {
            console.error('Error in arc:getCookies handler:', err);
            return {
                ok: false,
                cookies: [],
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    });
    electron_1.ipcMain.handle('arc:clearCookies', async () => {
        try {
            console.log('🔌 [IPC] arc:clearCookies called');
            const result = await clearAllCookies();
            console.log('🔌 [IPC] clearCookies result:', result);
            return result;
        }
        catch (err) {
            console.error('🔌 [IPC] Error in arc:clearCookies handler:', err);
            return {
                ok: false,
                cleared: 0,
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    });
    electron_1.ipcMain.handle('arc:clearCookiesForUrl', async (_event, url) => {
        try {
            const result = await clearCookiesForUrl(url);
            return result;
        }
        catch (err) {
            console.error('Error in arc:clearCookiesForUrl handler:', err);
            return {
                ok: false,
                cleared: 0,
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    });
};
exports.setupIpc = setupIpc;
