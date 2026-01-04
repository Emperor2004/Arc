import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { HistoryEntry } from './types';

const dbPath = join(app.getPath('userData'), 'history.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    title TEXT,
    visited_at INTEGER,
    visit_count INTEGER DEFAULT 1
  )
`);

export const recordVisit = async (url: string, title: string | null): Promise<void> => {
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

export const getRecentHistory = async (limit: number): Promise<HistoryEntry[]> => {
    const stmt = db.prepare('SELECT * FROM history ORDER BY visited_at DESC LIMIT ?');
    const rows = stmt.all(limit) as HistoryEntry[];
    return rows;
};
