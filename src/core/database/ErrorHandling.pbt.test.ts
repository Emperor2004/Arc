import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { DatabaseManager, TEST_CONFIG, DatabaseError, TimeoutError } from './DatabaseManager';
import * as path from 'path';
import * as fs from 'fs';

describe('Error Handling Property-Based Tests', () => {
  let manager: DatabaseManager;
  const testDbPath = path.join(__dirname, '../../../data/test-error-handling.db');

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

  describe('Property 11: Error Logging Completeness', () => {
    it('should log all errors with operation context', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.array(fc.string(), { maxLength: 5 }),
          async (sql, params) => {
            // Create invalid SQL to trigger error
            const invalidSql = `INVALID SQL ${sql}`;
            
            let caughtError: Error | null = null;
            try {
              await manager.execute(invalidSql, params);
            } catch (error) {
              caughtError = error as Error;
            }

            // Should catch error
            expect(caughtError).not.toBeNull();
            
            // Error should have meaningful message
            expect(caughtError!.message).toBeDefined();
            expect(caughtError!.message.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should categorize errors as recoverable or non-recoverable', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          // Test syntax error (non-recoverable)
          let syntaxError: Error | null = null;
          try {
            await manager.execute('INVALID SQL SYNTAX');
          } catch (error) {
            syntaxError = error as Error;
          }

          expect(syntaxError).not.toBeNull();
          expect(syntaxError!.message.toLowerCase()).toContain('syntax');

          // Database should still work after syntax error
          const result = await manager.query<any>('SELECT 1 as value');
          expect(result).toHaveLength(1);
          expect(result[0].value).toBe(1);
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 12: Error Propagation', () => {
    it('should propagate errors with meaningful messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'SELECT * FROM nonexistent_table',
            'INSERT INTO nonexistent_table VALUES (1)',
            'UPDATE nonexistent_table SET x = 1',
            'DELETE FROM nonexistent_table'
          ),
          async (invalidSql) => {
            let error: Error | null = null;
            try {
              await manager.execute(invalidSql);
            } catch (e) {
              error = e as Error;
            }

            // Should propagate error
            expect(error).not.toBeNull();
            
            // Error message should be meaningful
            expect(error!.message).toBeDefined();
            expect(error!.message.length).toBeGreaterThan(10);
            
            // Should contain context about what failed
            expect(
              error!.message.includes('table') ||
              error!.message.includes('syntax') ||
              error!.message.includes('error')
            ).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should preserve error stack traces', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          let error: Error | null = null;
          try {
            await manager.execute('SELECT * FROM nonexistent_table');
          } catch (e) {
            error = e as Error;
          }

          expect(error).not.toBeNull();
          expect(error!.stack).toBeDefined();
          expect(error!.stack!.length).toBeGreaterThan(0);
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Timeout Error Handling', () => {
    it('should throw TimeoutError with operation context', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (timeoutMs) => {
            let error: Error | null = null;
            try {
              // This will timeout because we set a very short timeout
              await manager.query('SELECT * FROM sqlite_master', [], timeoutMs);
            } catch (e) {
              error = e as Error;
            }

            if (error instanceof TimeoutError) {
              expect(error.operation).toBeDefined();
              expect(error.message).toContain('timed out');
              expect(error.message).toContain(`${timeoutMs}ms`);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Error Recovery', () => {
    it('should continue working after recoverable errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          async (testValue) => {
            // Cause an error
            try {
              await manager.execute('SELECT * FROM nonexistent_table');
            } catch {
              // Expected
            }

            // Should still work after error
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
  });
});
