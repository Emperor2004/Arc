"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettings = getSettings;
exports.updateSettings = updateSettings;
exports.getSetting = getSetting;
exports.updateSetting = updateSetting;
exports.resetSettings = resetSettings;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const SETTINGS_FILE = path.join(process.env.APPDATA || process.env.HOME || '.', 'arc-browser', 'data', 'settings.json');
const DEFAULT_SETTINGS = {
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
function loadSettings() {
    try {
        ensureDir();
        if (fs.existsSync(SETTINGS_FILE)) {
            const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
            return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
        }
    }
    catch (error) {
        console.error('Error loading settings:', error);
    }
    return DEFAULT_SETTINGS;
}
/**
 * Save settings to file
 */
function saveSettings(settings) {
    try {
        ensureDir();
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    }
    catch (error) {
        console.error('Error saving settings:', error);
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
