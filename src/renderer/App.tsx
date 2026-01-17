import React, { useRef, useEffect, useState } from 'react';
import BrowserShell from './components/BrowserShell';
import JarvisPanel, { JarvisPanelHandle } from './components/JarvisPanel';
import SettingsView from './components/SettingsView';
import DebugOverlay from './components/DebugOverlay';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import HamburgerMenu from './components/HamburgerMenu';
import SessionRestoreDialog from './components/SessionRestoreDialog';
import { DebugProvider, useDebug } from './contexts/DebugContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { KeyboardShortcutManager, createDefaultShortcuts } from '../core/keyboardShortcutManager';
import { getThemeManager } from '../core/themeManager';
import { SessionState, TabSession } from '../core/sessionManager';

type LayoutMode = 'normal' | 'browser_max' | 'jarvis_max';
type AppSection = 'browser' | 'settings';

// Error Boundary with improved fallback UI
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const isMissingAPI = this.state.error?.message?.includes('window.arc') || 
                          this.state.error?.message?.includes('Cannot read property');
      
      return (
        <div style={{
          padding: '40px',
          color: '#e5e7eb',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: '#0f1115',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ maxWidth: '600px', textAlign: 'center' }}>
            <h1 style={{ color: '#f59e0b', fontSize: '24px', marginBottom: '16px' }}>
              {isMissingAPI ? '⚠️ API Not Available' : '❌ Application Error'}
            </h1>
            <p style={{ color: '#9ca3af', marginBottom: '24px', lineHeight: '1.6' }}>
              {isMissingAPI 
                ? 'The browser API is not available. This may happen during testing or if Electron failed to initialize properly.'
                : 'An unexpected error occurred. Please try refreshing the application.'}
            </p>
            {process.env.NODE_ENV === 'development' && (
              <details style={{ 
                marginTop: '24px', 
                padding: '16px', 
                background: '#1f2937', 
                borderRadius: '8px',
                textAlign: 'left'
              }}>
                <summary style={{ cursor: 'pointer', color: '#60a5fa', marginBottom: '12px' }}>
                  Error Details (Development Mode)
                </summary>
                <p style={{ color: '#ef4444', marginBottom: '8px', wordBreak: 'break-word' }}>
                  {this.state.error?.message}
                </p>
                {this.state.error?.stack && (
                  <pre style={{ 
                    color: '#9ca3af', 
                    fontSize: '12px', 
                    overflow: 'auto',
                    maxHeight: '300px',
                    padding: '12px',
                    background: '#111827',
                    borderRadius: '4px'
                  }}>
                    {this.state.error.stack}
                  </pre>
                )}
                {this.state.errorInfo && (
                  <pre style={{ 
                    color: '#9ca3af', 
                    fontSize: '12px', 
                    marginTop: '12px',
                    overflow: 'auto',
                    maxHeight: '200px',
                    padding: '12px',
                    background: '#111827',
                    borderRadius: '4px'
                  }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '24px',
                padding: '12px 24px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Reload Application
            </button>
          </div>
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
  }, []);

  // Load and check for session restoration on mount
  useEffect(() => {
    const checkSessionRestore = async () => {
      try {
        // Check if window.arc is available
        if (!window.arc || !window.arc.getSettings) {
          console.warn('window.arc.getSettings not available, skipping session restore');
          return;
        }

        // Check if session restore is enabled in settings
        const settings = await window.arc.getSettings();
        const restoreEnabled = settings?.restorePreviousSession !== false;
        
        if (restoreEnabled) {
          // Load the previous session via IPC
          try {
            if (window.arc && window.arc.loadSession) {
              const result = await window.arc.loadSession();
              if (result && result.ok && result.session && result.session.tabs.length > 0) {
                setSessionToRestore(result.session);
                setRestoreSessionChoice('pending');
                logAction('Session restore dialog shown');
              }
            }
          } catch (sessionError) {
            console.error('Error loading session:', sessionError);
            // Continue without session restore
          }
        }
      } catch (error) {
        console.error('Error checking session restore:', error);
      }
    };

    checkSessionRestore();
  }, []);

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
  }, []);

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
      setSessionToRestore(null);  // Clear the session after restoring
      logAction('Session restored');
    }
  };

  const handleStartFresh = async () => {
    try {
      if (window.arc && window.arc.clearSession) {
        await window.arc.clearSession();
      }
    } catch (error) {
      console.error('Error clearing session:', error);
    }
    setRestoreSessionChoice('fresh');
    setSessionToRestore(null);  // Clear the session after starting fresh
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

      {/* Global Hamburger Menu */}
      <HamburgerMenu
        currentSection={section}
        onSectionChange={(newSection) => {
          setSection(newSection);
          logAction(`Section switched to ${newSection}`);
        }}
      />

      <main 
        className={`arc-main ${section === 'browser' ? `arc-main--${layoutMode}` : ''}`} 
        style={{ display: section === 'browser' ? 'flex' : 'none' }}
        id="main-content" 
        role="main" 
        aria-label="Browser interface"
        aria-hidden={section !== 'browser'}
      >
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

      <main 
        className="arc-main arc-main--settings" 
        style={{ display: section === 'settings' ? 'flex' : 'none' }}
        id="settings-content" 
        role="main" 
        aria-label="Settings"
        aria-hidden={section !== 'settings'}
      >
        <SettingsView />
      </main>
    </div>
  );
}

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <DebugProvider>
        <SettingsProvider>
          <AppContent />
          <DebugOverlay />
        </SettingsProvider>
      </DebugProvider>
    </ErrorBoundary>
  );
};

export default App;
