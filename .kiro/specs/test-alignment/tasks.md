# Implementation Plan: Test File Alignment

## Overview

This plan systematically analyzes and aligns all test files with the latest Arc Browser implementation, focusing on SQLite migration, Phase 10 features, import paths, mocks, and test environments.

## Tasks

- [x] 1. Analyze current test file structure and identify categories
  - Scan all test files in src/ directory
  - Categorize tests (unit, integration, property-based, performance, accessibility)
  - Document current test organization
  - _Requirements: 2.1, 2.5_

- [x] 2. Validate import paths across all test files
  - [x] 2.1 Parse import statements from all test files
    - Extract import paths using regex or AST parsing
    - Identify relative vs absolute imports
    - _Requirements: 2.1, 2.2_
  
  - [x] 2.2 Check import path resolution
    - Resolve relative paths based on file location
    - Verify imported files exist
    - Identify broken imports
    - _Requirements: 2.1, 2.4_
  
  - [x] 2.3 Validate imported symbols exist
    - Check that imported functions/types are exported
    - Identify missing exports
    - _Requirements: 2.3_
  
  - [x] 2.4 Generate import fix suggestions
    - For broken imports, suggest correct paths
    - Consider file moves and renames
    - _Requirements: 2.2, 2.5_

- [x] 3. Checkpoint - Review import analysis results
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Analyze SQLite migration alignment
  - [x] 4.1 Identify tests using history/bookmark/settings stores
    - Search for imports of historyStore, bookmarkStore, settingsStore
    - Identify which store version is used (Main vs Renderer)
    - _Requirements: 1.1_
  
  - [x] 4.2 Validate store version usage
    - Check if tests should use Main versions (database-backed)
    - Check if tests should use Renderer versions (localStorage)
    - Identify mismatches
    - _Requirements: 1.1, 1.3_
  
  - [x] 4.3 Analyze DatabaseManager mock usage
    - Find tests that mock DatabaseManager
    - Verify mock interface matches current implementation
    - _Requirements: 1.2_
  
  - [x] 4.4 Check for direct localStorage usage
    - Identify tests using localStorage for history/bookmarks/settings
    - Determine if they should use SQLite stores instead
    - _Requirements: 1.3, 1.4_

- [x] 5. Validate mock alignment with current interfaces
  - [x] 5.1 Extract all vi.mock() calls from test files
    - Parse test files for mock declarations
    - Extract mocked module paths
    - _Requirements: 3.3_
  
  - [x] 5.2 Verify mocked module paths are correct
    - Check that mocked modules exist
    - Identify broken mock paths
    - _Requirements: 3.3, 3.5_
  
  - [x] 5.3 Compare mock implementations with actual modules
    - Load actual module exports
    - Compare with mock structure
    - Identify missing or extra mock functions
    - _Requirements: 3.1, 3.2_
  
  - [x] 5.4 Validate mock return types
    - Check mock return values match actual types
    - Identify type mismatches
    - _Requirements: 3.4_

- [x] 6. Checkpoint - Review SQLite and mock analysis
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Verify test environment configuration
  - [x] 7.1 Analyze API usage in test files
    - Scan for DOM API usage (document, window, localStorage)
    - Scan for Node.js API usage (fs, path, better-sqlite3)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 7.2 Check vitest.config.mjs environment mappings
    - Review environmentMatchGlobs configuration
    - Verify test files map to correct environments
    - _Requirements: 5.5_
  
  - [x] 7.3 Identify environment mismatches
    - Find tests using DOM APIs in 'node' environment
    - Find tests using Node APIs in 'jsdom' environment
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 7.4 Generate environment fix suggestions
    - Suggest vitest.config.mjs updates
    - Suggest test refactoring if needed
    - _Requirements: 5.5_

- [x] 8. Analyze Phase 10 feature test coverage
  - [x] 8.1 List Phase 10 features from requirements
    - Session Management
    - Tab Groups
    - Advanced History Search
    - Recommendation Personalization
    - Performance Optimization
    - Accessibility Improvements
    - Usage Analytics
    - Cross-Device Sync
    - _Requirements: 4.7_
  
  - [x] 8.2 Search for existing tests for each feature
    - Find test files by feature name
    - Verify tests actually validate the feature
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 8.3 Identify coverage gaps
    - List features without adequate tests
    - Categorize by test type needed (unit, integration, property)
    - _Requirements: 4.7_
  
  - [x] 8.4 Generate test file templates for missing coverage
    - Create template structure for missing tests
    - Include property-based test templates where applicable
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 9. Checkpoint - Review coverage analysis
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Validate property-based tests
  - [x] 10.1 Find all property-based test files (*.pbt.test.ts)
    - List all PBT files
    - Extract test descriptions
    - _Requirements: 6.1_
  
  - [x] 10.2 Check for design document property references
    - Verify each PBT references a specific property
    - Check tag format: "Feature: {feature_name}, Property {number}: {property_text}"
    - _Requirements: 6.1, 6.3_
  
  - [x] 10.3 Verify fast-check usage
    - Check that tests use fc.property() or similar
    - Verify input generators are defined
    - _Requirements: 6.2_
  
  - [x] 10.4 Check iteration count configuration
    - Verify tests run at least 100 iterations
    - Check for explicit numRuns configuration
    - _Requirements: 6.5_
  
  - [x] 10.5 Cross-reference with design documents
    - For each design property, verify PBT exists
    - Identify properties without tests
    - _Requirements: 6.4_

- [x] 11. Validate integration tests
  - [x] 11.1 Identify integration test files
    - Find tests in src/test/integration/
    - Find tests with "integration" in filename
    - _Requirements: 7.1_
  
  - [x] 11.2 Analyze component interaction patterns
    - Check if tests use real components
    - Identify over-mocking of internal modules
    - _Requirements: 7.2, 7.4_
  
  - [x] 11.3 Verify external dependency mocking
    - Check that only external deps are mocked
    - Verify internal components are real
    - _Requirements: 7.2, 7.3_
  
  - [x] 11.4 Validate critical workflow coverage
    - List critical user workflows
    - Verify integration tests cover them
    - _Requirements: 7.5_

- [x] 12. Checkpoint - Review property and integration test analysis
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Validate performance tests
  - [x] 13.1 List performance requirements and benchmarks
    - App startup < 2s
    - Recommendation generation < 500ms
    - Bookmark search < 100ms
    - History search < 200ms
    - Memory usage < 200MB
    - _Requirements: 8.1_
  
  - [x] 13.2 Find corresponding performance tests
    - Locate tests in src/test/performance/
    - Match tests to benchmarks
    - _Requirements: 8.1, 8.2_
  
  - [x] 13.3 Verify benchmark thresholds in tests
    - Check test assertions match requirements
    - Identify outdated thresholds
    - _Requirements: 8.3, 8.5_
  
  - [x] 13.4 Validate realistic data volumes
    - Check tests use appropriate data sizes
    - Verify tests simulate production conditions
    - _Requirements: 8.4_

- [x] 14. Validate accessibility tests
  - [x] 14.1 List accessibility requirements
    - WCAG 2.1 AA compliance
    - Keyboard navigation
    - Screen reader support
    - High contrast mode
    - _Requirements: 9.1_
  
  - [x] 14.2 Find corresponding accessibility tests
    - Locate tests in src/test/accessibility/
    - Match tests to requirements
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [x] 14.3 Verify WCAG compliance test coverage
    - Check for contrast ratio tests
    - Check for ARIA attribute tests
    - Check for keyboard navigation tests
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [x] 14.4 Identify accessibility coverage gaps
    - List accessibility features without tests
    - Prioritize by WCAG level
    - _Requirements: 9.5_

- [x] 15. Checkpoint - Review performance and accessibility test analysis
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Generate comprehensive alignment report
  - [x] 16.1 Compile all analysis results
    - Aggregate issues by category
    - Calculate statistics
    - _Requirements: 2.5, 3.5, 4.7, 5.5, 6.4, 7.5, 8.5, 9.5, 10.5_
  
  - [x] 16.2 Prioritize issues by severity
    - Critical: Broken imports, environment mismatches
    - High: Mock mismatches, missing Phase 10 tests
    - Medium: Missing annotations, over-mocking
    - Low: Code organization, naming
    - _Requirements: All_
  
  - [x] 16.3 Generate fix suggestions for each issue
    - Provide specific code changes
    - Include file paths and line numbers
    - _Requirements: 2.5, 3.5, 5.5_
  
  - [x] 16.4 Create coverage gap report
    - List missing tests by feature
    - Provide test templates
    - _Requirements: 4.7, 6.4, 7.5, 8.5, 9.5_
  
  - [x] 16.5 Format report as markdown document
    - Include summary statistics
    - Organize by priority
    - Add actionable recommendations
    - _Requirements: All_

- [x] 17. Apply critical fixes
  - [x] 17.1 Fix broken import paths
    - Update imports to correct paths
    - Verify imports resolve
    - _Requirements: 2.1, 2.2, 2.4_
  
  - [x] 17.2 Align SQLite store usage
    - Update tests to use correct store versions
    - Add DatabaseManager mocks where needed
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 17.3 Fix environment mismatches
    - Update vitest.config.mjs if needed
    - Refactor tests if needed
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 17.4 Update critical mocks
    - Fix mocks with interface mismatches
    - Update mock paths
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 18. Add missing Phase 10 feature tests
  - [x] 18.1 Create Session Management tests if missing
    - Unit tests for save/restore
    - Integration tests for full workflow
    - _Requirements: 4.1_
  
  - [x] 18.2 Create Tab Groups tests if missing
    - Unit tests for CRUD operations
    - Property tests for group consistency
    - _Requirements: 4.2_
  
  - [x] 18.3 Create Advanced History Search tests if missing
    - Unit tests for search functions
    - Property tests for search accuracy
    - _Requirements: 4.3_
  
  - [x] 18.4 Create Recommendation Personalization tests if missing
    - Unit tests for weight adjustments
    - Integration tests for real-time updates
    - _Requirements: 4.4_
  
  - [x] 18.5 Create Performance tests if missing
    - Benchmark tests for all requirements
    - Memory profiling tests
    - _Requirements: 4.5_
  
  - [x] 18.6 Create Accessibility tests if missing
    - WCAG compliance tests
    - Keyboard navigation tests
    - Screen reader tests
    - _Requirements: 4.6_

- [x] 19. Final checkpoint - Run full test suite
  - Run all tests to verify fixes
  - Ensure no regressions introduced
  - Verify all critical issues resolved
  - _Requirements: All_

- [x] 20. Document test alignment patterns
  - [x] 20.1 Create test writing guidelines
    - Document SQLite store usage patterns
    - Document mock patterns
    - Document environment selection
    - _Requirements: 1.1, 3.1, 5.1_
  
  - [x] 20.2 Update test documentation
    - Add examples of correct patterns
    - Document common pitfalls
    - _Requirements: 10.5_
  
  - [x] 20.3 Create test templates
    - Unit test template
    - Integration test template
    - Property-based test template
    - Performance test template
    - _Requirements: 4.7, 6.1, 7.1, 8.1_

## Notes

- Analysis tasks (1-15) can be run without modifying code
- Fix tasks (17-18) should be applied after user reviews analysis report
- Each checkpoint allows user to review progress and provide feedback
- Property-based tests should reference design document properties
- Integration tests should minimize mocking of internal components
- Performance tests must use realistic data volumes
- All fixes should be verified by running the test suite
