import React, { useRef, useEffect, useState } from 'react';
import BrowserShell from './components/BrowserShell';
import JarvisPanel, { JarvisPanelHandle } from './components/JarvisPanel';
import SettingsView from './components/SettingsView';
import DebugOverlay from './components/DebugOverlay';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import HamburgerMenu from './components/HamburgerMenu';
import SessionRestoreDialog from './components/SessionRestoreDialog';
import CommandPalette from './components/CommandPalette';
import WorkspaceDialog from './components/WorkspaceDialog';
import DiagnosticsPanel from './components/DiagnosticsPanel';
import OnboardingFlow from './components/OnboardingFlow';
import { DebugProvider, useDebug } from './contexts/DebugContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { KeyboardShortcutManager, createDefaultShortcuts } from '../core/keyboardShortcutManager';
import { getThemeManager } from '../core/themeManager';
import { SessionState, TabSession } from '../core/sessionManager';
import { initializeDefaultCommands } from '../core/defaultCommands';

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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [workspaceDialog, setWorkspaceDialog] = useState<{
    isOpen: boolean;
    mode: 'save' | 'switch' | 'delete' | null;
  }>({ isOpen: false, mode: null });
  const [isDiagnosticsPanelOpen, setIsDiagnosticsPanelOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
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

  // Check for first run and show onboarding
  useEffect(() => {
    const checkFirstRun = async () => {
      try {
        if (window.arc && window.arc.isFirstRun) {
          const result = await window.arc.isFirstRun();
          if (result.ok && result.isFirstRun) {
            // Small delay to let the app initialize
            setTimeout(() => {
              setIsOnboardingOpen(true);
              logAction('First run detected, showing onboarding');
            }, 2000);
          }
        }
      } catch (error) {
        console.error('Error checking first run:', error);
      }
    };

    checkFirstRun();
  }, [logAction]);

  // Initialize command registry
  useEffect(() => {
    initializeDefaultCommands();
    logAction('Command registry initialized');

    // Add event listeners for command-triggered actions
    const handleNavigateToSection = (event: CustomEvent) => {
      const { section: newSection } = event.detail;
      setSection(newSection);
      logAction(`Navigated to section: ${newSection}`);
    };

    const handleRestoreSession = (event: CustomEvent) => {
      const { session } = event.detail;
      if (session && session.tabs) {
        setSessionToRestore(session);
        setRestoreSessionChoice('pending');
        logAction('Session restore triggered from command');
      }
    };

    const handleWorkspaceSave = (event: CustomEvent) => {
      setWorkspaceDialog({ isOpen: true, mode: 'save' });
      logAction('Workspace save dialog opened');
    };

    const handleWorkspaceSwitch = (event: CustomEvent) => {
      setWorkspaceDialog({ isOpen: true, mode: 'switch' });
      logAction('Workspace switch dialog opened');
    };

    const handleWorkspaceDelete = (event: CustomEvent) => {
      setWorkspaceDialog({ isOpen: true, mode: 'delete' });
      logAction('Workspace delete dialog opened');
    };

    const handleDiagnosticsOpen = (event: CustomEvent) => {
      setIsDiagnosticsPanelOpen(true);
      logAction('Diagnostics panel opened');
    };

    window.addEventListener('arc:navigate-to-section', handleNavigateToSection as EventListener);
    window.addEventListener('arc:restore-session', handleRestoreSession as EventListener);
    window.addEventListener('arc:workspace-save', handleWorkspaceSave as EventListener);
    window.addEventListener('arc:workspace-switch', handleWorkspaceSwitch as EventListener);
    window.addEventListener('arc:workspace-delete', handleWorkspaceDelete as EventListener);
    window.addEventListener('arc:diagnostics-open', handleDiagnosticsOpen as EventListener);

    return () => {
      window.removeEventListener('arc:navigate-to-section', handleNavigateToSection as EventListener);
      window.removeEventListener('arc:restore-session', handleRestoreSession as EventListener);
      window.removeEventListener('arc:workspace-save', handleWorkspaceSave as EventListener);
      window.removeEventListener('arc:workspace-switch', handleWorkspaceSwitch as EventListener);
      window.removeEventListener('arc:workspace-delete', handleWorkspaceDelete as EventListener);
      window.removeEventListener('arc:diagnostics-open', handleDiagnosticsOpen as EventListener);
    };
  }, [logAction]);

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
      // Check for Ctrl+K or Cmd+K to open command palette
      if ((event.ctrlKey || event.metaKey) && event.key === 'k' && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        setIsCommandPaletteOpen(true);
        logAction('Command palette opened via keyboard shortcut');
        return;
      }

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

  // Workspace dialog handlers
  const handleWorkspaceDialogClose = () => {
    setWorkspaceDialog({ isOpen: false, mode: null });
  };

  const handleWorkspaceSave = async (name: string, description?: string) => {
    try {
      // Get current tabs - this is a placeholder implementation
      // In a real implementation, we'd get the actual tabs from BrowserShell
      const mockTabs: TabSession[] = [
        {
          id: 'tab1',
          url: 'https://example.com',
          title: 'Example',
          scrollPosition: { x: 0, y: 0 }
        }
      ];
      
      if (window.arc && window.arc.saveWorkspace) {
        const result = await window.arc.saveWorkspace(mockTabs, 'tab1', { name, description });
        if (result.ok) {
          logAction(`Workspace saved: ${name}`);
          // Show success message or notification
        } else {
          console.error('Failed to save workspace:', result.error);
        }
      }
    } catch (error) {
      console.error('Error saving workspace:', error);
    }
  };

  const handleWorkspaceSwitch = async (workspaceId: string) => {
    try {
      if (window.arc && window.arc.loadWorkspace) {
        const result = await window.arc.loadWorkspace(workspaceId);
        if (result.ok && result.sessionSnapshot) {
          // Restore the workspace session
          if (window.arc.restoreSession) {
            await window.arc.restoreSession(result.sessionSnapshot.tabs);
            logAction(`Switched to workspace: ${workspaceId}`);
          }
        } else {
          console.error('Failed to load workspace:', result.error);
        }
      }
    } catch (error) {
      console.error('Error switching workspace:', error);
    }
  };

  const handleWorkspaceDelete = async (workspaceId: string) => {
    try {
      if (window.arc && window.arc.deleteWorkspace) {
        const result = await window.arc.deleteWorkspace(workspaceId);
        if (result.ok) {
          logAction(`Workspace deleted: ${workspaceId}`);
        } else {
          console.error('Failed to delete workspace:', result.error);
        }
      }
    } catch (error) {
      console.error('Error deleting workspace:', error);
    }
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

      {/* Command Palette */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => {
          setIsCommandPaletteOpen(false);
          logAction('Command palette closed');
        }}
      />

      {/* Workspace Dialog */}
      <WorkspaceDialog
        isOpen={workspaceDialog.isOpen}
        mode={workspaceDialog.mode}
        onClose={handleWorkspaceDialogClose}
        onSave={handleWorkspaceSave}
        onSwitch={handleWorkspaceSwitch}
        onDelete={handleWorkspaceDelete}
      />

      {/* Diagnostics Panel */}
      <DiagnosticsPanel
        isOpen={isDiagnosticsPanelOpen}
        onClose={() => {
          setIsDiagnosticsPanelOpen(false);
          logAction('Diagnostics panel closed');
        }}
      />

      {/* Onboarding Flow */}
      <OnboardingFlow
        isOpen={isOnboardingOpen}
        onComplete={async () => {
          try {
            if (window.arc && window.arc.markOnboardingCompleted) {
              await window.arc.markOnboardingCompleted();
            }
            setIsOnboardingOpen(false);
            logAction('Onboarding completed');
          } catch (error) {
            console.error('Error completing onboarding:', error);
            setIsOnboardingOpen(false);
          }
        }}
        onSkip={async () => {
          try {
            if (window.arc && window.arc.skipOnboarding) {
              await window.arc.skipOnboarding();
            }
            setIsOnboardingOpen(false);
            logAction('Onboarding skipped');
          } catch (error) {
            console.error('Error skipping onboarding:', error);
            setIsOnboardingOpen(false);
          }
        }}
        onCreateDemo={async () => {
          try {
            if (window.arc && window.arc.createDemoWorkspace) {
              const result = await window.arc.createDemoWorkspace();
              if (result.ok && result.workspaceId) {
                logAction(`Demo workspace created: ${result.workspaceId}`);
                // Optionally switch to the demo workspace
                if (window.arc.loadWorkspace) {
                  const loadResult = await window.arc.loadWorkspace(result.workspaceId);
                  if (loadResult.ok && loadResult.sessionSnapshot) {
                    if (window.arc.restoreSession) {
                      await window.arc.restoreSession(loadResult.sessionSnapshot.tabs);
                      logAction('Switched to demo workspace');
                    }
                  }
                }
              } else {
                console.error('Failed to create demo workspace:', result.error);
              }
            }
          } catch (error) {
            console.error('Error creating demo workspace:', error);
          }
        }}
      />
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
