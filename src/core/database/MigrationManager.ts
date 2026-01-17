import { DatabaseManager } from './DatabaseManager';
import * as fs from 'fs';
import * as path from 'path';

export interface Migration {
  version: number;
  name: string;
  up: (db: DatabaseManager) => Promise<void>;
  down?: (db: DatabaseManager) => Promise<void>;
}

export class MigrationManager {
  private migrations: Migration[] = [];
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  /**
   * Register a migration
   */
  registerMigration(migration: Migration): void {
    this.migrations.push(migration);
    // Sort by version to ensure correct order
    this.migrations.sort((a, b) => a.version - b.version);
  }

  /**
   * Get current schema version from database
   */
  async getCurrentVersion(): Promise<number> {
    const result = await this.dbManager.query<{ version: number }>(
      'SELECT MAX(version) as version FROM schema_version'
    );
    return result.length > 0 && result[0].version !== null ? result[0].version : 0;
  }

  /**
   * Detect pending migrations
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const currentVersion = await this.getCurrentVersion();
    return this.migrations.filter(m => m.version > currentVersion);
  }

  /**
   * Create backup of database file
   */
  async createBackup(dbPath: string): Promise<string> {
    const timestamp = Date.now();
    const backupPath = `${dbPath}.backup.${timestamp}`;
    
    // Copy database file
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
    }
    
    // Copy WAL file if exists
    const walPath = `${dbPath}-wal`;
    if (fs.existsSync(walPath)) {
      fs.copyFileSync(walPath, `${backupPath}-wal`);
    }
    
    // Copy SHM file if exists
    const shmPath = `${dbPath}-shm`;
    if (fs.existsSync(shmPath)) {
      fs.copyFileSync(shmPath, `${backupPath}-shm`);
    }
    
    return backupPath;
  }

  /**
   * Apply a single migration
   */
  private async applyMigration(migration: Migration): Promise<void> {
    console.log(`Applying migration ${migration.version}: ${migration.name}`);
    
    // Execute migration in a transaction
    await migration.up(this.dbManager);
    
    // Record migration in schema_version table
    await this.dbManager.execute(
      'INSERT INTO schema_version (version, applied_at) VALUES (?, ?)',
      [migration.version, Date.now()]
    );
    
    console.log(`Migration ${migration.version} applied successfully`);
  }

  /**
   * Rollback a migration
   */
  private async rollbackMigration(migration: Migration): Promise<void> {
    if (!migration.down) {
      throw new Error(`Migration ${migration.version} does not have a rollback function`);
    }
    
    console.log(`Rolling back migration ${migration.version}: ${migration.name}`);
    
    // Execute rollback
    await migration.down(this.dbManager);
    
    // Remove from schema_version table
    await this.dbManager.execute(
      'DELETE FROM schema_version WHERE version = ?',
      [migration.version]
    );
    
    console.log(`Migration ${migration.version} rolled back successfully`);
  }

  /**
   * Apply all pending migrations
   */
  async migrate(dbPath: string): Promise<{ applied: number; failed?: Migration }> {
    const pending = await this.getPendingMigrations();
    
    if (pending.length === 0) {
      console.log('No pending migrations');
      return { applied: 0 };
    }
    
    console.log(`Found ${pending.length} pending migrations`);
    
    // Create backup before migrations
    const backupPath = await this.createBackup(dbPath);
    console.log(`Database backed up to ${backupPath}`);
    
    let applied = 0;
    let failedMigration: Migration | undefined;
    
    try {
      // Apply migrations in order
      for (const migration of pending) {
        await this.applyMigration(migration);
        applied++;
      }
      
      console.log(`Successfully applied ${applied} migrations`);
      return { applied };
    } catch (error) {
      console.error('Migration failed:', error);
      failedMigration = pending[applied];
      
      // Attempt to rollback applied migrations
      console.log(`Attempting to rollback ${applied} applied migrations`);
      for (let i = applied - 1; i >= 0; i--) {
        try {
          await this.rollbackMigration(pending[i]);
        } catch (rollbackError) {
          console.error(`Failed to rollback migration ${pending[i].version}:`, rollbackError);
          // Continue trying to rollback other migrations
        }
      }
      
      return { applied: 0, failed: failedMigration };
    }
  }

  /**
   * Rollback to a specific version
   */
  async rollbackTo(targetVersion: number): Promise<number> {
    const currentVersion = await this.getCurrentVersion();
    
    if (targetVersion >= currentVersion) {
      console.log('Target version is current or higher, nothing to rollback');
      return 0;
    }
    
    // Find migrations to rollback (in reverse order)
    const toRollback = this.migrations
      .filter(m => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version); // Descending order
    
    console.log(`Rolling back ${toRollback.length} migrations to version ${targetVersion}`);
    
    let rolledBack = 0;
    for (const migration of toRollback) {
      await this.rollbackMigration(migration);
      rolledBack++;
    }
    
    console.log(`Successfully rolled back ${rolledBack} migrations`);
    return rolledBack;
  }
}
