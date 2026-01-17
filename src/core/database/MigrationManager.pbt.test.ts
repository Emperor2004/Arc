import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { DatabaseManager, TEST_CONFIG } from './DatabaseManager';
import { MigrationManager, Migration } from './MigrationManager';
import * as path from 'path';
import * as fs from 'fs';

describe('Migration Manager Property-Based Tests', () => {
  let manager: DatabaseManager;
  let migrationManager: MigrationManager;
  const testDbPath = path.join(__dirname, '../../../data/test-migration.db');

  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

    // Clean up backup files
    const backupFiles = fs.readdirSync(path.dirname(testDbPath))
      .filter(f => f.startsWith('test-migration.db.backup'));
    for (const file of backupFiles) {
      const fullPath = path.join(path.dirname(testDbPath), file);
      fs.unlinkSync(fullPath);
    }

    DatabaseManager.resetInstance();
    manager = DatabaseManager.getInstance({ ...TEST_CONFIG, path: testDbPath });
    await manager.initialize();
    migrationManager = new MigrationManager(manager);
  });

  afterEach(async () => {
    if (manager) {
      await manager.close();
    }
    DatabaseManager.resetInstance();

    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

    // Clean up backup files
    const backupFiles = fs.readdirSync(path.dirname(testDbPath))
      .filter(f => f.startsWith('test-migration.db.backup'));
    for (const file of backupFiles) {
      const fullPath = path.join(path.dirname(testDbPath), file);
      fs.unlinkSync(fullPath);
    }
  });

  describe('Property 20: Schema Version Tracking', () => {
    it('should track schema version correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (version) => {
            // Create fresh migration manager for this iteration
            const freshMigrationManager = new MigrationManager(manager);
            
            // Initially version should be 0
            const initialVersion = await freshMigrationManager.getCurrentVersion();
            expect(initialVersion).toBe(0);

            // Apply a migration
            const migration: Migration = {
              version,
              name: `test-migration-${version}`,
              up: async (db) => {
                await db.execute(`CREATE TABLE test_v${version} (id INTEGER)`);
              }
            };

            freshMigrationManager.registerMigration(migration);
            await freshMigrationManager.migrate(testDbPath);

            // Version should be updated
            const newVersion = await freshMigrationManager.getCurrentVersion();
            expect(newVersion).toBe(version);
            
            // Clean up for next iteration
            await manager.execute(`DROP TABLE IF EXISTS test_v${version}`);
            await manager.execute('DELETE FROM schema_version');
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 21: Migration Detection', () => {
    it('should detect pending migrations correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 1, maxLength: 5 }),
          async (versions) => {
            // Create fresh migration manager for this iteration
            const freshMigrationManager = new MigrationManager(manager);
            
            // Register migrations
            const uniqueVersions = [...new Set(versions)].sort((a, b) => a - b);
            for (const version of uniqueVersions) {
              freshMigrationManager.registerMigration({
                version,
                name: `migration-${version}`,
                up: async (db) => {
                  await db.execute(`CREATE TABLE IF NOT EXISTS test_v${version} (id INTEGER)`);
                }
              });
            }

            // All should be pending initially
            const pending = await freshMigrationManager.getPendingMigrations();
            expect(pending.length).toBe(uniqueVersions.length);
            expect(pending.map(m => m.version)).toEqual(uniqueVersions);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 22: Migration Application Order', () => {
    it('should apply migrations in version order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 2, maxLength: 5 }),
          async (versions) => {
            // Create fresh migration manager for this iteration
            const freshMigrationManager = new MigrationManager(manager);
            
            const uniqueVersions = [...new Set(versions)].sort((a, b) => a - b);
            const appliedOrder: number[] = [];

            // Register migrations in random order
            const shuffled = [...uniqueVersions].sort(() => Math.random() - 0.5);
            for (const version of shuffled) {
              freshMigrationManager.registerMigration({
                version,
                name: `migration-${version}`,
                up: async (db) => {
                  appliedOrder.push(version);
                  await db.execute(`CREATE TABLE IF NOT EXISTS test_v${version} (id INTEGER)`);
                }
              });
            }

            // Apply migrations
            await freshMigrationManager.migrate(testDbPath);

            // Should be applied in version order
            expect(appliedOrder).toEqual(uniqueVersions);
            
            // Clean up for next iteration
            for (const version of uniqueVersions) {
              await manager.execute(`DROP TABLE IF EXISTS test_v${version}`);
            }
            await manager.execute('DELETE FROM schema_version');
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 23: Migration Rollback on Failure', () => {
    it('should rollback on migration failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }),
          async (failAtVersion) => {
            // Create fresh migration manager for this iteration
            const freshMigrationManager = new MigrationManager(manager);
            
            // Register migrations, one will fail
            for (let i = 1; i <= failAtVersion + 1; i++) {
              freshMigrationManager.registerMigration({
                version: i,
                name: `migration-${i}`,
                up: async (db) => {
                  if (i === failAtVersion) {
                    throw new Error(`Migration ${i} failed`);
                  }
                  await db.execute(`CREATE TABLE IF NOT EXISTS test_v${i} (id INTEGER)`);
                },
                down: async (db) => {
                  await db.execute(`DROP TABLE IF EXISTS test_v${i}`);
                }
              });
            }

            // Apply migrations (should fail)
            const result = await freshMigrationManager.migrate(testDbPath);
            expect(result.applied).toBe(0);
            expect(result.failed).toBeDefined();
            expect(result.failed?.version).toBe(failAtVersion);

            // Version should still be 0 (rolled back)
            const version = await freshMigrationManager.getCurrentVersion();
            expect(version).toBe(0);

            // Tables from successful migrations should be rolled back
            for (let i = 1; i < failAtVersion; i++) {
              const tables = await manager.query<any>(
                `SELECT name FROM sqlite_master WHERE type='table' AND name='test_v${i}'`
              );
              expect(tables).toHaveLength(0);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 24: Migration Backup', () => {
    it('should create backup before migrations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          async (numMigrations) => {
            // Register migrations
            for (let i = 1; i <= numMigrations; i++) {
              migrationManager.registerMigration({
                version: i,
                name: `migration-${i}`,
                up: async (db) => {
                  await db.execute(`CREATE TABLE IF NOT EXISTS test_v${i} (id INTEGER)`);
                }
              });
            }

            // Apply migrations
            await migrationManager.migrate(testDbPath);

            // Check backup file exists
            const backupFiles = fs.readdirSync(path.dirname(testDbPath))
              .filter(f => f.startsWith('test-migration.db.backup'));
            expect(backupFiles.length).toBeGreaterThan(0);

            // Backup should be a valid database
            const backupPath = path.join(path.dirname(testDbPath), backupFiles[0]);
            expect(fs.existsSync(backupPath)).toBe(true);
            expect(fs.statSync(backupPath).size).toBeGreaterThan(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should not create backup when no migrations pending', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          // No migrations registered
          const result = await migrationManager.migrate(testDbPath);
          expect(result.applied).toBe(0);

          // No backup should be created
          const backupFiles = fs.readdirSync(path.dirname(testDbPath))
            .filter(f => f.startsWith('test-migration.db.backup'));
          expect(backupFiles.length).toBe(0);
        }),
        { numRuns: 5 }
      );
    });
  });

  describe('Migration Rollback', () => {
    it('should rollback to specific version', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.integer({ min: 3, max: 10 }),
            fc.integer({ min: 1, max: 2 })
          ),
          async ([totalVersions, targetVersion]) => {
            // Create fresh migration manager for this iteration
            const freshMigrationManager = new MigrationManager(manager);
            
            // Register and apply migrations
            for (let i = 1; i <= totalVersions; i++) {
              freshMigrationManager.registerMigration({
                version: i,
                name: `migration-${i}`,
                up: async (db) => {
                  await db.execute(`CREATE TABLE IF NOT EXISTS test_v${i} (id INTEGER)`);
                },
                down: async (db) => {
                  await db.execute(`DROP TABLE IF EXISTS test_v${i}`);
                }
              });
            }

            await freshMigrationManager.migrate(testDbPath);
            expect(await freshMigrationManager.getCurrentVersion()).toBe(totalVersions);

            // Rollback to target version
            const rolledBack = await freshMigrationManager.rollbackTo(targetVersion);
            expect(rolledBack).toBe(totalVersions - targetVersion);

            // Version should be target version
            const currentVersion = await freshMigrationManager.getCurrentVersion();
            expect(currentVersion).toBe(targetVersion);

            // Tables after target version should not exist
            for (let i = targetVersion + 1; i <= totalVersions; i++) {
              const tables = await manager.query<any>(
                `SELECT name FROM sqlite_master WHERE type='table' AND name='test_v${i}'`
              );
              expect(tables).toHaveLength(0);
            }
            
            // Clean up for next iteration
            for (let i = 1; i <= targetVersion; i++) {
              await manager.execute(`DROP TABLE IF EXISTS test_v${i}`);
            }
            await manager.execute('DELETE FROM schema_version');
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
