import { ipcMain, BrowserWindow, session } from 'electron';
import { addHistoryEntry, getRecentHistory, clearHistory } from '../core/historyStoreMain';
import { addFeedback, clearFeedback } from '../core/feedbackStore';
import { getSettings, updateSettings } from '../core/settingsStoreMain';
import { getJarvisRecommendations, clearRecommendationCache } from '../core/recommender';
import { PageLoadedPayload, RecommendationFeedback, ArcSettings } from '../core/types';
import * as dataManager from '../core/dataManager';
import { addBookmark, removeBookmark, isBookmarked, getAllBookmarks, searchBookmarks } from '../core/bookmarkStoreMain';
import { loadSession, saveSession, clearSession, createSessionState, TabSession } from '../core/sessionManager';

// Cookie Management Types
interface GetCookiesFilter {
    url?: string;
    domain?: string;
    name?: string;
}

interface ClearCookiesResult {
    ok: boolean;
    cleared: number;
    error?: string;
}

// Cookie Manager Helper Functions
function getSessionForContext(incognito: boolean = false): Electron.Session {
    if (incognito) {
        // Return incognito session partition (non-persistent)
        return session.fromPartition('incognito', { cache: false });
    }
    // Return default session for normal browsing
    return session.defaultSession;
}

function constructCookieUrl(cookie: Electron.Cookie): string {
    const protocol = cookie.secure ? 'https' : 'http';
    const domain = cookie.domain && cookie.domain.startsWith('.') 
        ? cookie.domain.substring(1) 
        : (cookie.domain || 'localhost');
    return `${protocol}://${domain}${cookie.path}`;
}

async function getCookies(
    filter?: GetCookiesFilter,
    incognito: boolean = false
): Promise<Electron.Cookie[]> {
    const targetSession = getSessionForContext(incognito);
    const cookies = await targetSession.cookies.get(filter || {});
    return cookies;
}

async function clearAllCookies(
    incognito: boolean = false
): Promise<ClearCookiesResult> {
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
            } catch (removeError) {
                console.error('🍪 [Cookies] Failed to remove cookie:', cookie.name, removeError);
            }
        }
        
        console.log('🍪 [Cookies] Cleared', cleared, 'out of', cookies.length, 'cookies');
        return { ok: true, cleared };
    } catch (error) {
        console.error('🍪 [Cookies] Error in clearAllCookies:', error);
        return {
            ok: false,
            cleared: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

async function clearCookiesForUrl(
    url: string,
    incognito: boolean = false
): Promise<ClearCookiesResult> {
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
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
        } catch (urlError) {
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
    } catch (error) {
        return {
            ok: false,
            cleared: 0,
            error: error instanceof Error ? error.message : 'Cookie operation failed'
        };
    }
}


export const setupIpc = (mainWindow: BrowserWindow) => {
    ipcMain.on('arc:navigate', (event, url: string) => {
        console.log(`🔗 [IPC] arc:navigate called with URL: ${url}`);
        let targetUrl = url;
        if (!/^https?:\/\//i.test(url)) {
            targetUrl = `https://${url}`;
            console.log(`🔗 [IPC] Normalized URL to: ${targetUrl}`);
        }
        
        // Get the sender's webContents (the renderer that sent the message)
        const senderWebContents = event.sender;
        
        // Find the BrowserWindow that contains this webContents
        const window = BrowserWindow.fromWebContents(senderWebContents);
        
        if (window) {
            // Send navigation event to the renderer
            console.log(`🔗 [IPC] Sending navigate-to event to renderer`);
            window.webContents.send('navigate-to', targetUrl);
        } else {
            console.error('❌ Could not find window for navigation');
        }
    });

    ipcMain.on('arc:pageLoaded', async (event, data: PageLoadedPayload) => {
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
            
            await addHistoryEntry(data.url, data.title);
            console.log(`📚 History entry recorded for: ${data.url}`);
        } catch (err) {
            console.error('❌ Error in arc:pageLoaded handler:', err);
        }
    });

    ipcMain.handle('jarvis:getRecommendations', async (_event, limit?: number) => {
        try {
            console.log(`💡 [IPC] jarvis:getRecommendations called with limit: ${limit ?? 5}`);
            const recommendations = await getJarvisRecommendations(limit ?? 5);
            console.log(`💡 [IPC] Returning ${recommendations.length} recommendations`);
            return recommendations;
        } catch (err) {
            console.error('❌ Error in jarvis:getRecommendations handler:', err);
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

    // Jarvis chat handler
    ipcMain.handle('jarvis:chat', async (_event, messages: Array<{from: string; text: string}>) => {
        try {
            console.log('🔌 [IPC] jarvis:chat received:', messages.length, 'messages');
            
            // Get settings to check if Ollama is enabled
            const settings = await getSettings();
            
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
            const { getOllamaClient } = await import('../core/ollamaClient');
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
            const modelExists = status.models.some(m => 
                m.name === ollamaModel || 
                m.name.startsWith(ollamaModel.split(':')[0])
            );
            
            let effectiveModel = ollamaModel;
            if (!modelExists) {
                console.log('🔌 [IPC] Configured model not found, using first available');
                effectiveModel = status.models[0].name;
            }
            
            console.log('🔌 [IPC] Using model:', effectiveModel);
            
            // Get recent history and recommendations for context
            const recentHistory = await getRecentHistory(5);
            const recommendations = await getJarvisRecommendations(3);
            
            // Get the last user message
            const userMessage = messages[messages.length - 1]?.text || '';
            
            console.log('🔌 [IPC] Calling Ollama chat:', {
                model: effectiveModel,
                messageLength: userMessage.length,
                historyCount: recentHistory.length,
                recCount: recommendations.length
            });
            
            // Call Ollama
            const result = await ollamaClient.chatWithJarvis(
                userMessage,
                {
                    recentHistory: recentHistory.map(h => ({
                        url: h.url,
                        title: h.title || h.url
                    })),
                    recommendations: recommendations.map(r => ({
                        url: r.url,
                        title: r.title || r.url,
                        reason: r.reason
                    }))
                },
                effectiveModel
            );
            
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
        } catch (err) {
            console.error('❌ [IPC] Error in jarvis:chat:', {
                error: err instanceof Error ? err.message : String(err),
                type: err instanceof Error ? err.name : typeof err,
                stack: err instanceof Error ? err.stack : undefined
            });
            
            // Check if it's an OllamaError
            if (err && typeof err === 'object' && 'type' in err) {
                const ollamaError = err as any;
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
    ipcMain.handle('arc:getOllamaModels', async () => {
        try {
            console.log('🔌 [IPC] arc:getOllamaModels called');
            
            // Get settings to check Ollama endpoint
            const settings = await getSettings();
            const ollamaEndpoint = settings.ollamaEndpoint || 'http://localhost:11434';
            
            // Get Ollama client
            const { getOllamaClient } = await import('../core/ollamaClient');
            const ollamaClient = getOllamaClient(ollamaEndpoint);
            
            // Get installed models
            const models = await ollamaClient.getInstalledModels();
            
            console.log('🔌 [IPC] Returning', models.length, 'models');
            
            return {
                ok: true,
                models
            };
        } catch (err) {
            console.error('🔌 [IPC] Error in arc:getOllamaModels:', err);
            return {
                ok: false,
                models: [],
                error: err instanceof Error ? err.message : String(err)
            };
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
            const session = await loadSession();
            return { ok: true, session };
        } catch (err) {
            console.error('Error in arc:loadSession handler:', err);
            return { ok: false, session: null, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    ipcMain.handle('arc:saveSession', async (_event, tabs: TabSession[], activeTabId: string) => {
        try {
            const sessionState = createSessionState(tabs, activeTabId);
            await saveSession(sessionState);
            return { ok: true };
        } catch (err) {
            console.error('Error in arc:saveSession handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    ipcMain.handle('arc:clearSession', async () => {
        try {
            await clearSession();
            return { ok: true };
        } catch (err) {
            console.error('Error in arc:clearSession handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    ipcMain.handle('arc:restoreSession', async (_event, tabs: TabSession[]) => {
        try {
            // Restore session by creating new tabs with the provided data
            // This is handled by the renderer, we just acknowledge
            return { ok: true };
        } catch (err) {
            console.error('Error in arc:restoreSession handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    // Enhanced page content extraction handler
    ipcMain.handle('arc:getCurrentPageText', async (event) => {
        try {
            console.log('📄 [IPC] arc:getCurrentPageText called');
            
            // Get the sender's webContents (the renderer that sent the message)
            const senderWebContents = event.sender;
            
            // Find the BrowserWindow that contains this webContents
            const window = BrowserWindow.fromWebContents(senderWebContents);
            
            if (!window) {
                console.error('❌ Could not find window for page content extraction');
                return { ok: false, error: 'No active window found' };
            }
            
            // Enhanced content extraction script
            const CONTENT_EXTRACTION_SCRIPT = `
                (function() {
                    try {
                        // Remove unwanted elements
                        const unwantedSelectors = [
                            'script', 'style', 'nav', 'header', 'footer', 
                            '.advertisement', '.ad', '.ads', '.sidebar',
                            '.menu', '.navigation', '.breadcrumb', '.social-share',
                            '[role="banner"]', '[role="navigation"]', '[role="complementary"]'
                        ];
                        
                        const unwantedElements = document.querySelectorAll(unwantedSelectors.join(', '));
                        const tempContainer = document.createElement('div');
                        tempContainer.innerHTML = document.body.innerHTML;
                        
                        // Remove unwanted elements from temp container
                        unwantedSelectors.forEach(selector => {
                            const elements = tempContainer.querySelectorAll(selector);
                            elements.forEach(el => el.remove());
                        });
                        
                        // Extract main content
                        let mainContent = '';
                        const contentSelectors = [
                            'main', 'article', '[role="main"]', '.content', '.post-content',
                            '.entry-content', '.article-content', '.story-body', '.post-body'
                        ];
                        
                        let mainElement = null;
                        for (const selector of contentSelectors) {
                            mainElement = tempContainer.querySelector(selector);
                            if (mainElement) break;
                        }
                        
                        // If no main content area found, use the whole body
                        if (!mainElement) {
                            mainElement = tempContainer;
                        }
                        
                        // Extract text content
                        mainContent = mainElement.innerText || mainElement.textContent || '';
                        
                        // Clean up the text
                        mainContent = mainContent
                            .replace(/\\s+/g, ' ')  // Replace multiple whitespace with single space
                            .replace(/\\n\\s*\\n/g, '\\n\\n')  // Clean up line breaks
                            .trim();
                        
                        // Extract metadata
                        const images = document.querySelectorAll('img').length;
                        const videos = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length;
                        const links = document.querySelectorAll('a[href]').length;
                        const tables = document.querySelectorAll('table').length > 0;
                        const codeBlocks = document.querySelectorAll('pre, code, .highlight').length > 0;
                        
                        // Detect language (simple heuristic)
                        const lang = document.documentElement.lang || 
                                     document.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content') ||
                                     'en';
                        
                        return {
                            text: mainContent,
                            url: window.location.href,
                            title: document.title || '',
                            language: lang,
                            metadata: {
                                hasImages: images > 0,
                                hasVideos: videos > 0,
                                hasLinks: links,
                                hasTables: tables,
                                hasCode: codeBlocks
                            }
                        };
                    } catch (error) {
                        return {
                            text: document.body ? document.body.innerText.slice(0, 8000) : '',
                            url: window.location.href,
                            title: document.title || '',
                            language: 'en',
                            metadata: {
                                hasImages: false,
                                hasVideos: false,
                                hasLinks: 0,
                                hasTables: false,
                                hasCode: false
                            }
                        };
                    }
                })()
            `;
            
            // Execute enhanced JavaScript in the renderer to get the active webview content
            const result = await window.webContents.executeJavaScript(`
                (function() {
                    try {
                        // Find the active webview element
                        const webview = document.querySelector('webview');
                        if (!webview) {
                            return { ok: false, error: 'No active webview found' };
                        }
                        
                        // Execute enhanced content extraction in the webview
                        return new Promise((resolve) => {
                            try {
                                webview.executeJavaScript(\`${CONTENT_EXTRACTION_SCRIPT}\`).then((extractedData) => {
                                    if (!extractedData || !extractedData.text) {
                                        resolve({ ok: false, error: 'No content extracted' });
                                        return;
                                    }
                                    
                                    // Apply length limit and calculate metadata
                                    let text = extractedData.text.trim();
                                    const maxLength = 8000;
                                    const truncated = text.length > maxLength;
                                    
                                    if (truncated) {
                                        text = text.slice(0, maxLength);
                                        // Try to end at a sentence boundary
                                        const lastSentence = text.lastIndexOf('.');
                                        if (lastSentence > maxLength * 0.8) {
                                            text = text.slice(0, lastSentence + 1);
                                        }
                                    }
                                    
                                    // Calculate word count and reading time
                                    const wordCount = text.trim().split(/\\s+/).filter(word => word.length > 0).length;
                                    const readingTime = Math.ceil(wordCount / 225); // 225 words per minute
                                    
                                    // Extract domain
                                    let domain = 'unknown';
                                    try {
                                        domain = new URL(extractedData.url).hostname;
                                    } catch (e) {}
                                    
                                    resolve({ 
                                        ok: true, 
                                        text,
                                        url: extractedData.url,
                                        title: extractedData.title,
                                        truncated,
                                        extractedAt: Date.now(),
                                        wordCount,
                                        readingTime,
                                        language: extractedData.language,
                                        domain,
                                        metadata: extractedData.metadata
                                    });
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
            
            console.log('📄 [IPC] Enhanced page content extraction result:', {
                ok: result.ok,
                textLength: result.text ? result.text.length : 0,
                wordCount: result.wordCount || 0,
                readingTime: result.readingTime || 0,
                language: result.language,
                domain: result.domain,
                truncated: result.truncated,
                error: result.error
            });
            
            return result;
        } catch (err) {
            console.error('❌ [IPC] Error in arc:getCurrentPageText:', err);
            return { 
                ok: false, 
                error: err instanceof Error ? err.message : 'Unknown error' 
            };
        }
    });

    // Workspace management handlers
    ipcMain.handle('arc:listWorkspaces', async () => {
        try {
            const { listWorkspaces } = await import('../core/workspaceManager');
            const workspaces = await listWorkspaces();
            return { ok: true, workspaces };
        } catch (err) {
            console.error('Error in arc:listWorkspaces handler:', err);
            return { ok: false, workspaces: [], error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    ipcMain.handle('arc:saveWorkspace', async (_event, tabs: TabSession[], activeTabId: string, options: { name: string; description?: string; tags?: string[] }) => {
        try {
            const { saveWorkspaceFromCurrentSession } = await import('../core/workspaceManager');
            const workspaceId = await saveWorkspaceFromCurrentSession(tabs, activeTabId, options);
            return { ok: true, workspaceId };
        } catch (err) {
            console.error('Error in arc:saveWorkspace handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    ipcMain.handle('arc:loadWorkspace', async (_event, workspaceId: string) => {
        try {
            const { loadWorkspace } = await import('../core/workspaceManager');
            const sessionSnapshot = await loadWorkspace(workspaceId);
            return { ok: true, sessionSnapshot };
        } catch (err) {
            console.error('Error in arc:loadWorkspace handler:', err);
            return { ok: false, sessionSnapshot: null, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    ipcMain.handle('arc:deleteWorkspace', async (_event, workspaceId: string) => {
        try {
            const { deleteWorkspace } = await import('../core/workspaceManager');
            const success = await deleteWorkspace(workspaceId);
            return { ok: success };
        } catch (err) {
            console.error('Error in arc:deleteWorkspace handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    ipcMain.handle('arc:updateWorkspace', async (_event, workspaceId: string, options: { name?: string; description?: string; tags?: string[] }) => {
        try {
            const { updateWorkspace } = await import('../core/workspaceManager');
            const success = await updateWorkspace(workspaceId, options);
            return { ok: success };
        } catch (err) {
            console.error('Error in arc:updateWorkspace handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    ipcMain.handle('arc:updateWorkspaceSession', async (_event, workspaceId: string, tabs: TabSession[], activeTabId: string) => {
        try {
            const { updateWorkspaceSession } = await import('../core/workspaceManager');
            const success = await updateWorkspaceSession(workspaceId, tabs, activeTabId);
            return { ok: success };
        } catch (err) {
            console.error('Error in arc:updateWorkspaceSession handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    ipcMain.handle('arc:searchWorkspaces', async (_event, query: string) => {
        try {
            const { searchWorkspaces } = await import('../core/workspaceManager');
            const workspaces = await searchWorkspaces(query);
            return { ok: true, workspaces };
        } catch (err) {
            console.error('Error in arc:searchWorkspaces handler:', err);
            return { ok: false, workspaces: [], error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    ipcMain.handle('arc:getWorkspaceStats', async () => {
        try {
            const { getWorkspaceStats } = await import('../core/workspaceManager');
            const stats = await getWorkspaceStats();
            return { ok: true, stats };
        } catch (err) {
            console.error('Error in arc:getWorkspaceStats handler:', err);
            return { ok: false, stats: null, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    // Diagnostics handler
    ipcMain.handle('arc:getDiagnostics', async () => {
        try {
            const { getDiagnosticsSnapshot } = await import('../core/diagnosticsProvider');
            const diagnostics = await getDiagnosticsSnapshot();
            return { ok: true, diagnostics };
        } catch (err) {
            console.error('Error in arc:getDiagnostics handler:', err);
            return { ok: false, diagnostics: null, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    // Onboarding handlers
    ipcMain.handle('arc:isFirstRun', async () => {
        try {
            const { isFirstRun } = await import('../core/onboardingManager');
            const firstRun = await isFirstRun();
            return { ok: true, isFirstRun: firstRun };
        } catch (err) {
            console.error('Error in arc:isFirstRun handler:', err);
            return { ok: false, isFirstRun: true, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    ipcMain.handle('arc:markOnboardingCompleted', async () => {
        try {
            const { markOnboardingCompleted } = await import('../core/onboardingManager');
            await markOnboardingCompleted();
            return { ok: true };
        } catch (err) {
            console.error('Error in arc:markOnboardingCompleted handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    ipcMain.handle('arc:skipOnboarding', async () => {
        try {
            const { skipOnboarding } = await import('../core/onboardingManager');
            await skipOnboarding();
            return { ok: true };
        } catch (err) {
            console.error('Error in arc:skipOnboarding handler:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    ipcMain.handle('arc:createDemoWorkspace', async () => {
        try {
            const { createDemoWorkspace } = await import('../core/onboardingManager');
            const workspaceId = await createDemoWorkspace();
            return { ok: true, workspaceId };
        } catch (err) {
            console.error('Error in arc:createDemoWorkspace handler:', err);
            return { ok: false, workspaceId: null, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    // Cookie management handlers
    ipcMain.handle('arc:getCookies', async (_event, filter?: GetCookiesFilter) => {
        try {
            const cookies = await getCookies(filter);
            return { ok: true, cookies };
        } catch (err) {
            console.error('Error in arc:getCookies handler:', err);
            return { 
                ok: false, 
                cookies: [],
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    });

    ipcMain.handle('arc:clearCookies', async () => {
        try {
            console.log('🔌 [IPC] arc:clearCookies called');
            const result = await clearAllCookies();
            console.log('🔌 [IPC] clearCookies result:', result);
            return result;
        } catch (err) {
            console.error('🔌 [IPC] Error in arc:clearCookies handler:', err);
            return { 
                ok: false, 
                cleared: 0,
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    });

    ipcMain.handle('arc:clearCookiesForUrl', async (_event, url: string) => {
        try {
            const result = await clearCookiesForUrl(url);
            return result;
        } catch (err) {
            console.error('Error in arc:clearCookiesForUrl handler:', err);
            return { 
                ok: false, 
                cleared: 0,
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    });

    // Enhanced summarization handlers
    ipcMain.handle('arc:summarizePage', async (_event, options?: { type?: 'short' | 'bullets' | 'insights' | 'detailed'; includeKeywords?: boolean; includeTopics?: boolean }) => {
        try {
            console.log('📝 [IPC] arc:summarizePage called with options:', options);
            
            const { summarizeCurrentPage } = await import('../core/summarization');
            const summaryOptions = {
                type: options?.type || 'short' as const,
                includeKeywords: options?.includeKeywords,
                includeTopics: options?.includeTopics
            };
            const result = await summarizeCurrentPage(summaryOptions);
            
            console.log('📝 [IPC] Summarization result:', 'error' in result ? 'error' : 'success');
            
            return { ok: true, result };
        } catch (err) {
            console.error('❌ [IPC] Error in arc:summarizePage:', err);
            return { 
                ok: false, 
                error: err instanceof Error ? err.message : 'Unknown error',
                result: null
            };
        }
    });

    ipcMain.handle('arc:summarizeText', async (_event, text: string, metadata?: { title?: string; url?: string; language?: string }, options?: { type?: 'short' | 'bullets' | 'insights' | 'detailed'; includeKeywords?: boolean; includeTopics?: boolean }) => {
        try {
            console.log('📝 [IPC] arc:summarizeText called:', {
                textLength: text.length,
                hasMetadata: !!metadata,
                options
            });
            
            const { summarizeText } = await import('../core/summarization');
            const summaryOptions = {
                type: options?.type || 'short' as const,
                includeKeywords: options?.includeKeywords,
                includeTopics: options?.includeTopics
            };
            const result = await summarizeText(text, metadata || {}, summaryOptions);
            
            console.log('📝 [IPC] Text summarization result:', 'error' in result ? 'error' : 'success');
            
            return { ok: true, result };
        } catch (err) {
            console.error('❌ [IPC] Error in arc:summarizeText:', err);
            return { 
                ok: false, 
                error: err instanceof Error ? err.message : 'Unknown error',
                result: null
            };
        }
    });

    ipcMain.handle('arc:getSummaryTypes', async () => {
        try {
            const { getSummaryTypes } = await import('../core/summarization');
            const types = getSummaryTypes();
            return { ok: true, types };
        } catch (err) {
            console.error('❌ [IPC] Error in arc:getSummaryTypes:', err);
            return { ok: false, types: [], error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    ipcMain.handle('arc:clearSummaryCache', async () => {
        try {
            const { clearSummaryCache } = await import('../core/summarization');
            clearSummaryCache();
            return { ok: true };
        } catch (err) {
            console.error('❌ [IPC] Error in arc:clearSummaryCache:', err);
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    ipcMain.handle('arc:getSummaryCacheStats', async () => {
        try {
            const { getSummaryCacheStats } = await import('../core/summarization');
            const stats = getSummaryCacheStats();
            return { ok: true, stats };
        } catch (err) {
            console.error('❌ [IPC] Error in arc:getSummaryCacheStats:', err);
            return { ok: false, stats: null, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    // Reading list handlers
    ipcMain.handle('arc:addToReadingList', async (_event, url: string, title: string, options?: { autoSummarize?: boolean; tags?: string[]; addedFrom?: 'manual' | 'jarvis' | 'command-palette' }) => {
        try {
            console.log('📚 [IPC] arc:addToReadingList called:', { url, title, options });
            
            const { addToReadingList } = await import('../core/readingListStore');
            const result = await addToReadingList(url, title, options || {});
            
            console.log('📚 [IPC] Add to reading list result:', result.ok ? 'success' : 'failed');
            
            return result;
        } catch (err) {
            console.error('❌ [IPC] Error in arc:addToReadingList:', err);
            return { 
                ok: false, 
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    });

    ipcMain.handle('arc:removeFromReadingList', async (_event, id: string) => {
        try {
            console.log('📚 [IPC] arc:removeFromReadingList called:', id);
            
            const { removeFromReadingList } = await import('../core/readingListStore');
            const result = await removeFromReadingList(id);
            
            return result;
        } catch (err) {
            console.error('❌ [IPC] Error in arc:removeFromReadingList:', err);
            return { 
                ok: false, 
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    });

    ipcMain.handle('arc:updateReadingListItem', async (_event, id: string, updates: { isRead?: boolean; progress?: number; tags?: string[] }) => {
        try {
            console.log('📚 [IPC] arc:updateReadingListItem called:', { id, updates });
            
            const { updateReadingListItem } = await import('../core/readingListStore');
            const result = await updateReadingListItem(id, updates);
            
            return result;
        } catch (err) {
            console.error('❌ [IPC] Error in arc:updateReadingListItem:', err);
            return { 
                ok: false, 
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    });

    ipcMain.handle('arc:getReadingList', async (_event, filter?: { isRead?: boolean; tags?: string[]; domain?: string; dateRange?: { start: number; end: number }; minReadingTime?: number; maxReadingTime?: number }) => {
        try {
            console.log('📚 [IPC] arc:getReadingList called with filter:', filter);
            
            const { getReadingList } = await import('../core/readingListStore');
            const items = await getReadingList(filter);
            
            console.log('📚 [IPC] Returning', items.length, 'reading list items');
            
            return { ok: true, items };
        } catch (err) {
            console.error('❌ [IPC] Error in arc:getReadingList:', err);
            return { 
                ok: false, 
                items: [],
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    });

    ipcMain.handle('arc:getReadingListItem', async (_event, id: string) => {
        try {
            const { getReadingListItem } = await import('../core/readingListStore');
            const item = await getReadingListItem(id);
            
            return { ok: true, item };
        } catch (err) {
            console.error('❌ [IPC] Error in arc:getReadingListItem:', err);
            return { 
                ok: false, 
                item: null,
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    });

    ipcMain.handle('arc:searchReadingList', async (_event, query: string) => {
        try {
            console.log('📚 [IPC] arc:searchReadingList called:', query);
            
            const { searchReadingList } = await import('../core/readingListStore');
            const items = await searchReadingList(query);
            
            return { ok: true, items };
        } catch (err) {
            console.error('❌ [IPC] Error in arc:searchReadingList:', err);
            return { 
                ok: false, 
                items: [],
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    });

    ipcMain.handle('arc:getReadingListStats', async () => {
        try {
            const { getReadingListStats } = await import('../core/readingListStore');
            const stats = await getReadingListStats();
            
            return { ok: true, stats };
        } catch (err) {
            console.error('❌ [IPC] Error in arc:getReadingListStats:', err);
            return { 
                ok: false, 
                stats: null,
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    });

    ipcMain.handle('arc:clearReadingList', async () => {
        try {
            const { clearReadingList } = await import('../core/readingListStore');
            const result = await clearReadingList();
            
            return result;
        } catch (err) {
            console.error('❌ [IPC] Error in arc:clearReadingList:', err);
            return { 
                ok: false, 
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    });

    ipcMain.handle('arc:exportReadingList', async () => {
        try {
            const { exportReadingList } = await import('../core/readingListStore');
            const result = await exportReadingList();
            
            return result;
        } catch (err) {
            console.error('❌ [IPC] Error in arc:exportReadingList:', err);
            return { 
                ok: false, 
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    });

    ipcMain.handle('arc:importReadingList', async (_event, data: any, mode: 'merge' | 'replace' = 'merge') => {
        try {
            console.log('📚 [IPC] arc:importReadingList called in', mode, 'mode');
            
            const { importReadingList } = await import('../core/readingListStore');
            const result = await importReadingList(data, mode);
            
            return result;
        } catch (err) {
            console.error('❌ [IPC] Error in arc:importReadingList:', err);
            return { 
                ok: false, 
                imported: 0,
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    });

    // Translation handlers
    ipcMain.handle('arc:detectLanguage', async (_event, text: string) => {
        try {
            console.log('🌐 [IPC] arc:detectLanguage called for text length:', text.length);
            const { detectLanguage } = await import('../core/translation');
            const result = await detectLanguage(text);
            
            if ('error' in result) {
                return { ok: false, error: result.error, code: result.code };
            }
            
            return { ok: true, result };
        } catch (err) {
            console.error('❌ [IPC] Error in arc:detectLanguage:', err);
            return { 
                ok: false, 
                error: err instanceof Error ? err.message : 'Unknown error',
                code: 'LANGUAGE_DETECTION_FAILED'
            };
        }
    });

    ipcMain.handle('arc:translateText', async (_event, text: string, targetLanguage: string, sourceLanguage?: string) => {
        try {
            console.log('🌐 [IPC] arc:translateText called:', { 
                textLength: text.length, 
                from: sourceLanguage || 'auto', 
                to: targetLanguage 
            });
            const { translateText } = await import('../core/translation');
            const result = await translateText(text, targetLanguage, sourceLanguage);
            
            if ('error' in result) {
                return { ok: false, error: result.error, code: result.code };
            }
            
            return { ok: true, result };
        } catch (err) {
            console.error('❌ [IPC] Error in arc:translateText:', err);
            return { 
                ok: false, 
                error: err instanceof Error ? err.message : 'Unknown error',
                code: 'TRANSLATION_FAILED'
            };
        }
    });

    ipcMain.handle('arc:translatePageContent', async (_event, content: string, targetLanguage: string, sourceLanguage?: string, options?: { chunkSize?: number; preserveFormatting?: boolean }) => {
        try {
            console.log('🌐 [IPC] arc:translatePageContent called:', { 
                contentLength: content.length, 
                from: sourceLanguage || 'auto', 
                to: targetLanguage,
                options 
            });
            const { translatePageContent } = await import('../core/translation');
            const result = await translatePageContent(content, targetLanguage, sourceLanguage, options);
            
            if ('error' in result) {
                return { ok: false, error: result.error, code: result.code };
            }
            
            return { ok: true, result };
        } catch (err) {
            console.error('❌ [IPC] Error in arc:translatePageContent:', err);
            return { 
                ok: false, 
                error: err instanceof Error ? err.message : 'Unknown error',
                code: 'TRANSLATION_FAILED'
            };
        }
    });

    ipcMain.handle('arc:getSupportedLanguages', async () => {
        try {
            const { getAllSupportedLanguages, getPopularLanguages } = await import('../core/translation');
            const allLanguages = getAllSupportedLanguages();
            const popularLanguages = getPopularLanguages();
            
            return { 
                ok: true, 
                allLanguages, 
                popularLanguages 
            };
        } catch (err) {
            console.error('❌ [IPC] Error in arc:getSupportedLanguages:', err);
            return { 
                ok: false, 
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    });

    ipcMain.handle('arc:clearTranslationCache', async () => {
        try {
            console.log('🌐 [IPC] arc:clearTranslationCache called');
            const { clearTranslationCache } = await import('../core/translation');
            const result = clearTranslationCache();
            
            return { ok: true, cleared: result.cleared };
        } catch (err) {
            console.error('❌ [IPC] Error in arc:clearTranslationCache:', err);
            return { 
                ok: false, 
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    });

    ipcMain.handle('arc:getTranslationCacheStats', async () => {
        try {
            const { getTranslationCacheStats } = await import('../core/translation');
            const stats = getTranslationCacheStats();
            
            return { ok: true, stats };
        } catch (err) {
            console.error('❌ [IPC] Error in arc:getTranslationCacheStats:', err);
            return { 
                ok: false, 
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    });
};



