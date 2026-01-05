import React, { useState, useEffect } from 'react';
import { ArcSettings } from '../../core/types';

const SettingsView: React.FC = () => {
    const [settings, setSettings] = useState<ArcSettings>({
        theme: 'dark',
        jarvisEnabled: true,
        useHistoryForRecommendations: true,
        incognitoEnabled: true
    });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<string | null>(null);

    // Load settings on mount
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            if (window.arc && window.arc.getSettings) {
                const loadedSettings = await window.arc.getSettings();
                setSettings(loadedSettings);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            showMessage('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async <K extends keyof ArcSettings>(
        key: K,
        value: ArcSettings[K]
    ) => {
        try {
            if (window.arc && window.arc.updateSettings) {
                const updatedSettings = await window.arc.updateSettings({ [key]: value });
                setSettings(updatedSettings);
                showMessage('Settings saved');
            }
        } catch (error) {
            console.error('Failed to update settings:', error);
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
        <div className="settings-view">
            <div className="settings-header">
                <h1>Settings</h1>
                <p>Customize your Arc browsing experience</p>
                {message && (
                    <div className="settings-message">
                        {message}
                    </div>
                )}
            </div>

            <div className="settings-content">
                {/* Appearance Section */}
                <div className="settings-card">
                    <div className="settings-group">
                        <h2>Appearance</h2>
                        <p>Customize the look and feel of Arc</p>
                        
                        <div className="settings-item">
                            <label className="settings-label">
                                <span>Theme</span>
                                <select 
                                    className="settings-select"
                                    value={settings.theme}
                                    onChange={(e) => updateSetting('theme', e.target.value as ArcSettings['theme'])}
                                >
                                    <option value="light">Light</option>
                                    <option value="dark">Dark</option>
                                    <option value="system">System</option>
                                </select>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Privacy Section */}
                <div className="settings-card">
                    <div className="settings-group">
                        <h2>Privacy</h2>
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
                                        onChange={(e) => updateSetting('jarvisEnabled', e.target.checked)}
                                        className="settings-checkbox"
                                    />
                                    <span className="settings-toggle-slider"></span>
                                </div>
                            </label>
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
                                        onChange={(e) => updateSetting('useHistoryForRecommendations', e.target.checked)}
                                        className="settings-checkbox"
                                        disabled={!settings.jarvisEnabled}
                                    />
                                    <span className="settings-toggle-slider"></span>
                                </div>
                            </label>
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
                                        onChange={(e) => updateSetting('incognitoEnabled', e.target.checked)}
                                        className="settings-checkbox"
                                    />
                                    <span className="settings-toggle-slider"></span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Data Section */}
                <div className="settings-card">
                    <div className="settings-group">
                        <h2>Data</h2>
                        <p>Manage your stored data and preferences</p>
                        
                        <div className="settings-item">
                            <div className="settings-action">
                                <div className="settings-action-content">
                                    <span>Clear browsing history</span>
                                    <span className="settings-description">
                                        Remove all stored browsing history and visited sites
                                    </span>
                                </div>
                                <button 
                                    className="settings-btn settings-btn--danger"
                                    onClick={handleClearHistory}
                                >
                                    Clear History
                                </button>
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
                                    className="settings-btn settings-btn--danger"
                                    onClick={handleClearFeedback}
                                >
                                    Clear Feedback
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;