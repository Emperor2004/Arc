import React from 'react';
import BrowserShell from './components/BrowserShell';

function App() {
  return (
    <div className="app" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '10px 20px', background: '#333', color: 'white' }}>
        <h1>Arc + Jarvis</h1>
      </header>
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <BrowserShell />
      </main>
    </div>
  );
}

export default App;
