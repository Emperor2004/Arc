import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { DatabaseManager, TEST_CONFIG } from './DatabaseManager';
import * as path from 'path';
import * as fs from 'fs';

describe('Automatic Reconnection Property-Based Tests', () => {
  let manager: DatabaseManager;
  const testDbPath = path.join(__dirname, '../../../data/test-reconnection.db');

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
  });

  describe('Property 13: Automatic Reconnection', () => {
    it('should detect unhealthy connection', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          // Ensure manager is ready first
          expect(manager.isReady()).toBe(true);
          
          // Initially healthy
          const healthBefore = await manager.checkHealth();
          expect(healthBefore).toBe(true);

          // Close connection to simulate failure
          await manager.close();

          // Wait for close to complete
          await new Promise(resolve => setTimeout(resolve, 50));

          // Should detect unhealthy state
          const healthAfter = await manager.checkHealth();
          expect(healthAfter).toBe(false);
          
          // Reinitialize for next test
          DatabaseManager.resetInstance();
          manager = DatabaseManager.getInstance({ ...TEST_CONFIG, path: testDbPath });
          await manager.initialize();
        }),
        { numRuns: 5 }
      );
    });

    it('should successfully reconnect after connection loss', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          async (testValue) => {
            // Insert data
            await manager.execute(
              'CREATE TABLE IF NOT EXISTS test_reconnect (value TEXT)'
            );
            await manager.execute(
              'INSERT INTO test_reconnect (value) VALUES (?)',
              [testValue]
            );

            // Verify data exists
            const before = await manager.query<any>(
              'SELECT value FROM test_reconnect WHERE value = ?',
              [testValue]
            );
            expect(before).toHaveLength(1);

            // Simulate connection loss and reconnect
            await manager.reconnect();

            // Should still be able to query data
            const after = await manager.query<any>(
              'SELECT value FROM test_reconnect WHERE value = ?',
              [testValue]
            );
            expect(after).toHaveLength(1);
            expect(after[0].value).toBe(testValue);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should clear statement cache on reconnect', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          // Execute query to populate cache
          await manager.query('SELECT 1 as value');

          // Get cache size before reconnect
          const cacheBefore = (manager as any).statementCache.size;
          expect(cacheBefore).toBeGreaterThan(0);

          // Reconnect
          await manager.reconnect();

          // Cache should be cleared and repopulated
          const cacheAfter = (manager as any).statementCache.size;
          expect(cacheAfter).toBe(0);
        }),
        { numRuns: 10 }
      );
    });

    it('should maintain data integrity across reconnections', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
          async (values) => {
            // Create table (drop first if exists from previous test)
            await manager.execute('DROP TABLE IF EXISTS test_integrity');
            await manager.execute(
              'CREATE TABLE test_integrity (id INTEGER PRIMARY KEY, value TEXT)'
            );

            // Insert values
            for (const value of values) {
              await manager.execute(
                'INSERT INTO test_integrity (value) VALUES (?)',
                [value]
              );
            }

            // Reconnect
            await manager.reconnect();

            // Verify all data is still there
            const results = await manager.query<any>(
              'SELECT value FROM test_integrity'
            );
            expect(results).toHaveLength(values.length);
            
            const resultValues = results.map(r => r.value);
            for (const value of values) {
              expect(resultValues).toContain(value);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Connection Health Monitoring', () => {
    it('should report healthy state when database is operational', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          expect(manager.isReady()).toBe(true);
          expect(await manager.checkHealth()).toBe(true);
        }),
        { numRuns: 10 }
      );
    });

    it('should report unhealthy state when database is closed', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          await manager.close();
          
          expect(manager.isReady()).toBe(false);
          expect(await manager.checkHealth()).toBe(false);
        }),
        { numRuns: 10 }
      );
    });
  });
});
