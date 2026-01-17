import React from 'react';

const MinimalApp: React.FC = () => {
  return (
    <div style={{ 
      padding: '20px', 
      color: 'white', 
      background: '#0f1115',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>Arc Browser - Minimal Mode</h1>
      <p>Basic functionality test</p>
      
      <nav style={{ margin: '20px 0' }}>
        <button style={{ margin: '0 10px', padding: '10px 20px' }}>
          Browser
        </button>
        <button style={{ margin: '0 10px', padding: '10px 20px' }}>
          Settings
        </button>
      </nav>
      
      <div style={{ 
        display: 'flex', 
        gap: '20px',
        minHeight: '400px'
      }}>
        <div style={{ 
          flex: '2', 
          background: 'rgba(255,255,255,0.1)', 
          padding: '20px',
          borderRadius: '8px'
        }}>
          <h2>Browser Area</h2>
          <p>This would contain the web browser</p>
        </div>
        
        <div style={{ 
          flex: '1', 
          background: 'rgba(255,255,255,0.1)', 
          padding: '20px',
          borderRadius: '8px'
        }}>
          <h2>Jarvis AI</h2>
          <p>This would contain the AI assistant</p>
        </div>
      </div>
    </div>
  );
};

export default MinimalApp;
