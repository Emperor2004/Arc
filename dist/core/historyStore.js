"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentHistory = exports.recordVisit = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const electron_1 = require("electron");
const path_1 = require("path");
// Initialize DB path using Electron's userData directory
const dbPath = (0, path_1.join)(electron_1.app.getPath('userData'), 'history.db');
let db;
try {
    db = new better_sqlite3_1.default(dbPath);
    db.pragma('journal_mode = WAL');
    // Create history table if it doesn't exist
    db.exec(`
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL UNIQUE,
            title TEXT,
            visited_at INTEGER NOT NULL,
            visit_count INTEGER NOT NULL DEFAULT 1
        )
    `);
    console.log(`History DB initialized at: ${dbPath}`);
}
catch (err) {
    console.error('Failed to initialize history database:', err);
}
/**
 * Record a page visit. If URL exists, increment visit_count and update visited_at.
 * Otherwise insert a new row.
 */
const recordVisit = async (url, title) => {
    try {
        // Normalize URL
        const normalizedUrl = url?.trim();
        if (!normalizedUrl) {
            console.warn('recordVisit: empty URL, skipping');
            return;
        }
        const visitedAt = Date.now();
        const stmt = db.prepare(`
            INSERT INTO history (url, title, visited_at, visit_count)
            VALUES (@url, @title, @visitedAt, 1)
            ON CONFLICT(url) DO UPDATE SET
                title = COALESCE(@title, title),
                visited_at = @visitedAt,
                visit_count = visit_count + 1
        `);
        stmt.run({ url: normalizedUrl, title, visitedAt });
        console.log(`Recorded visit: ${normalizedUrl}`);
    }
    catch (err) {
        console.error('Failed to record visit:', err);
    }
};
exports.recordVisit = recordVisit;
/**
 * Get recent history entries ordered by visited_at DESC.
 */
const getRecentHistory = async (limit = 50) => {
    try {
        const stmt = db.prepare(`
            SELECT id, url, title, visited_at, visit_count
            FROM history
            ORDER BY visited_at DESC
            LIMIT ?
        `);
        return stmt.all(limit);
    }
    catch (err) {
        console.error('Failed to get recent history:', err);
        return [];
    }
};
exports.getRecentHistory = getRecentHistory;
