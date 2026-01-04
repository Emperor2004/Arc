import React, { useState } from 'react';
import WebviewContainer from './WebviewContainer';

// Define the interface for the exposed API
import { Recommendation, HistoryEntry } from '../../core/types';

// Define the interface for the exposed API
interface ArcAPI {
    navigate: (url: string) => void;
    onNavigation: (callback: (event: any, url: string) => void) => void;
    pageLoaded: (data: { url: string; title: string }) => void;
    getJarvisRecommendations: (limit?: number) => Promise<Recommendation[]>;
    getRecentHistory: (limit?: number) => Promise<HistoryEntry[]>;
}


// Extend Window interface to include arc
declare global {
    interface Window {
        arc: ArcAPI;
    }
}

interface BrowserShellProps {
    onNavigate?: () => void;
}

const BrowserShell: React.FC<BrowserShellProps> = ({ onNavigate }) => {
    const [url, setUrl] = useState('');
    const [currentUrl, setCurrentUrl] = useState('');

    const handleNavigate = () => {
        let targetUrl = url;
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = `https://${targetUrl}`;
        }

        if (window.arc) {
            window.arc.navigate(targetUrl);
            setCurrentUrl(targetUrl); // Update local state for webview
            if (onNavigate) onNavigate();
        } else {
            console.warn('window.arc is not defined');
        }
    };


    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleNavigate();
        }
    };

    return (
        <div className="glass-card" style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            <div style={{
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                borderBottom: '1px solid var(--glass-border)'
            }}>
                <button className="round-btn" onClick={() => { }}>←</button>
                <button className="round-btn" onClick={() => { }}>→</button>
                <button className="round-btn" onClick={() => { }}>↻</button>

                <input
                    type="text"
                    className="pill-input"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
                    placeholder="Search or enter URL"
                    style={{ flex: 1 }}
                />

                <button className="round-btn" onClick={handleNavigate}>Go</button>
            </div>

            <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                <WebviewContainer currentUrl={currentUrl} />
            </div>
        </div>
    );
};


export default BrowserShell;
