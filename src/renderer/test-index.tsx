import React from 'react';
import { createRoot } from 'react-dom/client';

const TestApp: React.FC = () => {
  return (
    <div style={{ padding: '20px', color: 'white', background: '#000' }}>
      <h1>Test App Working</h1>
      <p>If you see this, React is working!</p>
    </div>
  );
};

console.log('Test renderer starting...');

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<TestApp />);
  console.log('Test app rendered!');
} else {
  console.error('Root element not found!');
}
