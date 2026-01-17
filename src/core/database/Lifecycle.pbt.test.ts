import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { DatabaseManager, TEST_CONFIG } from './DatabaseManager';
import * as path from 'path';
import * as fs from 'fs';

describe('Connection Lifecycle Property-Based Tests', () => {
  let manager: DatabaseManager;
  const testDbPath = path.join(__dirname, '../../../data/test-lifecycle.db');

  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

    DatabaseManager.resetInstance();
    manager = DatabaseManager.getInstance({ ...TEST_CONFIG, path: testDbPath });
    await manager.initialize();
  });

  afterEach(async () => {
    if (manager && !manager.isClosed()) {
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
  });

  describe('Property 15: Connection Lifecycle - Clean Shutdown', () => {
    it('should checkpoint WAL before closing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
          async (values) => {
            // Insert data (drop table first to ensure clean state)
            await manager.execute('DROP TABLE IF EXISTS test');
            await manager.execute('CREATE TABLE test (value TEXT)');
            for (const value of values) {
              await manager.execute('INSERT INTO test (value) VALUES (?)', [value]);
            }

            // Close (should checkpoint)
            await manager.close();

            // Verify WAL was checkpointed by checking file doesn't exist or is empty
            const walPath = `${testDbPath}-wal`;
            if (fs.existsSync(walPath)) {
              const stats = fs.statSync(walPath);
              // WAL should be empty or very small after checkpoint
              expect(stats.size).toBeLessThan(1000);
            }

            // Reinitialize and verify data persisted
            DatabaseManager.resetInstance();
            manager = DatabaseManager.getInstance({ ...TEST_CONFIG, path: testDbPath });
            await manager.initialize();

            const results = await manager.query<any>('SELECT value FROM test');
            expect(results).toHaveLength(values.length);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should clear statement cache on close', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          // Execute queries to populate cache
          await manager.query('SELECT 1');
          await manager.query('SELECT 2');
          await manager.query('SELECT 3');
          
          const cacheBefore = (manager as any).statementCache.size;
          expect(cacheBefore).toBeGreaterThan(0);

          // Close
          await manager.close();

          // Cache should be cleared
          const cacheAfter = (manager as any).statementCache.size;
          expect(cacheAfter).toBe(0);
          
          // Reinitialize for next test
          DatabaseManager.resetInstance();
          manager = DatabaseManager.getInstance({ ...TEST_CONFIG, path: testDbPath });
          await manager.initialize();
        }),
        { numRuns: 10 }
      );
    });

    it('should abort pending operations on close', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          // Queue some operations (don't await, catch rejections)
          const promises = [
            manager.execute('SELECT 1').catch(() => {}),
            manager.execute('SELECT 2').catch(() => {}),
            manager.execute('SELECT 3').catch(() => {})
          ];

          // Close immediately
          await manager.close();

          // Wait for promises to settle
          await Promise.allSettled(promises);

          // Pending operations should be aborted
          const stats = manager.getQueueStats();
          expect(stats.pending).toBe(0);
          
          // Reinitialize for next test
          DatabaseManager.resetInstance();
          manager = DatabaseManager.getInstance({ ...TEST_CONFIG, path: testDbPath });
          await manager.initialize();
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 16: Connection Lifecycle - Post-Close Behavior', () => {
    it('should report closed state after close', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          // Ensure manager is ready
          expect(manager.isReady()).toBe(true);
          expect(manager.isClosed()).toBe(false);

          await manager.close();

          expect(manager.isClosed()).toBe(true);
          expect(manager.isReady()).toBe(false);
          
          // Reinitialize for next test
          DatabaseManager.resetInstance();
          manager = DatabaseManager.getInstance({ ...TEST_CONFIG, path: testDbPath });
          await manager.initialize();
        }),
        { numRuns: 10 }
      );
    });

    it('should handle operations gracefully after close (with graceful degradation)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          async (value) => {
            await manager.close();

            // With graceful degradation, should not throw
            const result = await manager.query('SELECT ? as value', [value]);
            expect(result).toEqual([]);

            await manager.execute('CREATE TABLE test (value TEXT)');
            // Should not throw, just skip
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should allow reinitialization after close', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          async (testValue) => {
            // Close
            await manager.close();
            expect(manager.isClosed()).toBe(true);

            // Reinitialize
            await manager.initialize();
            expect(manager.isReady()).toBe(true);

            // Should work normally
            const result = await manager.query<any>(
              'SELECT ? as value',
              [testValue]
            );
            expect(result).toHaveLength(1);
            expect(result[0].value).toBe(testValue);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle multiple close calls safely', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          await manager.close();
          await manager.close(); // Second close should not throw
          await manager.close(); // Third close should not throw

          expect(manager.isClosed()).toBe(true);
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Lifecycle State Transitions', () => {
    it('should transition through states correctly', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          // Initial state: ready
          expect(manager.isReady()).toBe(true);
          expect(manager.isClosed()).toBe(false);

          // Close
          await manager.close();
          expect(manager.isReady()).toBe(false);
          expect(manager.isClosed()).toBe(true);

          // Reinitialize
          await manager.initialize();
          expect(manager.isReady()).toBe(true);
          expect(manager.isClosed()).toBe(false);
        }),
        { numRuns: 10 }
      );
    });
  });
});
