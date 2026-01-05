"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettings = getSettings;
exports.updateSettings = updateSettings;
exports.clearHistory = clearHistory;
exports.clearFeedback = clearFeedback;
const path_1 = require("path");
const fs_1 = require("fs");
// Use a local data folder in the project root for dev mode
const DATA_DIR = (0, path_1.join)(__dirname, '..', '..', 'data');
const SETTINGS_FILE = (0, path_1.join)(DATA_DIR, 'settings.json');
// Default settings
const DEFAULT_SETTINGS = {
    theme: 'system',
    jarvisEnabled: true,
    useHistoryForRecommendations: true,
    incognitoEnabled: true
};
// ===== Internal Helpers =====
/**
 * Load settings from JSON file
 */
const loadSettings = () => {
    try {
        if ((0, fs_1.existsSync)(SETTINGS_FILE)) {
            const raw = (0, fs_1.readFileSync)(SETTINGS_FILE, 'utf-8');
            const data = JSON.parse(raw);
            // Merge with defaults to handle missing properties
            return { ...DEFAULT_SETTINGS, ...data };
        }
    }
    catch (err) {
        console.error('Failed to load settings:', err);
    }
    return DEFAULT_SETTINGS;
};
/**
 * Save settings to JSON file
 */
const saveSettings = (settings) => {
    try {
        // Ensure data directory exists
        if (!(0, fs_1.existsSync)(DATA_DIR)) {
            (0, fs_1.mkdirSync)(DATA_DIR, { recursive: true });
        }
        (0, fs_1.writeFileSync)(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    }
    catch (err) {
        console.error('Failed to save settings:', err);
    }
};
// ===== Public API =====
/**
 * Get current settings, returning defaults if file doesn't exist
 */
async function getSettings() {
    try {
        return loadSettings();
    }
    catch (err) {
        console.error('Failed to get settings:', err);
        return DEFAULT_SETTINGS;
    }
}
/**
 * Update settings with partial values and return the complete updated settings
 */
async function updateSettings(partial) {
    try {
        const currentSettings = loadSettings();
        const updatedSettings = { ...currentSettings, ...partial };
        saveSettings(updatedSettings);
        console.log('Settings updated:', partial);
        return updatedSettings;
    }
    catch (err) {
        console.error('Failed to update settings:', err);
        throw err;
    }
}
/**
 * Clear all browsing history by delegating to historyStore
 */
async function clearHistory() {
    try {
        // Since historyStore doesn't have a clear method, we'll implement it here
        // by overwriting the history file with an empty array
        const historyFile = (0, path_1.join)(DATA_DIR, 'history.json');
        if ((0, fs_1.existsSync)(historyFile)) {
            (0, fs_1.writeFileSync)(historyFile, JSON.stringify([], null, 2));
        }
        console.log('History cleared successfully');
    }
    catch (err) {
        console.error('Failed to clear history:', err);
        throw err;
    }
}
/**
 * Clear all Jarvis feedback by delegating to feedbackStore
 */
async function clearFeedback() {
    try {
        // Since feedbackStore doesn't have a clear method, we'll implement it here
        // by overwriting the feedback file with an empty array
        const feedbackFile = (0, path_1.join)(DATA_DIR, 'feedback.json');
        if ((0, fs_1.existsSync)(feedbackFile)) {
            (0, fs_1.writeFileSync)(feedbackFile, JSON.stringify([], null, 2));
        }
        console.log('Feedback cleared successfully');
    }
    catch (err) {
        console.error('Failed to clear feedback:', err);
        throw err;
    }
}
