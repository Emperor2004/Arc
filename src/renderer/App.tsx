import React, { useRef, useEffect, useState } from 'react';
import BrowserShell from './components/BrowserShell';
import JarvisPanel, { JarvisPanelHandle } from './components/JarvisPanel';
import SettingsView from './components/SettingsView';
import DebugOverlay from './components/DebugOverlay';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import { DebugProvider, useDebug } from './contexts/DebugContext';
import { KeyboardShortcutManager, createDefaultShortcuts } from '../core/keyboardShortcutManager';
import { getThemeManager } from '../core/themeManager';

type LayoutMode = 'normal' | 'browser_max' | 'jarvis_max';
type AppSection = 'browser' | 'settings';

const AppContent: React.FC = () => {
  const [lastNavigated, setLastNavigated] = React.useState<number>(0);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('normal');
  const [section, setSection] = useState<AppSection>('browser');
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const jarvisRef = useRef<JarvisPanelHandle | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shortcutManagerRef = useRef<KeyboardShortcutManager | null>(null);
  const themeManagerRef = useRef(getThemeManager());
  const { updateDebugState, logAction } = useDebug();

  // Initialize theme manager on mount
  useEffect(() => {
    const themeManager = themeManagerRef.current;
    logAction('Theme manager initialized');
    
    return () => {
      // Cleanup is handled by singleton pattern
    };
  }, [logAction]);

  // Initialize keyboard shortcuts
  useEffect(() => {
    const manager = new KeyboardShortcutManager(process.platform);
    shortcutManagerRef.current = manager;

    const handlers = {
      newTab: () => {
        logAction('Keyboard shortcut: New Tab');
        if (window.arc) {
          window.arc.newTab?.();
        }
      },
      newIncognitoTab: () => {
        logAction('Keyboard shortcut: New Incognito Tab');
        if (window.arc) {
          window.arc.newIncognitoTab?.();
        }
      },
      closeTab: () => {
        logAction('Keyboard shortcut: Close Tab');
        if (window.arc) {
          window.arc.closeTab?.();
        }
      },
      nextTab: () => {
        logAction('Keyboard shortcut: Next Tab');
        if (window.arc) {
          window.arc.nextTab?.();
        }
      },
      previousTab: () => {
        logAction('Keyboard shortcut: Previous Tab');
        if (window.arc) {
          window.arc.previousTab?.();
        }
      },
      focusAddressBar: () => {
        logAction('Keyboard shortcut: Focus Address Bar');
        if (window.arc) {
          window.arc.focusAddressBar?.();
        }
      },
      reloadPage: () => {
        logAction('Keyboard shortcut: Reload Page');
        if (window.arc) {
          window.arc.reloadPage?.();
        }
      },
      clearData: () => {
        logAction('Keyboard shortcut: Clear Data');
        if (window.arc) {
          window.arc.clearData?.();
        }
      },
    };

    const shortcuts = createDefaultShortcuts(handlers);
    manager.registerShortcuts(shortcuts);

    // Add global keyboard event listener
    const handleKeyDown = async (event: KeyboardEvent) => {
      // Check for Ctrl+? or Cmd+? to show help
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === '?') {
        event.preventDefault();
        setShowShortcutsHelp(prev => !prev);
        logAction('Keyboard shortcuts help toggled');
        return;
      }

      await manager.handleKeyDown(event);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [logAction]);

  // Update debug state when section changes
  useEffect(() => {
    updateDebugState({ section });
    logAction(`Section changed to: ${section}`);
  }, [section, updateDebugState, logAction]);

  // Update debug state when layout mode changes
  useEffect(() => {
    updateDebugState({ layoutMode });
    logAction(`Layout mode changed to: ${layoutMode}`);
  }, [layoutMode, updateDebugState, logAction]);

  // Trigger Jarvis refresh on app startup
  useEffect(() => {
    // Small delay to ensure components are mounted
    const timer = setTimeout(() => {
      jarvisRef.current?.refresh();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle navigation completion with debounced refresh
  const handleNavigationComplete = () => {
    setLastNavigated(Date.now());
    logAction('Navigation completed');
    
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Set new debounced refresh (15 seconds after navigation)
    refreshTimeoutRef.current = setTimeout(() => {
      console.log('Refreshing Jarvis recommendations after navigation...');
      jarvisRef.current?.refresh();
      logAction('Jarvis refresh triggered (debounced)');
    }, 15000);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Navigation handler for Jarvis
  const handleJarvisNavigate = (url: string) => {
    if (window.arc) {
      window.arc.navigate(url);
      logAction(`Jarvis navigation to: ${url}`);
    }
  };

  // Layout mode handlers
  const handleBrowserMaximize = () => {
    const newMode = layoutMode === 'browser_max' ? 'normal' : 'browser_max';
    setLayoutMode(newMode);
    logAction(`Browser maximize toggled: ${newMode}`);
  };

  const handleJarvisMaximize = () => {
    const newMode = layoutMode === 'jarvis_max' ? 'normal' : 'jarvis_max';
    setLayoutMode(newMode);
    logAction(`Jarvis maximize toggled: ${newMode}`);
  };

  return (
    <div className="arc-root">
      <header className="arc-header">
        <div className="arc-logo">
          Arc <span className="arc-logo-subtitle">+ Jarvis</span>
        </div>
        
        {/* Section Navigation */}
        <div className="arc-nav">
          <button 
            className={`arc-nav-btn ${section === 'browser' ? 'arc-nav-btn--active' : ''}`}
            onClick={() => {
              setSection('browser');
              logAction('Section switched to browser');
            }}
          >
            🌐 Browse
          </button>
          <button 
            className={`arc-nav-btn ${section === 'settings' ? 'arc-nav-btn--active' : ''}`}
            onClick={() => {
              setSection('settings');
              logAction('Section switched to settings');
            }}
          >
            ⚙️ Settings
          </button>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="arc-header-actions">
          {shortcutManagerRef.current && (
            <KeyboardShortcutsHelp
              shortcuts={shortcutManagerRef.current.getShortcuts()}
              platform={process.platform}
              onClose={() => setShowShortcutsHelp(false)}
            />
          )}
        </div>
      </header>

      {section === 'browser' && (
        <main className={`arc-main arc-main--${layoutMode}`}>
          {layoutMode !== 'jarvis_max' && (
            <section className="arc-main-left">
              <BrowserShell 
                onNavigationComplete={handleNavigationComplete}
                onMaximize={handleBrowserMaximize}
                isMaximized={layoutMode === 'browser_max'}
              />
            </section>
          )}

          {layoutMode !== 'browser_max' && (
            <aside className="arc-main-right">
              <JarvisPanel 
                ref={jarvisRef} 
                refreshTrigger={lastNavigated}
                onMaximize={handleJarvisMaximize}
                isMaximized={layoutMode === 'jarvis_max'}
                onNavigate={handleJarvisNavigate}
              />
            </aside>
          )}
        </main>
      )}

      {section === 'settings' && (
        <main className="arc-main arc-main--settings">
          <SettingsView />
        </main>
      )}
    </div>
  );
}

const App: React.FC = () => {
  return (
    <DebugProvider>
      <AppContent />
      <DebugOverlay />
    </DebugProvider>
  );
};

export default App;
