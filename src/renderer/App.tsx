import React from 'react';
import BrowserShell from './components/BrowserShell';
import JarvisPanel from './components/JarvisPanel';

function App() {
  const [lastNavigated, setLastNavigated] = React.useState<number>(0);

  return (
    <div className="app" style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'transparent' // Background handled by body styles
    }}>
      <header style={{
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        zIndex: 10
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Arc <span style={{ opacity: 0.5, fontSize: '14px' }}>+ Jarvis</span>
        </div>
      </header>

      <main style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        padding: '0 20px 20px 20px',
        gap: '20px'
      }}>
        {/* Main Browser Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <BrowserShell onNavigate={() => setLastNavigated(Date.now())} />
        </div>

        {/* Side Panel */}
        <JarvisPanel refreshTrigger={lastNavigated} />
      </main>
    </div>
  );
}


export default App;

