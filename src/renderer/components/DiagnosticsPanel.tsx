import React, { useState, useEffect } from 'react';

interface DiagnosticsSnapshot {
  ollama: {
    available: boolean;
    model?: string;
    endpoint?: string;
    lastError?: string;
    modelCount?: number;
  };
  database: {
    connected: boolean;
    ready: boolean;
    lastError?: string;
    tablesCount?: number;
    workspacesCount?: number;
  };
  session: {
    tabs: number;
    lastSavedAt?: number;
    restoreEnabled: boolean;
    workspacesAvailable: number;
  };
  jarvis: {
    enabled: boolean;
    recommendationsLoaded: boolean;
    lastRecommendationCount?: number;
    chatAvailable: boolean;
  };
  app: {
    version: string;
    env: 'development' | 'production';
    platform: string;
    uptime: number;
    memoryUsage?: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  overall: {
    status: 'healthy' | 'warning' | 'error';
    issues: string[];
    recommendations: string[];
  };
}

interface DiagnosticsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({ isOpen, onClose }) => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load diagnostics when panel opens
  useEffect(() => {
    if (isOpen) {
      loadDiagnostics();
    }
  }, [isOpen]);

  const loadDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      if (window.arc && window.arc.getDiagnostics) {
        const result = await window.arc.getDiagnostics();
        if (result.ok) {
          setDiagnostics(result.diagnostics);
        } else {
          setError(result.error || 'Failed to load diagnostics');
        }
      } else {
        setError('Diagnostics API not available');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: boolean | 'healthy' | 'warning' | 'error') => {
    if (typeof status === 'boolean') {
      return status ? '✅' : '❌';
    }
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status: boolean | 'healthy' | 'warning' | 'error') => {
    if (typeof status === 'boolean') {
      return status ? '#22c55e' : '#ef4444';
    }
    switch (status) {
      case 'healthy': return '#22c55e';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatUptime = (uptime: number) => {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90vw' }}>
        <div className="modal-header">
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔧 System Diagnostics
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              className="icon-button icon-button--glass"
              onClick={loadDiagnostics}
              disabled={loading}
              title="Refresh diagnostics"
              aria-label="Refresh diagnostics"
            >
              ↻
            </button>
            <button 
              className="icon-button icon-button--glass"
              onClick={onClose}
              aria-label="Close diagnostics"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ padding: '20px 0', maxHeight: '70vh', overflowY: 'auto' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔄</div>
              Running system diagnostics...
            </div>
          )}

          {error && (
            <div style={{
              padding: '16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#ef4444',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>❌</div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Diagnostics Failed</div>
              <div style={{ fontSize: '14px' }}>{error}</div>
            </div>
          )}

          {diagnostics && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Overall Status */}
              <div style={{
                padding: '16px',
                background: `rgba(${getStatusColor(diagnostics.overall.status) === '#22c55e' ? '34, 197, 94' : 
                              getStatusColor(diagnostics.overall.status) === '#f59e0b' ? '245, 158, 11' : '239, 68, 68'}, 0.1)`,
                border: `1px solid ${getStatusColor(diagnostics.overall.status)}33`,
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                  {getStatusIcon(diagnostics.overall.status)}
                </div>
                <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>
                  {diagnostics.overall.status === 'healthy' && 'All Systems Operational'}
                  {diagnostics.overall.status === 'warning' && 'Minor Issues Detected'}
                  {diagnostics.overall.status === 'error' && 'Critical Issues Found'}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {diagnostics.overall.issues.length === 0 
                    ? 'Everything is working correctly'
                    : `${diagnostics.overall.issues.length} issue${diagnostics.overall.issues.length > 1 ? 's' : ''} found`
                  }
                </div>
              </div>

              {/* System Components */}
              <div style={{ display: 'grid', gap: '12px' }}>
                {/* Ollama AI */}
                <div className="diagnostic-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '20px' }}>{getStatusIcon(diagnostics.ollama.available)}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>Ollama AI Service</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {diagnostics.ollama.available 
                          ? `Connected • ${diagnostics.ollama.modelCount || 0} models`
                          : 'Not available'
                        }
                      </div>
                    </div>
                  </div>
                  {diagnostics.ollama.model && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Active model: {diagnostics.ollama.model}
                    </div>
                  )}
                  {diagnostics.ollama.lastError && (
                    <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                      Error: {diagnostics.ollama.lastError}
                    </div>
                  )}
                </div>

                {/* Database */}
                <div className="diagnostic-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '20px' }}>{getStatusIcon(diagnostics.database.connected && diagnostics.database.ready)}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>Database</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {diagnostics.database.connected && diagnostics.database.ready
                          ? `Connected • ${diagnostics.database.tablesCount || 0} tables`
                          : 'Connection issues'
                        }
                      </div>
                    </div>
                  </div>
                  {diagnostics.database.workspacesCount !== undefined && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Workspaces: {diagnostics.database.workspacesCount}
                    </div>
                  )}
                  {diagnostics.database.lastError && (
                    <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                      Error: {diagnostics.database.lastError}
                    </div>
                  )}
                </div>

                {/* Session & Workspaces */}
                <div className="diagnostic-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '20px' }}>{getStatusIcon(true)}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>Session Management</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {diagnostics.session.workspacesAvailable} workspaces • {diagnostics.session.tabs} total tabs
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Session restore: {diagnostics.session.restoreEnabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>

                {/* Jarvis Assistant */}
                <div className="diagnostic-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '20px' }}>{getStatusIcon(diagnostics.jarvis.enabled && diagnostics.jarvis.chatAvailable)}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>Jarvis Assistant</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {diagnostics.jarvis.enabled 
                          ? (diagnostics.jarvis.chatAvailable ? 'Fully operational' : 'Limited functionality')
                          : 'Disabled'
                        }
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Recommendations: {diagnostics.jarvis.recommendationsLoaded ? 'Working' : 'Not loading'}
                    {diagnostics.jarvis.lastRecommendationCount !== undefined && 
                      ` • ${diagnostics.jarvis.lastRecommendationCount} loaded`
                    }
                  </div>
                </div>

                {/* Application Info */}
                <div className="diagnostic-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '20px' }}>ℹ️</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>Application</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Version {diagnostics.app.version} • {diagnostics.app.env} • {diagnostics.app.platform}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Uptime: {formatUptime(diagnostics.app.uptime)}
                    {diagnostics.app.memoryUsage && (
                      <> • Memory: {diagnostics.app.memoryUsage.used}MB / {diagnostics.app.memoryUsage.total}MB ({diagnostics.app.memoryUsage.percentage}%)</>
                    )}
                  </div>
                </div>
              </div>

              {/* Issues and Recommendations */}
              {(diagnostics.overall.issues.length > 0 || diagnostics.overall.recommendations.length > 0) && (
                <div style={{ marginTop: '16px' }}>
                  {diagnostics.overall.issues.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: '#ef4444' }}>
                        Issues Found
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {diagnostics.overall.issues.map((issue, index) => (
                          <div key={index} style={{
                            padding: '8px 12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: '#ef4444'
                          }}>
                            • {issue}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {diagnostics.overall.recommendations.length > 0 && (
                    <div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: '#3b82f6' }}>
                        Recommendations
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {diagnostics.overall.recommendations.map((rec, index) => (
                          <div key={index} style={{
                            padding: '8px 12px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: '#3b82f6'
                          }}>
                            💡 {rec}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'space-between',
          paddingTop: '16px',
          borderTop: '1px solid var(--glass-border)'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', alignSelf: 'center' }}>
            Last updated: {new Date().toLocaleTimeString()}
          </div>
          <button 
            className="btn-primary" 
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        .diagnostic-card {
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          backdrop-filter: blur(10px);
        }
      `}</style>
    </div>
  );
};

export default DiagnosticsPanel;