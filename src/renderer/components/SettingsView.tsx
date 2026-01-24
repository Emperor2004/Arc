import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import ThemeSelector from './ThemeSelector';
import DataExportImport from './DataExportImport';
import PersonalizationSettings from './PersonalizationSettings';
import AccessibilitySettings from './AccessibilitySettings';
import { getThemeManager } from '../../core/themeManager';

export interface SettingsViewProps {}

const SettingsView: React.FC<SettingsViewProps> = () => {
    const { settings, loading, updateSettings } = useSettings();
    const [message, setMessage] = useState<string | null>(null);
    const [siteUrl, setSiteUrl] = useState<string>('');
    const [siteCookies, setSiteCookies] = useState<any[]>([]);
    const [showSiteCookies, setShowSiteCookies] = useState<boolean>(false);

    const handleUpdateSetting = async <K extends keyof typeof settings>(
        key: K,
        value: typeof settings[K]
    ) => {
        try {
            await updateSettings({ [key]: value });
            showMessage('Settings saved');
        } catch (error) {
            showMessage('Failed to save settings');
        }
    };

    const showMessage = (msg: string) => {
        setMessage(msg);
        setTimeout(() => setMessage(null), 3000);
    };

    const handleClearHistory = async () => {
        if (window.confirm('Are you sure you want to clear all browsing history? This action cannot be undone.')) {
            try {
                if (window.arc && window.arc.clearHistory) {
                    const result = await window.arc.clearHistory();
                    if (result.ok) {
                        showMessage('History cleared successfully!');
                    } else {
                        showMessage('Failed to clear history');
                    }
                }
            } catch (error) {
                console.error('Failed to clear history:', error);
                showMessage('Failed to clear history');
            }
        }
    };

    const handleClearFeedback = async () => {
        if (window.confirm('Are you sure you want to clear all Jarvis feedback? This will reset your recommendation preferences.')) {
            try {
                if (window.arc && window.arc.clearFeedback) {
                    const result = await window.arc.clearFeedback();
                    if (result.ok) {
                        showMessage('Jarvis feedback cleared successfully!');
                    } else {
                        showMessage('Failed to clear feedback');
                    }
                }
            } catch (error) {
                console.error('Failed to clear feedback:', error);
                showMessage('Failed to clear feedback');
            }
        }
    };

    const handleClearCookies = async () => {
        if (window.confirm('Are you sure you want to clear all cookies? This will log you out of all websites and cannot be undone.')) {
            try {
                console.log('🎨 [UI] Clearing cookies...');
                if (window.arc && window.arc.clearCookies) {
                    const result = await window.arc.clearCookies();
                    console.log('🎨 [UI] Clear cookies result:', result);
                    if (result.ok) {
                        showMessage(`Successfully cleared ${result.cleared} cookie${result.cleared !== 1 ? 's' : ''}!`);
                    } else {
                        showMessage(`Failed to clear cookies${result.error ? ': ' + result.error : ''}`);
                    }
                }
            } catch (error) {
                console.error('🎨 [UI] Failed to clear cookies:', error);
                showMessage('Failed to clear cookies');
            }
        }
    };

    const handleViewSiteCookies = async () => {
        if (!siteUrl.trim()) {
            showMessage('Please enter a URL');
            return;
        }

        try {
            if (window.arc && window.arc.getCookies) {
                const result = await window.arc.getCookies({ url: siteUrl });
                if (result.ok) {
                    setSiteCookies(result.cookies);
                    setShowSiteCookies(true);
                    if (result.cookies.length === 0) {
                        showMessage('No cookies found for this site');
                    } else {
                        showMessage(`Found ${result.cookies.length} cookie${result.cookies.length !== 1 ? 's' : ''} for this site`);
                    }
                } else {
                    showMessage(`Failed to get cookies${result.error ? ': ' + result.error : ''}`);
                    setSiteCookies([]);
                    setShowSiteCookies(false);
                }
            }
        } catch (error) {
            console.error('Failed to get cookies:', error);
            showMessage('Failed to get cookies');
            setSiteCookies([]);
            setShowSiteCookies(false);
        }
    };

    const handleClearSiteCookies = async () => {
        if (!siteUrl.trim()) {
            showMessage('Please enter a URL');
            return;
        }

        if (window.confirm(`Are you sure you want to clear cookies for ${siteUrl}? This will log you out of this site.`)) {
            try {
                if (window.arc && window.arc.clearCookiesForUrl) {
                    const result = await window.arc.clearCookiesForUrl(siteUrl);
                    if (result.ok) {
                        showMessage(`Successfully cleared ${result.cleared} cookie${result.cleared !== 1 ? 's' : ''} for this site!`);
                        // Refresh the cookie list
                        setSiteCookies([]);
                        setShowSiteCookies(false);
                    } else {
                        showMessage(`Failed to clear cookies${result.error ? ': ' + result.error : ''}`);
                    }
                }
            } catch (error) {
                console.error('Failed to clear cookies for URL:', error);
                showMessage('Failed to clear cookies for this site');
            }
        }
    };

    const formatExpirationDate = (timestamp?: number): string => {
        if (!timestamp) {
            return 'Session';
        }
        const date = new Date(timestamp * 1000);
        return date.toLocaleString();
    };

    const handleClearSession = async () => {
        if (window.confirm('Are you sure you want to clear all saved sessions? This will delete all session data and you will start with a blank slate on next launch.')) {
            try {
                if (window.arc && window.arc.clearSession) {
                    const result = await window.arc.clearSession();
                    if (result.ok) {
                        showMessage('Session cleared successfully!');
                    } else {
                        showMessage('Failed to clear session');
                    }
                }
            } catch (error) {
                console.error('Failed to clear session:', error);
                showMessage('Failed to clear session');
            }
        }
    };

    if (loading) {
        return (
            <div className="settings-view">
                <div className="settings-header">
                    <h1>Settings</h1>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-view" role="main" aria-labelledby="settings-title">
            <div className="settings-header">
                <h1 id="settings-title">Settings</h1>
                <p>Customize your Arc browsing experience</p>
                {message && (
                    <div className="settings-message" role="status" aria-live="polite">
                        {message}
                    </div>
                )}
            </div>

            <div className="settings-content">
                {/* Appearance Section */}
                <div className="settings-card" role="region" aria-labelledby="appearance-heading">
                    <div className="settings-group">
                        <h2 id="appearance-heading">Appearance</h2>
                        <p>Customize the look and feel of Arc</p>
                        
                        <ThemeSelector themeManager={getThemeManager()} />
                    </div>
                </div>

                {/* Session Section */}
                <div className="settings-card" role="region" aria-labelledby="session-heading">
                    <div className="settings-group">
                        <h2 id="session-heading">Session</h2>
                        <p>Control how Arc manages your browsing sessions</p>
                        
                        <div className="settings-item">
                            <label className="settings-label">
                                <div className="settings-label-content">
                                    <span>Restore Previous Session</span>
                                    <span className="settings-description">
                                        Automatically restore your tabs when Arc starts
                                    </span>
                                </div>
                                <div className="settings-toggle">
                                    <input
                                        type="checkbox"
                                        checked={settings.restorePreviousSession ?? true}
                                        onChange={(e) => handleUpdateSetting('restorePreviousSession', e.target.checked)}
                                        className="settings-checkbox"
                                        id="restore-session-toggle"
                                        aria-describedby="restore-session-desc"
                                    />
                                    <span className="settings-toggle-slider" aria-hidden="true"></span>
                                </div>
                            </label>
                            <div id="restore-session-desc" className="sr-only">
                                When enabled, Arc will automatically restore your tabs from the previous session when the application starts
                            </div>
                        </div>

                        <div className="settings-item">
                            <div className="settings-action">
                                <div className="settings-action-content">
                                    <span>Clear Session</span>
                                    <span className="settings-description">
                                        Delete all saved session data and start fresh on next launch
                                    </span>
                                </div>
                                <button 
                                    className="btn-danger"
                                    onClick={handleClearSession}
                                    aria-describedby="clear-session-desc"
                                >
                                    Clear Session
                                </button>
                            </div>
                            <div id="clear-session-desc" className="sr-only">
                                This action will permanently delete all saved session data and cannot be undone
                            </div>
                        </div>
                    </div>
                </div>

                {/* Privacy Section */}
                <div className="settings-card" role="region" aria-labelledby="privacy-heading">
                    <div className="settings-group">
                        <h2 id="privacy-heading">Privacy</h2>
                        <p>Control how Arc handles your data and recommendations</p>
                        
                        <div className="settings-item">
                            <label className="settings-label">
                                <div className="settings-label-content">
                                    <span>Enable Jarvis</span>
                                    <span className="settings-description">
                                        Allow Jarvis to provide personalized recommendations
                                    </span>
                                </div>
                                <div className="settings-toggle">
                                    <input
                                        type="checkbox"
                                        checked={settings.jarvisEnabled}
                                        onChange={(e) => handleUpdateSetting('jarvisEnabled', e.target.checked)}
                                        className="settings-checkbox"
                                        id="jarvis-enabled-toggle"
                                        aria-describedby="jarvis-enabled-desc"
                                    />
                                    <span className="settings-toggle-slider" aria-hidden="true"></span>
                                </div>
                            </label>
                            <div id="jarvis-enabled-desc" className="sr-only">
                                When enabled, Jarvis will analyze your browsing patterns to provide personalized recommendations
                            </div>
                        </div>

                        <div className="settings-item">
                            <label className="settings-label">
                                <div className="settings-label-content">
                                    <span>Use history for recommendations</span>
                                    <span className="settings-description">
                                        Allow Jarvis to analyze your browsing history to improve suggestions
                                    </span>
                                </div>
                                <div className="settings-toggle">
                                    <input
                                        type="checkbox"
                                        checked={settings.useHistoryForRecommendations}
                                        onChange={(e) => handleUpdateSetting('useHistoryForRecommendations', e.target.checked)}
                                        className="settings-checkbox"
                                        disabled={!settings.jarvisEnabled}
                                        id="history-recommendations-toggle"
                                        aria-describedby="history-recommendations-desc"
                                    />
                                    <span className="settings-toggle-slider" aria-hidden="true"></span>
                                </div>
                            </label>
                            <div id="history-recommendations-desc" className="sr-only">
                                When enabled, Jarvis will use your browsing history to provide more relevant recommendations. This setting requires Jarvis to be enabled.
                            </div>
                        </div>

                        <div className="settings-item">
                            <label className="settings-label">
                                <div className="settings-label-content">
                                    <span>Allow Incognito mode</span>
                                    <span className="settings-description">
                                        Enable private browsing tabs that don't save history
                                    </span>
                                </div>
                                <div className="settings-toggle">
                                    <input
                                        type="checkbox"
                                        checked={settings.incognitoEnabled}
                                        onChange={(e) => handleUpdateSetting('incognitoEnabled', e.target.checked)}
                                        className="settings-checkbox"
                                        id="incognito-enabled-toggle"
                                        aria-describedby="incognito-enabled-desc"
                                    />
                                    <span className="settings-toggle-slider" aria-hidden="true"></span>
                                </div>
                            </label>
                            <div id="incognito-enabled-desc" className="sr-only">
                                When enabled, you can create incognito tabs that don't save browsing history or cookies
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preloading Section */}
                <div className="settings-card" role="region" aria-labelledby="preloading-heading">
                    <div className="settings-group">
                        <h2 id="preloading-heading">Preloading</h2>
                        <p>Speed up browsing by preloading predicted pages</p>
                        
                        <div className="settings-item">
                            <label className="settings-label">
                                <div className="settings-label-content">
                                    <span>Enable Preloading</span>
                                    <span className="settings-description">
                                        Preload connections to pages you're likely to visit for faster loading
                                    </span>
                                </div>
                                <div className="settings-toggle">
                                    <input
                                        type="checkbox"
                                        checked={settings.preloadingEnabled ?? false}
                                        onChange={async (e) => {
                                            if (e.target.checked && !settings.preloadingConsent) {
                                                // Request consent first
                                                const consent = confirm(
                                                    'Arc can preload pages you\'re likely to visit to make browsing faster. ' +
                                                    'This uses a small amount of bandwidth to establish connections. ' +
                                                    'Would you like to enable this feature?'
                                                );
                                                if (consent) {
                                                    await handleUpdateSetting('preloadingConsent', true);
                                                    await handleUpdateSetting('preloadingEnabled', true);
                                                }
                                            } else {
                                                await handleUpdateSetting('preloadingEnabled', e.target.checked);
                                            }
                                        }}
                                        className="settings-checkbox"
                                        id="preloading-enabled-toggle"
                                        aria-describedby="preloading-enabled-desc"
                                    />
                                    <span className="settings-toggle-slider" aria-hidden="true"></span>
                                </div>
                            </label>
                            <div id="preloading-enabled-desc" className="sr-only">
                                When enabled, Arc will preload connections to pages you're likely to visit based on AI predictions
                            </div>
                        </div>

                        <div className="settings-item">
                            <label className="settings-label">
                                <div className="settings-label-content">
                                    <span>WiFi Only</span>
                                    <span className="settings-description">
                                        Only preload when connected to WiFi to save mobile data
                                    </span>
                                </div>
                                <div className="settings-toggle">
                                    <input
                                        type="checkbox"
                                        checked={settings.preloadingOnlyOnWifi ?? true}
                                        onChange={(e) => handleUpdateSetting('preloadingOnlyOnWifi', e.target.checked)}
                                        className="settings-checkbox"
                                        disabled={!settings.preloadingEnabled}
                                        id="preloading-wifi-toggle"
                                        aria-describedby="preloading-wifi-desc"
                                    />
                                    <span className="settings-toggle-slider" aria-hidden="true"></span>
                                </div>
                            </label>
                            <div id="preloading-wifi-desc" className="sr-only">
                                When enabled, preloading will only occur when connected to WiFi networks
                            </div>
                        </div>

                        <div className="settings-item">
                            <div className="settings-label-content">
                                <span>Maximum Connections</span>
                                <span className="settings-description">
                                    Maximum number of connections to preload simultaneously (1-5)
                                </span>
                            </div>
                            <div style={{ marginTop: '8px' }}>
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    value={settings.preloadingMaxConnections ?? 3}
                                    onChange={(e) => handleUpdateSetting('preloadingMaxConnections', parseInt(e.target.value))}
                                    disabled={!settings.preloadingEnabled}
                                    style={{
                                        width: '100%',
                                        marginBottom: '8px'
                                    }}
                                    aria-label="Maximum preloading connections"
                                />
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    fontSize: '12px',
                                    color: 'var(--text-secondary)'
                                }}>
                                    <span>1</span>
                                    <span>Current: {settings.preloadingMaxConnections ?? 3}</span>
                                    <span>5</span>
                                </div>
                            </div>
                        </div>

                        <div className="settings-item">
                            <div className="settings-label-content">
                                <span>Prediction Confidence</span>
                                <span className="settings-description">
                                    Minimum confidence required for preloading (higher = fewer but more accurate predictions)
                                </span>
                            </div>
                            <div style={{ marginTop: '8px' }}>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="0.8"
                                    step="0.1"
                                    value={settings.preloadingMinConfidence ?? 0.3}
                                    onChange={(e) => handleUpdateSetting('preloadingMinConfidence', parseFloat(e.target.value))}
                                    disabled={!settings.preloadingEnabled}
                                    style={{
                                        width: '100%',
                                        marginBottom: '8px'
                                    }}
                                    aria-label="Minimum prediction confidence"
                                />
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    fontSize: '12px',
                                    color: 'var(--text-secondary)'
                                }}>
                                    <span>Low (10%)</span>
                                    <span>Current: {Math.round((settings.preloadingMinConfidence ?? 0.3) * 100)}%</span>
                                    <span>High (80%)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Personalization Section */}
                <PersonalizationSettings onMessage={showMessage} />

                {/* Accessibility Section */}
                <AccessibilitySettings onMessage={showMessage} />

                {/* Data Section */}
                <div className="settings-card" role="region" aria-labelledby="data-heading">
                    <div className="settings-group">
                        <h2 id="data-heading">Data</h2>
                        <p>Manage your stored data and preferences</p>
                        
                        <DataExportImport onMessage={showMessage} />
                        
                        <div className="settings-item">
                            <div className="settings-action">
                                <div className="settings-action-content">
                                    <span>Clear browsing history</span>
                                    <span className="settings-description">
                                        Remove all stored browsing history and visited sites
                                    </span>
                                </div>
                                <button 
                                    className="btn-danger"
                                    onClick={handleClearHistory}
                                    aria-describedby="clear-history-desc"
                                >
                                    Clear History
                                </button>
                            </div>
                            <div id="clear-history-desc" className="sr-only">
                                This action will permanently delete all browsing history and cannot be undone
                            </div>
                        </div>

                        <div className="settings-item">
                            <div className="settings-action">
                                <div className="settings-action-content">
                                    <span>Clear Jarvis feedback</span>
                                    <span className="settings-description">
                                        Reset all likes, dislikes, and recommendation preferences
                                    </span>
                                </div>
                                <button 
                                    className="btn-danger"
                                    onClick={handleClearFeedback}
                                    aria-describedby="clear-feedback-desc"
                                >
                                    Clear Feedback
                                </button>
                            </div>
                            <div id="clear-feedback-desc" className="sr-only">
                                This action will reset all Jarvis feedback and recommendation preferences and cannot be undone
                            </div>
                        </div>

                        <div className="settings-item">
                            <div className="settings-action">
                                <div className="settings-action-content">
                                    <span>Clear all cookies</span>
                                    <span className="settings-description">
                                        Remove all cookies stored by websites. This will log you out of all sites.
                                    </span>
                                </div>
                                <button 
                                    className="btn-danger"
                                    onClick={handleClearCookies}
                                    aria-describedby="clear-cookies-desc"
                                >
                                    Clear Cookies
                                </button>
                            </div>
                            <div id="clear-cookies-desc" className="sr-only">
                                This action will permanently delete all cookies and log you out of all websites. This cannot be undone.
                            </div>
                        </div>

                        <div className="settings-item">
                            <div className="settings-action">
                                <div className="settings-action-content">
                                    <span>View cookies for a specific site</span>
                                    <span className="settings-description">
                                        Inspect and manage cookies for a particular website
                                    </span>
                                </div>
                            </div>
                            
                            <div style={{ marginTop: '12px' }}>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                    <input
                                        type="text"
                                        value={siteUrl}
                                        onChange={(e) => setSiteUrl(e.target.value)}
                                        placeholder="Enter website URL (e.g., https://example.com)"
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '6px',
                                            color: '#e5e7eb',
                                            fontSize: '14px'
                                        }}
                                        aria-label="Website URL for cookie inspection"
                                    />
                                    <button
                                        onClick={handleViewSiteCookies}
                                        style={{
                                            padding: '8px 16px',
                                            background: 'rgba(59, 130, 246, 0.8)',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: 'white',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '500'
                                        }}
                                        aria-label="View cookies for entered URL"
                                    >
                                        View Cookies
                                    </button>
                                </div>

                                {showSiteCookies && (
                                    <div style={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        marginTop: '12px'
                                    }}>
                                        {siteCookies.length === 0 ? (
                                            <p style={{ color: '#9ca3af', margin: 0 }}>
                                                No cookies found for this site
                                            </p>
                                        ) : (
                                            <>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    alignItems: 'center',
                                                    marginBottom: '12px'
                                                }}>
                                                    <h3 style={{ 
                                                        margin: 0, 
                                                        fontSize: '14px', 
                                                        fontWeight: '600',
                                                        color: '#e5e7eb'
                                                    }}>
                                                        Cookies ({siteCookies.length})
                                                    </h3>
                                                    <button
                                                        onClick={handleClearSiteCookies}
                                                        style={{
                                                            padding: '6px 12px',
                                                            background: 'rgba(239, 68, 68, 0.8)',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            color: 'white',
                                                            cursor: 'pointer',
                                                            fontSize: '12px',
                                                            fontWeight: '500'
                                                        }}
                                                        aria-label="Clear cookies for this site"
                                                    >
                                                        Clear Site Cookies
                                                    </button>
                                                </div>
                                                <div style={{
                                                    maxHeight: '300px',
                                                    overflowY: 'auto'
                                                }}>
                                                    {siteCookies.map((cookie, index) => (
                                                        <div
                                                            key={index}
                                                            style={{
                                                                padding: '12px',
                                                                background: 'rgba(255, 255, 255, 0.02)',
                                                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                                                borderRadius: '6px',
                                                                marginBottom: '8px'
                                                            }}
                                                        >
                                                            <div style={{ 
                                                                display: 'grid', 
                                                                gap: '6px',
                                                                fontSize: '13px'
                                                            }}>
                                                                <div>
                                                                    <strong style={{ color: '#60a5fa' }}>Name:</strong>{' '}
                                                                    <span style={{ color: '#e5e7eb' }}>{cookie.name}</span>
                                                                </div>
                                                                <div>
                                                                    <strong style={{ color: '#60a5fa' }}>Domain:</strong>{' '}
                                                                    <span style={{ color: '#e5e7eb' }}>{cookie.domain}</span>
                                                                </div>
                                                                <div>
                                                                    <strong style={{ color: '#60a5fa' }}>Path:</strong>{' '}
                                                                    <span style={{ color: '#e5e7eb' }}>{cookie.path}</span>
                                                                </div>
                                                                <div>
                                                                    <strong style={{ color: '#60a5fa' }}>Expires:</strong>{' '}
                                                                    <span style={{ color: '#e5e7eb' }}>
                                                                        {formatExpirationDate(cookie.expirationDate)}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <strong style={{ color: '#60a5fa' }}>Secure:</strong>{' '}
                                                                    <span style={{ color: '#e5e7eb' }}>
                                                                        {cookie.secure ? 'Yes' : 'No'}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <strong style={{ color: '#60a5fa' }}>HttpOnly:</strong>{' '}
                                                                    <span style={{ color: '#e5e7eb' }}>
                                                                        {cookie.httpOnly ? 'Yes' : 'No'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;