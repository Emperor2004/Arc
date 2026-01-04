import React from 'react';
import BrowserShell from './components/BrowserShell';
import JarvisPanel from './components/JarvisPanel';

function App() {
  const [lastNavigated, setLastNavigated] = React.useState<number>(0);

  return (
    <div className="arc-root">
      <header className="arc-header">
        <div className="arc-logo">
          Arc <span className="arc-logo-subtitle">+ Jarvis</span>
        </div>
      </header>

      <main className="arc-main">
        <section className="arc-main-left">
          <BrowserShell onNavigate={() => setLastNavigated(Date.now())} />
        </section>

        <aside className="arc-main-right">
          <JarvisPanel refreshTrigger={lastNavigated} />
        </aside>
      </main>
    </div>
  );
}

export default App;
