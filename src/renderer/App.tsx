import React, { useRef, useEffect } from 'react';
import BrowserShell from './components/BrowserShell';
import JarvisPanel, { JarvisPanelHandle } from './components/JarvisPanel';

function App() {
  const [lastNavigated, setLastNavigated] = React.useState<number>(0);
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

  return (
    <div className="arc-root">
      <header className="arc-header">
        <div className="arc-logo">
          Arc <span className="arc-logo-subtitle">+ Jarvis</span>
        </div>
      </header>

      <main className="arc-main">
        <section className="arc-main-left">
          <BrowserShell onNavigationComplete={handleNavigationComplete} />
        </section>

        <aside className="arc-main-right">
          <JarvisPanel ref={jarvisRef} refreshTrigger={lastNavigated} />
        </aside>
      </main>
    </div>
  );
}

export default App;
