import React, { useEffect, useRef } from 'react';

// Declare webview tag as an intrinsic element
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'webview': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { 
                src?: string; 
                allowpopups?: string;
                partition?: string;
                useragent?: string;
                webpreferences?: string;
            }, HTMLElement>;
        }
    }
}

interface WebviewContainerProps {
    currentUrl: string;
    tabId: string;
    incognito: boolean;
    onPageLoaded?: () => void;
    onTitleUpdate?: (title: string) => void;
}

const WebviewContainer: React.FC<WebviewContainerProps> = ({ 
    currentUrl, 
    tabId, 
    incognito, 
    onPageLoaded, 
    onTitleUpdate 
}) => {
    const webviewRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const webview = webviewRef.current;
        if (webview) {
            const handleDidFinishLoad = () => {
                // We need to cast to any because the Electron types for webview methods aren't easily available in standard React JSX
                const title = (webview as any).getTitle();
                const src = (webview as any).getURL();
                console.log(`📄 Page loaded: ${title} (${src}) - Incognito: ${incognito}`);
                
                // Update tab title
                if (onTitleUpdate) {
                    onTitleUpdate(title);
                }
                
                // Send page loaded event with incognito flag
                if (window.arc) {
                    window.arc.pageLoaded({ 
                        url: src, 
                        title,
                        tabId,
                        incognito 
                    });
                    
                    if (!incognito) {
                        console.log('📚 History recorded for:', src);
                    } else {
                        console.log('🕶️ Skipping history (incognito):', src);
                    }
                } else {
                    console.warn('⚠️ window.arc not available for history recording');
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
    }, [tabId, incognito, onPageLoaded, onTitleUpdate]);

    if (!currentUrl) {
        return (
            <div style={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: incognito ? '#2a2a2a' : '#f0f0f0', 
                color: incognito ? '#fff' : '#888' 
            }}>
                {incognito ? '🕶️ New Incognito Tab' : 'Enter a URL to browse'}
            </div>
        );
    }

    // Use different partition for incognito tabs
    const partition = incognito ? `arc-incognito-${tabId}` : 'persist:arc-main';
    
    // Set a proper user agent to avoid being blocked by websites
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    
    // Enable necessary web preferences for authentication
    const webPreferences = 'nativeWindowOpen=yes';

    return (
        <webview
            ref={webviewRef}
            src={currentUrl}
            partition={partition}
            useragent={userAgent}
            webpreferences={webPreferences}
            allowpopups="true"
            style={{ display: 'flex', flex: 1, width: '100%', height: '100%' }}
        />
    );
};

export default WebviewContainer;
