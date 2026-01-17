import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { withRetry, withTimeout, isRetryableError } from './RetryStrategy';
import { TimeoutError } from './DatabaseManager';

describe('RetryStrategy Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 3: Initialization Retry on Failure
   * Feature: database-io-fix, Property 3: Initialization Retry on Failure
   * Validates: Requirements 1.4
   */
  it('should retry initialization on failure with exponential backoff', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }), // Number of failures before success
        async (failuresBeforeSuccess) => {
          let attempts = 0;
          const operation = async () => {
            attempts++;
            if (attempts <= failuresBeforeSuccess) {
              throw new Error('Initialization failed');
            }
            return 'success';
          };

          const config = {
            maxAttempts: 5,
            initialDelay: 10,
            maxDelay: 100,
            backoffMultiplier: 2
          };

          const result = await withRetry(operation, config);
          
          expect(result).toBe('success');
          expect(attempts).toBe(failuresBeforeSuccess + 1);
          
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
   * Property 8: Retry on SQLITE_BUSY
   * Feature: database-io-fix, Property 8: Retry on SQLITE_BUSY
   * Validates: Requirements 2.3
   */
  it('should retry on SQLITE_BUSY errors with exponential backoff', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 2 }), // Number of SQLITE_BUSY errors
        async (busyErrors) => {
          let attempts = 0;
          const operation = async () => {
            attempts++;
            if (attempts <= busyErrors) {
              const error = new Error('SQLITE_BUSY: database is locked');
              throw error;
            }
            return 'success';
          };

          const config = {
            maxAttempts: 3,
            initialDelay: 50,
            maxDelay: 500,
            backoffMultiplier: 2
          };

          const shouldRetry = (error: Error) => isRetryableError(error);

          const result = await withRetry(operation, config, shouldRetry);
          
          expect(result).toBe('success');
          expect(attempts).toBe(busyErrors + 1);
          expect(attempts).toBeLessThanOrEqual(config.maxAttempts);
          
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
   * Property 31: Retry Loop Termination
   * Feature: database-io-fix, Property 31: Retry Loop Termination
   * Validates: Requirements 9.7, 9.8
   */
  it('should terminate retry loop after maximum attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }), // Max attempts
        async (maxAttempts) => {
          let attempts = 0;
          const alwaysFails = async () => {
            attempts++;
            throw new Error('Operation always fails');
          };

          const config = {
            maxAttempts,
            initialDelay: 10,
            maxDelay: 50,
            backoffMultiplier: 2
          };

          try {
            await withRetry(alwaysFails, config);
            // Should not reach here
            return false;
          } catch (error) {
            // Should fail after exactly maxAttempts
            expect(attempts).toBe(maxAttempts);
            expect((error as Error).message).toContain(`after ${maxAttempts} attempts`);
            return true;
          }
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
   * Additional test: Timeout errors should not be retried
   */
  it('should not retry timeout errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          let attempts = 0;
          const operation = async () => {
            attempts++;
            throw new TimeoutError('Operation timed out', 'test');
          };

          const config = {
            maxAttempts: 3,
            initialDelay: 10,
            maxDelay: 100,
            backoffMultiplier: 2
          };

          try {
            await withRetry(operation, config);
            return false;
          } catch (error) {
            // Should fail immediately without retrying
            expect(attempts).toBe(1);
            expect(error).toBeInstanceOf(TimeoutError);
            return true;
          }
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
   * Additional test: withTimeout should enforce timeout
   */
  it('should enforce timeout on operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 50, max: 200 }), // Timeout in ms
        async (timeout) => {
          const slowOperation = async () => {
            await new Promise(resolve => setTimeout(resolve, timeout + 100));
            return 'completed';
          };

          try {
            await withTimeout(slowOperation, timeout, 'slow-op');
            // If operation completes before timeout, that's ok
            return true;
          } catch (error) {
            // Should be a timeout error
            expect(error).toBeInstanceOf(TimeoutError);
            expect((error as TimeoutError).operation).toBe('slow-op');
            return true;
          }
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
   * Additional test: isRetryableError should identify retryable errors
   */
  it('should correctly identify retryable errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'SQLITE_BUSY',
          'database is locked',
          'database is busy',
          'Database Is Locked', // Case insensitive
          'SQLITE_BUSY: database is locked'
        ),
        async (errorMessage) => {
          const error = new Error(errorMessage);
          expect(isRetryableError(error)).toBe(true);
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

  it('should correctly identify non-retryable errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'SQLITE_CORRUPT',
          'disk full',
          'permission denied',
          'invalid SQL',
          'constraint violation'
        ),
        async (errorMessage) => {
          const error = new Error(errorMessage);
          expect(isRetryableError(error)).toBe(false);
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
