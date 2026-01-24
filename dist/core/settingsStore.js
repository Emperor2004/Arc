"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettings = getSettings;
exports.updateSettings = updateSettings;
exports.getSetting = getSetting;
exports.updateSetting = updateSetting;
exports.resetSettings = resetSettings;
// Browser-safe settings storage using localStorage
const SETTINGS_KEY = 'arc-browser-settings';
const DEFAULT_SETTINGS = {
    theme: 'system',
    jarvisEnabled: true,
    useHistoryForRecommendations: true,
    incognitoEnabled: true,
    searchEngine: 'google',
    tabOrder: [],
    keyboardShortcutsEnabled: true,
    restorePreviousSession: true,
    // Personalization defaults
    recencyWeight: 0.5,
    frequencyWeight: 0.3,
    feedbackWeight: 0.2,
    minScore: 0.1,
    maxRecommendations: 5,
    ollamaModel: 'llama3:latest',
    ollamaEnabled: true, // Enable Ollama by default
    ollamaEndpoint: 'http://localhost:11434',
    // Translation defaults
    translationEnabled: true,
    defaultTargetLanguage: 'en',
    autoDetectLanguage: true,
    translationCacheEnabled: true,
    // Voice commands defaults
    voiceCommandsEnabled: true,
    voiceLanguage: 'en-US',
    voiceContinuousMode: false,
    voiceConfidenceThreshold: 0.7,
    // Accessibility defaults
    reducedMotion: false,
    highContrast: false,
    fontSize: 'medium',
    focusIndicators: true,
    screenReaderOptimizations: false,
    // Preloading defaults
    preloadingEnabled: false, // Disabled by default, requires user consent
    preloadingConsent: false,
    preloadingMaxConnections: 3,
    preloadingTimeout: 5000,
    preloadingOnlyOnWifi: true,
    preloadingMinConfidence: 0.3,
};
// Browser-safe settings management using localStorage
function loadSettings() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const stored = localStorage.getItem(SETTINGS_KEY);
            if (stored) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
            }
        }
    }
    catch (error) {
        console.error('Error loading settings from localStorage:', error);
    }
    return DEFAULT_SETTINGS;
}
/**
 * Save settings to localStorage
 */
function saveSettings(settings) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        }
    }
    catch (error) {
        console.error('Error saving settings to localStorage:', error);
    }
}
/**
 * Get all settings
 */
function getSettings() {
    return loadSettings();
}
/**
 * Update settings
 */
function updateSettings(updates) {
    const current = loadSettings();
    const updated = { ...current, ...updates };
    saveSettings(updated);
    return updated;
}
/**
 * Get a specific setting
 */
function getSetting(key) {
    const settings = loadSettings();
    return settings[key];
}
/**
 * Update a specific setting
 */
function updateSetting(key, value) {
    const settings = loadSettings();
    settings[key] = value;
    saveSettings(settings);
}
/**
 * Reset settings to defaults
 */
function resetSettings() {
    saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
}
