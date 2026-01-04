"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentHistory = exports.recordVisit = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const electron_1 = require("electron");
const path_1 = require("path");
const dbPath = (0, path_1.join)(electron_1.app.getPath('userData'), 'history.db');
const db = new better_sqlite3_1.default(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    title TEXT,
    visited_at INTEGER,
    visit_count INTEGER DEFAULT 1
  )
`);
const recordVisit = async (url, title) => {
    const visitedAt = Date.now();
    const stmt = db.prepare(`
        INSERT INTO history (url, title, visited_at, visit_count)
        VALUES (@url, @title, @visitedAt, 1)
        ON CONFLICT(url) DO UPDATE SET
            title = COALESCE(@title, title),
            visited_at = @visitedAt,
            visit_count = visit_count + 1
    `);
    stmt.run({ url, title, visitedAt });
};
exports.recordVisit = recordVisit;
const getRecentHistory = async (limit) => {
    const stmt = db.prepare('SELECT * FROM history ORDER BY visited_at DESC LIMIT ?');
    const rows = stmt.all(limit);
    return rows;
};
exports.getRecentHistory = getRecentHistory;
