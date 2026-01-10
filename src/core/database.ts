import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

let db: Database.Database | null = null;

/**
 * Get or create the SQLite database connection
 */
export function getDatabase(): Database.Database {
  if (db) {
    return db;
  }

  // Determine database path
  const dataDir = path.join(process.env.APPDATA || process.env.HOME || '.', 'arc-browser', 'data');
  
  // Ensure directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'arc-browser.db');

  // Open database
  db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Initialize schema
  initializeSchema(db);

  return db;
}

/**
 * Initialize database schema
 */
function initializeSchema(database: Database.Database): void {
  // Create sessions table
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tabs TEXT NOT NULL,
      activeTabId TEXT,
      timestamp INTEGER NOT NULL,
      version TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);

  // Create tab_groups table
  database.exec(`
    CREATE TABLE IF NOT EXISTS tab_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      tabIds TEXT NOT NULL,
      isCollapsed INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);

  // Create indices for performance
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_timestamp ON sessions(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_tab_groups_createdAt ON tab_groups(createdAt DESC);
  `);
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Reset database (for testing)
 */
export function resetDatabase(): void {
  if (db) {
    db.exec('DELETE FROM sessions');
    db.exec('DELETE FROM tab_groups');
  }
}
