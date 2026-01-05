import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { ArcSettings } from './types';
import { recordVisit, getRecentHistory } from './historyStore';
import { getAllFeedback } from './feedbackStore';

// Use a local data folder in the project root for dev mode
const DATA_DIR = join(__dirname, '..', '..', 'data');
const SETTINGS_FILE = join(DATA_DIR, 'settings.json');

// Default settings
const DEFAULT_SETTINGS: ArcSettings = {
    theme: 'system',
    jarvisEnabled: true,
    useHistoryForRecommendations: true,
    incognitoEnabled: true
};

// ===== Internal Helpers =====

/**
 * Load settings from JSON file
 */
const loadSettings = (): ArcSettings => {
    try {
        if (existsSync(SETTINGS_FILE)) {
            const raw = readFileSync(SETTINGS_FILE, 'utf-8');
            const data = JSON.parse(raw);
            // Merge with defaults to handle missing properties
            return { ...DEFAULT_SETTINGS, ...data };
        }
    } catch (err) {
        console.error('Failed to load settings:', err);
    }
    return DEFAULT_SETTINGS;
};

/**
 * Save settings to JSON file
 */
const saveSettings = (settings: ArcSettings): void => {
    try {
        // Ensure data directory exists
        if (!existsSync(DATA_DIR)) {
            mkdirSync(DATA_DIR, { recursive: true });
        }
        writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    } catch (err) {
        console.error('Failed to save settings:', err);
    }
};

// ===== Public API =====

/**
 * Get current settings, returning defaults if file doesn't exist
 */
export async function getSettings(): Promise<ArcSettings> {
    try {
        return loadSettings();
    } catch (err) {
        console.error('Failed to get settings:', err);
        return DEFAULT_SETTINGS;
    }
}

/**
 * Update settings with partial values and return the complete updated settings
 */
export async function updateSettings(partial: Partial<ArcSettings>): Promise<ArcSettings> {
    try {
        const currentSettings = loadSettings();
        const updatedSettings = { ...currentSettings, ...partial };
        saveSettings(updatedSettings);
        console.log('Settings updated:', partial);
        return updatedSettings;
    } catch (err) {
        console.error('Failed to update settings:', err);
        throw err;
    }
}

/**
 * Clear all browsing history by delegating to historyStore
 */
export async function clearHistory(): Promise<void> {
    try {
        // Since historyStore doesn't have a clear method, we'll implement it here
        // by overwriting the history file with an empty array
        const historyFile = join(DATA_DIR, 'history.json');
        if (existsSync(historyFile)) {
            writeFileSync(historyFile, JSON.stringify([], null, 2));
        }
        console.log('History cleared successfully');
    } catch (err) {
        console.error('Failed to clear history:', err);
        throw err;
    }
}

/**
 * Clear all Jarvis feedback by delegating to feedbackStore
 */
export async function clearFeedback(): Promise<void> {
    try {
        // Since feedbackStore doesn't have a clear method, we'll implement it here
        // by overwriting the feedback file with an empty array
        const feedbackFile = join(DATA_DIR, 'feedback.json');
        if (existsSync(feedbackFile)) {
            writeFileSync(feedbackFile, JSON.stringify([], null, 2));
        }
        console.log('Feedback cleared successfully');
    } catch (err) {
        console.error('Failed to clear feedback:', err);
        throw err;
    }
}