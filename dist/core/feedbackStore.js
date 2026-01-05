"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordFeedback = recordFeedback;
exports.getAllFeedback = getAllFeedback;
const path_1 = require("path");
const fs_1 = require("fs");
// Use a local data folder in the project root for dev mode
// This avoids issues with Electron's app module not being ready
const DATA_DIR = (0, path_1.join)(__dirname, '..', '..', 'data');
const FEEDBACK_FILE = (0, path_1.join)(DATA_DIR, 'feedback.json');
// ===== Internal Helpers =====
/**
 * Load feedback from JSON file
 */
const loadFeedback = () => {
    try {
        if ((0, fs_1.existsSync)(FEEDBACK_FILE)) {
            const raw = (0, fs_1.readFileSync)(FEEDBACK_FILE, 'utf-8');
            const data = JSON.parse(raw);
            return Array.isArray(data) ? data : [];
        }
    }
    catch (err) {
        console.error('Failed to load feedback:', err);
    }
    return [];
};
/**
 * Save feedback to JSON file
 */
const saveFeedback = (entries) => {
    try {
        // Ensure data directory exists
        if (!(0, fs_1.existsSync)(DATA_DIR)) {
            (0, fs_1.mkdirSync)(DATA_DIR, { recursive: true });
        }
        (0, fs_1.writeFileSync)(FEEDBACK_FILE, JSON.stringify(entries, null, 2));
    }
    catch (err) {
        console.error('Failed to save feedback:', err);
    }
};
// ===== Public API =====
/**
 * Record feedback for a recommendation.
 * Appends the feedback entry to the existing feedback array.
 */
async function recordFeedback(entry) {
    try {
        // Validate entry
        if (!entry || !entry.url || !entry.value) {
            console.warn('recordFeedback: invalid feedback entry, skipping');
            return;
        }
        const entries = loadFeedback();
        // Add timestamp if not provided
        const feedbackEntry = {
            ...entry,
            created_at: entry.created_at || Date.now()
        };
        // Append new feedback entry
        entries.push(feedbackEntry);
        saveFeedback(entries);
        console.log(`Recorded feedback: ${entry.value} for ${entry.url}`);
    }
    catch (err) {
        console.error('Failed to record feedback:', err);
    }
}
/**
 * Get all feedback entries ordered by created_at DESC.
 */
async function getAllFeedback() {
    try {
        const entries = loadFeedback();
        return entries.sort((a, b) => b.created_at - a.created_at);
    }
    catch (err) {
        console.error('Failed to get all feedback:', err);
        return [];
    }
}
