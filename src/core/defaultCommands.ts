/**
 * Default commands for Arc Browser Command Palette
 * Wires basic browser functionality to the command registry
 */

import { Command, getCommandRegistry } from './commandRegistry';

// Import global types to access window.arc
declare global {
  interface Window {
    arc: import('../renderer/types/global').ArcAPI;
  }
}

/**
 * Initialize and register all default commands
 */
export function initializeDefaultCommands(): void {
  const registry = getCommandRegistry();

  // Tab commands
  registry.registerCommand({
    id: 'tab:new',
    title: 'New Tab',
    description: 'Open a new tab',
    category: 'tab',
    keywords: ['new', 'tab', 'open'],
    run: () => {
      if (window.arc && window.arc.newTab) {
        window.arc.newTab();
      }
    }
  });

  registry.registerCommand({
    id: 'tab:close',
    title: 'Close Tab',
    description: 'Close the current tab',
    category: 'tab',
    keywords: ['close', 'tab', 'exit'],
    run: () => {
      if (window.arc && window.arc.closeTab) {
        window.arc.closeTab();
      }
    }
  });

  registry.registerCommand({
    id: 'tab:switch-next',
    title: 'Next Tab',
    description: 'Switch to the next tab',
    category: 'tab',
    keywords: ['next', 'tab', 'switch', 'forward'],
    run: () => {
      if (window.arc && window.arc.nextTab) {
        window.arc.nextTab();
      }
    }
  });

  registry.registerCommand({
    id: 'tab:switch-prev',
    title: 'Previous Tab',
    description: 'Switch to the previous tab',
    category: 'tab',
    keywords: ['previous', 'tab', 'switch', 'back'],
    run: () => {
      if (window.arc && window.arc.previousTab) {
        window.arc.previousTab();
      }
    }
  });

  // Jarvis commands
  registry.registerCommand({
    id: 'jarvis:focus',
    title: 'Focus Jarvis',
    description: 'Focus the Jarvis chat input',
    category: 'jarvis',
    keywords: ['jarvis', 'focus', 'chat', 'ai'],
    run: () => {
      // Focus Jarvis chat input
      const jarvisInput = document.querySelector('#jarvis-input') as HTMLTextAreaElement;
      if (jarvisInput) {
        jarvisInput.focus();
      }
    }
  });

  registry.registerCommand({
    id: 'jarvis:analyze-page',
    title: 'Analyze Current Page',
    description: 'Get AI analysis of the current page content',
    category: 'jarvis',
    keywords: ['jarvis', 'analyze', 'page', 'ai', 'analysis'],
    run: async () => {
      try {
        const { executeJarvisAction } = await import('./jarvisActions');
        const result = await executeJarvisAction('analyze');
        
        // Trigger a custom event to add the message to Jarvis chat
        const event = new CustomEvent('arc:jarvis-message', { 
          detail: { 
            message: {
              from: 'jarvis',
              text: result
            }
          } 
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Failed to analyze page:', error);
      }
    }
  });

  registry.registerCommand({
    id: 'jarvis:summarize-page',
    title: 'Summarize Current Page',
    description: 'Get AI summary of the current page content',
    category: 'jarvis',
    keywords: ['jarvis', 'summarize', 'page', 'ai', 'summary'],
    run: async () => {
      try {
        const { executeJarvisAction } = await import('./jarvisActions');
        const result = await executeJarvisAction('summarize');
        
        // Trigger a custom event to add the message to Jarvis chat
        const event = new CustomEvent('arc:jarvis-message', { 
          detail: { 
            message: {
              from: 'jarvis',
              text: result
            }
          } 
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Failed to summarize page:', error);
      }
    }
  });

  registry.registerCommand({
    id: 'jarvis:explain-page',
    title: 'Explain Current Page',
    description: 'Get simple AI explanation of the current page content',
    category: 'jarvis',
    keywords: ['jarvis', 'explain', 'page', 'ai', 'simple'],
    run: async () => {
      try {
        const { executeJarvisAction } = await import('./jarvisActions');
        const result = await executeJarvisAction('explain');
        
        // Trigger a custom event to add the message to Jarvis chat
        const event = new CustomEvent('arc:jarvis-message', { 
          detail: { 
            message: {
              from: 'jarvis',
              text: result
            }
          } 
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Failed to explain page:', error);
      }
    }
  });

  // Workspace commands
  registry.registerCommand({
    id: 'workspace:save',
    title: 'Save Current Session as Workspace',
    description: 'Save all current tabs as a new workspace',
    category: 'workspace',
    keywords: ['workspace', 'save', 'session', 'tabs'],
    run: async () => {
      try {
        // Get current tabs from the browser shell
        const event = new CustomEvent('arc:get-current-tabs');
        window.dispatchEvent(event);
        
        // For now, we'll use a simple prompt for the workspace name
        // In a full implementation, this would open a proper dialog
        const workspaceName = prompt('Enter workspace name:');
        if (!workspaceName) return;
        
        // This is a placeholder - in the full implementation, we'd get actual tab data
        console.log('Save workspace command triggered:', workspaceName);
        
        // Trigger workspace save dialog
        const saveEvent = new CustomEvent('arc:workspace-save', { 
          detail: { name: workspaceName } 
        });
        window.dispatchEvent(saveEvent);
      } catch (error) {
        console.error('Failed to save workspace:', error);
      }
    }
  });

  registry.registerCommand({
    id: 'workspace:switch',
    title: 'Switch to Workspace',
    description: 'Switch to a different workspace',
    category: 'workspace',
    keywords: ['workspace', 'switch', 'load', 'open'],
    run: async () => {
      try {
        // Trigger workspace selection dialog
        const event = new CustomEvent('arc:workspace-switch');
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Failed to switch workspace:', error);
      }
    }
  });

  registry.registerCommand({
    id: 'workspace:list',
    title: 'List Workspaces',
    description: 'Show all available workspaces',
    category: 'workspace',
    keywords: ['workspace', 'list', 'show', 'all'],
    run: async () => {
      try {
        if (window.arc && window.arc.listWorkspaces) {
          const result = await window.arc.listWorkspaces();
          if (result.ok) {
            console.log('Available workspaces:', result.workspaces);
            // In a full implementation, this would show a proper list UI
            alert(`Found ${result.workspaces.length} workspaces:\n${result.workspaces.map(w => `- ${w.name}`).join('\n')}`);
          }
        }
      } catch (error) {
        console.error('Failed to list workspaces:', error);
      }
    }
  });

  registry.registerCommand({
    id: 'workspace:delete',
    title: 'Delete Workspace',
    description: 'Delete an existing workspace',
    category: 'workspace',
    keywords: ['workspace', 'delete', 'remove'],
    run: async () => {
      try {
        // Trigger workspace deletion dialog
        const event = new CustomEvent('arc:workspace-delete');
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Failed to delete workspace:', error);
      }
    }
  });

  // Diagnostics command
  registry.registerCommand({
    id: 'diagnostics:open',
    title: 'Open System Diagnostics',
    description: 'View system health and troubleshooting information',
    category: 'system',
    keywords: ['diagnostics', 'system', 'health', 'status', 'troubleshoot'],
    run: () => {
      // Trigger diagnostics panel
      const event = new CustomEvent('arc:diagnostics-open');
      window.dispatchEvent(event);
    }
  });

  // System commands
  registry.registerCommand({
    id: 'settings:open',
    title: 'Open Settings',
    description: 'Open the settings panel',
    category: 'system',
    keywords: ['settings', 'preferences', 'config', 'options'],
    run: () => {
      // Trigger settings section change
      const event = new CustomEvent('arc:navigate-to-section', { 
        detail: { section: 'settings' } 
      });
      window.dispatchEvent(event);
    }
  });

  registry.registerCommand({
    id: 'history:search',
    title: 'Search History',
    description: 'Search through browsing history',
    category: 'system',
    keywords: ['history', 'search', 'browse', 'past'],
    run: async () => {
      try {
        if (window.arc && window.arc.getRecentHistory) {
          const history = await window.arc.getRecentHistory(50);
          console.log('Recent history:', history);
          // For now, just log the history. In a full implementation,
          // this would open a history search dialog
        }
      } catch (error) {
        console.error('Failed to search history:', error);
      }
    }
  });

  registry.registerCommand({
    id: 'session:restore',
    title: 'Restore Session',
    description: 'Restore the previous browsing session',
    category: 'system',
    keywords: ['session', 'restore', 'recover', 'tabs'],
    run: async () => {
      try {
        if (window.arc && window.arc.loadSession) {
          const result = await window.arc.loadSession();
          if (result && result.ok && result.session) {
            // Trigger session restore
            const event = new CustomEvent('arc:restore-session', { 
              detail: { session: result.session } 
            });
            window.dispatchEvent(event);
          }
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
      }
    }
  });

  // Demo workspace command
  registry.registerCommand({
    id: 'demo:open-workspace',
    title: 'Open Demo Workspace',
    description: 'Create and open a demo workspace with sample content',
    category: 'workspace',
    keywords: ['demo', 'workspace', 'example', 'tutorial'],
    run: async () => {
      try {
        if (window.arc && window.arc.createDemoWorkspace) {
          const result = await window.arc.createDemoWorkspace();
          if (result.ok && result.workspaceId) {
            // Switch to the demo workspace
            const switchEvent = new CustomEvent('arc:workspace-switch-to', { 
              detail: { workspaceId: result.workspaceId } 
            });
            window.dispatchEvent(switchEvent);
          }
        }
      } catch (error) {
        console.error('Failed to create demo workspace:', error);
      }
    }
  });

  // Bookmark commands
  registry.registerCommand({
    id: 'bookmark:add',
    title: 'Add Bookmark',
    description: 'Bookmark the current page',
    category: 'bookmark',
    keywords: ['bookmark', 'add', 'save', 'favorite'],
    run: async () => {
      try {
        if (window.arc && window.arc.getCurrentTab) {
          const currentTab = await window.arc.getCurrentTab();
          if (currentTab) {
            const { addBookmark, isBookmarked } = await import('./bookmarkStore');
            const alreadyBookmarked = await isBookmarked(currentTab.url);
            
            if (!alreadyBookmarked) {
              await addBookmark(currentTab.url, currentTab.title || currentTab.url);
              
              // Show success notification
              const event = new CustomEvent('arc:notification', {
                detail: {
                  type: 'success',
                  message: 'Page bookmarked successfully!'
                }
              });
              window.dispatchEvent(event);
            } else {
              // Show info notification
              const event = new CustomEvent('arc:notification', {
                detail: {
                  type: 'info',
                  message: 'Page is already bookmarked'
                }
              });
              window.dispatchEvent(event);
            }
          }
        }
      } catch (error) {
        console.error('Failed to add bookmark:', error);
        const event = new CustomEvent('arc:notification', {
          detail: {
            type: 'error',
            message: 'Failed to add bookmark'
          }
        });
        window.dispatchEvent(event);
      }
    }
  });

  registry.registerCommand({
    id: 'bookmark:organize',
    title: 'Smart Organize Bookmarks',
    description: 'Use AI to organize bookmarks into folders',
    category: 'bookmark',
    keywords: ['bookmark', 'organize', 'ai', 'smart', 'folders'],
    run: async () => {
      try {
        // Trigger bookmarks panel with organize action
        const event = new CustomEvent('arc:bookmarks-organize');
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Failed to organize bookmarks:', error);
      }
    }
  });

  registry.registerCommand({
    id: 'bookmark:search',
    title: 'Search Bookmarks',
    description: 'Search through your bookmarks',
    category: 'bookmark',
    keywords: ['bookmark', 'search', 'find', 'filter'],
    run: async () => {
      try {
        // Trigger bookmarks panel with search focus
        const event = new CustomEvent('arc:bookmarks-search');
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Failed to search bookmarks:', error);
      }
    }
  });

  registry.registerCommand({
    id: 'bookmark:open-panel',
    title: 'Open Bookmarks Panel',
    description: 'Open the bookmarks management panel',
    category: 'bookmark',
    keywords: ['bookmark', 'panel', 'open', 'manage'],
    run: () => {
      // Trigger bookmarks panel
      const event = new CustomEvent('arc:bookmarks-open');
      window.dispatchEvent(event);
    }
  });

  registry.registerCommand({
    id: 'bookmark:remove-current',
    title: 'Remove Current Bookmark',
    description: 'Remove bookmark for the current page',
    category: 'bookmark',
    keywords: ['bookmark', 'remove', 'delete', 'unbookmark'],
    run: async () => {
      try {
        if (window.arc && window.arc.getCurrentTab) {
          const currentTab = await window.arc.getCurrentTab();
          if (currentTab) {
            const { removeBookmark, getAllBookmarks } = await import('./bookmarkStore');
            const bookmarks = await getAllBookmarks();
            const bookmark = bookmarks.find(b => b.url === currentTab.url);
            
            if (bookmark) {
              await removeBookmark(bookmark.id);
              
              // Show success notification
              const event = new CustomEvent('arc:notification', {
                detail: {
                  type: 'success',
                  message: 'Bookmark removed successfully!'
                }
              });
              window.dispatchEvent(event);
            } else {
              // Show info notification
              const event = new CustomEvent('arc:notification', {
                detail: {
                  type: 'info',
                  message: 'Page is not bookmarked'
                }
              });
              window.dispatchEvent(event);
            }
          }
        }
      } catch (error) {
        console.error('Failed to remove bookmark:', error);
        const event = new CustomEvent('arc:notification', {
          detail: {
            type: 'error',
            message: 'Failed to remove bookmark'
          }
        });
        window.dispatchEvent(event);
      }
    }
  });

  // Reading List commands
  registry.registerCommand({
    id: 'reading-list:add-current',
    title: 'Save to Reading List',
    description: 'Save the current page to your reading list',
    category: 'reading-list',
    keywords: ['reading', 'list', 'save', 'article', 'read', 'later'],
    run: async () => {
      try {
        const currentTab = await window.arc.getCurrentTab();
        if (!currentTab) {
          throw new Error('No active tab found');
        }

        const result = await window.arc.addToReadingList(currentTab.url, currentTab.title, {
          autoSummarize: false,
          addedFrom: 'command-palette'
        });

        if (result.ok) {
          const event = new CustomEvent('arc:notification', {
            detail: {
              type: 'success',
              message: 'Article saved to reading list!'
            }
          });
          window.dispatchEvent(event);
        } else {
          throw new Error(result.error || 'Failed to save article');
        }
      } catch (error) {
        console.error('Failed to save to reading list:', error);
        const event = new CustomEvent('arc:notification', {
          detail: {
            type: 'error',
            message: 'Failed to save to reading list'
          }
        });
        window.dispatchEvent(event);
      }
    }
  });

  registry.registerCommand({
    id: 'reading-list:add-current-with-summary',
    title: 'Save to Reading List with Summary',
    description: 'Save the current page to your reading list with AI-generated summary',
    category: 'reading-list',
    keywords: ['reading', 'list', 'save', 'article', 'summary', 'ai', 'summarize'],
    run: async () => {
      try {
        const currentTab = await window.arc.getCurrentTab();
        if (!currentTab) {
          throw new Error('No active tab found');
        }

        const result = await window.arc.addToReadingList(currentTab.url, currentTab.title, {
          autoSummarize: true,
          addedFrom: 'command-palette'
        });

        if (result.ok) {
          const event = new CustomEvent('arc:notification', {
            detail: {
              type: 'success',
              message: 'Article saved to reading list with AI summary!'
            }
          });
          window.dispatchEvent(event);
        } else {
          throw new Error(result.error || 'Failed to save article');
        }
      } catch (error) {
        console.error('Failed to save to reading list with summary:', error);
        const event = new CustomEvent('arc:notification', {
          detail: {
            type: 'error',
            message: 'Failed to save to reading list with summary'
          }
        });
        window.dispatchEvent(event);
      }
    }
  });

  registry.registerCommand({
    id: 'reading-list:open-panel',
    title: 'Open Reading List',
    description: 'Open the reading list panel to view saved articles',
    category: 'reading-list',
    keywords: ['reading', 'list', 'open', 'panel', 'articles', 'saved'],
    run: () => {
      // Trigger reading list panel
      const event = new CustomEvent('arc:reading-list-open');
      window.dispatchEvent(event);
    }
  });

  registry.registerCommand({
    id: 'reading-list:search',
    title: 'Search Reading List',
    description: 'Search through your saved articles',
    category: 'reading-list',
    keywords: ['reading', 'list', 'search', 'find', 'articles'],
    run: () => {
      // Trigger reading list panel with search focus
      const event = new CustomEvent('arc:reading-list-search');
      window.dispatchEvent(event);
    }
  });

  // Translation commands
  registry.registerCommand({
    id: 'translation:detect-language',
    title: 'Detect Page Language',
    description: 'Detect the language of the current page',
    category: 'translation',
    keywords: ['translate', 'language', 'detect', 'identify'],
    run: async () => {
      try {
        const pageResult = await window.arc.getCurrentPageText();
        if (!pageResult.ok || !pageResult.text) {
          throw new Error('Could not get page content');
        }

        const detectionResult = await window.arc.detectLanguage(pageResult.text);
        if (!detectionResult.ok) {
          throw new Error(detectionResult.error || 'Language detection failed');
        }

        const detectedLang = detectionResult.result?.language || 'unknown';
        const confidence = Math.round((detectionResult.result?.confidence || 0) * 100);
        
        const langName = detectedLang === 'en' ? 'English' : 
                        detectedLang === 'es' ? 'Spanish' :
                        detectedLang === 'fr' ? 'French' :
                        detectedLang === 'de' ? 'German' :
                        detectedLang === 'it' ? 'Italian' :
                        detectedLang === 'pt' ? 'Portuguese' :
                        detectedLang === 'ru' ? 'Russian' :
                        detectedLang === 'ja' ? 'Japanese' :
                        detectedLang === 'ko' ? 'Korean' :
                        detectedLang === 'zh' ? 'Chinese' :
                        detectedLang;

        const event = new CustomEvent('arc:notification', {
          detail: {
            type: 'success',
            message: `Language detected: ${langName} (${confidence}% confidence)`
          }
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Failed to detect language:', error);
        const event = new CustomEvent('arc:notification', {
          detail: {
            type: 'error',
            message: 'Failed to detect page language'
          }
        });
        window.dispatchEvent(event);
      }
    }
  });

  registry.registerCommand({
    id: 'translation:translate-to-english',
    title: 'Translate Page to English',
    description: 'Translate the current page to English',
    category: 'translation',
    keywords: ['translate', 'english', 'page', 'convert'],
    run: async () => {
      try {
        const pageResult = await window.arc.getCurrentPageText();
        if (!pageResult.ok || !pageResult.text) {
          throw new Error('Could not get page content');
        }

        const translationResult = await window.arc.translatePageContent(
          pageResult.text,
          'en',
          undefined,
          { chunkSize: 2000, preserveFormatting: true }
        );

        if (!translationResult.ok) {
          throw new Error(translationResult.error || 'Translation failed');
        }

        // Trigger Jarvis message with translation result
        const result = translationResult.result;
        const sourceLangName = result.sourceLanguage === 'es' ? 'Spanish' :
                             result.sourceLanguage === 'fr' ? 'French' :
                             result.sourceLanguage === 'de' ? 'German' :
                             result.sourceLanguage === 'it' ? 'Italian' :
                             result.sourceLanguage === 'pt' ? 'Portuguese' :
                             result.sourceLanguage === 'ru' ? 'Russian' :
                             result.sourceLanguage === 'ja' ? 'Japanese' :
                             result.sourceLanguage === 'ko' ? 'Korean' :
                             result.sourceLanguage === 'zh' ? 'Chinese' :
                             result.sourceLanguage;

        const event = new CustomEvent('arc:jarvis-message', { 
          detail: { 
            message: {
              from: 'jarvis',
              text: `🌐 **Page Translated to English**\n\n**From:** ${sourceLangName} (${result.sourceLanguage})\n**Confidence:** ${Math.round(result.confidence * 100)}%\n**Translation Time:** ${result.translationTime}ms\n\n**Translation:**\n\n${result.translatedText.substring(0, 1000)}${result.translatedText.length > 1000 ? '...\n\n*[Translation truncated for display]*' : ''}`
            }
          } 
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Failed to translate page:', error);
        const event = new CustomEvent('arc:notification', {
          detail: {
            type: 'error',
            message: 'Failed to translate page to English'
          }
        });
        window.dispatchEvent(event);
      }
    }
  });

  registry.registerCommand({
    id: 'translation:translate-to-spanish',
    title: 'Translate Page to Spanish',
    description: 'Translate the current page to Spanish',
    category: 'translation',
    keywords: ['translate', 'spanish', 'español', 'page', 'convert'],
    run: async () => {
      try {
        const pageResult = await window.arc.getCurrentPageText();
        if (!pageResult.ok || !pageResult.text) {
          throw new Error('Could not get page content');
        }

        const translationResult = await window.arc.translatePageContent(
          pageResult.text,
          'es',
          undefined,
          { chunkSize: 2000, preserveFormatting: true }
        );

        if (!translationResult.ok) {
          throw new Error(translationResult.error || 'Translation failed');
        }

        const result = translationResult.result;
        const event = new CustomEvent('arc:jarvis-message', { 
          detail: { 
            message: {
              from: 'jarvis',
              text: `🌐 **Página Traducida al Español**\n\n**Desde:** ${result.sourceLanguage}\n**Confianza:** ${Math.round(result.confidence * 100)}%\n**Tiempo:** ${result.translationTime}ms\n\n**Traducción:**\n\n${result.translatedText.substring(0, 1000)}${result.translatedText.length > 1000 ? '...\n\n*[Traducción truncada para mostrar]*' : ''}`
            }
          } 
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Failed to translate page:', error);
        const event = new CustomEvent('arc:notification', {
          detail: {
            type: 'error',
            message: 'Failed to translate page to Spanish'
          }
        });
        window.dispatchEvent(event);
      }
    }
  });

  registry.registerCommand({
    id: 'translation:open-panel',
    title: 'Open Translation Panel',
    description: 'Open the translation panel for more language options',
    category: 'translation',
    keywords: ['translate', 'panel', 'open', 'languages', 'options'],
    run: () => {
      // Trigger translation panel
      const event = new CustomEvent('arc:translation-open');
      window.dispatchEvent(event);
    }
  });

  registry.registerCommand({
    id: 'translation:clear-cache',
    title: 'Clear Translation Cache',
    description: 'Clear the translation cache to free up memory',
    category: 'translation',
    keywords: ['translate', 'cache', 'clear', 'memory', 'reset'],
    run: async () => {
      try {
        const result = await window.arc.clearTranslationCache();
        if (result.ok) {
          const event = new CustomEvent('arc:notification', {
            detail: {
              type: 'success',
              message: `Translation cache cleared (${result.cleared || 0} items)`
            }
          });
          window.dispatchEvent(event);
        } else {
          throw new Error(result.error || 'Failed to clear cache');
        }
      } catch (error) {
        console.error('Failed to clear translation cache:', error);
        const event = new CustomEvent('arc:notification', {
          detail: {
            type: 'error',
            message: 'Failed to clear translation cache'
          }
        });
        window.dispatchEvent(event);
      }
    }
  });

  // Voice commands
  registry.registerCommand({
    id: 'voice:toggle-listening',
    title: 'Toggle Voice Listening',
    description: 'Start or stop voice command listening',
    category: 'voice',
    keywords: ['voice', 'microphone', 'listen', 'speech', 'command'],
    run: () => {
      // Trigger voice toggle event
      const event = new CustomEvent('arc:voice-toggle');
      window.dispatchEvent(event);
    }
  });

  registry.registerCommand({
    id: 'voice:show-help',
    title: 'Show Voice Commands Help',
    description: 'Display available voice commands',
    category: 'voice',
    keywords: ['voice', 'help', 'commands', 'guide', 'tutorial'],
    run: () => {
      // Trigger voice help event
      const event = new CustomEvent('arc:voice-help');
      window.dispatchEvent(event);
    }
  });

  registry.registerCommand({
    id: 'voice:clear-cache',
    title: 'Clear Voice Commands Cache',
    description: 'Clear the voice command recognition cache',
    category: 'voice',
    keywords: ['voice', 'cache', 'clear', 'reset'],
    run: async () => {
      try {
        const { clearVoiceCommandCache } = await import('./voiceCommands');
        const result = clearVoiceCommandCache();
        
        const event = new CustomEvent('arc:notification', {
          detail: {
            type: 'success',
            message: `Voice command cache cleared (${result.cleared} items)`
          }
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Failed to clear voice command cache:', error);
        const event = new CustomEvent('arc:notification', {
          detail: {
            type: 'error',
            message: 'Failed to clear voice command cache'
          }
        });
        window.dispatchEvent(event);
      }
    }
  });

  console.log('Default commands initialized:', registry.getStats());
}

/**
 * Get all available commands for display purposes
 */
export function getAvailableCommands(): Command[] {
  const registry = getCommandRegistry();
  return registry.getAllCommands();
}

/**
 * Execute a command by ID with error handling
 */
export async function executeCommand(commandId: string): Promise<boolean> {
  try {
    const registry = getCommandRegistry();
    await registry.executeCommand(commandId as any);
    return true;
  } catch (error) {
    console.error(`Failed to execute command ${commandId}:`, error);
    return false;
  }
}