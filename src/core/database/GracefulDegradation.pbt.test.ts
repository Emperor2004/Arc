import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { DatabaseManager, TEST_CONFIG } from './DatabaseManager';
import * as path from 'path';
import * as fs from 'fs';

describe('Graceful Degradation Property-Based Tests', () => {
  let manager: DatabaseManager;
  const testDbPath = path.join(__dirname, '../../../data/test-degradation.db');

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

  describe('Property 14: Graceful Degradation', () => {
    it('should return empty results for queries when database not ready (graceful mode)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (sql) => {
            manager = DatabaseManager.getInstance({
              ...TEST_CONFIG,
              path: testDbPath,
              gracefulDegradation: true
            });
            
            // Don't initialize - database not ready
            // Query should return empty array instead of throwing
            const result = await manager.query(`SELECT '${sql}' as value`);
            expect(result).toEqual([]);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should skip execute operations when database not ready (graceful mode)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          async (value) => {
            manager = DatabaseManager.getInstance({
              ...TEST_CONFIG,
              path: testDbPath,
              gracefulDegradation: true
            });
            
            // Don't initialize - database not ready
            // Execute should not throw, just skip
            await expect(
              manager.execute('CREATE TABLE test (value TEXT)')
            ).resolves.not.toThrow();
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should throw errors when graceful degradation is disabled', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          manager = DatabaseManager.getInstance({
            ...TEST_CONFIG,
            path: testDbPath,
            gracefulDegradation: false
          });
          
          // Don't initialize - database not ready
          // Should throw error
          await expect(
            manager.query('SELECT 1')
          ).rejects.toThrow('Database not initialized');
        }),
        { numRuns: 10 }
      );
    });

    it('should work normally when database is ready (graceful mode)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          async (testValue) => {
            manager = DatabaseManager.getInstance({
              ...TEST_CONFIG,
              path: testDbPath,
              gracefulDegradation: true
            });
            
            await manager.initialize();
            
            // Should work normally when ready
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

    it('should handle mixed ready/not-ready states gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 3, maxLength: 5 }),
          async (values) => {
            // Close and reset before each iteration
            if (manager) {
              await manager.close();
            }
            DatabaseManager.resetInstance();
            
            manager = DatabaseManager.getInstance({
              ...TEST_CONFIG,
              path: testDbPath,
              gracefulDegradation: true
            });
            
            // Query before init - should return empty
            const before = await manager.query('SELECT 1');
            expect(before).toEqual([]);
            
            // Initialize
            await manager.initialize();
            
            // Create table and insert
            await manager.execute('DROP TABLE IF EXISTS test');
            await manager.execute('CREATE TABLE test (value TEXT)');
            for (const value of values) {
              await manager.execute('INSERT INTO test (value) VALUES (?)', [value]);
            }
            
            // Query after init - should work
            const after = await manager.query<any>('SELECT value FROM test');
            expect(after).toHaveLength(values.length);
            
            // Close
            await manager.close();
            
            // Query after close - should return empty
            const afterClose = await manager.query('SELECT 1');
            expect(afterClose).toEqual([]);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Fallback Behavior', () => {
    it('should log warnings when operations are skipped', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          manager = DatabaseManager.getInstance({
            ...TEST_CONFIG,
            path: testDbPath,
            gracefulDegradation: true
          });
          
          // Capture console.warn
          const warnings: string[] = [];
          const originalWarn = console.warn;
          console.warn = (...args: any[]) => {
            warnings.push(args.join(' '));
          };
          
          try {
            // Operations without initialization
            await manager.query('SELECT 1');
            await manager.execute('CREATE TABLE test (id INTEGER)');
            
            // Should have logged warnings
            expect(warnings.length).toBeGreaterThan(0);
            expect(warnings.some(w => w.includes('not ready'))).toBe(true);
          } finally {
            console.warn = originalWarn;
          }
        }),
        { numRuns: 5 }
      );
    });
  });
});
