# Design Document: Database IO Fix

## Overview

This design addresses database IO issues in Arc Browser by implementing a robust database management system with proper initialization, connection lifecycle management, error handling, and performance optimizations. The solution ensures that database operations are reliable, performant, and safe across the main and renderer processes.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React Components & Services                         │   │
│  │  (No direct database access)                         │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │ IPC Calls                            │
└───────────────────────┼──────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                     Main Process                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  IPC Handlers                                        │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐   │
│  │  DatabaseManager (Singleton)                         │   │
│  │  - Connection Management                             │   │
│  │  - Transaction Handling                              │   │
│  │  - Error Recovery                                    │   │
│  │  - Statement Caching                                 │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐   │
│  │  SQLite Database (WAL Mode)                          │   │
│  │  - arc-browser.db                                    │   │
│  │  - arc-browser.db-wal                                │   │
│  │  - arc-browser.db-shm                                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Singleton Pattern**: Use a single DatabaseManager instance to manage the database connection
2. **WAL Mode**: Enable Write-Ahead Logging for better concurrency and crash recovery
3. **Statement Caching**: Cache prepared statements to improve performance
4. **Operation Queue**: Serialize write operations to prevent conflicts
5. **Retry Logic**: Implement exponential backoff for transient errors
6. **Graceful Degradation**: Provide fallback behavior when database is unavailable

## Components and Interfaces

### DatabaseManager Class

```typescript
class DatabaseManager {
  private db: Database.Database | null;
  private statementCache: Map<string, Database.Statement>;
  private writeQueue: OperationQueue;
  private isInitialized: boolean;
  private initPromise: Promise<void> | null;
  private config: DatabaseConfig;
  
  // Singleton instance
  private static instance: DatabaseManager | null;
  
  // Get singleton instance
  static getInstance(config?: DatabaseConfig): DatabaseManager;
  
  // Initialize database connection
  async initialize(): Promise<void>;
  
  // Execute a read query with timeout
  async query<T>(sql: string, params?: any[], timeout?: number): Promise<T[]>;
  
  // Execute a write operation with timeout
  async execute(sql: string, params?: any[], timeout?: number): Promise<void>;
  
  // Execute multiple operations in a transaction with timeout
  async transaction(operations: Operation[], timeout?: number): Promise<void>;
  
  // Get a prepared statement (cached)
  getStatement(sql: string): Database.Statement;
  
  // Close database connection
  async close(): Promise<void>;
  
  // Reset database (for testing)
  async reset(): Promise<void>;
  
  // Check if database is ready
  isReady(): boolean;
  
  // Wait for database to be ready with timeout
  waitForReady(timeout?: number): Promise<void>;
  
  // Abort all pending operations (for emergency shutdown)
  abortPendingOperations(): void;
}
```

### OperationQueue Class

```typescript
interface QueuedOperation {
  id: string;
  operation: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: number;
  enqueuedAt: number;
  timeoutHandle?: NodeJS.Timeout;
}

class OperationQueue {
  private queue: QueuedOperation[];
  private isProcessing: boolean;
  private config: DatabaseConfig;
  
  // Add operation to queue with timeout
  enqueue<T>(operation: () => Promise<T>, timeout?: number): Promise<T>;
  
  // Process next operation in queue
  private async processNext(): Promise<void>;
  
  // Clear all pending operations
  clear(): void;
  
  // Get queue statistics
  getStats(): { pending: number; oldestAge: number };
  
  // Check for stale operations and log warnings
  private checkForStaleOperations(): void;
}
```

### RetryStrategy

```typescript
interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface RetryContext {
  attempt: number;
  startTime: number;
  lastError?: Error;
}

async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  shouldRetry?: (error: Error, context: RetryContext) => boolean
): Promise<T>;

// Timeout wrapper for any async operation
async function withTimeout<T>(
  operation: () => Promise<T>,
  timeout: number,
  operationName: string
): Promise<T>;
```

### Migration System

```typescript
interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
  down: (db: Database.Database) => void;
}

class MigrationManager {
  private migrations: Migration[];
  
  // Get current schema version
  getCurrentVersion(): number;
  
  // Apply pending migrations
  async applyMigrations(): Promise<void>;
  
  // Rollback to specific version
  async rollback(targetVersion: number): Promise<void>;
}
```

## Data Models

### Database Schema

```sql
-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);

-- Sessions table (existing, with optimizations)
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tabs TEXT NOT NULL,
  activeTabId TEXT,
  timestamp INTEGER NOT NULL,
  version TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Tab groups table (existing, with optimizations)
CREATE TABLE IF NOT EXISTS tab_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  tabIds TEXT NOT NULL,
  isCollapsed INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_sessions_timestamp ON sessions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tab_groups_createdAt ON tab_groups(createdAt DESC);
```

### Configuration

```typescript
interface DatabaseConfig {
  path: string;
  busyTimeout: number;
  enableWAL: boolean;
  cacheSize: number;
  pageSize: number;
  maxConnections: number;
  operationTimeout: number;
  queueTimeout: number;
  testMode: boolean;
  retryConfig: RetryConfig;
}

const DEFAULT_CONFIG: DatabaseConfig = {
  path: 'data/arc-browser.db',
  busyTimeout: 5000,
  enableWAL: true,
  cacheSize: 10000,
  pageSize: 4096,
  maxConnections: 1,
  operationTimeout: 30000, // 30 seconds max per operation
  queueTimeout: 60000, // 60 seconds max queue wait
  testMode: false,
  retryConfig: {
    maxAttempts: 3,
    initialDelay: 100,
    maxDelay: 2000,
    backoffMultiplier: 2
  }
};

const TEST_CONFIG: DatabaseConfig = {
  ...DEFAULT_CONFIG,
  operationTimeout: 5000, // 5 seconds in tests
  queueTimeout: 10000, // 10 seconds in tests
  testMode: true,
  retryConfig: {
    maxAttempts: 2, // Fewer retries in tests
    initialDelay: 50,
    maxDelay: 500,
    backoffMultiplier: 2
  }
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Database Initialization Completeness

*For any* database initialization, all required tables, indices, and WAL mode should be properly configured, and the database should be ready for operations.

**Validates: Requirements 1.2, 1.3, 2.1**

### Property 2: Initialization Idempotence

*For any* number of initialization calls, calling `initialize()` multiple times should result in exactly one database connection being created and should not throw errors.

**Validates: Requirements 1.1, 5.1**

### Property 3: Initialization Retry on Failure

*For any* database initialization failure, the system should retry with exponential backoff and eventually succeed or fail with a clear error after maximum attempts.

**Validates: Requirements 1.4**

### Property 4: Configuration Correctness

*For any* initialized database, the busy timeout should be at least 5000ms and WAL mode should be enabled.

**Validates: Requirements 2.4, 1.3**

### Property 5: Statement Cache Consistency

*For any* SQL query string, calling `getStatement()` multiple times with the same SQL should return the same cached prepared statement object.

**Validates: Requirements 2.5, 6.1**

### Property 6: Transaction Atomicity

*For any* set of database operations within a transaction, either all operations succeed and are committed, or all operations fail and are rolled back, leaving the database in its original state.

**Validates: Requirements 2.2**

### Property 7: Transaction Type Correctness

*For any* write transaction, it should use BEGIN IMMEDIATE to prevent lock escalation issues.

**Validates: Requirements 2.2**

### Property 8: Retry on SQLITE_BUSY

*For any* database operation that encounters SQLITE_BUSY, the system should retry with exponential backoff up to 3 times with proper timing intervals.

**Validates: Requirements 2.3**

### Property 9: Process Isolation - Renderer Fallback

*For any* database operation attempted from the renderer process, it should use the browser-safe fallback implementation and not access the real database.

**Validates: Requirements 3.1, 3.4**

### Property 10: Process Isolation - Main Process Access

*For any* database operation in the main process, it should have direct access to the real SQLite database.

**Validates: Requirements 3.3**

### Property 11: Error Logging Completeness

*For any* database operation that fails, the error log should contain the operation type, parameters, and detailed error information.

**Validates: Requirements 4.1**

### Property 12: Error Propagation

*For any* database operation that fails, a meaningful error should be returned to the caller with actionable information.

**Validates: Requirements 4.2**

### Property 13: Automatic Reconnection

*For any* lost database connection, the system should attempt to reconnect automatically before failing operations.

**Validates: Requirements 4.3**

### Property 14: Graceful Degradation

*For any* non-critical database operation when the database is unavailable, the system should provide fallback behavior instead of crashing.

**Validates: Requirements 4.4**

### Property 15: Connection Lifecycle - Clean Shutdown

*For any* database connection, calling `close()` should checkpoint the WAL file and close the connection gracefully.

**Validates: Requirements 5.2, 5.3**

### Property 16: Connection Lifecycle - Post-Close Behavior

*For any* database operation attempted after `close()`, it should either wait for reinitialization or fail gracefully with a clear error message.

**Validates: Requirements 5.2**

### Property 17: Test Reset Without Close

*For any* database reset operation during testing, it should clear all data but keep the connection open and functional.

**Validates: Requirements 5.5**

### Property 18: Batch Transaction Wrapping

*For any* set of multiple write operations submitted together, they should be wrapped in a single transaction for performance.

**Validates: Requirements 6.2, 6.5**

### Property 19: Index Existence

*For any* common query pattern, appropriate indices should exist in the database schema.

**Validates: Requirements 6.3**

### Property 20: Schema Version Tracking

*For any* database, the current schema version should be tracked in the schema_version table.

**Validates: Requirements 7.1**

### Property 21: Migration Detection

*For any* application startup, the system should check if migrations are needed by comparing current version to target version.

**Validates: Requirements 7.2**

### Property 22: Migration Application Order

*For any* set of pending migrations, they should be applied in version order within a single transaction.

**Validates: Requirements 7.3**

### Property 23: Migration Rollback on Failure

*For any* migration that fails, the transaction should be rolled back and the database should remain at the previous version.

**Validates: Requirements 7.4**

### Property 24: Migration Backup

*For any* migration application, a backup of the database should be created before applying changes.

**Validates: Requirements 7.5**

### Property 25: Write Operation Serialization

*For any* sequence of concurrent write operations, they should be executed in the order they were queued with no interleaving.

**Validates: Requirements 8.1, 8.3**

### Property 26: Read Concurrency

*For any* set of concurrent read operations, they should be able to execute simultaneously without blocking each other.

**Validates: Requirements 8.2**

### Property 27: Race Condition Prevention

*For any* concurrent database operations, no race conditions should occur in transaction handling or data access.

**Validates: Requirements 8.5**

### Property 28: Operation Timeout Enforcement

*For any* database operation, if it exceeds the configured timeout, it should be cancelled and throw a timeout error.

**Validates: Requirements 9.1, 9.2**

### Property 29: Queue Timeout Prevention

*For any* operation in the queue, if it waits longer than the queue timeout, it should fail with a clear timeout error.

**Validates: Requirements 9.3, 9.4**

### Property 30: Test Mode Timeout

*For any* database operation in test mode, it should use shorter timeouts (5 seconds) to detect hangs quickly.

**Validates: Requirements 9.6**

### Property 31: Retry Loop Termination

*For any* retry operation, it should terminate after maximum attempts and never enter an infinite loop.

**Validates: Requirements 9.7, 9.8**

### Property 32: Operation Abort

*For any* pending operations when abort is called, they should be cancelled immediately with a clear cancellation error.

**Validates: Requirements 9.5**

## Error Handling

### Critical: Timeout and Hang Prevention

**All database operations MUST have timeouts to prevent test hangs and infinite loops.**

Key timeout strategies:
1. **Operation-level timeouts**: Every database operation has a maximum execution time
2. **Queue-level timeouts**: Operations waiting in queue have a maximum wait time
3. **Test mode timeouts**: Shorter timeouts in test environment (5s vs 30s)
4. **Retry limits**: Maximum retry attempts to prevent infinite loops
5. **Abort mechanism**: Emergency shutdown can cancel all pending operations

```typescript
// Example timeout implementation
async function withTimeout<T>(
  operation: () => Promise<T>,
  timeout: number,
  operationName: string
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new TimeoutError(
        `Operation '${operationName}' timed out after ${timeout}ms`
      )), timeout)
    )
  ]);
}

// Usage in DatabaseManager
async query<T>(sql: string, params?: any[], timeout?: number): Promise<T[]> {
  const effectiveTimeout = timeout ?? this.config.operationTimeout;
  return withTimeout(
    () => this.executeQuery(sql, params),
    effectiveTimeout,
    `query: ${sql}`
  );
}
```

### Error Categories

1. **Initialization Errors**
   - Database file permissions
   - Corrupt database file
   - Missing directory
   - Schema creation failure

2. **Runtime Errors**
   - SQLITE_BUSY (database locked)
   - SQLITE_LOCKED (table locked)
   - SQLITE_IOERR (IO error)
   - SQLITE_CORRUPT (database corruption)
   - SQLITE_FULL (disk full)

3. **Connection Errors**
   - Connection lost
   - Connection timeout
   - Invalid connection state

4. **Transaction Errors**
   - Deadlock
   - Constraint violation
   - Rollback failure

5. **Timeout Errors**
   - Operation timeout (exceeded max execution time)
   - Queue timeout (waited too long in queue)
   - Initialization timeout
   - Retry timeout (max attempts exceeded)

### Error Handling Strategy

```typescript
class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public operation: string,
    public recoverable: boolean
  ) {
    super(message);
  }
}

class TimeoutError extends DatabaseError {
  constructor(message: string, operation: string) {
    super(message, 'TIMEOUT', operation, false);
  }
}

// Error handling with retry and timeout
async function handleDatabaseOperation<T>(
  operation: () => Promise<T>,
  context: string,
  timeout: number
): Promise<T> {
  try {
    return await withTimeout(
      () => withRetry(operation, DEFAULT_RETRY_CONFIG),
      timeout,
      context
    );
  } catch (error) {
    if (error instanceof TimeoutError) {
      throw error; // Don't retry timeouts
    } else if (error.code === 'SQLITE_BUSY') {
      throw new DatabaseError(
        'Database is busy, please try again',
        'SQLITE_BUSY',
        context,
        true
      );
    } else if (error.code === 'SQLITE_CORRUPT') {
      throw new DatabaseError(
        'Database is corrupted, backup and restore required',
        'SQLITE_CORRUPT',
        context,
        false
      );
    }
    throw error;
  }
}
```

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases:

1. **Initialization Tests**
   - Database creates required tables
   - WAL mode is enabled
   - Indices are created
   - Schema version is tracked

2. **Connection Management Tests**
   - Singleton pattern works correctly
   - Connection is reused
   - Connection closes cleanly
   - Reconnection works after close

3. **Error Handling Tests**
   - SQLITE_BUSY triggers retry
   - Retry exhaustion throws error
   - Corrupt database is detected
   - IO errors are handled

4. **Statement Caching Tests**
   - Statements are cached
   - Cache returns same statement
   - Cache is cleared on close

5. **Transaction Tests**
   - Successful transaction commits
   - Failed transaction rolls back
   - Nested transactions work
   - Concurrent transactions are serialized

### Property-Based Tests

Property-based tests will verify universal properties across all inputs. Each property test will run with minimum 100 iterations.

1. **Property 1: Database Initialization Completeness**
   - Initialize database
   - Verify all tables exist
   - Verify all indices exist
   - Verify WAL mode enabled

2. **Property 2: Initialization Idempotence**
   - Generate random number of initialization calls (1-10)
   - Verify only one connection exists
   - Verify no errors thrown

3. **Property 3: Initialization Retry on Failure**
   - Inject initialization failures
   - Verify retry with exponential backoff
   - Verify eventual success or clear error

4. **Property 4: Configuration Correctness**
   - Initialize database
   - Query busy_timeout pragma
   - Query journal_mode pragma
   - Verify values meet requirements

5. **Property 5: Statement Cache Consistency**
   - Generate random SQL queries
   - Call getStatement multiple times
   - Verify same object reference returned

6. **Property 6: Transaction Atomicity**
   - Generate random sets of operations
   - Inject random failures
   - Verify all-or-nothing behavior

7. **Property 7: Transaction Type Correctness**
   - Start write transaction
   - Verify BEGIN IMMEDIATE used
   - Verify proper lock acquisition

8. **Property 8: Retry on SQLITE_BUSY**
   - Inject SQLITE_BUSY errors
   - Verify retry attempts (up to 3)
   - Verify exponential backoff timing

9. **Property 9: Process Isolation - Renderer Fallback**
   - Simulate renderer context
   - Attempt database operations
   - Verify fallback implementation used

10. **Property 10: Process Isolation - Main Process Access**
    - Simulate main process context
    - Attempt database operations
    - Verify real database accessed

11. **Property 11: Error Logging Completeness**
    - Inject random errors
    - Verify log contains operation type
    - Verify log contains parameters
    - Verify log contains error details

12. **Property 12: Error Propagation**
    - Inject random errors
    - Verify meaningful error returned
    - Verify error contains actionable info

13. **Property 13: Automatic Reconnection**
    - Simulate connection loss
    - Attempt operations
    - Verify reconnection attempts
    - Verify operations succeed after reconnect

14. **Property 14: Graceful Degradation**
    - Make database unavailable
    - Attempt non-critical operations
    - Verify fallback behavior
    - Verify no crashes

15. **Property 15: Connection Lifecycle - Clean Shutdown**
    - Perform operations
    - Call close()
    - Verify WAL checkpoint
    - Verify connection closed

16. **Property 16: Connection Lifecycle - Post-Close Behavior**
    - Close connection
    - Attempt operations
    - Verify graceful failure or reinitialization

17. **Property 17: Test Reset Without Close**
    - Insert test data
    - Call reset()
    - Verify data cleared
    - Verify connection still open

18. **Property 18: Batch Transaction Wrapping**
    - Generate multiple write operations
    - Submit as batch
    - Verify wrapped in single transaction

19. **Property 19: Index Existence**
    - Query sqlite_master for indices
    - Verify indices for common queries exist

20. **Property 20: Schema Version Tracking**
    - Initialize database
    - Verify schema_version table exists
    - Verify version tracked correctly

21. **Property 21: Migration Detection**
    - Set current version
    - Set target version
    - Verify migration detection logic

22. **Property 22: Migration Application Order**
    - Create multiple migrations
    - Apply migrations
    - Verify applied in version order
    - Verify wrapped in transaction

23. **Property 23: Migration Rollback on Failure**
    - Create migration that fails
    - Attempt to apply
    - Verify rollback occurred
    - Verify version unchanged

24. **Property 24: Migration Backup**
    - Apply migration
    - Verify backup file created
    - Verify backup contains pre-migration data

25. **Property 25: Write Operation Serialization**
    - Generate concurrent write operations
    - Verify execution order matches queue order
    - Verify no interleaving

26. **Property 26: Read Concurrency**
    - Generate concurrent read operations
    - Verify all execute simultaneously
    - Verify no blocking

27. **Property 27: Race Condition Prevention**
    - Generate concurrent mixed operations
    - Verify no race conditions
    - Verify data consistency

28. **Property 28: Operation Timeout Enforcement**
    - Generate operations with various durations
    - Set timeout shorter than operation duration
    - Verify timeout error thrown
    - Verify operation cancelled

29. **Property 29: Queue Timeout Prevention**
    - Fill queue with slow operations
    - Enqueue operation that exceeds queue timeout
    - Verify timeout error thrown
    - Verify clear error message

30. **Property 30: Test Mode Timeout**
    - Initialize database in test mode
    - Verify timeout is 5 seconds
    - Verify operations fail faster in test mode

31. **Property 31: Retry Loop Termination**
    - Generate operation that always fails
    - Verify retry attempts exactly maxAttempts times
    - Verify no infinite loop
    - Verify final error thrown

32. **Property 32: Operation Abort**
    - Enqueue multiple operations
    - Call abortPendingOperations()
    - Verify all pending operations cancelled
    - Verify clear cancellation errors

### Integration Tests

Integration tests will verify the complete system:

1. **End-to-End Database Operations**
   - Initialize database
   - Perform CRUD operations
   - Verify data persistence
   - Close database cleanly

2. **IPC Integration**
   - Renderer requests database operation
   - Main process handles request
   - Result returned to renderer
   - Errors propagated correctly

3. **Migration Integration**
   - Start with old schema
   - Apply migrations
   - Verify data preserved
   - Verify new schema active

4. **Performance Integration**
   - Measure operation latency
   - Verify statement caching improves performance
   - Verify WAL mode improves concurrency
   - Verify batch operations are faster

### Test Configuration

All property-based tests will run with minimum 100 iterations to ensure comprehensive coverage through randomization.

Each test will be tagged with:
```typescript
// Feature: database-io-fix, Property 1: Database Initialization Idempotence
```

### Critical: Test Hang Prevention

**All tests MUST have explicit timeouts to prevent hanging:**

```typescript
// Vitest test configuration
describe('DatabaseManager', () => {
  // Set global timeout for all tests in this suite
  beforeAll(() => {
    vi.setConfig({ testTimeout: 10000 }); // 10 second max per test
  });

  it('should initialize database', async () => {
    // Individual test timeout (overrides global)
    const result = await Promise.race([
      databaseManager.initialize(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), 5000)
      )
    ]);
    expect(result).toBeDefined();
  }, 5000); // Vitest timeout parameter
});

// Property-based test configuration
fc.assert(
  fc.asyncProperty(
    fc.string(),
    async (input) => {
      // Property test logic with timeout
      const result = await withTimeout(
        () => testOperation(input),
        3000, // 3 second timeout per iteration
        'property test'
      );
      return result !== null;
    }
  ),
  { 
    numRuns: 100,
    timeout: 5000, // 5 second timeout per iteration
    interruptAfterTimeLimit: 30000 // 30 second total timeout
  }
);
```

**Test timeout guidelines:**
- Unit tests: 5 seconds max
- Property tests: 5 seconds per iteration, 30 seconds total
- Integration tests: 10 seconds max
- Always use `withTimeout` wrapper for database operations in tests
- Always configure test framework timeout
- Always use test mode config (shorter timeouts)
