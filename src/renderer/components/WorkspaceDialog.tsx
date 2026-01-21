import React, { useState, useEffect } from 'react';

interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  sessionSnapshot: {
    tabs: any[];
    activeTabId: string;
  };
  tags?: string[];
}

interface WorkspaceDialogProps {
  isOpen: boolean;
  mode: 'save' | 'switch' | 'delete' | null;
  onClose: () => void;
  onSave?: (name: string, description?: string) => void;
  onSwitch?: (workspaceId: string) => void;
  onDelete?: (workspaceId: string) => void;
}

const WorkspaceDialog: React.FC<WorkspaceDialogProps> = ({
  isOpen,
  mode,
  onClose,
  onSave,
  onSwitch,
  onDelete
}) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  // Load workspaces when dialog opens
  useEffect(() => {
    if (isOpen && (mode === 'switch' || mode === 'delete')) {
      loadWorkspaces();
    }
  }, [isOpen, mode]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setWorkspaceName('');
      setWorkspaceDescription('');
      setSelectedWorkspaceId(null);
      setError(null);
    }
  }, [isOpen]);

  const loadWorkspaces = async () => {
    setLoading(true);
    setError(null);
    try {
      if (window.arc && window.arc.listWorkspaces) {
        const result = await window.arc.listWorkspaces();
        if (result.ok) {
          setWorkspaces(result.workspaces);
        } else {
          setError(result.error || 'Failed to load workspaces');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!workspaceName.trim()) {
      setError('Workspace name is required');
      return;
    }
    onSave?.(workspaceName.trim(), workspaceDescription.trim() || undefined);
    onClose();
  };

  const handleSwitch = () => {
    if (!selectedWorkspaceId) {
      setError('Please select a workspace');
      return;
    }
    onSwitch?.(selectedWorkspaceId);
    onClose();
  };

  const handleDelete = () => {
    if (!selectedWorkspaceId) {
      setError('Please select a workspace');
      return;
    }
    
    const workspace = workspaces.find(w => w.id === selectedWorkspaceId);
    if (workspace && confirm(`Are you sure you want to delete workspace "${workspace.name}"?`)) {
      onDelete?.(selectedWorkspaceId);
      onClose();
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            {mode === 'save' && 'Save Workspace'}
            {mode === 'switch' && 'Switch Workspace'}
            {mode === 'delete' && 'Delete Workspace'}
          </h2>
          <button 
            className="icon-button icon-button--glass"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px 0' }}>
          {error && (
            <div style={{
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: '#ef4444',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {mode === 'save' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label htmlFor="workspace-name" style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  fontSize: '14px', 
                  fontWeight: 500 
                }}>
                  Workspace Name *
                </label>
                <input
                  id="workspace-name"
                  type="text"
                  className="pill-input"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="Enter workspace name"
                  style={{ width: '100%' }}
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="workspace-description" style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  fontSize: '14px', 
                  fontWeight: 500 
                }}>
                  Description (optional)
                </label>
                <textarea
                  id="workspace-description"
                  className="pill-input"
                  value={workspaceDescription}
                  onChange={(e) => setWorkspaceDescription(e.target.value)}
                  placeholder="Enter workspace description"
                  rows={3}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
            </div>
          )}

          {(mode === 'switch' || mode === 'delete') && (
            <div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                  Loading workspaces...
                </div>
              ) : workspaces.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                  No workspaces found. Create your first workspace by saving your current session.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                  {workspaces.map((workspace) => (
                    <div
                      key={workspace.id}
                      className={`workspace-item ${selectedWorkspaceId === workspace.id ? 'selected' : ''}`}
                      onClick={() => setSelectedWorkspaceId(workspace.id)}
                      style={{
                        padding: '12px',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: selectedWorkspaceId === workspace.id 
                          ? 'rgba(59, 130, 246, 0.1)' 
                          : 'rgba(255, 255, 255, 0.05)',
                        borderColor: selectedWorkspaceId === workspace.id 
                          ? '#3b82f6' 
                          : 'var(--glass-border)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                            {workspace.name}
                          </div>
                          {workspace.description && (
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                              {workspace.description}
                            </div>
                          )}
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {workspace.sessionSnapshot.tabs.length} tabs • Updated {formatDate(workspace.updatedAt)}
                          </div>
                        </div>
                        <div style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#60a5fa'
                        }}>
                          {workspace.sessionSnapshot.tabs.length}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end',
          paddingTop: '20px',
          borderTop: '1px solid var(--glass-border)'
        }}>
          <button 
            className="btn-secondary" 
            onClick={onClose}
          >
            Cancel
          </button>
          {mode === 'save' && (
            <button 
              className="btn-primary" 
              onClick={handleSave}
              disabled={!workspaceName.trim()}
            >
              Save Workspace
            </button>
          )}
          {mode === 'switch' && (
            <button 
              className="btn-primary" 
              onClick={handleSwitch}
              disabled={!selectedWorkspaceId}
            >
              Switch to Workspace
            </button>
          )}
          {mode === 'delete' && (
            <button 
              className="btn-danger" 
              onClick={handleDelete}
              disabled={!selectedWorkspaceId}
              style={{
                background: '#ef4444',
                borderColor: '#ef4444'
              }}
            >
              Delete Workspace
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceDialog;