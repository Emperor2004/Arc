import React, { useState, useEffect, useRef } from 'react';
import { Recommendation } from '../../core/types';

interface JarvisPanelProps {
    refreshTrigger?: number;
}

interface Message {
    from: 'user' | 'jarvis';
    text: string;
}

type JarvisStatus = 'idle' | 'thinking' | 'error';

// Local helper for "smart" replies
const getJarvisReply = async (text: string): Promise<{ text: string; action?: 'refresh' }> => {
    const lower = text.toLowerCase();
    if (lower.includes('recommend') || lower.includes('suggest') || lower.includes('refresh')) {
        return {
            text: "I’ve updated your recommendations based on where you’ve been browsing.",
            action: 'refresh'
        };
    }
    return {
        text: "I'm still learning to chat. For now, let me show you some websites you might enjoy."
    };
};

const JarvisPanel: React.FC<JarvisPanelProps> = ({ refreshTrigger }) => {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [status, setStatus] = useState<JarvisStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial load
    useEffect(() => {
        loadRecommendations();
    }, []);

    // Refresh on trigger (debounced)
    useEffect(() => {
        if (!refreshTrigger) return;
        const timer = setTimeout(() => {
            loadRecommendations();
        }, 10000);
        return () => clearTimeout(timer);
    }, [refreshTrigger]);

    // Scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadRecommendations = async () => {
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
                loadRecommendations();
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
            width: '320px',
            height: 'calc(100% - 40px)',
            margin: '20px 20px 20px 0',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
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
                    {/* Refresh Button */}
                    <button
                        onClick={loadRecommendations}
                        className="round-btn"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        title="Search for recommendations"
                    >
                        ↻
                    </button>
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

                            <button className="round-btn" style={{
                                marginTop: '8px',
                                width: '100%',
                                justifyContent: 'center',
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid var(--glass-border)'
                            }}
                                onClick={() => handleOpen(rec.url)}
                            >
                                Open
                            </button>
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
};

export default JarvisPanel;
