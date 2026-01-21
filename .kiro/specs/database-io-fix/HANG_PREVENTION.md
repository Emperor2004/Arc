# Database IO Fix - Hang Prevention Strategy

## Critical Issue: Test Hangs

The current database implementation causes tests to hang indefinitely. This spec addresses this with comprehensive timeout and hang prevention measures.

## Root Causes of Hangs

1. **No operation timeouts** - Database operations can run forever
2. **Infinite retry loops** - Retry logic without maximum attempts
3. **Queue deadlocks** - Operations waiting indefinitely in queue
4. **No test timeouts** - Tests don't have maximum execution time
5. **Blocking operations** - Synchronous operations blocking event loop

## Prevention Measures

### 1. Operation-Level Timeouts

Every database operation has a maximum execution time:
- **Production**: 30 seconds per operation
- **Test mode**: 5 seconds per operation

```typescript
async query<T>(sql: string, params?: any[], timeout?: number): Promise<T[]> {
  const effectiveTimeout = timeout ?? this.config.operationTimeout;
  return withTimeout(
    () => this.executeQuery(sql, params),
    effectiveTimeout,
    `query: ${sql}`
  );
}
```

### 2. Queue-Level Timeouts

Operations waiting in queue have maximum wait time:
- **Production**: 60 seconds queue wait
- **Test mode**: 10 seconds queue wait

```typescript
enqueue<T>(operation: () => Promise<T>, timeout?: number): Promise<T> {
  const effectiveTimeout = timeout ?? this.config.queueTimeout;
  
  return new Promise((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      reject(new TimeoutError(
        `Operation timed out in queue after ${effectiveTimeout}ms`,
        'queue'
      ));
    }, effectiveTimeout);
    
    this.queue.push({ operation, resolve, reject, timeoutHandle });
  });
}
```

### 3. Retry Loop Limits

Retry logic has strict maximum attempts:
- **Production**: Maximum 3 retry attempts
- **Test mode**: Maximum 2 retry attempts
- **Exponential backoff**: Prevents rapid retries
- **Attempt counter**: Tracks and enforces limit

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let attempt = 0;
  const startTime = Date.now();
  
  while (attempt < config.maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      
      // CRITICAL: Always check attempt limit
      if (attempt >= config.maxAttempts) {
        throw new Error(
          `Operation failed after ${attempt} attempts: ${error.message}`
        );
      }
      
      const delay = Math.min(
        config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Should never reach here, but fail-safe
  throw new Error('Retry loop exceeded maximum attempts');
}
```

### 4. Test Framework Timeouts

All tests have explicit timeouts:

```typescript
// Global test timeout
beforeAll(() => {
  vi.setConfig({ testTimeout: 10000 }); // 10 seconds
});

// Individual test timeout
it('should not hang', async () => {
  await databaseManager.initialize();
}, 5000); // 5 second timeout

// Property test timeout
fc.assert(
  fc.asyncProperty(/* ... */),
  { 
    timeout: 5000, // Per iteration
    interruptAfterTimeLimit: 30000 // Total
  }
);
```

### 5. Test Mode Configuration

Separate configuration for tests with shorter timeouts:

```typescript
const TEST_CONFIG: DatabaseConfig = {
  operationTimeout: 5000,    // 5 seconds (vs 30s production)
  queueTimeout: 10000,       // 10 seconds (vs 60s production)
  testMode: true,
  retryConfig: {
    maxAttempts: 2,          // 2 attempts (vs 3 production)
    initialDelay: 50,        // 50ms (vs 100ms production)
    maxDelay: 500,           // 500ms (vs 2000ms production)
    backoffMultiplier: 2
  }
};
```

### 6. Operation Abort Mechanism

Emergency shutdown can cancel all pending operations:

```typescript
abortPendingOperations(): void {
  for (const op of this.writeQueue.queue) {
    clearTimeout(op.timeoutHandle);
    op.reject(new Error('Operation aborted'));
  }
  this.writeQueue.clear();
}
```

## Implementation Checklist

- [ ] Add `operationTimeout` to DatabaseConfig
- [ ] Add `queueTimeout` to DatabaseConfig
- [ ] Add `testMode` flag to DatabaseConfig
- [ ] Implement `withTimeout` wrapper function
- [ ] Wrap all database operations with `withTimeout`
- [ ] Add timeout handling to OperationQueue
- [ ] Add attempt counter to retry logic
- [ ] Enforce maximum retry attempts
- [ ] Create TEST_CONFIG with shorter timeouts
- [ ] Add timeout parameters to all test suites
- [ ] Add timeout to all property-based tests
- [ ] Implement `abortPendingOperations` method
- [ ] Add timeout error type
- [ ] Document timeout behavior

## Testing the Prevention

### Test Cases for Hang Prevention

1. **Operation Timeout Test**
   ```typescript
   it('should timeout long operations', async () => {
     const slowOp = () => new Promise(resolve => setTimeout(resolve, 10000));
     await expect(
       withTimeout(slowOp, 1000, 'slow operation')
     ).rejects.toThrow('timed out');
   });
   ```

2. **Queue Timeout Test**
   ```typescript
   it('should timeout queued operations', async () => {
     // Fill queue with blocking operations
     const promises = Array(10).fill(0).map(() => 
       queue.enqueue(() => new Promise(resolve => setTimeout(resolve, 5000)))
     );
     
     // This should timeout waiting in queue
     await expect(
       queue.enqueue(() => Promise.resolve(), 100)
     ).rejects.toThrow('timed out in queue');
   });
   ```

3. **Retry Limit Test**
   ```typescript
   it('should not retry infinitely', async () => {
     let attempts = 0;
     const alwaysFails = () => {
       attempts++;
       return Promise.reject(new Error('fail'));
     };
     
     await expect(
       withRetry(alwaysFails, { maxAttempts: 3, initialDelay: 10, maxDelay: 100, backoffMultiplier: 2 })
     ).rejects.toThrow();
     
     expect(attempts).toBe(3); // Exactly 3 attempts, no more
   });
   ```

## Monitoring and Debugging

### Logging for Hang Detection

```typescript
// Log slow operations
if (duration > this.config.operationTimeout * 0.8) {
  console.warn(
    `Slow operation detected: ${operationName} took ${duration}ms ` +
    `(${(duration / this.config.operationTimeout * 100).toFixed(1)}% of timeout)`
  );
}

// Log queue statistics
setInterval(() => {
  const stats = this.writeQueue.getStats();
  if (stats.pending > 5 || stats.oldestAge > 10000) {
    console.warn(
      `Queue backlog detected: ${stats.pending} pending operations, ` +
      `oldest is ${stats.oldestAge}ms old`
    );
  }
}, 5000);
```

## Success Criteria

The hang prevention is successful when:
- ✅ No test hangs for more than 10 seconds
- ✅ All database operations complete or timeout within configured limits
- ✅ Retry loops always terminate after maximum attempts
- ✅ Queue operations timeout if waiting too long
- ✅ Test mode uses shorter timeouts than production
- ✅ All async operations are wrapped with timeout protection
- ✅ Emergency abort can cancel all pending operations
