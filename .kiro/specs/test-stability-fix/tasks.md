# Implementation Plan: Test Stability Fix

## Overview

This plan addresses test stability issues by fixing test-implementation mismatches, ensuring proper async handling, implementing proper mocking strategies, and configuring appropriate timeouts. The tasks are organized to fix the most critical issues first (hanging tests), then address failing tests, and finally optimize test configuration.

## Tasks

- [x] 1. Fix test setup and global configuration
  - Update `src/test/setup.ts` to add localStorage mock
  - Configure fake timers properly with cleanup
  - Ensure all global mocks are reset between tests
  - _Requirements: 1.4, 3.1, 3.2_

- [x] 2. Fix BookmarkStore tests
  - [x] 2.1 Replace fs mocks with localStorage mocks
    - Remove `vi.mock('fs')` and `vi.mock('path')`
    - Implement localStorage mock in test file
    - Update all test expectations to use localStorage
    - _Requirements: 7.1, 7.3_

  - [x] 2.2 Fix async/sync mismatch in tests
    - Remove unnecessary `async/await` from tests (implementation is sync)
    - Update test assertions to match synchronous behavior
    - _Requirements: 5.1, 7.3_

  - [x] 2.3 Ensure proper state reset between tests
    - Clear localStorage in beforeEach hook
    - Verify each test starts with clean state
    - _Requirements: 3.1, 7.3_

- [x] 3. Fix SessionManager tests
  - [x] 3.1 Add async/await to all test functions
    - Make test functions async where they call async methods
    - Await all `saveSession`, `loadSession`, `clearSession` calls
    - Await `resetDatabase` in beforeEach
    - _Requirements: 5.1, 5.2, 7.2_

  - [x] 3.2 Mock database manager properly
    - Create database mock that returns resolved promises
    - Ensure mock matches actual DatabaseManager interface
    - Reset mock state between tests
    - _Requirements: 4.1, 7.4_

  - [x] 3.3 Fix test expectations for async operations
    - Update assertions to await database operations
    - Verify data is properly persisted and retrieved
    - _Requirements: 7.2, 7.3_

- [x] 4. Optimize property-based test configuration
  - [x] 4.1 Update fast-check global configuration
    - Reduce numRuns to 10 for faster execution
    - Set timeout to 2000ms per property
    - Add interruptAfterTimeLimit and skipAllAfterTimeLimit
    - _Requirements: 2.1, 2.2, 6.2_

  - [x] 4.2 Review and fix hanging property-based tests
    - Identify property tests that may hang
    - Ensure all async operations in properties are awaited
    - Add proper error handling in property functions
    - _Requirements: 1.3, 2.4, 5.1_

- [ ] 5. Update vitest configuration
  - Verify timeout settings are appropriate
  - Ensure pool configuration prevents crashes
  - Add separate configurations for different test types if needed
  - _Requirements: 1.1, 1.2, 6.1, 6.3_

- [x] 6. Checkpoint - Run all tests and verify stability
  - **CRITICAL**: Read and analyze complete terminal output before proceeding
  - Run `npm run test:run` to execute all tests once
  - Carefully examine error messages, stack traces, and failure patterns
  - Verify no tests hang or timeout
  - Verify all previously failing tests now pass
  - Adjust strategy based on observed errors
  - Document any remaining issues
  - _Requirements: 1.1, 7.1, 7.2_

- [ ] 7. Add test execution documentation
  - Document test commands and their purposes
  - Document timeout configurations
  - Document mocking strategies
  - Add troubleshooting guide for common test issues
  - _Requirements: 6.4_

## Notes

- **CRITICAL**: Always read and understand terminal output before taking the next step
- Analyze test failures, error messages, and stack traces carefully
- Adjust strategy based on actual errors observed in terminal output
- Do not proceed blindly - each step should be informed by previous results
- Focus on fixing hanging tests first (tasks 1-3) before optimizing
- Each task should result in tests that complete execution
- Verify tests pass after each major change
- Property-based tests are excluded from default test run but should still be fixed
- Integration tests may need separate attention if they also hang
