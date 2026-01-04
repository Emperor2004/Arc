import React, { useState } from 'react';

// Define the interface for the exposed API
interface ArcAPI {
    navigate: (url: string) => void;
    onNavigation: (callback: (event: any, url: string) => void) => void;
}

// Extend Window interface to include arc
declare global {
    interface Window {
        arc: ArcAPI;
    }
}

const BrowserShell: React.FC = () => {
    const [url, setUrl] = useState('');

    const handleNavigate = () => {
        if (window.arc) {
            window.arc.navigate(url);
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
            <div style={{ display: 'flex', marginBottom: '10px', gap: '10px' }}>
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter URL"
                    style={{ flex: 1, padding: '8px' }}
                />
                <button onClick={handleNavigate} style={{ padding: '8px 16px' }}>
                    Go
                </button>
            </div>
            <div style={{ flex: 1, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ccc' }}>
                Webview goes here
            </div>
        </div>
    );
};

export default BrowserShell;
