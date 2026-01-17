"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addHistoryEntry = addHistoryEntry;
exports.getRecentHistory = getRecentHistory;
exports.getAllHistory = getAllHistory;
exports.clearHistory = clearHistory;
exports.removeHistoryEntry = removeHistoryEntry;
exports.searchHistory = searchHistory;
// Browser-safe history storage using localStorage
const HISTORY_KEY = 'arc-browser-history';
/**
 * Load history from localStorage
 */
function loadHistory() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const stored = localStorage.getItem(HISTORY_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        }
    }
    catch (error) {
        console.error('Error loading history from localStorage:', error);
    }
    return [];
}
/**
 * Save history to localStorage
 */
function saveHistory(history) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        }
    }
    catch (error) {
        console.error('Error saving history to localStorage:', error);
    }
}
/**
 * Add or update a history entry
 */
function addHistoryEntry(url, title) {
    const history = loadHistory();
    const existingIndex = history.findIndex(h => h.url === url);
    if (existingIndex >= 0) {
        // Update existing entry
        history[existingIndex].visit_count++;
        history[existingIndex].visited_at = Date.now();
        if (title) {
            history[existingIndex].title = title;
        }
    }
    else {
        // Add new entry
        const newEntry = {
            id: history.length > 0 ? Math.max(...history.map(h => h.id)) + 1 : 1,
            url,
            title: title || null,
            visited_at: Date.now(),
            visit_count: 1,
        };
        history.push(newEntry);
    }
    saveHistory(history);
    return history[existingIndex >= 0 ? existingIndex : history.length - 1];
}
/**
 * Get recent history entries
 */
async function getRecentHistory(limit = 200) {
    const history = loadHistory();
    return history
        .sort((a, b) => b.visited_at - a.visited_at)
        .slice(0, limit);
}
/**
 * Get all history entries
 */
async function getAllHistory() {
    return loadHistory();
}
/**
 * Clear all history
 */
function clearHistory() {
    saveHistory([]);
}
/**
 * Remove a specific history entry
 */
function removeHistoryEntry(url) {
    const history = loadHistory();
    const filtered = history.filter(h => h.url !== url);
    saveHistory(filtered);
}
/**
 * Search history by URL or title
 */
async function searchHistory(query) {
    const history = loadHistory();
    const lowerQuery = query.toLowerCase();
    return history.filter(h => h.url.toLowerCase().includes(lowerQuery) ||
        (h.title && h.title.toLowerCase().includes(lowerQuery)));
}
