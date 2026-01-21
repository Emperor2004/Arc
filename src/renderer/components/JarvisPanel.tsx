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

    // Listen for Jarvis messages from command palette
    useEffect(() => {
        const handleJarvisMessage = (event: CustomEvent) => {
            const { message } = event.detail;
            if (message && jarvisController.addMessage) {
                jarvisController.addMessage(message);
                logAction('Jarvis message added from command palette');
            }
        };

        window.addEventListener('arc:jarvis-message', handleJarvisMessage as EventListener);

        return () => {
            window.removeEventListener('arc:jarvis-message', handleJarvisMessage as EventListener);
        };
    }, [jarvisController, logAction]);

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
        <div className="glass-card jarvis-panel" 
             role="region" 
             aria-labelledby="jarvis-heading"
             aria-describedby="jarvis-description"
             style={{
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
                        <div className="status-dot" 
                             style={{ background: statusUI.color, boxShadow: `0 0 8px ${statusUI.color}` }}
                             role="status"
                             aria-label={`Jarvis status: ${statusUI.text}`}></div>
                        <span style={{ fontWeight: 600, color: statusUI.color, letterSpacing: '2px', fontSize: '12px' }}>
                            {statusUI.text}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }} role="toolbar" aria-label="Jarvis controls">
                        {/* Refresh Button */}
                        <button
                            onClick={() => {
                                fetchRecommendations();
                                logAction('Jarvis refresh manually triggered');
                            }}
                            className="icon-button icon-button--glass"
                            type="button"
                            title="Refresh recommendations"
                            aria-label="Refresh recommendations"
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
                                aria-label={isMaximized ? "Restore Jarvis panel" : "Maximize Jarvis panel"}
                            >
                                ⤢
                            </button>
                        )}
                    </div>
                </div>
                <h2 id="jarvis-heading" style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Jarvis</h2>
                <p id="jarvis-description" style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
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
            }}
            role="region"
            aria-labelledby="recommendations-heading"
            aria-live="polite">
                <h3 id="recommendations-heading" className="sr-only">Recommendations</h3>
                {status === 'thinking' && recommendations.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}
                         role="status" aria-live="polite">
                        Finding gems...
                    </div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--danger)' }}
                         role="alert" aria-live="assertive">
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
                        }}
                        aria-hidden="true">
                            ✨
                        </div>
                        <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-secondary)', margin: 0 }}>
                            Refining my suggestions...
                        </p>
                    </div>
                ) : (
                    recommendations.map((rec, index) => (
                        <div key={rec.id || rec.url} 
                             style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: 'var(--radius-md)',
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                backdropFilter: 'blur(10px)'
                             }}
                             role="article"
                             aria-labelledby={`rec-title-${index}`}
                             aria-describedby={`rec-reason-${index}`}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{
                                    fontSize: '10px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    background: 'rgba(0,0,0,0.3)',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    color: 'var(--accent)'
                                }}
                                aria-label={`Recommendation type: ${getKindBadge(rec.kind)}`}>
                                    {getKindBadge(rec.kind)}
                                </span>
                                <span style={{
                                    fontSize: '11px',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 600
                                }}
                                aria-label={`Confidence score: ${Math.round(rec.score * 100)} percent`}>
                                    {Math.round(rec.score * 100)}%
                                </span>
                            </div>

                            <div id={`rec-title-${index}`} style={{ fontWeight: 600, fontSize: '14px', wordBreak: 'break-all' }}>
                                {rec.title || rec.url}
                            </div>

                            <div id={`rec-reason-${index}`} style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                {rec.reason}
                            </div>

                            {/* Weight indicators - show if personalized scores are available */}
                            {rec.personalizedScores && (
                                <div style={{
                                    display: 'flex',
                                    gap: '4px',
                                    marginTop: '4px',
                                    flexWrap: 'wrap'
                                }}>
                                    <div style={{
                                        fontSize: '9px',
                                        padding: '2px 6px',
                                        borderRadius: '8px',
                                        background: 'rgba(59, 130, 246, 0.2)',
                                        color: '#60a5fa',
                                        border: '1px solid rgba(59, 130, 246, 0.3)'
                                    }}>
                                        F: {Math.round(rec.personalizedScores.frequency * 100)}%
                                    </div>
                                    <div style={{
                                        fontSize: '9px',
                                        padding: '2px 6px',
                                        borderRadius: '8px',
                                        background: 'rgba(34, 197, 94, 0.2)',
                                        color: '#4ade80',
                                        border: '1px solid rgba(34, 197, 94, 0.3)'
                                    }}>
                                        R: {Math.round(rec.personalizedScores.recency * 100)}%
                                    </div>
                                    <div style={{
                                        fontSize: '9px',
                                        padding: '2px 6px',
                                        borderRadius: '8px',
                                        background: 'rgba(168, 85, 247, 0.2)',
                                        color: '#a78bfa',
                                        border: '1px solid rgba(168, 85, 247, 0.3)'
                                    }}>
                                        FB: {Math.round(rec.personalizedScores.feedback * 100)}%
                                    </div>
                                </div>
                            )}

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
                            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }} role="group" aria-label="Recommendation actions">
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
                                    aria-label={`Like recommendation: ${rec.title || rec.url}`}
                                    aria-pressed={feedback[rec.url] === 'like'}
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
                                    aria-label={`Dislike recommendation: ${rec.title || rec.url}`}
                                    aria-pressed={feedback[rec.url] === 'dislike'}
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
                                    aria-label={`Open recommendation: ${rec.title || rec.url}`}
                                >
                                    Open
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Page Analysis Actions */}
            <div style={{
                padding: '12px 0',
                borderBottom: '1px solid var(--glass-border)'
            }}
            role="region"
            aria-labelledby="analysis-heading">
                <h3 id="analysis-heading" style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '14px', 
                    fontWeight: 600,
                    color: 'var(--text-primary)'
                }}>
                    Page Analysis
                </h3>
                <div style={{ 
                    display: 'flex', 
                    gap: '6px', 
                    flexWrap: 'wrap' 
                }} 
                role="group" 
                aria-label="Page analysis actions">
                    <button
                        className="btn-secondary"
                        style={{
                            flex: '1 1 auto',
                            fontSize: '11px',
                            padding: '6px 8px',
                            minWidth: '70px'
                        }}
                        onClick={async () => {
                            try {
                                const { executeJarvisAction } = await import('../../core/jarvisActions');
                                const result = await executeJarvisAction('analyze');
                                
                                // Add the analysis result to chat
                                const analysisMessage = {
                                    from: 'jarvis',
                                    text: result
                                };
                                
                                // Trigger the message display (we'll need to expose this from the controller)
                                jarvisController.addMessage(analysisMessage);
                                logAction('Page analysis completed');
                            } catch (error) {
                                console.error('Analysis error:', error);
                                logAction(`Page analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                            }
                        }}
                        disabled={status === 'thinking'}
                        aria-label="Analyze current page content"
                        title="Get a comprehensive analysis of the current page"
                    >
                        🔍 Analyze
                    </button>
                    <button
                        className="btn-secondary"
                        style={{
                            flex: '1 1 auto',
                            fontSize: '11px',
                            padding: '6px 8px',
                            minWidth: '70px'
                        }}
                        onClick={async () => {
                            try {
                                const { executeJarvisAction } = await import('../../core/jarvisActions');
                                const result = await executeJarvisAction('summarize');
                                
                                // Add the summary result to chat
                                const summaryMessage = {
                                    from: 'jarvis',
                                    text: result
                                };
                                
                                jarvisController.addMessage(summaryMessage);
                                logAction('Page summary completed');
                            } catch (error) {
                                console.error('Summary error:', error);
                                logAction(`Page summary failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                            }
                        }}
                        disabled={status === 'thinking'}
                        aria-label="Summarize current page content"
                        title="Get a concise summary of the current page"
                    >
                        📝 Summary
                    </button>
                    <button
                        className="btn-secondary"
                        style={{
                            flex: '1 1 auto',
                            fontSize: '11px',
                            padding: '6px 8px',
                            minWidth: '70px'
                        }}
                        onClick={async () => {
                            try {
                                const { executeJarvisAction } = await import('../../core/jarvisActions');
                                const result = await executeJarvisAction('explain');
                                
                                // Add the explanation result to chat
                                const explanationMessage = {
                                    from: 'jarvis',
                                    text: result
                                };
                                
                                jarvisController.addMessage(explanationMessage);
                                logAction('Page explanation completed');
                            } catch (error) {
                                console.error('Explanation error:', error);
                                logAction(`Page explanation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                            }
                        }}
                        disabled={status === 'thinking'}
                        aria-label="Explain current page in simple terms"
                        title="Get a simple explanation of the current page"
                    >
                        💡 Explain
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div style={{
                flex: '1 1 auto',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}
            role="log"
            aria-labelledby="chat-heading"
            aria-live="polite">
                <h3 id="chat-heading" className="sr-only">Chat with Jarvis</h3>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', marginTop: 'auto' }}>
                        Chat with Jarvis...
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} 
                         style={{
                            alignSelf: msg.from === 'user' ? 'flex-end' : 'flex-start',
                            background: msg.from === 'user' ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            padding: '8px 12px',
                            borderRadius: '12px',
                            fontSize: '13px',
                            maxWidth: '85%',
                            lineHeight: '1.4'
                         }}
                         role="article"
                         aria-label={`Message from ${msg.from === 'user' ? 'you' : 'Jarvis'}`}>
                        {msg.text}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }} role="group" aria-label="Chat input">
                <label htmlFor="jarvis-input" className="sr-only">Message to Jarvis</label>
                <textarea
                    id="jarvis-input"
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
                    aria-describedby="jarvis-input-help"
                />
                <div id="jarvis-input-help" className="sr-only">
                    Type your message to Jarvis. Press Enter to send, or Shift+Enter for a new line.
                </div>
                <button 
                    className="btn-primary" 
                    onClick={() => {
                        handleSend();
                        logAction(`Chat message sent: ${input.substring(0, 50)}${input.length > 50 ? '...' : ''}`);
                    }} 
                    style={{ padding: '0 16px', height: '40px' }} 
                    disabled={status === 'thinking' || !input.trim()}
                    aria-label="Send message to Jarvis"
                >
                    Send
                </button>
            </div>
        </div>
    );
});

export default JarvisPanel;