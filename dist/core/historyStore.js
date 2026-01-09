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
exports.addHistoryEntry = addHistoryEntry;
exports.getRecentHistory = getRecentHistory;
exports.getAllHistory = getAllHistory;
exports.clearHistory = clearHistory;
exports.removeHistoryEntry = removeHistoryEntry;
exports.searchHistory = searchHistory;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const HISTORY_FILE = path.join(process.env.APPDATA || process.env.HOME || '.', 'arc-browser', 'data', 'history.json');
// Ensure directory exists
function ensureDir() {
    const dir = path.dirname(HISTORY_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
/**
 * Load history from file
 */
function loadHistory() {
    try {
        ensureDir();
        if (fs.existsSync(HISTORY_FILE)) {
            const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
            return JSON.parse(data);
        }
    }
    catch (error) {
        console.error('Error loading history:', error);
    }
    return [];
}
/**
 * Save history to file
 */
function saveHistory(history) {
    try {
        ensureDir();
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
    }
    catch (error) {
        console.error('Error saving history:', error);
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
