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
exports.exportData = exportData;
exports.validateExportData = validateExportData;
exports.importData = importData;
const historyStore = __importStar(require("./historyStore"));
const feedbackStore = __importStar(require("./feedbackStore"));
const bookmarkStore = __importStar(require("./bookmarkStore"));
const settingsStore = __importStar(require("./settingsStore"));
/**
 * Export all data to a JSON object
 */
async function exportData() {
    const history = await historyStore.getAllHistory();
    const feedback = await feedbackStore.getAllFeedback();
    const bookmarks = await bookmarkStore.getAllBookmarks();
    const settings = settingsStore.getSettings();
    return {
        version: '1.0.0',
        timestamp: Date.now(),
        history: history.map(entry => ({
            url: entry.url,
            title: entry.title,
            visited_at: entry.visited_at,
        })),
        feedback: feedback.map(entry => ({
            url: entry.url,
            value: entry.value,
            created_at: entry.created_at,
        })),
        bookmarks: bookmarks.map(entry => ({
            url: entry.url,
            title: entry.title,
            createdAt: entry.createdAt,
        })),
        settings: settings,
    };
}
/**
 * Validate export data format
 */
function validateExportData(data) {
    if (!data || typeof data !== 'object') {
        return false;
    }
    const obj = data;
    // Check required fields
    if (typeof obj.version !== 'string') {
        return false;
    }
    if (typeof obj.timestamp !== 'number' || obj.timestamp <= 0) {
        return false;
    }
    // Check arrays
    if (!Array.isArray(obj.history)) {
        return false;
    }
    if (!Array.isArray(obj.feedback)) {
        return false;
    }
    if (!Array.isArray(obj.bookmarks)) {
        return false;
    }
    if (typeof obj.settings !== 'object' || obj.settings === null) {
        return false;
    }
    // Validate history entries
    for (const entry of obj.history) {
        if (typeof entry !== 'object' || entry === null) {
            return false;
        }
        const e = entry;
        if (typeof e.url !== 'string' || (e.title !== null && typeof e.title !== 'string') || typeof e.visited_at !== 'number') {
            return false;
        }
    }
    // Validate feedback entries
    for (const entry of obj.feedback) {
        if (typeof entry !== 'object' || entry === null) {
            return false;
        }
        const e = entry;
        if (typeof e.url !== 'string' || (e.value !== 'like' && e.value !== 'dislike') || typeof e.created_at !== 'number') {
            return false;
        }
    }
    // Validate bookmark entries
    for (const entry of obj.bookmarks) {
        if (typeof entry !== 'object' || entry === null) {
            return false;
        }
        const e = entry;
        if (typeof e.url !== 'string' || typeof e.title !== 'string' || typeof e.createdAt !== 'number') {
            return false;
        }
    }
    return true;
}
/**
 * Import data with merge or replace mode
 */
async function importData(data, mode = 'merge') {
    if (!validateExportData(data)) {
        throw new Error('Invalid export data format');
    }
    if (mode === 'replace') {
        // Clear existing data
        historyStore.clearHistory();
        feedbackStore.clearFeedback();
        bookmarkStore.clearBookmarks();
    }
    // Import history
    for (const entry of data.history) {
        historyStore.addHistoryEntry(entry.url, entry.title || '');
    }
    // Import feedback
    for (const entry of data.feedback) {
        feedbackStore.addFeedback(entry.url, entry.value);
    }
    // Import bookmarks
    for (const entry of data.bookmarks) {
        bookmarkStore.addBookmark(entry.url, entry.title);
    }
    // Import settings (merge mode only for settings)
    if (mode === 'merge') {
        const updates = data.settings;
        settingsStore.updateSettings(updates);
    }
    else {
        // Replace mode: reset and set all settings
        settingsStore.resetSettings();
        const updates = data.settings;
        settingsStore.updateSettings(updates);
    }
}
