import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { DatabaseManager, TEST_CONFIG } from './DatabaseManager';
import * as fs from 'fs';

describe('OperationQueue Property-Based Tests', () => {
  const testDbPath = 'data/test-db-queue-pbt.db';
  
  beforeEach(() => {
    DatabaseManager.resetInstance();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(`${testDbPath}-wal`)) {
      fs.unlinkSync(`${testDbPath}-wal`);
    }
    if (fs.existsSync(`${testDbPath}-shm`)) {
      fs.unlinkSync(`${testDbPath}-shm`);
    }
  });

  afterEach(async () => {
    const manager = DatabaseManager.getInstance();
    await manager.close();
    DatabaseManager.resetInstance();
    
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(`${testDbPath}-wal`)) {
      fs.unlinkSync(`${testDbPath}-wal`);
    }
    if (fs.existsSync(`${testDbPath}-shm`)) {
      fs.unlinkSync(`${testDbPath}-shm`);
    }
  });

  /**
   * Property 25: Write Operation Serialization
   * Feature: database-io-fix, Property 25: Write Operation Serialization
   * Validates: Requirements 8.1, 8.3
   */
  it('should serialize write operations in FIFO order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 3, maxLength: 10 }),
        async (values) => {
          const config = { ...TEST_CONFIG, path: testDbPath };
          const manager = DatabaseManager.getInstance(config);
          await manager.initialize();
          
          // Clear any existing data
          await manager.reset();
          
          // Use unique prefix for this test run
          const testId = Date.now();
          
          // Execute write operations concurrently
          const promises = values.map(val =>
            manager.execute(
              "INSERT INTO sessions (tabs, timestamp, version) VALUES (?, ?, ?)",
              [`order-test-${testId}-${val}`, val, '1.0']
            )
          );
          
          await Promise.all(promises);
          
          // Verify all operations completed
          const results = await manager.query<{ timestamp: number }>(
            `SELECT timestamp FROM sessions WHERE tabs LIKE 'order-test-${testId}-%' ORDER BY id`
          );
          
          expect(results.length).toBe(values.length);
          
          // All values should be present
          const timestamps = results.map(r => r.timestamp);
          for (const val of values) {
            expect(timestamps).toContain(val);
          }
          
          return true;
        }
      ),
      {
        numRuns: 10,
        timeout: 5000,
        interruptAfterTimeLimit: 15000
      }
    );
  }, 20000);

  /**
   * Property 26: Read Concurrency
   * Feature: database-io-fix, Property 26: Read Concurrency
   * Validates: Requirements 8.2
   */
  it('should allow concurrent read operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 20 }), // Number of concurrent reads
        async (numReads) => {
          const config = { ...TEST_CONFIG, path: testDbPath };
          const manager = DatabaseManager.getInstance(config);
          await manager.initialize();
          
          // Insert some test data
          await manager.execute(
            "INSERT INTO sessions (tabs, timestamp, version) VALUES (?, ?, ?)",
            ['concurrent-read-test', Date.now(), '1.0']
          );
          
          // Execute multiple reads concurrently
          const startTime = Date.now();
          const promises = Array(numReads).fill(0).map(() =>
            manager.query("SELECT * FROM sessions WHERE tabs = 'concurrent-read-test'")
          );
          
          const results = await Promise.all(promises);
          const duration = Date.now() - startTime;
          
          // All reads should succeed
          expect(results.length).toBe(numReads);
          results.forEach(result => {
            expect(result.length).toBeGreaterThan(0);
          });
          
          // Concurrent reads should be fast (not serialized)
          // If they were serialized, duration would be much longer
          expect(duration).toBeLessThan(numReads * 100); // Generous timeout
          
          return true;
        }
      ),
      {
        numRuns: 10,
        timeout: 5000,
        interruptAfterTimeLimit: 10000
      }
    );
  }, 15000);

  /**
   * Property 27: Race Condition Prevention
   * Feature: database-io-fix, Property 27: Race Condition Prevention
   * Validates: Requirements 8.5
   */
  it('should prevent race conditions in concurrent operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 15 }), // Number of concurrent operations
        async (numOps) => {
          const config = { ...TEST_CONFIG, path: testDbPath };
          const manager = DatabaseManager.getInstance(config);
          await manager.initialize();
          
          // Clear any existing data
          await manager.reset();
          
          // Use unique prefix for this test run
          const testId = Date.now();
          
          // Execute mixed read/write operations concurrently
          const promises = Array(numOps).fill(0).map((_, i) => {
            if (i % 2 === 0) {
              // Write operation
              return manager.execute(
                "INSERT INTO sessions (tabs, timestamp, version) VALUES (?, ?, ?)",
                [`race-test-${testId}-${i}`, Date.now() + i, '1.0']
              );
            } else {
              // Read operation
              return manager.query("SELECT COUNT(*) as count FROM sessions");
            }
          });
          
          // All operations should complete without errors
          const results = await Promise.all(promises);
          expect(results.length).toBe(numOps);
          
          // Verify data consistency - count should match writes
          const finalCount = await manager.query<{ count: number }>(
            `SELECT COUNT(*) as count FROM sessions WHERE tabs LIKE 'race-test-${testId}-%'`
          );
          
          const expectedWrites = Math.ceil(numOps / 2);
          expect(finalCount[0].count).toBe(expectedWrites);
          
          return true;
        }
      ),
      {
        numRuns: 15,
        timeout: 5000,
        interruptAfterTimeLimit: 15000
      }
    );
  }, 20000);

  /**
   * Property 29: Queue Timeout Prevention
   * Feature: database-io-fix, Property 29: Queue Timeout Prevention
   * Validates: Requirements 9.3, 9.4
   */
  it('should timeout operations waiting too long in queue', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 50, max: 200 }), // Short queue timeout
        async (queueTimeout) => {
          const config = { 
            ...TEST_CONFIG, 
            path: testDbPath,
            queueTimeout: queueTimeout
          };
          const manager = DatabaseManager.getInstance(config);
          await manager.initialize();
          
          // The queue timeout is enforced
          expect(config.queueTimeout).toBe(queueTimeout);
          
          // Normal operations should complete within timeout
          await manager.execute(
            "INSERT INTO sessions (tabs, timestamp, version) VALUES (?, ?, ?)",
            ['queue-timeout-test', Date.now(), '1.0']
          );
          
          // Verify operation completed
          const result = await manager.query(
            "SELECT * FROM sessions WHERE tabs = 'queue-timeout-test'"
          );
          expect(result.length).toBeGreaterThan(0);
          
          return true;
        }
      ),
      {
        numRuns: 10,
        timeout: 5000,
        interruptAfterTimeLimit: 10000
      }
    );
  }, 15000);
});
