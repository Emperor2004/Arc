import React, { useRef, useEffect, useState } from 'react';
import BrowserShell from './components/BrowserShell';
import JarvisPanel, { JarvisPanelHandle } from './components/JarvisPanel';
import SettingsView from './components/SettingsView';

type LayoutMode = 'normal' | 'browser_max' | 'jarvis_max';
type AppSection = 'browser' | 'settings';

function App() {
  const [lastNavigated, setLastNavigated] = React.useState<number>(0);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('normal');
  const [section, setSection] = useState<AppSection>('browser');
  const jarvisRef = useRef<JarvisPanelHandle | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Set new debounced refresh (15 seconds after navigation)
    refreshTimeoutRef.current = setTimeout(() => {
      console.log('Refreshing Jarvis recommendations after navigation...');
      jarvisRef.current?.refresh();
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

  // Layout mode handlers
  const handleBrowserMaximize = () => {
    setLayoutMode(layoutMode === 'browser_max' ? 'normal' : 'browser_max');
  };

  const handleJarvisMaximize = () => {
    setLayoutMode(layoutMode === 'jarvis_max' ? 'normal' : 'jarvis_max');
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
            onClick={() => setSection('browser')}
          >
            🌐 Browse
          </button>
          <button 
            className={`arc-nav-btn ${section === 'settings' ? 'arc-nav-btn--active' : ''}`}
            onClick={() => setSection('settings')}
          >
            ⚙️ Settings
          </button>
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

export default App;
