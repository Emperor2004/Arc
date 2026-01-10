import React, { useRef, useEffect, useState } from 'react';
import BrowserShell from './components/BrowserShell';
import JarvisPanel, { JarvisPanelHandle } from './components/JarvisPanel';
import SettingsView from './components/SettingsView';
import DebugOverlay from './components/DebugOverlay';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import SessionRestoreDialog from './components/SessionRestoreDialog';
import { DebugProvider, useDebug } from './contexts/DebugContext';
import { KeyboardShortcutManager, createDefaultShortcuts } from '../core/keyboardShortcutManager';
import { getThemeManager } from '../core/themeManager';
import { loadSession, clearSession, SessionState, TabSession } from '../core/sessionManager';

type LayoutMode = 'normal' | 'browser_max' | 'jarvis_max';
type AppSection = 'browser' | 'settings';

// Error Boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', fontFamily: 'monospace' }}>
          <h1>Application Error</h1>
          <p>{this.state.error?.message}</p>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const [lastNavigated, setLastNavigated] = React.useState<number>(0);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('normal');
  const [section, setSection] = useState<AppSection>('browser');
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [sessionToRestore, setSessionToRestore] = useState<SessionState | null>(null);
  const [restoreSessionChoice, setRestoreSessionChoice] = useState<'pending' | 'restored' | 'fresh' | null>(null);
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

  // Load and check for session restoration on mount
  useEffect(() => {
    const checkSessionRestore = async () => {
      try {
        // Check if session restore is enabled in settings
        if (window.arc && window.arc.getSettings) {
          const settings = await window.arc.getSettings();
          const restoreEnabled = settings.restorePreviousSession !== false;
          
          if (restoreEnabled) {
            // Load the previous session
            const session = loadSession();
            if (session && session.tabs.length > 0) {
              setSessionToRestore(session);
              setRestoreSessionChoice('pending');
              logAction('Session restore dialog shown');
            }
          }
        }
      } catch (error) {
        console.error('Error checking session restore:', error);
      }
    };

    checkSessionRestore();
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

  // Session restoration handlers
  const handleRestoreSession = (tabs: TabSession[]) => {
    if (window.arc && window.arc.restoreSession) {
      window.arc.restoreSession(tabs);
      setRestoreSessionChoice('restored');
      logAction('Session restored');
    }
  };

  const handleStartFresh = () => {
    clearSession();
    setRestoreSessionChoice('fresh');
    logAction('Session cleared, starting fresh');
  };

  const handleSessionDialogClose = () => {
    setSessionToRestore(null);
    setRestoreSessionChoice(null);
  };

  // Expose session restoration to window for BrowserShell to use
  React.useEffect(() => {
    (window as any).arcSessionRestore = {
      restoreTabs: handleRestoreSession,
      sessionChoice: restoreSessionChoice
    };
  }, [handleRestoreSession, restoreSessionChoice]);

  return (
    <div className="arc-root">
      {/* Skip Links for Keyboard Navigation */}
      <div className="skip-links">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <a href="#navigation" className="skip-link">Skip to navigation</a>
        {section === 'browser' && layoutMode !== 'jarvis_max' && (
          <a href="#browser-section" className="skip-link">Skip to browser</a>
        )}
        {section === 'browser' && layoutMode !== 'browser_max' && (
          <a href="#jarvis-section" className="skip-link">Skip to Jarvis</a>
        )}
      </div>

      <SessionRestoreDialog
        session={sessionToRestore}
        onRestore={handleRestoreSession}
        onStartFresh={handleStartFresh}
        onClose={handleSessionDialogClose}
      />

      <header className="arc-header" role="banner">
        <div className="arc-logo">
          Arc <span className="arc-logo-subtitle">+ Jarvis</span>
        </div>
        
        {/* Section Navigation */}
        <nav className="arc-nav" id="navigation" role="navigation" aria-label="Main navigation">
          <button 
            className={`arc-nav-btn ${section === 'browser' ? 'arc-nav-btn--active' : ''}`}
            onClick={() => {
              setSection('browser');
              logAction('Section switched to browser');
            }}
            aria-pressed={section === 'browser'}
            aria-describedby="browser-nav-desc"
          >
            🌐 Browse
          </button>
          <div id="browser-nav-desc" className="sr-only">
            Switch to browser view to browse the web and manage tabs
          </div>
          <button 
            className={`arc-nav-btn ${section === 'settings' ? 'arc-nav-btn--active' : ''}`}
            onClick={() => {
              setSection('settings');
              logAction('Section switched to settings');
            }}
            aria-pressed={section === 'settings'}
            aria-describedby="settings-nav-desc"
          >
            ⚙️ Settings
          </button>
          <div id="settings-nav-desc" className="sr-only">
            Switch to settings view to configure Arc Browser preferences
          </div>
        </nav>

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
        <main className={`arc-main arc-main--${layoutMode}`} id="main-content" role="main" aria-label="Browser interface">
          {layoutMode !== 'jarvis_max' && (
            <section className="arc-main-left" id="browser-section" aria-label="Web browser">
              <BrowserShell 
                onNavigationComplete={handleNavigationComplete}
                onMaximize={handleBrowserMaximize}
                isMaximized={layoutMode === 'browser_max'}
              />
            </section>
          )}

          {layoutMode !== 'browser_max' && (
            <aside className="arc-main-right" id="jarvis-section" role="complementary" aria-label="Jarvis AI assistant">
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
        <main className="arc-main arc-main--settings" id="main-content" role="main" aria-label="Settings">
          <SettingsView />
        </main>
      )}
    </div>
  );
}

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <DebugProvider>
        <AppContent />
        <DebugOverlay />
      </DebugProvider>
    </ErrorBoundary>
  );
};

export default App;
