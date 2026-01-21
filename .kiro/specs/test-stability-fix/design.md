# Design Document: Test Stability Fix

## Overview

The Arc Browser test suite experiences hanging and failures due to mismatches between test expectations and actual implementations, improper mocking strategies, and lack of proper async handling. This design addresses these issues by:

1. Fixing test-implementation mismatches (bookmarkStore uses localStorage, tests mock fs)
2. Ensuring proper async/await handling in all tests
3. Implementing proper cleanup and resource management
4. Configuring appropriate timeouts for different test types
5. Fixing property-based test configurations to prevent hangs

## Architecture

### Test Environment Layers

```
┌─────────────────────────────────────┐
│   Test Configuration (vitest)      │
│   - Timeouts                        │
│   - Environment (jsdom/node)        │
│   - Pool settings                   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Test Setup (setup.ts)             │
│   - Global mocks                    │
│   - Fast-check configuration        │
│   - Cleanup hooks                   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Individual Test Files             │
│   - Unit tests                      │
│   - Property-based tests            │
│   - Integration tests               │
└─────────────────────────────────────┘
```

## Components and Interfaces

### 1. Test Setup Configuration

**File**: `src/test/setup.ts`

**Responsibilities**:
- Configure fast-check with appropriate limits
- Set up global mocks (window.arc, localStorage, etc.)
- Implement cleanup hooks
- Configure fake timers

**Key Changes**:
- Add localStorage mock for browser environment
- Reduce fast-check iterations to prevent hangs
- Ensure all timers are cleared between tests

### 2. BookmarkStore Test Fixes

**File**: `src/core/bookmarkStore.test.ts`

**Issues**:
- Tests mock `fs` module but implementation uses `localStorage`
- Tests expect synchronous file writes but implementation is browser-based
- No proper localStorage mocking in test environment

**Solution**:
- Mock `localStorage` instead of `fs`
- Implement proper localStorage mock with getItem/setItem/clear
- Ensure tests reset localStorage between runs

### 3. SessionManager Test Fixes

**File**: `src/core/sessionManager.test.ts`

**Issues**:
- Tests call synchronous functions but implementation is async
- Database operations return promises but tests don't await them
- `resetDatabase` is called but may not complete before tests run

**Solution**:
- Make all test functions async where they call async methods
- Properly await all database operations
- Ensure database is fully reset before each test
- Mock database manager to return resolved promises

### 4. Property-Based Test Configuration

**Files**: All `*.pbt.test.ts` files

**Issues**:
- Tests may run too many iterations causing timeouts
- Async properties may not properly await operations
- No timeout limits on individual property checks

**Solution**:
- Configure fast-check with reduced iterations (10-20 for CI)
- Set per-property timeouts (2000ms)
- Ensure all async operations in properties are properly awaited
- Add `interruptAfterTimeLimit` to prevent hangs

## Data Models

### Test Configuration

```typescript
interface TestConfig {
  testTimeout: number;        // 5000ms for unit tests
  hookTimeout: number;        // 2000ms for setup/teardown
  teardownTimeout: number;    // 1000ms for cleanup
}

interface FastCheckConfig {
  numRuns: number;           // 10 for CI, 100 for thorough testing
  timeout: number;           // 2000ms per property
  interruptAfterTimeLimit: number;  // 2000ms hard limit
  skipAllAfterTimeLimit: number;    // 2000ms skip remaining
  endOnFailure: boolean;     // true to stop on first failure
}
```

### Mock Interfaces

```typescript
interface LocalStorageMock {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  length: number;
  key(index: number): string | null;
}

interface DatabaseMock {
  execute(sql: string, params?: any[]): Promise<void>;
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  close(): Promise<void>;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Test Isolation

*For any* test in the test suite, running it should not affect the state or outcome of any other test.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 2: Async Completion

*For any* test with async operations, all promises should resolve or reject before the test completes.

**Validates: Requirements 5.1, 5.2**

### Property 3: Resource Cleanup

*For any* test that creates resources (timers, listeners, connections), those resources should be cleaned up after the test completes.

**Validates: Requirements 1.4, 4.3, 4.4**

### Property 4: Timeout Enforcement

*For any* test that exceeds its configured timeout, the test framework should terminate it and report a timeout failure.

**Validates: Requirements 1.2, 1.3**

### Property 5: Mock Consistency

*For any* test using mocks, the mock behavior should match the actual implementation's interface and return types.

**Validates: Requirements 7.4**

### Property 6: State Reset

*For any* test that modifies shared state (localStorage, database, global variables), that state should be reset to initial conditions before the next test runs.

**Validates: Requirements 3.1, 7.3**

## Error Handling

### Test Timeout Errors

**Strategy**: Configure appropriate timeouts at multiple levels
- Test-level timeout: 5000ms for unit tests, 10000ms for integration tests
- Hook-level timeout: 2000ms for setup/teardown
- Property-level timeout: 2000ms per fast-check property

**Handling**:
- Vitest will automatically fail tests that exceed timeout
- Log warning messages about which operation timed out
- Ensure cleanup still runs even on timeout

### Mock Configuration Errors

**Strategy**: Validate mock setup matches implementation
- Check that mocked methods exist on actual implementation
- Ensure mock return types match actual return types
- Verify async/sync consistency

**Handling**:
- Fail fast if mock configuration is invalid
- Provide clear error messages about mismatch
- Document expected mock behavior in test comments

### Async Operation Errors

**Strategy**: Proper promise handling and error propagation
- Always await async operations in tests
- Use try-catch for expected errors
- Let unexpected errors fail the test

**Handling**:
- Unhandled promise rejections should fail the test
- Log full error stack traces
- Clean up resources even on error

### Database/Storage Errors

**Strategy**: Mock storage layers to prevent real I/O
- Mock localStorage for browser-based storage
- Mock database manager for SQL operations
- Ensure mocks are reset between tests

**Handling**:
- Storage errors in tests should be caught and logged
- Tests should not depend on real file system or database
- Mock implementations should simulate both success and failure cases

## Testing Strategy

### Critical Testing Workflow

**ALWAYS follow this workflow when fixing tests:**

1. **Run tests** - Execute the test suite
2. **Read output** - Carefully read ALL terminal output, error messages, and stack traces
3. **Analyze errors** - Understand what the errors are telling you about the problem
4. **Adjust strategy** - Modify your approach based on observed errors
5. **Implement fix** - Make targeted changes to address the specific issues
6. **Verify** - Run tests again and confirm the fix worked
7. **Repeat** - Continue this cycle until all tests pass

**DO NOT:**
- Make changes without understanding the error
- Proceed blindly without reading terminal output
- Assume what the problem is without verification
- Skip error analysis

### Dual Testing Approach

We will use both unit tests and property-based tests:

**Unit Tests**:
- Verify specific examples and edge cases
- Test error conditions with known inputs
- Validate integration points between components
- Focus on concrete scenarios

**Property-Based Tests**:
- Verify universal properties across all inputs
- Use fast-check library for TypeScript
- Configure with 10 iterations for CI, 100 for thorough testing
- Each property test references its design document property

### Property-Based Testing Configuration

**Library**: fast-check (already installed)

**Configuration**:
```typescript
fc.configureGlobal({
  numRuns: 10,                    // Iterations per property
  timeout: 2000,                  // 2s timeout per property
  interruptAfterTimeLimit: 2000,  // Hard limit
  skipAllAfterTimeLimit: 2000,    // Skip remaining after timeout
  endOnFailure: true,             // Stop on first failure
});
```

**Test Tagging**:
Each property test must include a comment:
```typescript
// Feature: test-stability-fix, Property 1: Test Isolation
```

### Test Organization

**Unit Tests** (`*.test.ts`):
- One test file per source file
- Group related tests in describe blocks
- Use beforeEach/afterEach for setup/cleanup
- Mock external dependencies

**Property-Based Tests** (`*.pbt.test.ts`):
- Separate files for property-based tests
- One property per test case
- Use fast-check arbitraries for input generation
- Reference design properties in comments

**Integration Tests** (`*.integration.test.ts`):
- Test multiple components together
- Use real implementations where possible
- Mock only external boundaries (file system, network)
- Longer timeouts (10000ms)

### Specific Test Fixes

#### BookmarkStore Tests

**Changes**:
1. Remove `fs` and `path` mocks
2. Add `localStorage` mock in setup
3. Implement proper localStorage mock with in-memory storage
4. Reset localStorage between tests
5. Remove async/await from tests (implementation is synchronous)

#### SessionManager Tests

**Changes**:
1. Make all test functions async
2. Await all `saveSession`, `loadSession`, `clearSession` calls
3. Mock database manager to return resolved promises
4. Ensure `resetDatabase` completes before tests run
5. Add proper cleanup in afterEach

#### Property-Based Tests

**Changes**:
1. Reduce iteration count from 100 to 10
2. Add timeout configuration to each property test
3. Ensure all async operations in properties are awaited
4. Add proper error handling in property functions
5. Use `fc.asyncProperty` for async properties

### Test Execution

**Commands**:
- `npm test` - Run all unit tests in watch mode
- `npm run test:run` - Run all unit tests once
- `npm run test:coverage` - Run with coverage report

**Timeouts**:
- Unit tests: 5000ms
- Integration tests: 10000ms
- Property tests: 2000ms per property
- Setup/teardown hooks: 2000ms

**Isolation**:
- Use `pool: 'forks'` for process isolation
- Use `singleFork: true` to prevent crashes
- Reset all mocks between tests
- Clear all timers between tests
