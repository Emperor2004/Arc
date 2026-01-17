import { RetryConfig, TimeoutError } from './DatabaseManager';

export interface RetryContext {
  attempt: number;
  startTime: number;
  lastError?: Error;
}

/**
 * Execute an operation with retry logic and exponential backoff
 * CRITICAL: Has maximum attempt limit to prevent infinite loops
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  shouldRetry?: (error: Error, context: RetryContext) => boolean
): Promise<T> {
  const startTime = Date.now();
  let attempt = 0;
  let lastError: Error | undefined;

  while (attempt < config.maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      lastError = error as Error;

      const context: RetryContext = {
        attempt,
        startTime,
        lastError
      };

      // Don't retry if we've reached max attempts
      if (attempt >= config.maxAttempts) {
        throw new Error(
          `Operation failed after ${attempt} attempts: ${lastError.message}`
        );
      }

      // Don't retry timeout errors
      if (error instanceof TimeoutError) {
        throw error;
      }

      // Check custom retry condition if provided
      if (shouldRetry && !shouldRetry(lastError, context)) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelay
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Should never reach here due to the check above, but fail-safe
  throw new Error(
    `Retry loop exceeded maximum attempts (${config.maxAttempts}): ${lastError?.message}`
  );
}

/**
 * Wrap an async operation with a timeout
 * CRITICAL: Prevents operations from hanging indefinitely
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeout: number,
  operationName: string
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new TimeoutError(
          `Operation '${operationName}' timed out after ${timeout}ms`,
          operationName
        )),
        timeout
      )
    )
  ]);
}

/**
 * Check if an error is retryable (e.g., SQLITE_BUSY)
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('sqlite_busy') ||
    message.includes('database is locked') ||
    message.includes('database is busy')
  );
}
