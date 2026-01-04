import React, { useState } from 'react';


const JarvisPanel: React.FC = () => {
    // Empty state logic for now
    const hasHistory = false;

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
                <div className="jarvis-header" style={{ marginBottom: '4px' }}>
                    <div className="status-dot"></div>
                    <span style={{ fontWeight: 600, color: 'var(--accent)', letterSpacing: '2px' }}>ONLINE</span>
                </div>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Jarvis</h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Your Arc discovery assistant
                </p>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '16px' }}>
                {!hasHistory ? (
                    <>
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
                        }}>
                            Start exploring
                        </button>
                    </>
                ) : (
                    <div>Recommendations will appear here.</div>
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

