import React from 'react';
import WebviewContainer from './WebviewContainer';
import TabBar from './TabBar';
import AddressBar from './AddressBar';
import { useTabsController } from '../hooks/useTabsController';
import { useSettingsController } from '../hooks/useSettingsController';
import { useDebug } from '../contexts/DebugContext';

export interface BrowserShellProps {
    onNavigationComplete?: () => void;
    onMaximize?: () => void;
    isMaximized?: boolean;
}

const BrowserShell: React.FC<BrowserShellProps> = ({ onNavigationComplete, onMaximize, isMaximized }) => {
    const tabsController = useTabsController();
    const { settings } = useSettingsController();
    const { updateDebugState, logAction } = useDebug();
    const [canGoBack, setCanGoBack] = React.useState(false);
    const [canGoForward, setCanGoForward] = React.useState(false);
    
    const { 
        tabs, 
        activeTab, 
        url, 
        setUrl, 
        handleNewTab, 
        handleNewIncognitoTab, 
        handleTabSelect, 
        handleTabClose, 
        handleTabTitleUpdate,
        updateActiveTabUrl
    } = tabsController;

    const isIncognitoActive = activeTab?.incognito || false;

    // Update debug state when active tab changes
    React.useEffect(() => {
        updateDebugState({ 
            activeTabId: activeTab?.id || null,
            isIncognito: isIncognitoActive
        });
        if (activeTab) {
            logAction(`Tab switched to: ${activeTab.title || activeTab.url} (${activeTab.incognito ? 'incognito' : 'normal'})`);
        }
    }, [activeTab, isIncognitoActive, updateDebugState, logAction]);

    const handleNavigate = () => {
        let targetUrl = url;
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = `https://${targetUrl}`;
        }

        if (window.arc && activeTab) {
            window.arc.navigate(targetUrl);
            logAction(`Navigation to: ${targetUrl}`);
            
            // Update the active tab's URL
            updateActiveTabUrl(targetUrl);
            
            // Trigger navigation completion callback
            if (onNavigationComplete) {
                onNavigationComplete();
            }
        } else {
            console.warn('window.arc is not defined or no active tab');
        }
    };

    const handleBack = () => {
        const webview = document.querySelector('webview');
        if (webview && (webview as any).canGoBack()) {
            (webview as any).goBack();
            logAction('Browser back navigation');
        }
    };

    const handleForward = () => {
        const webview = document.querySelector('webview');
        if (webview && (webview as any).canGoForward()) {
            (webview as any).goForward();
            logAction('Browser forward navigation');
        }
    };

    const handleReload = () => {
        const webview = document.querySelector('webview');
        if (webview) {
            (webview as any).reload();
            logAction('Browser reload');
        }
    };

    // Update navigation state when webview changes
    const updateNavigationState = () => {
        const webview = document.querySelector('webview');
        if (webview) {
            setCanGoBack((webview as any).canGoBack());
            setCanGoForward((webview as any).canGoForward());
        } else {
            setCanGoBack(false);
            setCanGoForward(false);
        }
    };

    // Update navigation state periodically
    React.useEffect(() => {
        const interval = setInterval(updateNavigationState, 500);
        return () => clearInterval(interval);
    }, [activeTab]);

    return (
        <div className="browser-shell glass-card">
            {/* Tab Bar */}
            <TabBar
                tabs={tabs}
                onNewTab={handleNewTab}
                onNewIncognitoTab={handleNewIncognitoTab}
                onTabSelect={handleTabSelect}
                onTabClose={handleTabClose}
                incognitoEnabled={settings.incognitoEnabled}
            />

            {/* Incognito Banner */}
            {isIncognitoActive && (
                <div className="incognito-banner">
                    🕶️ Incognito: Arc won't save your history for this tab
                </div>
            )}

            {/* Toolbar with address bar */}
            <AddressBar
                url={url}
                onUrlChange={setUrl}
                onNavigate={handleNavigate}
                onBack={handleBack}
                onForward={handleForward}
                onReload={handleReload}
                onMaximize={onMaximize}
                isMaximized={isMaximized}
                canGoBack={canGoBack}
                canGoForward={canGoForward}
                hasActiveTab={!!activeTab}
            />

            {/* Webview content */}
            <div className="browser-content">
                {activeTab && (
                    <WebviewContainer 
                        currentUrl={activeTab.url}
                        tabId={activeTab.id}
                        incognito={activeTab.incognito || false}
                        onPageLoaded={onNavigationComplete}
                        onTitleUpdate={handleTabTitleUpdate}
                    />
                )}
            </div>
        </div>
    );
};

export default BrowserShell;
