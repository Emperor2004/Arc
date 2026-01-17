import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

console.log('Renderer starting...');

// Get the root element
const rootElement = document.getElementById('root');
console.log('Root element found:', !!rootElement);

if (!rootElement) {
  console.error('Root element not found!');
  document.body.innerHTML = '<div style="color: red; padding: 20px; font-family: monospace;">ERROR: Root element not found!</div>';
} else {
  try {
    console.log('Creating React root...');
    const root = createRoot(rootElement);
    
    console.log('Rendering App component...');
    root.render(<App />);
    
    console.log('App rendered successfully!');
  } catch (error) {
    console.error('Error rendering app:', error);
    rootElement.innerHTML = `
      <div style="color: red; padding: 20px; font-family: monospace; background: #0f1115;">
        <h1>Rendering Error</h1>
        <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        <pre>${error instanceof Error ? error.stack : ''}</pre>
      </div>
    `;
  }
}