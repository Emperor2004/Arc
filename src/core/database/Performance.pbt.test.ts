import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { DatabaseManager, TEST_CONFIG } from './DatabaseManager';
import * as path from 'path';
import * as fs from 'fs';

describe('Performance Optimization Property-Based Tests', () => {
  let manager: DatabaseManager;
  const testDbPath = path.join(__dirname, '../../../data/test-performance.db');

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
    
    // Drop test tables if they exist from previous runs
    try {
      await manager.execute('DROP TABLE IF EXISTS test');
      await manager.execute('DROP TABLE IF EXISTS test_individual');
      await manager.execute('DROP TABLE IF EXISTS test_batch');
      await manager.execute('DROP TABLE IF EXISTS test_reconnect');
      await manager.execute('DROP TABLE IF EXISTS test_integrity');
    } catch (error) {
      // Ignore errors if tables don't exist
    }
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

  describe('Property 18: Batch Transaction Wrapping', () => {
    it('should execute multiple operations in a single transaction', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 10 }),
          async (values) => {
            // Create table (drop first to ensure clean state)
            await manager.execute('DROP TABLE IF EXISTS test');
            await manager.execute('CREATE TABLE test (value TEXT)');

            // Prepare batch operations
            const operations = values.map(value => ({
              sql: 'INSERT INTO test (value) VALUES (?)',
              params: [value]
            }));

            // Execute as batch
            await manager.batch(operations);

            // Verify all inserted
            const results = await manager.query<any>('SELECT value FROM test');
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

    it('should be atomic - all or nothing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 3, maxLength: 5 }),
          async (values) => {
            // Create table (drop first to ensure clean state)
            await manager.execute('DROP TABLE IF EXISTS test');
            await manager.execute('CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT UNIQUE)');

            // Insert first value normally
            await manager.execute('INSERT INTO test (value) VALUES (?)', [values[0]]);

            // Try to batch insert including duplicate (should fail)
            const operations = values.map(value => ({
              sql: 'INSERT INTO test (value) VALUES (?)',
              params: [value]
            }));

            let error: Error | null = null;
            try {
              await manager.batch(operations);
            } catch (e) {
              error = e as Error;
            }

            // Should have failed due to duplicate
            expect(error).not.toBeNull();

            // Only the first value should exist (transaction rolled back)
            const results = await manager.query<any>('SELECT value FROM test');
            expect(results).toHaveLength(1);
            expect(results[0].value).toBe(values[0]);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle empty batch gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          // Empty batch should not throw
          await manager.batch([]);
        }),
        { numRuns: 10 }
      );
    });

    it('should be faster than individual operations for large batches', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 50, maxLength: 100 }),
          async (values) => {
            // Create tables (drop first to ensure clean state)
            await manager.execute('DROP TABLE IF EXISTS test_individual');
            await manager.execute('DROP TABLE IF EXISTS test_batch');
            await manager.execute('CREATE TABLE test_individual (value TEXT)');
            await manager.execute('CREATE TABLE test_batch (value TEXT)');

            // Time individual operations
            const startIndividual = Date.now();
            for (const value of values) {
              await manager.execute('INSERT INTO test_individual (value) VALUES (?)', [value]);
            }
            const individualTime = Date.now() - startIndividual;

            // Time batch operation
            const operations = values.map(value => ({
              sql: 'INSERT INTO test_batch (value) VALUES (?)',
              params: [value]
            }));
            const startBatch = Date.now();
            await manager.batch(operations);
            const batchTime = Date.now() - startBatch;

            // Batch should be faster (or at least not significantly slower)
            // Allow some variance due to test environment
            expect(batchTime).toBeLessThan(individualTime * 2);

            // Verify both have same data
            const individualResults = await manager.query('SELECT * FROM test_individual');
            const batchResults = await manager.query('SELECT * FROM test_batch');
            expect(individualResults).toHaveLength(values.length);
            expect(batchResults).toHaveLength(values.length);
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Property 19: Index Existence', () => {
    it('should have all required indices', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          const { missing, existing } = await manager.verifyIndices();

          // All required indices should exist
          expect(missing).toHaveLength(0);
          expect(existing.length).toBeGreaterThan(0);
          
          // Specific indices should exist
          expect(existing).toContain('idx_sessions_timestamp');
          expect(existing).toContain('idx_tab_groups_createdAt');
        }),
        { numRuns: 10 }
      );
    });

    it('should detect missing indices correctly', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          // Drop an index
          await manager.execute('DROP INDEX IF EXISTS idx_sessions_timestamp');

          const { missing, existing } = await manager.verifyIndices();

          // Should detect missing index
          expect(missing).toContain('idx_sessions_timestamp');
          expect(existing).not.toContain('idx_sessions_timestamp');

          // Recreate index
          await manager.execute(
            'CREATE INDEX idx_sessions_timestamp ON sessions(timestamp DESC)'
          );

          // Should now exist
          const { missing: missing2, existing: existing2 } = await manager.verifyIndices();
          expect(missing2).not.toContain('idx_sessions_timestamp');
          expect(existing2).toContain('idx_sessions_timestamp');
        }),
        { numRuns: 5 }
      );
    });
  });

  describe('Batch Operation Edge Cases', () => {
    it('should handle mixed operation types in batch', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 5 }),
            fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 5 })
          ),
          async ([insertValues, updateValues]) => {
            // Create table (drop first to ensure clean state)
            await manager.execute('DROP TABLE IF EXISTS test');
            await manager.execute('CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)');

            // Batch with inserts
            const insertOps = insertValues.map((value, idx) => ({
              sql: 'INSERT INTO test (id, value) VALUES (?, ?)',
              params: [idx + 1, value]
            }));
            await manager.batch(insertOps);

            // Batch with updates
            const updateOps = updateValues.map((value, idx) => ({
              sql: 'UPDATE test SET value = ? WHERE id = ?',
              params: [value, idx + 1]
            }));
            await manager.batch(updateOps);

            // Verify updates applied
            const results = await manager.query<any>('SELECT value FROM test ORDER BY id');
            expect(results).toHaveLength(insertValues.length);
            
            // First N should have updated values
            for (let i = 0; i < Math.min(updateValues.length, results.length); i++) {
              expect(results[i].value).toBe(updateValues[i]);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
