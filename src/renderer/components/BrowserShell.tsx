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
    onNavigationComplete?: () => void;
}

const BrowserShell: React.FC<BrowserShellProps> = ({ onNavigationComplete }) => {
    const [url, setUrl] = useState('');
    const [currentUrl, setCurrentUrl] = useState('');

    const handleNavigate = () => {
        let targetUrl = url;
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = `https://${targetUrl}`;
        }

        if (window.arc) {
            window.arc.navigate(targetUrl);
            setCurrentUrl(targetUrl);
            // Trigger navigation completion callback
            if (onNavigationComplete) {
                onNavigationComplete();
            }
        } else {
            console.warn('window.arc is not defined');
        }
    };

    return (
        <div className="browser-shell glass-card">
            {/* Toolbar with address bar */}
            <div className="browser-toolbar">
                <div className="browser-nav-buttons">
                    <button className="round-btn" onClick={() => { }}>←</button>
                    <button className="round-btn" onClick={() => { }}>→</button>
                    <button className="round-btn" onClick={() => { }}>↻</button>
                </div>

                <div className="browser-address-bar">
                    <input
                        type="text"
                        className="pill-input"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
                        placeholder="Search or enter URL"
                    />
                    <button className="round-btn" onClick={handleNavigate}>Go</button>
                </div>
            </div>

            {/* Webview content */}
            <div className="browser-content">
                <WebviewContainer 
                    currentUrl={currentUrl} 
                    onPageLoaded={onNavigationComplete}
                />
            </div>
        </div>
    );
};

export default BrowserShell;
