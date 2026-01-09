import { ArcSettings } from './types';
import * as fs from 'fs';
import * as path from 'path';

const SETTINGS_FILE = path.join(process.env.APPDATA || process.env.HOME || '.', 'arc-browser', 'data', 'settings.json');

const DEFAULT_SETTINGS: ArcSettings = {
  theme: 'system',
  jarvisEnabled: true,
  useHistoryForRecommendations: true,
  incognitoEnabled: true,
  searchEngine: 'google',
  tabOrder: [],
  keyboardShortcutsEnabled: true,
};

// Ensure directory exists
function ensureDir() {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Load settings from file
 */
function loadSettings(): ArcSettings {
  try {
    ensureDir();
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save settings to file
 */
function saveSettings(settings: ArcSettings): void {
  try {
    ensureDir();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

/**
 * Get all settings
 */
export function getSettings(): ArcSettings {
  return loadSettings();
}

/**
 * Update settings
 */
export function updateSettings(updates: Partial<ArcSettings>): ArcSettings {
  const current = loadSettings();
  const updated = { ...current, ...updates };
  saveSettings(updated);
  return updated;
}

/**
 * Get a specific setting
 */
export function getSetting<K extends keyof ArcSettings>(key: K): ArcSettings[K] {
  const settings = loadSettings();
  return settings[key];
}

/**
 * Update a specific setting
 */
export function updateSetting<K extends keyof ArcSettings>(key: K, value: ArcSettings[K]): void {
  const settings = loadSettings();
  settings[key] = value;
  saveSettings(settings);
}

/**
 * Reset settings to defaults
 */
export function resetSettings(): ArcSettings {
  saveSettings(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}
