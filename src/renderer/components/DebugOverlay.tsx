import React from 'react';
import { useDebug } from '../contexts/DebugContext';

const DebugOverlay: React.FC = () => {
  const { debugState } = useDebug();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return '#22c55e';
      case 'thinking': return '#fbbf24';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getLayoutModeColor = (mode: string) => {
    switch (mode) {
      case 'normal': return '#3b82f6';
      case 'browser_max': return '#8b5cf6';
      case 'jarvis_max': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.9)',
      color: '#fff',
      padding: '12px',
      borderRadius: '8px',
      fontSize: '11px',
      fontFamily: 'Monaco, Consolas, monospace',
      zIndex: 9999,
      minWidth: '200px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
    }}>
      <div style={{ 
        marginBottom: '8px', 
        fontWeight: 'bold', 
        color: '#60a5fa',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '4px'
      }}>
        🐛 Debug Overlay
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#9ca3af' }}>Section:</span>
          <span style={{ 
            color: debugState.section === 'browser' ? '#10b981' : '#f59e0b',
            fontWeight: 'bold'
          }}>
            {debugState.section}
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#9ca3af' }}>Layout:</span>
          <span style={{ 
            color: getLayoutModeColor(debugState.layoutMode),
            fontWeight: 'bold'
          }}>
            {debugState.layoutMode}
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#9ca3af' }}>Active Tab:</span>
          <span style={{ color: '#e5e7eb' }}>
            {debugState.activeTabId ? debugState.activeTabId.substring(0, 8) + '...' : 'none'}
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#9ca3af' }}>Incognito:</span>
          <span style={{ 
            color: debugState.isIncognito ? '#f97316' : '#6b7280',
            fontWeight: debugState.isIncognito ? 'bold' : 'normal'
          }}>
            {debugState.isIncognito ? '🕶️ YES' : 'NO'}
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#9ca3af' }}>Jarvis:</span>
          <span style={{ 
            color: getStatusColor(debugState.jarvisStatus),
            fontWeight: 'bold'
          }}>
            {debugState.jarvisStatus.toUpperCase()}
          </span>
        </div>
        
        <div style={{ 
          marginTop: '8px', 
          paddingTop: '8px', 
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '10px'
        }}>
          <div style={{ color: '#9ca3af', marginBottom: '2px' }}>Last Action:</div>
          <div style={{ color: '#fbbf24', wordBreak: 'break-word' }}>
            {debugState.lastAction}
          </div>
          <div style={{ color: '#6b7280', marginTop: '2px' }}>
            {formatTime(debugState.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugOverlay;