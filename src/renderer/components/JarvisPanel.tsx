import React, { useState, useEffect } from 'react';
import { Recommendation } from '../../core/types';

interface JarvisPanelProps {
    refreshTrigger?: number;
}

const JarvisPanel: React.FC<JarvisPanelProps> = ({ refreshTrigger }) => {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initial load
    useEffect(() => {
        loadRecommendations();
    }, []);

    // Refresh on trigger (debounced)
    useEffect(() => {
        if (!refreshTrigger) return;
        const timer = setTimeout(() => {
            loadRecommendations();
        }, 10000); // 10s delay to allow history to settle / become "old" enough or just wait for browsing session
        return () => clearTimeout(timer);
    }, [refreshTrigger]);

    const loadRecommendations = async () => {
        setLoading(true);
        setError(null);
        try {
            if (window.arc && window.arc.getJarvisRecommendations) {
                const recs = await window.arc.getJarvisRecommendations();
                setRecommendations(recs);
            } else {
                console.warn('Jarvis API not available');
            }
        } catch (err) {
            console.error('Failed to load recommendations:', err);
            setError('Could not reach Jarvis.');
        } finally {
            setLoading(false);
        }
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
                        <div className="status-dot"></div>
                        <span style={{ fontWeight: 600, color: 'var(--accent)', letterSpacing: '2px' }}>ONLINE</span>
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

            {/* Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                        Jarvis is thinking...
                    </div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--danger)' }}>
                        {error}
                    </div>
                ) : recommendations.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '16px' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px'
                        }}>
                            ✨
                        </div>
                        <p style={{ fontSize: '15px', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0 }}>
                            When I know you better, I’ll start suggesting websites you’ll love.
                        </p>
                        <button className="round-btn" style={{
                            background: 'var(--accent)',
                            color: 'white',
                            marginTop: '8px',
                            padding: '10px 24px',
                            fontWeight: 500
                        }} onClick={loadRecommendations}>
                            Start exploring
                        </button>
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

                            <div style={{ fontWeight: 600, fontSize: '15px', wordBreak: 'break-all' }}>
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
                                Open in Arc
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Input Area */}
            <div style={{ marginTop: 'auto' }}>
                <input
                    type="text"
                    className="pill-input"
                    placeholder="Ask Jarvis..."
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.3)' }}
                />
            </div>
        </div>
    );
};

export default JarvisPanel;
