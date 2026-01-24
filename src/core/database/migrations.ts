import { DatabaseManager } from './DatabaseManager';
import { Migration } from './MigrationManager';

/**
 * Migration 1: Add folderId column to bookmarks table and create bookmark_folders table
 */
export const migration001: Migration = {
  version: 1,
  name: 'Add bookmark folders support',
  async up(db: DatabaseManager): Promise<void> {
    // Create bookmark_folders table first
    await db.execute(`
      CREATE TABLE IF NOT EXISTS bookmark_folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        createdAt INTEGER NOT NULL,
        color TEXT DEFAULT 'blue',
        description TEXT,
        smart INTEGER DEFAULT 0,
        rule TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )
    `);

    // Add folderId column to bookmarks table if it doesn't exist
    const columns = await db.query<{ name: string }>(`PRAGMA table_info(bookmarks)`);
    const hasFolderId = columns.some(col => col.name === 'folderId');
    
    if (!hasFolderId) {
      await db.execute(`ALTER TABLE bookmarks ADD COLUMN folderId TEXT`);
      
      // Add foreign key constraint (SQLite doesn't support adding FK constraints to existing tables,
      // so we'll handle this in application logic)
      
      // Create index for the new column
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_bookmarks_folderId ON bookmarks(folderId)`);
    }

    // Create index for bookmark_folders
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_bookmark_folders_name ON bookmark_folders(name)`);
  },
  
  async down(db: DatabaseManager): Promise<void> {
    // Note: SQLite doesn't support dropping columns easily, so we'll recreate the table
    await db.execute(`
      CREATE TABLE bookmarks_backup AS 
      SELECT id, url, title, tags, favicon, createdAt, updatedAt, created_at 
      FROM bookmarks
    `);
    
    await db.execute(`DROP TABLE bookmarks`);
    
    await db.execute(`
      CREATE TABLE bookmarks (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        tags TEXT,
        favicon TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )
    `);
    
    await db.execute(`
      INSERT INTO bookmarks (id, url, title, tags, favicon, createdAt, updatedAt, created_at)
      SELECT id, url, title, tags, favicon, createdAt, updatedAt, created_at
      FROM bookmarks_backup
    `);
    
    await db.execute(`DROP TABLE bookmarks_backup`);
    await db.execute(`DROP TABLE IF EXISTS bookmark_folders`);
    
    // Recreate original indices
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_bookmarks_createdAt ON bookmarks(createdAt DESC)`);
  }
};

// Export all migrations
export const migrations: Migration[] = [
  migration001
];