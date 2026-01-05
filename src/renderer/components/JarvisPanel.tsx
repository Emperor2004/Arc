import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Recommendation, FeedbackValue } from '../../core/types';

export type JarvisPanelHandle = {
    refresh: () => void;
};

interface JarvisPanelProps {
    refreshTrigger?: number;
    onMaximize?: () => void;
    isMaximized?: boolean;
}

interface Message {
    from: 'user' | 'jarvis';
    text: string;
}

type JarvisStatus = 'idle' | 'thinking' | 'error';

// Local helper for "smart" replies
const getJarvisReply = async (text: string): Promise<{ text: string; action?: 'refresh' | 'history' }> => {
    const lower = text.toLowerCase();

    // Handle history queries
    if (lower.includes('history') || lower.includes('recent') || lower.includes('visited')) {
        try {
            if (window.arc && window.arc.getRecentHistory) {
                const history = await window.arc.getRecentHistory(5);
                if (history.length === 0) {
                    return {
                        text: "You haven't visited any sites yet. Start browsing and I'll remember where you've been!"
                    };
                }
                const historyText = history
                    .map((h, i) => `${i + 1}. ${h.title || h.url}`)
                    .join('\n');
                return {
                    text: `Here's your recent history:\n${historyText}`,
                    action: 'history'
                };
            }
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
        return { text: "I couldn't retrieve your history right now." };
    }

    // Handle recommendation queries
    if (lower.includes('recommend') || lower.includes('suggest') || lower.includes('refresh')) {
        return {
            text: "I’ve updated your recommendations based on where you’ve been browsing.",
            action: 'refresh'
        };
    }

    return {
        text: "I'm still learning to chat. Try asking for 'history' or 'recommendations'!"
    };
};

const JarvisPanel = forwardRef<JarvisPanelHandle, JarvisPanelProps>(({ refreshTrigger, onMaximize, isMaximized }, ref) => {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [status, setStatus] = useState<JarvisStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [feedback, setFeedback] = useState<Record<string, FeedbackValue>>({});

    // Expose refresh function via ref
    useImperativeHandle(ref, () => ({
        refresh: fetchRecommendations
    }));

    const fetchRecommendations = async () => {
        setStatus('thinking');
        setError(null);
        try {
            if (window.arc && window.arc.getJarvisRecommendations) {
                const recs = await window.arc.getJarvisRecommendations();
                setRecommendations(recs);
                setStatus('idle');
            } else {
                console.warn('Jarvis API not available');
                setStatus('error');
                setError('Jarvis API missing');
            }
        } catch (err) {
            console.error('Failed to load recommendations:', err);
            setStatus('error');
            setError('Could not reach Jarvis.');
        }
    };

    // Initial load
    useEffect(() => {
        fetchRecommendations();
    }, []);

    // Refresh on trigger (debounced)
    useEffect(() => {
        if (!refreshTrigger) return;
        const timer = setTimeout(() => {
            fetchRecommendations();
        }, 10000);
        return () => clearTimeout(timer);
    }, [refreshTrigger]);

    // Scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userText = input.trim();
        setMessages(prev => [...prev, { from: 'user', text: userText }]);
        setInput('');

        setStatus('thinking');

        // Simulate thinking delay
        setTimeout(async () => {
            const reply = await getJarvisReply(userText);
            setMessages(prev => [...prev, { from: 'jarvis', text: reply.text }]);

            if (reply.action === 'refresh') {
                fetchRecommendations();
            } else {
                setStatus('idle');
            }
        }, 600);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSend();
    };

    const handleOpen = (url: string) => {
        if (window.arc) {
            window.arc.navigate(url);
        }
    };

    const handleFeedback = (rec: Recommendation, value: FeedbackValue) => {
        // Update local state
        setFeedback(prev => ({ ...prev, [rec.url]: value }));

        // Send to backend (if available)
        if (window.arc && (window.arc as any).sendJarvisFeedback) {
            (window.arc as any).sendJarvisFeedback({
                id: rec.id,
                url: rec.url,
                value,
                created_at: Date.now()
            });
        }
        console.log(`Feedback: ${value} for ${rec.url}`);
    };

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
                            onClick={fetchRecommendations}
                            className="icon-button icon-button--glass"
                            type="button"
                            title="Refresh recommendations"
                        >
                            ↻
                        </button>
                        {/* Maximize Button */}
                        {onMaximize && (
                            <button
                                onClick={onMaximize}
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
                                    className="round-btn"
                                    style={{
                                        flex: 1,
                                        fontSize: '12px',
                                        padding: '6px',
                                        background: feedback[rec.url] === 'like' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                                        border: '1px solid var(--glass-border)'
                                    }}
                                    onClick={() => handleFeedback(rec, 'like')}
                                    disabled={!!feedback[rec.url]}
                                >
                                    👍
                                </button>
                                <button
                                    className="round-btn"
                                    style={{
                                        flex: 1,
                                        fontSize: '12px',
                                        padding: '6px',
                                        background: feedback[rec.url] === 'dislike' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                                        border: '1px solid var(--glass-border)'
                                    }}
                                    onClick={() => handleFeedback(rec, 'dislike')}
                                    disabled={!!feedback[rec.url]}
                                >
                                    👎
                                </button>
                                <button
                                    className="round-btn"
                                    style={{
                                        flex: 2,
                                        fontSize: '12px',
                                        padding: '6px',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid var(--glass-border)'
                                    }}
                                    onClick={() => handleOpen(rec.url)}
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
            <div style={{ display: 'flex', gap: '8px' }}>
                <input
                    type="text"
                    className="pill-input"
                    placeholder="Ask Jarvis..."
                    style={{ flex: 1, boxSizing: 'border-box', background: 'rgba(0,0,0,0.3)' }}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={status === 'thinking'}
                />
                <button className="round-btn" onClick={handleSend} style={{ padding: '0 16px' }} disabled={status === 'thinking'}>
                    Send
                </button>
            </div>
        </div>
    );
});

export default JarvisPanel;
