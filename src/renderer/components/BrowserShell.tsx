import React from 'react';
import WebviewContainer from './WebviewContainer';
import TabBar from './TabBar';
import AddressBar from './AddressBar';
import VoiceMicrophoneButton from './VoiceMicrophoneButton';
import { useTabsController } from '../hooks/useTabsController';
import { useSettingsController } from '../hooks/useSettingsController';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useSessionManager } from '../hooks/useSessionManager';
import { useTabGroups } from '../hooks/useTabGroups';
import { useDebug } from '../contexts/DebugContext';
import { normalizeInput } from '../../core/searchEngineManager';

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
        updateActiveTabUrl,
        handleTabReorder,
        restoreTabs
    } = tabsController;

    // Initialize tab groups
    const {
        groups,
        createGroup,
        addTabToGroup,
        removeTabFromGroup,
        getGroupForTab
    } = useTabGroups(tabs);

    // Initialize session manager
    useSessionManager({
        tabs,
        activeTab,
        onRestoreTabs: restoreTabs
    });

    const isIncognitoActive = activeTab?.incognito || false;

    // Define navigation handlers before they're used
    const handleReload = () => {
        const webview = document.querySelector('webview');
        if (webview) {
            (webview as any).reload();
            logAction('Browser reload');
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

    // Expose keyboard shortcut handlers
    useKeyboardShortcuts({
        newTab: handleNewTab,
        newIncognitoTab: handleNewIncognitoTab,
        closeTab: () => {
            if (activeTab) {
                handleTabClose(activeTab.id);
            }
        },
        nextTab: () => {
            const currentIndex = tabs.findIndex(t => t.id === activeTab?.id);
            if (currentIndex >= 0 && currentIndex < tabs.length - 1) {
                handleTabSelect(tabs[currentIndex + 1].id);
            }
        },
        previousTab: () => {
            const currentIndex = tabs.findIndex(t => t.id === activeTab?.id);
            if (currentIndex > 0) {
                handleTabSelect(tabs[currentIndex - 1].id);
            }
        },
        focusAddressBar: () => {
            const addressBar = document.querySelector('input[type="text"]') as HTMLInputElement;
            if (addressBar) {
                addressBar.focus();
                addressBar.select();
                logAction('Address bar focused');
            }
        },
        reloadPage: handleReload,
        clearData: () => {
            if (window.arc) {
                window.arc.clearHistory?.();
                window.arc.clearFeedback?.();
                logAction('Data cleared');
            }
        },
    });

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

    // Listen for navigation events from main process
    React.useEffect(() => {
        if (window.arc && window.arc.onNavigation) {
            const handleNavigationEvent = (_event: any, url: string) => {
                console.log('📍 [BrowserShell] Navigation event received:', url);
                
                // Find the active tab and navigate its webview
                if (activeTab) {
                    console.log(`📍 [BrowserShell] Updating active tab ${activeTab.id} to URL: ${url}`);
                    // Update the tab's URL
                    updateActiveTabUrl(url);
                    setUrl(url);
                    
                    logAction(`Navigation event: ${url}`);
                } else {
                    console.warn('⚠️ [BrowserShell] No active tab for navigation');
                }
            };
            
            window.arc.onNavigation(handleNavigationEvent);
        }
    }, [activeTab, updateActiveTabUrl, setUrl, logAction]);

    // Listen for voice navigation events
    React.useEffect(() => {
        const handleVoiceNavigation = (event: CustomEvent) => {
            const { url: voiceUrl } = event.detail;
            console.log('🎤 [BrowserShell] Voice navigation event received:', voiceUrl);
            
            if (voiceUrl && activeTab) {
                // Use search engine manager to normalize input
                const searchEngine = settings.searchEngine || 'google';
                const targetUrl = normalizeInput(voiceUrl, searchEngine as any);
                
                console.log(`🎤 [BrowserShell] Voice navigating to: ${targetUrl}`);
                
                // Update URL and navigate
                setUrl(targetUrl);
                updateActiveTabUrl(targetUrl);
                
                if (window.arc) {
                    window.arc.navigate(targetUrl);
                    logAction(`Voice navigation to: ${targetUrl}`);
                }
            }
        };

        window.addEventListener('arc:voice-navigate', handleVoiceNavigation as EventListener);

        return () => {
            window.removeEventListener('arc:voice-navigate', handleVoiceNavigation as EventListener);
        };
    }, [activeTab, updateActiveTabUrl, setUrl, settings.searchEngine, logAction]);

    const handleNavigate = () => {
        let targetUrl = url;
        
        // Use search engine manager to normalize input
        const searchEngine = settings.searchEngine || 'google';
        targetUrl = normalizeInput(targetUrl, searchEngine as any);

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
                onTabReorder={handleTabReorder}
                incognitoEnabled={settings.incognitoEnabled}
                groups={groups}
                onCreateGroup={createGroup}
                onAddTabToGroup={addTabToGroup}
                onRemoveTabFromGroup={removeTabFromGroup}
                getGroupForTab={getGroupForTab}
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
                currentUrl={activeTab?.url}
                recentUrls={tabs.slice(-5).map(tab => tab.url).filter(Boolean)}
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

            {/* Voice Microphone Button */}
            <VoiceMicrophoneButton
                enabled={settings.voiceCommandsEnabled !== false}
                position="bottom-right"
                showHelp={true}
            />
        </div>
    );
};

export default BrowserShell;
