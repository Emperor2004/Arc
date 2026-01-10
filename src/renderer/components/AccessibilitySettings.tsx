import React, { useState, useEffect } from 'react';
import { useSettingsController } from '../hooks/useSettingsController';

export interface AccessibilitySettingsProps {
    onMessage?: (message: string) => void;
}

const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({ onMessage }) => {
    const { settings, updateSetting } = useSettingsController();
    
    const [systemPreferences, setSystemPreferences] = useState({
        prefersReducedMotion: false,
        prefersHighContrast: false
    });

    useEffect(() => {
        // Detect system preferences
        if (window.matchMedia) {
            const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
            
            setSystemPreferences({
                prefersReducedMotion: reducedMotionQuery.matches,
                prefersHighContrast: highContrastQuery.matches
            });

            // Listen for changes
            const handleReducedMotionChange = (e: MediaQueryListEvent) => {
                setSystemPreferences(prev => ({ ...prev, prefersReducedMotion: e.matches }));
            };

            const handleHighContrastChange = (e: MediaQueryListEvent) => {
                setSystemPreferences(prev => ({ ...prev, prefersHighContrast: e.matches }));
            };

            reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
            highContrastQuery.addEventListener('change', handleHighContrastChange);

            return () => {
                reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
                highContrastQuery.removeEventListener('change', handleHighContrastChange);
            };
        }
    }, []);

    useEffect(() => {
        // Apply accessibility settings to document
        applyAccessibilitySettings();
    }, [settings.reducedMotion, settings.highContrast, settings.fontSize, settings.focusIndicators, settings.screenReaderOptimizations, systemPreferences]);

    const applyAccessibilitySettings = () => {
        const root = document.documentElement;
        
        // Apply reduced motion
        if (settings.reducedMotion || systemPreferences.prefersReducedMotion) {
            root.style.setProperty('--animation-duration', '0s');
            root.style.setProperty('--transition-duration', '0s');
            root.classList.add('reduced-motion');
        } else {
            root.style.removeProperty('--animation-duration');
            root.style.removeProperty('--transition-duration');
            root.classList.remove('reduced-motion');
        }

        // Apply high contrast
        if (settings.highContrast || systemPreferences.prefersHighContrast) {
            root.classList.add('high-contrast');
        } else {
            root.classList.remove('high-contrast');
        }

        // Apply font size
        const fontSizeMap = {
            'small': '0.875rem',
            'medium': '1rem',
            'large': '1.125rem',
            'extra-large': '1.25rem'
        };
        root.style.setProperty('--base-font-size', fontSizeMap[settings.fontSize || 'medium']);

        // Apply focus indicators
        if (settings.focusIndicators) {
            root.classList.add('enhanced-focus');
        } else {
            root.classList.remove('enhanced-focus');
        }

        // Apply screen reader optimizations
        if (settings.screenReaderOptimizations) {
            root.classList.add('screen-reader-optimized');
        } else {
            root.classList.remove('screen-reader-optimized');
        }
    };

    const handleSettingChange = async <K extends keyof typeof settings>(
        key: K,
        value: typeof settings[K]
    ) => {
        try {
            await updateSetting(key, value);
            if (onMessage) {
                onMessage('Accessibility settings updated');
            }
        } catch (error) {
            if (onMessage) {
                onMessage('Failed to save accessibility settings');
            }
        }
    };

    const resetToDefaults = async () => {
        try {
            await handleSettingChange('reducedMotion', false);
            await handleSettingChange('highContrast', false);
            await handleSettingChange('fontSize', 'medium');
            await handleSettingChange('focusIndicators', true);
            await handleSettingChange('screenReaderOptimizations', false);
            if (onMessage) {
                onMessage('Accessibility settings reset to defaults');
            }
        } catch (error) {
            if (onMessage) {
                onMessage('Failed to reset accessibility settings');
            }
        }
    };

    const useSystemPreferences = async () => {
        try {
            await handleSettingChange('reducedMotion', systemPreferences.prefersReducedMotion);
            await handleSettingChange('highContrast', systemPreferences.prefersHighContrast);
            if (onMessage) {
                onMessage('Using system accessibility preferences');
            }
        } catch (error) {
            if (onMessage) {
                onMessage('Failed to apply system preferences');
            }
        }
    };

    return (
        <div className="settings-card" role="region" aria-labelledby="accessibility-heading">
            <div className="settings-group">
                <h2 id="accessibility-heading">Accessibility</h2>
                <p>Configure accessibility features to improve your browsing experience</p>

                {/* System Preferences Info */}
                {(systemPreferences.prefersReducedMotion || systemPreferences.prefersHighContrast) && (
                    <div className="settings-system-info" role="status">
                        <p>
                            <strong>System preferences detected:</strong>
                            {systemPreferences.prefersReducedMotion && ' Reduced motion'}
                            {systemPreferences.prefersHighContrast && ' High contrast'}
                        </p>
                        <button 
                            className="btn-secondary"
                            onClick={useSystemPreferences}
                            aria-describedby="system-prefs-desc"
                        >
                            Use System Preferences
                        </button>
                        <div id="system-prefs-desc" className="sr-only">
                            Apply your system's accessibility preferences to Arc Browser
                        </div>
                    </div>
                )}

                {/* Reduced Motion */}
                <div className="settings-item">
                    <label className="settings-label">
                        <div className="settings-label-content">
                            <span>Reduce Motion</span>
                            <span className="settings-description">
                                Minimize animations and transitions for a calmer experience
                            </span>
                        </div>
                        <div className="settings-toggle">
                            <input
                                type="checkbox"
                                checked={settings.reducedMotion || false}
                                onChange={(e) => handleSettingChange('reducedMotion', e.target.checked)}
                                className="settings-checkbox"
                                id="reduced-motion-toggle"
                                aria-describedby="reduced-motion-desc"
                            />
                            <span className="settings-toggle-slider" aria-hidden="true"></span>
                        </div>
                    </label>
                    <div id="reduced-motion-desc" className="sr-only">
                        When enabled, animations and transitions will be reduced or disabled to minimize motion
                    </div>
                </div>

                {/* High Contrast */}
                <div className="settings-item">
                    <label className="settings-label">
                        <div className="settings-label-content">
                            <span>High Contrast Mode</span>
                            <span className="settings-description">
                                Increase contrast between text and background for better readability
                            </span>
                        </div>
                        <div className="settings-toggle">
                            <input
                                type="checkbox"
                                checked={settings.highContrast || false}
                                onChange={(e) => handleSettingChange('highContrast', e.target.checked)}
                                className="settings-checkbox"
                                id="high-contrast-toggle"
                                aria-describedby="high-contrast-desc"
                            />
                            <span className="settings-toggle-slider" aria-hidden="true"></span>
                        </div>
                    </label>
                    <div id="high-contrast-desc" className="sr-only">
                        When enabled, colors will be adjusted to provide higher contrast for better visibility
                    </div>
                </div>

                {/* Font Size */}
                <div className="settings-item">
                    <label className="settings-label">
                        <div className="settings-label-content">
                            <span>Font Size</span>
                            <span className="settings-description">
                                Adjust the base font size for better readability
                            </span>
                        </div>
                        <select
                            value={settings.fontSize || 'medium'}
                            onChange={(e) => handleSettingChange('fontSize', e.target.value as 'small' | 'medium' | 'large' | 'extra-large')}
                            className="settings-select"
                            id="font-size-select"
                            aria-describedby="font-size-desc"
                        >
                            <option value="small">Small</option>
                            <option value="medium">Medium (Default)</option>
                            <option value="large">Large</option>
                            <option value="extra-large">Extra Large</option>
                        </select>
                    </label>
                    <div id="font-size-desc" className="sr-only">
                        Select the base font size for all text in the application
                    </div>
                </div>

                {/* Enhanced Focus Indicators */}
                <div className="settings-item">
                    <label className="settings-label">
                        <div className="settings-label-content">
                            <span>Enhanced Focus Indicators</span>
                            <span className="settings-description">
                                Show more prominent focus indicators for keyboard navigation
                            </span>
                        </div>
                        <div className="settings-toggle">
                            <input
                                type="checkbox"
                                checked={settings.focusIndicators !== false}
                                onChange={(e) => handleSettingChange('focusIndicators', e.target.checked)}
                                className="settings-checkbox"
                                id="focus-indicators-toggle"
                                aria-describedby="focus-indicators-desc"
                            />
                            <span className="settings-toggle-slider" aria-hidden="true"></span>
                        </div>
                    </label>
                    <div id="focus-indicators-desc" className="sr-only">
                        When enabled, focused elements will have more visible and prominent focus indicators
                    </div>
                </div>

                {/* Screen Reader Optimizations */}
                <div className="settings-item">
                    <label className="settings-label">
                        <div className="settings-label-content">
                            <span>Screen Reader Optimizations</span>
                            <span className="settings-description">
                                Optimize the interface for screen reader users
                            </span>
                        </div>
                        <div className="settings-toggle">
                            <input
                                type="checkbox"
                                checked={settings.screenReaderOptimizations || false}
                                onChange={(e) => handleSettingChange('screenReaderOptimizations', e.target.checked)}
                                className="settings-checkbox"
                                id="screen-reader-toggle"
                                aria-describedby="screen-reader-desc"
                            />
                            <span className="settings-toggle-slider" aria-hidden="true"></span>
                        </div>
                    </label>
                    <div id="screen-reader-desc" className="sr-only">
                        When enabled, the interface will be optimized for screen reader users with additional ARIA labels and descriptions
                    </div>
                </div>

                {/* Reset Button */}
                <div className="settings-item">
                    <div className="settings-action">
                        <div className="settings-action-content">
                            <span>Reset Accessibility Settings</span>
                            <span className="settings-description">
                                Restore all accessibility settings to their default values
                            </span>
                        </div>
                        <button 
                            className="btn-secondary"
                            onClick={resetToDefaults}
                            aria-describedby="reset-accessibility-desc"
                        >
                            Reset to Defaults
                        </button>
                    </div>
                    <div id="reset-accessibility-desc" className="sr-only">
                        This will reset all accessibility settings to their default values
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccessibilitySettings;