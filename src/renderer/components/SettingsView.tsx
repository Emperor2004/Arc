import React, { useState } from 'react';
import { useSettingsController } from '../hooks/useSettingsController';
import ThemeSelector from './ThemeSelector';
import DataExportImport from './DataExportImport';
import PersonalizationSettings from './PersonalizationSettings';
import AccessibilitySettings from './AccessibilitySettings';
import { getThemeManager } from '../../core/themeManager';

export interface SettingsViewProps {}

const SettingsView: React.FC<SettingsViewProps> = () => {
    const { settings, loading, updateSetting } = useSettingsController();
    const [message, setMessage] = useState<string | null>(null);

    const handleUpdateSetting = async <K extends keyof typeof settings>(
        key: K,
        value: typeof settings[K]
    ) => {
        try {
            await updateSetting(key, value);
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;