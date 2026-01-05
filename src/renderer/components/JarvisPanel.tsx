import React, { useEffect, forwardRef, useImperativeHandle } from 'react';
import { useJarvisController } from '../hooks/useJarvisController';
import { useDebug } from '../contexts/DebugContext';

export type JarvisPanelHandle = {
    refresh: () => void;
};

export interface JarvisPanelProps {
    refreshTrigger?: number;
    onMaximize?: () => void;
    isMaximized?: boolean;
    onNavigate?: (url: string) => void;
}

const JarvisPanel = forwardRef<JarvisPanelHandle, JarvisPanelProps>(({ refreshTrigger, onMaximize, isMaximized, onNavigate }, ref) => {
    const jarvisController = useJarvisController(onNavigate);
    const { updateDebugState, logAction } = useDebug();
    
    const {
        recommendations,
        status,
        error,
        messages,
        input,
        feedback,
        messagesEndRef,
        fetchRecommendations,
        handleSend,
        handleInputChange,
        handleKeyDown,
        handleFeedback,
        handleOpen
    } = jarvisController;

    // Update debug state when Jarvis status changes
    useEffect(() => {
        updateDebugState({ jarvisStatus: status });
        if (status === 'thinking') {
            logAction('Jarvis started thinking');
        } else if (status === 'error') {
            logAction(`Jarvis error: ${error || 'Unknown error'}`);
        } else if (status === 'idle') {
            logAction('Jarvis returned to idle');
        }
    }, [status, error, updateDebugState, logAction]);

    // Expose refresh function via ref
    useImperativeHandle(ref, () => ({
        refresh: fetchRecommendations
    }));

    // Initial load
    useEffect(() => {
        fetchRecommendations();
        logAction('Jarvis panel initialized');
    }, [logAction]);

    // Refresh on trigger (debounced)
    useEffect(() => {
        if (!refreshTrigger) return;
        const timer = setTimeout(() => {
            fetchRecommendations();
        }, 10000);
        return () => clearTimeout(timer);
    }, [refreshTrigger, fetchRecommendations]);

    const getKindBadge = (kind: string) => {
        switch (kind) {
            case 'favorite': return '❤️ Favorite';
            case 'old_but_gold': return '🕰️ Rediscover';
            case 'explore': return '🧭 Explore';
            default: return '✨';
        }
    };

    // Status UI helper
    const getStatusUI = () => {
        switch (status) {
            case 'thinking':
                return { color: 'var(--warning, #fbbf24)', text: 'Thinking...' };
            case 'error':
                return { color: 'var(--danger, #ef4444)', text: 'Issue' };
            default:
                return { color: 'var(--accent)', text: 'ONLINE' };
        }
    };

    const statusUI = getStatusUI();

    return (
        <div className="glass-card jarvis-panel" style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div>
                <div className="jarvis-header" style={{ marginBottom: '4px', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="status-dot" style={{ background: statusUI.color, boxShadow: `0 0 8px ${statusUI.color}` }}></div>
                        <span style={{ fontWeight: 600, color: statusUI.color, letterSpacing: '2px', fontSize: '12px' }}>
                            {statusUI.text}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {/* Refresh Button */}
                        <button
                            onClick={() => {
                                fetchRecommendations();
                                logAction('Jarvis refresh manually triggered');
                            }}
                            className="icon-button icon-button--glass"
                            type="button"
                            title="Refresh recommendations"
                        >
                            ↻
                        </button>
                        {/* Maximize Button */}
                        {onMaximize && (
                            <button
                                onClick={() => {
                                    onMaximize();
                                    logAction(`Jarvis ${isMaximized ? 'restored' : 'maximized'}`);
                                }}
                                className="icon-button icon-button--glass"
                                type="button"
                                title={isMaximized ? "Restore Jarvis" : "Maximize Jarvis"}
                            >
                                ⤢
                            </button>
                        )}
                    </div>
                </div>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Jarvis</h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Your Arc discovery assistant
                </p>
            </div>

            {/* Recommendations Area (Scrollable flex item) */}
            <div style={{
                flex: '1 1 50%', // Take up ~50% of available space initially
                minHeight: '150px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                paddingBottom: '10px',
                borderBottom: '1px solid var(--glass-border)'
            }}>
                {status === 'thinking' && recommendations.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                        Finding gems...
                    </div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--danger)' }}>
                        {error}
                    </div>
                ) : recommendations.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '16px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px'
                        }}>
                            ✨
                        </div>
                        <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-secondary)', margin: 0 }}>
                            Refining my suggestions...
                        </p>
                    </div>
                ) : (
                    recommendations.map(rec => (
                        <div key={rec.id || rec.url} style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: 'var(--radius-md)',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            backdropFilter: 'blur(10px)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{
                                    fontSize: '10px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    background: 'rgba(0,0,0,0.3)',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    color: 'var(--accent)'
                                }}>
                                    {getKindBadge(rec.kind)}
                                </span>
                            </div>

                            <div style={{ fontWeight: 600, fontSize: '14px', wordBreak: 'break-all' }}>
                                {rec.title || rec.url}
                            </div>

                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                {rec.reason}
                            </div>

                            {/* Feedback indicator */}
                            {feedback[rec.url] && (
                                <div style={{
                                    fontSize: '11px',
                                    padding: '4px 8px',
                                    borderRadius: '12px',
                                    background: feedback[rec.url] === 'like' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                    color: feedback[rec.url] === 'like' ? '#22c55e' : '#ef4444',
                                    alignSelf: 'flex-start'
                                }}>
                                    {feedback[rec.url] === 'like' ? '✓ Liked' : '✗ Muted'}
                                </div>
                            )}

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                <button
                                    className="btn-secondary"
                                    style={{
                                        flex: 1,
                                        fontSize: '12px',
                                        padding: '6px',
                                        background: feedback[rec.url] === 'like' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                                        borderColor: feedback[rec.url] === 'like' ? '#22c55e' : 'var(--glass-border)'
                                    }}
                                    onClick={() => {
                                        handleFeedback(rec, 'like');
                                        logAction(`Liked recommendation: ${rec.title || rec.url}`);
                                    }}
                                    disabled={!!feedback[rec.url]}
                                >
                                    👍
                                </button>
                                <button
                                    className="btn-secondary"
                                    style={{
                                        flex: 1,
                                        fontSize: '12px',
                                        padding: '6px',
                                        background: feedback[rec.url] === 'dislike' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                                        borderColor: feedback[rec.url] === 'dislike' ? '#ef4444' : 'var(--glass-border)'
                                    }}
                                    onClick={() => {
                                        handleFeedback(rec, 'dislike');
                                        logAction(`Disliked recommendation: ${rec.title || rec.url}`);
                                    }}
                                    disabled={!!feedback[rec.url]}
                                >
                                    👎
                                </button>
                                <button
                                    className="btn-primary"
                                    style={{
                                        flex: 2,
                                        fontSize: '12px',
                                        padding: '6px'
                                    }}
                                    onClick={() => {
                                        handleOpen(rec.url);
                                        logAction(`Opened recommendation: ${rec.title || rec.url}`);
                                    }}
                                >
                                    Open
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Chat Area */}
            <div style={{
                flex: '1 1 auto',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', marginTop: 'auto' }}>
                        Chat with Jarvis...
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} style={{
                        alignSelf: msg.from === 'user' ? 'flex-end' : 'flex-start',
                        background: msg.from === 'user' ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        maxWidth: '85%',
                        lineHeight: '1.4'
                    }}>
                        {msg.text}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <textarea
                    className="pill-input"
                    placeholder="Ask Jarvis... (Shift+Enter for new line)"
                    style={{ 
                        flex: 1, 
                        boxSizing: 'border-box', 
                        background: 'rgba(0,0,0,0.3)',
                        resize: 'none',
                        minHeight: '40px',
                        maxHeight: '120px',
                        overflow: 'auto'
                    }}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    disabled={status === 'thinking'}
                    rows={1}
                />
                <button 
                    className="btn-primary" 
                    onClick={() => {
                        handleSend();
                        logAction(`Chat message sent: ${input.substring(0, 50)}${input.length > 50 ? '...' : ''}`);
                    }} 
                    style={{ padding: '0 16px', height: '40px' }} 
                    disabled={status === 'thinking' || !input.trim()}
                >
                    Send
                </button>
            </div>
        </div>
    );
});

export default JarvisPanel;