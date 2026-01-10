import React, { useState, useEffect } from 'react';
import { SessionState, TabSession } from '../../core/sessionManager';

export interface SessionRestoreDialogProps {
  session: SessionState | null;
  onRestore: (tabs: TabSession[]) => void;
  onStartFresh: () => void;
  onClose?: () => void;
}

const SessionRestoreDialog: React.FC<SessionRestoreDialogProps> = ({
  session,
  onRestore,
  onStartFresh,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(!!session);

  useEffect(() => {
    setIsVisible(!!session);
  }, [session]);

  if (!session || !isVisible) {
    return null;
  }

  const handleRestore = () => {
    onRestore(session.tabs);
    setIsVisible(false);
    onClose?.();
  };

  const handleStartFresh = () => {
    onStartFresh();
    setIsVisible(false);
    onClose?.();
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  // Format timestamp for display
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="session-restore-overlay">
      <div className="session-restore-dialog glass-card">
        <div className="session-restore-header">
          <h2>Restore Previous Session?</h2>
          <p className="session-restore-time">
            Last session: {formatTime(session.timestamp)}
          </p>
        </div>

        <div className="session-restore-tabs">
          <p className="session-restore-tabs-label">
            {session.tabs.length} tab{session.tabs.length !== 1 ? 's' : ''} available:
          </p>
          <div className="session-restore-tabs-list">
            {session.tabs.slice(0, 5).map((tab, index) => (
              <div key={index} className="session-restore-tab-item">
                {tab.favicon && (
                  <img 
                    src={tab.favicon} 
                    alt="" 
                    className="session-restore-tab-favicon"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <div className="session-restore-tab-info">
                  <div className="session-restore-tab-title">{tab.title || 'Untitled'}</div>
                  <div className="session-restore-tab-url">{tab.url}</div>
                </div>
              </div>
            ))}
            {session.tabs.length > 5 && (
              <div className="session-restore-tab-more">
                +{session.tabs.length - 5} more tab{session.tabs.length - 5 !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        <div className="session-restore-actions">
          <button 
            className="btn btn-primary"
            onClick={handleRestore}
          >
            Restore Session
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleStartFresh}
          >
            Start Fresh
          </button>
          <button 
            className="btn btn-tertiary"
            onClick={handleClose}
            title="Close without choosing (will restore on next startup)"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionRestoreDialog;
