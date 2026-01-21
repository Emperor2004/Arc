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