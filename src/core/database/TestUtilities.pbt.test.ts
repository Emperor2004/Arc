import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { DatabaseManager, TEST_CONFIG } from './DatabaseManager';
import * as path from 'path';
import * as fs from 'fs';

describe('Test Utilities Property-Based Tests', () => {
  let manager: DatabaseManager;
  const testDbPath = path.join(__dirname, '../../../data/test-utilities.db');

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

  describe('Property 17: Test Reset Without Close', () => {
    it('should clear all data without closing connection', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
          async (values) => {
            // Insert data into sessions
            for (const value of values) {
              await manager.execute(
                'INSERT INTO sessions (tabs, activeTabId, timestamp, version) VALUES (?, ?, ?, ?)',
                [JSON.stringify([]), value, Date.now(), '1.0.0']
              );
            }

            // Verify data exists
            const before = await manager.query('SELECT * FROM sessions');
            expect(before.length).toBeGreaterThan(0);

            // Connection should be ready
            expect(manager.isReady()).toBe(true);

            // Reset
            await manager.reset();

            // Connection should still be ready
            expect(manager.isReady()).toBe(true);
            expect(manager.isClosed()).toBe(false);

            // Data should be cleared
            const after = await manager.query('SELECT * FROM sessions');
            expect(after).toHaveLength(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should clear data from all tables', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
            fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 })
          ),
          async ([sessionValues, groupValues]) => {
            // Insert into sessions
            for (const value of sessionValues) {
              await manager.execute(
                'INSERT INTO sessions (tabs, activeTabId, timestamp, version) VALUES (?, ?, ?, ?)',
                [JSON.stringify([]), value, Date.now(), '1.0.0']
              );
            }

            // Insert into tab_groups
            for (const value of groupValues) {
              await manager.execute(
                'INSERT INTO tab_groups (id, name, color, tabIds, isCollapsed, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
                [value, 'Test', 'red', JSON.stringify([]), 0, Date.now()]
              );
            }

            // Verify data exists
            const sessionsBefore = await manager.query('SELECT * FROM sessions');
            const groupsBefore = await manager.query('SELECT * FROM tab_groups');
            expect(sessionsBefore.length).toBeGreaterThan(0);
            expect(groupsBefore.length).toBeGreaterThan(0);

            // Reset
            await manager.reset();

            // All tables should be empty
            const sessionsAfter = await manager.query('SELECT * FROM sessions');
            const groupsAfter = await manager.query('SELECT * FROM tab_groups');
            expect(sessionsAfter).toHaveLength(0);
            expect(groupsAfter).toHaveLength(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should allow operations after reset', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          async (testValue) => {
            // Insert data
            await manager.execute(
              'INSERT INTO sessions (tabs, activeTabId, timestamp, version) VALUES (?, ?, ?, ?)',
              [JSON.stringify([]), testValue, Date.now(), '1.0.0']
            );

            // Reset
            await manager.reset();

            // Should be able to insert again
            await manager.execute(
              'INSERT INTO sessions (tabs, activeTabId, timestamp, version) VALUES (?, ?, ?, ?)',
              [JSON.stringify([]), testValue, Date.now(), '1.0.0']
            );

            const results = await manager.query<any>(
              'SELECT activeTabId FROM sessions WHERE activeTabId = ?',
              [testValue]
            );
            expect(results).toHaveLength(1);
            expect(results[0].activeTabId).toBe(testValue);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should preserve schema after reset', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          // Reset
          await manager.reset();

          // Schema should still exist - verify by inserting
          await manager.execute(
            'INSERT INTO sessions (tabs, activeTabId, timestamp, version) VALUES (?, ?, ?, ?)',
            [JSON.stringify([]), 'test', Date.now(), '1.0.0']
          );

          await manager.execute(
            'INSERT INTO tab_groups (id, name, color, tabIds, isCollapsed, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
            ['test-id', 'Test', 'red', JSON.stringify([]), 0, Date.now()]
          );

          // Should not throw
        }),
        { numRuns: 10 }
      );
    });

    it('should be idempotent - multiple resets should work', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }),
          async (resetCount) => {
            // Insert data
            await manager.execute(
              'INSERT INTO sessions (tabs, activeTabId, timestamp, version) VALUES (?, ?, ?, ?)',
              [JSON.stringify([]), 'test', Date.now(), '1.0.0']
            );

            // Reset multiple times
            for (let i = 0; i < resetCount; i++) {
              await manager.reset();
              
              // Should be empty after each reset
              const results = await manager.query('SELECT * FROM sessions');
              expect(results).toHaveLength(0);
              
              // Should still be ready
              expect(manager.isReady()).toBe(true);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
