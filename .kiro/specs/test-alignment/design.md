# Design Document: Test File Alignment

## Overview

This design outlines a systematic approach to analyze and align all test files in the Arc Browser project with the latest implementation changes. The system will identify misalignments in imports, mocks, test environments, and coverage gaps, then provide actionable fixes to ensure test suite accuracy and completeness.

## Architecture

### Analysis Pipeline

```
Test Files → Import Analyzer → Mock Validator → Environment Checker → Coverage Analyzer → Report Generator
```

### Components

1. **Import Analyzer**: Validates all import statements resolve correctly
2. **Mock Validator**: Ensures mocks match current module interfaces
3. **Environment Checker**: Verifies tests run in correct environment (node/jsdom)
4. **Coverage Analyzer**: Identifies missing tests for new features
5. **Report Generator**: Produces actionable alignment report

## Components and Interfaces

### Test File Categories

```typescript
enum TestCategory {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  PROPERTY_BASED = 'property-based',
  PERFORMANCE = 'performance',
  ACCESSIBILITY = 'accessibility'
}

interface TestFile {
  path: string;
  category: TestCategory;
  imports: ImportStatement[];
  mocks: MockStatement[];
  environment: 'node' | 'jsdom';
  testedModule: string;
}
```

### Analysis Results

```typescript
interface AlignmentIssue {
  file: string;
  line: number;
  severity: 'error' | 'warning' | 'info';
  category: 'import' | 'mock' | 'environment' | 'coverage';
  message: string;
  suggestedFix?: string;
}

interface AlignmentReport {
  totalTests: number;
  issuesFound: number;
  issuesByCategory: Record<string, AlignmentIssue[]>;
  coverageGaps: CoverageGap[];
  summary: string;
}
```

## Data Models

### Key Test File Patterns

#### SQLite-Backed Stores
- **Main Process**: Use `*Main.ts` versions (historyStoreMain, bookmarkStoreMain, settingsStoreMain)
- **Renderer Process**: Use regular versions with localStorage
- **Tests**: Should mock DatabaseManager or use in-memory SQLite

#### Import Patterns
```typescript
// Correct for main process tests
import { addHistoryEntry } from '../../core/historyStoreMain';

// Correct for renderer tests
import { addHistoryEntry } from '../../core/historyStore';

// Correct for integration tests
import * as historyStore from '../../core/historyStore';
```

#### Mock Patterns
```typescript
// Correct mock setup
vi.mock('../../core/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: vi.fn(() => ({
      execute: vi.fn(),
      query: vi.fn(),
      close: vi.fn()
    }))
  }
}));
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Import Path Validity
*For any* test file with import statements, all import paths should resolve to existing modules in the project structure.
**Validates: Requirements 2.1, 2.2, 2.4**

### Property 2: Mock Interface Completeness
*For any* mocked module, the mock should implement all functions that are called by the test or the code under test.
**Validates: Requirements 3.1, 3.2, 3.5**

### Property 3: Environment Consistency
*For any* test file, if it uses DOM APIs (document, window, localStorage), it should run in 'jsdom' environment; if it uses Node.js APIs (fs, path, better-sqlite3), it should run in 'node' environment.
**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 4: SQLite Store Usage
*For any* test that validates history, bookmark, or settings persistence, it should use SQLite-backed stores (Main versions) or appropriate mocks, not localStorage directly.
**Validates: Requirements 1.1, 1.3, 1.4**

### Property 5: Property Test Annotation
*For any* property-based test file, each test should reference a specific correctness property from a design document with proper tag format.
**Validates: Requirements 6.1, 6.3**

### Property 6: Phase 10 Feature Coverage
*For any* Phase 10 feature listed in the requirements, there should exist at least one test file that validates its core functionality.
**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7**

### Property 7: Integration Test Authenticity
*For any* integration test, it should test interactions between real components, mocking only external dependencies (not internal modules).
**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 8: Performance Benchmark Alignment
*For any* performance requirement with a specific threshold, there should exist a performance test that validates the threshold is met.
**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

## Error Handling

### Import Resolution Errors
- **Detection**: Parse import statements and check file existence
- **Handling**: Report broken imports with suggested fixes based on file moves
- **Recovery**: Provide multiple fix suggestions if module was renamed or moved

### Mock Mismatch Errors
- **Detection**: Compare mock structure with actual module exports
- **Handling**: Report missing or extra mock functions
- **Recovery**: Generate updated mock template based on current interface

### Environment Mismatch Errors
- **Detection**: Analyze API usage and compare with configured environment
- **Handling**: Report environment conflicts with specific API examples
- **Recovery**: Suggest vitest.config.mjs updates or test refactoring

### Coverage Gap Errors
- **Detection**: Compare implemented features with test file existence
- **Handling**: Report missing test files for new features
- **Recovery**: Suggest test file templates based on feature type

## Testing Strategy

### Analysis Validation
- **Unit Tests**: Validate each analyzer component independently
- **Integration Tests**: Validate full analysis pipeline on sample test files
- **Property Tests**: Validate analysis properties hold across all test files

### Test File Validation
- **Import Validation**: Check all imports resolve correctly
- **Mock Validation**: Verify mocks match current interfaces
- **Environment Validation**: Confirm tests run in correct environment
- **Coverage Validation**: Ensure Phase 10 features have tests

### Specific Test Areas

#### SQLite Migration Tests
- Verify tests use correct store versions (Main vs Renderer)
- Validate DatabaseManager mocks are correct
- Ensure database tests run in 'node' environment

#### Phase 10 Feature Tests
- Session Management: Save/restore tests exist
- Tab Groups: CRUD operation tests exist
- History Search: Full-text search tests exist
- Personalization: Weight adjustment tests exist
- Performance: Benchmark tests exist and pass
- Accessibility: WCAG compliance tests exist

#### Import Path Tests
- All imports resolve to existing files
- Relative paths navigate correctly
- Type imports reference exported types

#### Mock Alignment Tests
- Mocks implement required functions
- Mock return types match actual types
- Mock paths are correct

## Implementation Notes

### Test File Discovery
```bash
# Find all test files
find src -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.pbt.test.ts"
```

### Import Analysis
- Parse TypeScript AST to extract import statements
- Resolve relative paths based on file location
- Check file existence for each import
- Validate exported symbols match imported names

### Mock Analysis
- Identify vi.mock() calls
- Extract mocked module path
- Compare mock implementation with actual module
- Report missing or extra functions

### Environment Analysis
- Scan test code for API usage patterns
- Identify DOM APIs: document, window, localStorage, etc.
- Identify Node APIs: fs, path, require, process, etc.
- Compare with vitest.config.mjs environment configuration

### Coverage Analysis
- List Phase 10 features from requirements
- Search for test files matching feature names
- Validate test files actually test the feature
- Report features without adequate coverage

## Alignment Priorities

### Critical (Must Fix)
1. Broken import paths (tests won't run)
2. SQLite store misalignment (tests validate wrong implementation)
3. Environment mismatches (tests fail due to missing APIs)
4. Missing Phase 10 feature tests (no validation of new features)

### High (Should Fix)
1. Mock interface mismatches (tests may pass incorrectly)
2. Property test missing annotations (can't trace to requirements)
3. Integration tests over-mocking (not testing real interactions)
4. Performance tests with outdated thresholds (wrong benchmarks)

### Medium (Nice to Fix)
1. Duplicate test setup code (maintainability)
2. Missing test documentation (understandability)
3. Skipped/disabled tests (incomplete coverage)
4. Test naming inconsistencies (discoverability)

### Low (Optional)
1. Test file organization (structure)
2. Test helper consolidation (DRY principle)
3. Shared fixture extraction (reusability)

## Expected Outcomes

### Alignment Report Structure
```markdown
# Test Alignment Report

## Summary
- Total test files analyzed: X
- Issues found: Y
- Critical issues: Z
- Coverage gaps: W

## Critical Issues
### Broken Imports
- File: path/to/test.ts:line
- Issue: Import path does not resolve
- Fix: Update import to '../../correct/path'

### SQLite Misalignment
- File: path/to/test.ts:line
- Issue: Test uses localStorage for history
- Fix: Use historyStoreMain or mock DatabaseManager

## Coverage Gaps
### Phase 10 Features
- Session Management: ✅ Tests exist
- Tab Groups: ✅ Tests exist
- Advanced History Search: ⚠️ Missing full-text search tests
- Recommendation Personalization: ✅ Tests exist
- Performance Optimization: ✅ Benchmark tests exist
- Accessibility: ⚠️ Missing keyboard navigation tests

## Recommendations
1. Fix all critical issues before next release
2. Add missing Phase 10 feature tests
3. Update mocks to match current interfaces
4. Review environment configuration
```

## Next Steps

1. **Run Analysis**: Execute test file analysis across entire codebase
2. **Generate Report**: Produce detailed alignment report with fixes
3. **Prioritize Fixes**: Address critical issues first
4. **Update Tests**: Apply suggested fixes systematically
5. **Verify**: Run test suite to confirm all tests pass
6. **Document**: Update test documentation with new patterns
