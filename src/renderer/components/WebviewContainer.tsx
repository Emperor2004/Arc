import React, { useEffect, useRef } from 'react';

// Declare webview tag as an intrinsic element
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'webview': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { src?: string; allowpopups?: string }, HTMLElement>;
        }
    }
}

interface WebviewContainerProps {
    currentUrl: string;
    onPageLoaded?: () => void;
}

const WebviewContainer: React.FC<WebviewContainerProps> = ({ currentUrl, onPageLoaded }) => {
    const webviewRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const webview = webviewRef.current;
        if (webview) {
            const handleDidFinishLoad = () => {
                // We need to cast to any because the Electron types for webview methods aren't easily available in standard React JSX
                const title = (webview as any).getTitle();
                const src = (webview as any).getURL();
                console.log(`Page loaded: ${title}`);
                if (window.arc) {
                    window.arc.pageLoaded({ url: src, title });
                }
                // Trigger page loaded callback
                if (onPageLoaded) {
                    onPageLoaded();
                }
            };

            webview.addEventListener('did-finish-load', handleDidFinishLoad);

            return () => {
                webview.removeEventListener('did-finish-load', handleDidFinishLoad);
            };
        }
    }, [onPageLoaded]);

    if (!currentUrl) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', color: '#888' }}>
                Enter a URL to browse
            </div>
        );
    }

    return (
        <webview
            ref={webviewRef}
            src={currentUrl}
            style={{ display: 'flex', flex: 1, width: '100%', height: '100%' }}
        />
    );
};

export default WebviewContainer;
