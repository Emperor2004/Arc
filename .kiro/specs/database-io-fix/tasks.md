# Implementation Plan: Database IO Fix

## Overview

This implementation plan addresses database IO issues in Arc Browser by implementing a robust DatabaseManager with proper initialization, connection lifecycle management, error handling, retry logic, and performance optimizations. The approach focuses on reliability, concurrency, and graceful error recovery.

## Tasks

- [x] 1. Create DatabaseManager Core Infrastructure
  - Create `src/core/database/DatabaseManager.ts` with singleton pattern
  - Implement connection management and initialization
  - Add configuration interface with timeout settings
  - Add default config and test config (shorter timeouts)
  - Implement timeout enforcement for all operations
  - Add operation abort functionality
  - _Requirements: 1.1, 1.2, 5.1, 9.1, 9.2, 9.5, 9.6_

- [x] 1.1 Write property test for initialization completeness
  - **Property 1: Database Initialization Completeness**
  - **Validates: Requirements 1.2, 1.3, 2.1**

- [x] 1.2 Write property test for initialization idempotence
  - **Property 2: Initialization Idempotence**
  - **Validates: Requirements 1.1, 5.1**

- [x] 1.3 Write property test for operation timeout enforcement
  - **Property 28: Operation Timeout Enforcement**
  - **Validates: Requirements 9.1, 9.2**

- [x] 1.4 Write property test for test mode timeout
  - **Property 30: Test Mode Timeout**
  - **Validates: Requirements 9.6**

- [x] 1.5 Write property test for operation abort
  - **Property 32: Operation Abort**
  - **Validates: Requirements 9.5**

- [x] 2. Implement WAL Mode and Configuration
  - Enable WAL mode during initialization
  - Set busy timeout to 5000ms
  - Configure cache size and page size
  - Add pragma queries for configuration verification
  - _Requirements: 1.3, 2.1, 2.4_

- [x] 2.1 Write property test for configuration correctness
  - **Property 4: Configuration Correctness**
  - **Validates: Requirements 2.4, 1.3**

- [x] 3. Implement Retry Logic with Exponential Backoff
  - Create `src/core/database/RetryStrategy.ts`
  - Implement `withRetry` function with exponential backoff
  - Add retry configuration interface
  - Handle SQLITE_BUSY and other transient errors
  - Add retry attempt counter to prevent infinite loops
  - Implement `withTimeout` wrapper for all async operations
  - _Requirements: 1.4, 2.3, 4.1, 9.1, 9.7, 9.8_

- [x] 3.1 Write property test for initialization retry
  - **Property 3: Initialization Retry on Failure**
  - **Validates: Requirements 1.4**

- [x] 3.2 Write property test for SQLITE_BUSY retry
  - **Property 8: Retry on SQLITE_BUSY**
  - **Validates: Requirements 2.3**

- [x] 3.3 Write property test for retry loop termination
  - **Property 31: Retry Loop Termination**
  - **Validates: Requirements 9.7, 9.8**

- [x] 4. Implement Statement Caching
  - Add statement cache Map to DatabaseManager
  - Implement `getStatement()` method with caching
  - Add cache clearing on connection close
  - _Requirements: 2.5, 6.1_

- [x] 4.1 Write property test for statement cache consistency
  - **Property 5: Statement Cache Consistency**
  - **Validates: Requirements 2.5, 6.1**

- [x] 5. Checkpoint - Ensure basic database operations work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5.1 Verify no test hangs
  - Run all tests with timeout monitoring
  - Verify all tests complete within 10 seconds
  - Verify no infinite loops in retry logic
  - Verify queue operations timeout properly

- [x] 6. Implement Transaction Management
  - Add `transaction()` method to DatabaseManager
  - Implement BEGIN IMMEDIATE for write transactions
  - Add transaction rollback on error
  - Ensure atomicity guarantees
  - _Requirements: 2.2, 8.1_

- [x] 6.1 Write property test for transaction atomicity
  - **Property 6: Transaction Atomicity**
  - **Validates: Requirements 2.2**

- [x] 6.2 Write property test for transaction type correctness
  - **Property 7: Transaction Type Correctness**
  - **Validates: Requirements 2.2**

- [x] 7. Implement Write Operation Queue
  - Create `src/core/database/OperationQueue.ts`
  - Implement queue with FIFO ordering
  - Add async operation processing
  - Serialize write operations
  - Add timeout handling for queued operations
  - Add queue statistics and stale operation detection
  - _Requirements: 8.1, 8.3, 9.3, 9.4_

- [x] 7.1 Write property test for write operation serialization
  - **Property 25: Write Operation Serialization**
  - **Validates: Requirements 8.1, 8.3**

- [x] 7.2 Write property test for read concurrency
  - **Property 26: Read Concurrency**
  - **Validates: Requirements 8.2**

- [x] 7.3 Write property test for race condition prevention
  - **Property 27: Race Condition Prevention**
  - **Validates: Requirements 8.5**

- [x] 7.4 Write property test for queue timeout prevention
  - **Property 29: Queue Timeout Prevention**
  - **Validates: Requirements 9.3, 9.4**

- [x] 8. Implement Process Isolation
  - Update `src/core/database.ts` to use DatabaseManager
  - Ensure `src/core/database.browser.ts` uses fallback only
  - Add context detection (main vs renderer)
  - Add clear error messages for wrong context
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8.1 Write property test for renderer fallback
  - **Property 9: Process Isolation - Renderer Fallback**
  - **Validates: Requirements 3.1, 3.4**

- [x] 8.2 Write property test for main process access
  - **Property 10: Process Isolation - Main Process Access**
  - **Validates: Requirements 3.3**

- [x] 9. Implement Error Handling and Logging
  - Create `src/core/database/DatabaseError.ts` with error types
  - Add comprehensive error logging with operation context
  - Implement error propagation with meaningful messages
  - Add error categorization (recoverable vs non-recoverable)
  - _Requirements: 4.1, 4.2_

- [x] 9.1 Write property test for error logging completeness
  - **Property 11: Error Logging Completeness**
  - **Validates: Requirements 4.1**

- [x] 9.2 Write property test for error propagation
  - **Property 12: Error Propagation**
  - **Validates: Requirements 4.2**

- [x] 10. Implement Automatic Reconnection
  - Add connection health checking
  - Implement reconnection logic on connection loss
  - Add reconnection attempts with backoff
  - _Requirements: 4.3_

- [x] 10.1 Write property test for automatic reconnection
  - **Property 13: Automatic Reconnection**
  - **Validates: Requirements 4.3**

- [x] 11. Implement Graceful Degradation
  - Add fallback behavior for non-critical operations
  - Implement operation priority levels
  - Add graceful failure modes
  - _Requirements: 4.4_

- [x] 11.1 Write property test for graceful degradation
  - **Property 14: Graceful Degradation**
  - **Validates: Requirements 4.4**

- [x] 12. Checkpoint - Ensure error handling works correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12.1 Verify timeout enforcement
  - Test operation timeouts work correctly
  - Test queue timeouts work correctly
  - Test retry limits prevent infinite loops
  - Verify test mode uses shorter timeouts
  - Verify no test hangs

- [x] 13. Implement Connection Lifecycle Management
  - Add `close()` method with WAL checkpoint
  - Implement graceful shutdown
  - Add signal handlers for SIGTERM and SIGINT
  - Ensure post-close operations fail gracefully
  - _Requirements: 5.2, 5.3, 5.4_

- [x] 13.1 Write property test for clean shutdown
  - **Property 15: Connection Lifecycle - Clean Shutdown**
  - **Validates: Requirements 5.2, 5.3**

- [x] 13.2 Write property test for post-close behavior
  - **Property 16: Connection Lifecycle - Post-Close Behavior**
  - **Validates: Requirements 5.2**

- [x] 14. Implement Test Utilities
  - Add `reset()` method for testing
  - Ensure reset clears data without closing connection
  - Add test helpers for database operations
  - _Requirements: 5.5_

- [x] 14.1 Write property test for test reset
  - **Property 17: Test Reset Without Close**
  - **Validates: Requirements 5.5**

- [x] 15. Implement Performance Optimizations
  - Add batch operation support
  - Implement transaction wrapping for bulk operations
  - Verify indices exist for common queries
  - Add performance monitoring hooks
  - _Requirements: 6.2, 6.3, 6.5_

- [x] 15.1 Write property test for batch transaction wrapping
  - **Property 18: Batch Transaction Wrapping**
  - **Validates: Requirements 6.2, 6.5**

- [x] 15.2 Write property test for index existence
  - **Property 19: Index Existence**
  - **Validates: Requirements 6.3**

- [x] 16. Implement Migration System
  - Create `src/core/database/MigrationManager.ts`
  - Add schema version tracking table
  - Implement migration detection on startup
  - Add migration application with transaction wrapping
  - Implement rollback on migration failure
  - Add database backup before migrations
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 16.1 Write property test for schema version tracking
  - **Property 20: Schema Version Tracking**
  - **Validates: Requirements 7.1**

- [x] 16.2 Write property test for migration detection
  - **Property 21: Migration Detection**
  - **Validates: Requirements 7.2**

- [x] 16.3 Write property test for migration application order
  - **Property 22: Migration Application Order**
  - **Validates: Requirements 7.3**

- [x] 16.4 Write property test for migration rollback
  - **Property 23: Migration Rollback on Failure**
  - **Validates: Requirements 7.4**

- [x] 16.5 Write property test for migration backup
  - **Property 24: Migration Backup**
  - **Validates: Requirements 7.5**

- [x] 17. Update Existing Database Consumers
  - Update `src/core/tabGroupManager.ts` to use DatabaseManager
  - Update `src/core/sessionManager.ts` to use DatabaseManager
  - Update `src/main/main.ts` to initialize DatabaseManager
  - Update `src/main/ipc.ts` to wait for database ready
  - _Requirements: 1.1, 1.5_

- [x] 18. Add Integration Tests
  - Test end-to-end database operations
  - Test IPC integration with database
  - Test migration integration
  - Test performance with real workloads
  - _Requirements: All_

- [x] 19. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The DatabaseManager uses a singleton pattern to ensure one connection
- WAL mode enables concurrent reads and writes
- All write operations are serialized through a queue
- Retry logic handles transient errors automatically
- Process isolation ensures renderer never directly accesses database
- **CRITICAL: All operations have timeouts to prevent hangs**
- **Test mode uses 5-second timeouts to detect issues quickly**
- **Retry logic has maximum attempt limits to prevent infinite loops**
- **Queue operations timeout after 60 seconds (10 seconds in tests)**
- **All async operations are wrapped with timeout protection**
