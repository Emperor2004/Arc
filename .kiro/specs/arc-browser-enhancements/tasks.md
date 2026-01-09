# Implementation Plan: Arc Browser Enhancements

## Overview

This implementation plan breaks down the Arc Browser enhancements into discrete, manageable coding tasks. Tasks are organized by feature area and build incrementally, with testing integrated throughout. Each task includes specific requirements references and clear acceptance criteria.

## Tasks

### Phase 1: Testing Infrastructure

- [x] 1. Set up testing framework and configuration
  - Install Vitest, fast-check, and testing utilities
  - Create test configuration files (vitest.config.ts)
  - Set up test scripts in package.json
  - Create test helpers and fixtures directory
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write unit tests for Recommender module
  - Test domain extraction and keyword extraction functions
  - Test feedback map building and score calculation
  - Test recommendation generation with various history inputs
  - Test edge cases (empty history, single entry, large history)
  - _Requirements: 1.1_

- [x]* 2.1 Write property-based tests for Recommender
  - **Property 1: Recommendation Score Invariant** - Validates: Requirements 4.1, 4.6
  - **Property 2: Temporal Weight Monotonicity** - Validates: Requirements 4.2, 4.3
  - Generate random history and feedback data
  - Verify score bounds and monotonicity properties
  - _Requirements: 1.2_

- [x] 3. Write unit tests for HistoryStore module
  - Test adding history entries
  - Test retrieving recent history
  - Test history persistence and loading
  - Test edge cases (duplicate entries, invalid URLs)
  - _Requirements: 1.1_

- [x] 4. Write unit tests for FeedbackStore module
  - Test adding feedback entries
  - Test retrieving feedback by URL
  - Test feedback persistence
  - Test feedback aggregation
  - _Requirements: 1.1_

- [x] 5. Write unit tests for SettingsStore module
  - Test reading and writing settings
  - Test default settings initialization
  - Test settings persistence
  - _Requirements: 1.1_

- [x] 6. Checkpoint - Ensure all tests pass
  - Run full test suite and verify 80%+ coverage for core modules
  - Fix any failing tests
  - Document coverage report

### Phase 2: Bookmarks System

- [x] 7. Create BookmarkStore module
  - Implement bookmark data model and interfaces
  - Create JSON storage file at data/bookmarks.json
  - Implement addBookmark, removeBookmark, getAllBookmarks methods
  - Implement searchBookmarks with URL and title matching
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x]* 7.1 Write unit tests for BookmarkStore
  - Test adding and removing bookmarks
  - Test bookmark persistence
  - Test search functionality
  - Test edge cases (duplicate URLs, special characters)
  - _Requirements: 1.1_

- [x]* 7.2 Write property-based tests for BookmarkStore
  - **Property 3: Bookmark Persistence Round-Trip** - Validates: Requirements 2.5
  - Generate random bookmarks and verify round-trip persistence
  - _Requirements: 1.2_

- [x] 8. Create BookmarkButton component
  - Add bookmark button to AddressBar component
  - Implement click handler to save current URL
  - Show visual feedback (button state change) when bookmarked
  - _Requirements: 2.1_

- [x] 9. Create BookmarksPanel component
  - Display all bookmarks in a list view
  - Show bookmark title, URL, and creation date
  - Implement bookmark removal with confirmation
  - Implement bookmark click to navigate
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 10. Implement bookmark search functionality
  - Add search input to BookmarksPanel
  - Filter bookmarks by URL and title in real-time
  - Highlight matching text in results
  - _Requirements: 2.6_

- [x] 11. Checkpoint - Bookmarks system complete
  - Test bookmark creation, deletion, and navigation
  - Verify persistence across application restart
  - Ensure UI is responsive and intuitive

### Phase 3: Search Engine Integration

- [x] 12. Create SearchEngineManager module
  - Define SearchEngine interface and available engines (Google, DuckDuckGo, Bing)
  - Implement getAvailableEngines method
  - Implement setDefaultEngine and getDefaultEngine methods
  - Implement buildSearchUrl with template substitution
  - _Requirements: 3.3, 3.4, 3.5, 3.6_

- [x] 13. Implement search query detection
  - Create isSearchQuery function to detect search vs URL input
  - Use URL pattern matching and keyword detection
  - Handle edge cases (URLs with spaces, special characters)
  - _Requirements: 3.1, 3.2_

- [x]* 13.1 Write property-based tests for search detection
  - **Property 4: Search Query Detection Consistency** - Validates: Requirements 3.1, 3.2
  - Generate random inputs and verify consistent classification
  - _Requirements: 1.2_

- [x] 14. Integrate search engine into navigation flow
  - Modify handleNavigate in BrowserShell to detect search queries
  - Route search queries through SearchEngineManager
  - Construct and navigate to search URL
  - _Requirements: 3.1, 3.2, 3.6_

- [x] 15. Create SearchEngineSelector component
  - Add search engine dropdown to Settings panel
  - Display available search engines with icons
  - Implement selection handler to update settings
  - _Requirements: 3.3, 3.4_

- [x] 16. Checkpoint - Search engine integration complete
  - Test search query detection with various inputs
  - Test search with different engines
  - Verify search engine preference persists

### Phase 4: Improved Recommendation Algorithm

- [x] 17. Implement temporal weighting function
  - Create calculateTemporalWeight function with decay curve
  - Apply different weights based on days since visit (7, 30, 90 day thresholds)
  - Integrate into recommendation scoring
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 18. Update recommendation scoring algorithm
  - Modify getJarvisRecommendations to use temporal weighting
  - Ensure feedback adjustments still override temporal weight appropriately
  - Maintain backward compatibility with existing recommendation types
  - _Requirements: 4.4, 4.5, 4.6_

- [x]* 18.1 Write property-based tests for temporal weighting
  - **Property 2: Temporal Weight Monotonicity** - Validates: Requirements 4.2, 4.3
  - Generate random visit timestamps and verify monotonicity
  - _Requirements: 1.2_

- [x] 19. Update recommendation display to show temporal factors
  - Modify recommendation reason text to indicate temporal weighting
  - Show "recently visited" vs "old favorite" indicators
  - Update UI to reflect temporal scoring
  - _Requirements: 4.1_

- [x] 20. Checkpoint - Recommendation algorithm improved
  - Test recommendations with various history patterns
  - Verify temporal weighting is applied correctly
  - Ensure recommendations reflect current interests

### Phase 5: Keyboard Shortcuts

- [x] 21. Create KeyboardShortcutManager module
  - Define KeyboardShortcut interface
  - Implement registerShortcut and handleKeyDown methods
  - Create platform-specific shortcut mappings
  - _Requirements: 5.1 through 5.8_

- [x] 22. Implement keyboard event listener
  - Add global keyboard event listener to main App component
  - Route keyboard events to KeyboardShortcutManager
  - Prevent default browser behavior for registered shortcuts
  - _Requirements: 5.1 through 5.8_

- [x] 23. Implement individual shortcuts
  - Ctrl+T / Cmd+T: New Tab
  - Ctrl+N / Cmd+N: New Incognito Tab
  - Ctrl+W / Cmd+W: Close Tab
  - Ctrl+Tab: Next Tab
  - Ctrl+Shift+Tab: Previous Tab
  - Ctrl+L / Cmd+L: Focus Address Bar
  - Ctrl+R / Cmd+R: Reload Page
  - Ctrl+Shift+Delete: Clear Data
  - _Requirements: 5.1 through 5.8_

- [x]* 23.1 Write unit tests for keyboard shortcuts
  - Test each shortcut triggers correct action
  - Test platform-specific shortcuts (macOS vs Windows/Linux)
  - Test shortcut conflicts and precedence
  - _Requirements: 1.1_

- [x]* 23.2 Write property-based tests for shortcuts
  - **Property 8: Keyboard Shortcut Uniqueness** - Validates: Requirements 5.1 through 5.8
  - Verify no duplicate shortcuts on same platform
  - _Requirements: 1.2_

- [x] 24. Add keyboard shortcuts help dialog
  - Create help dialog showing all available shortcuts
  - Display platform-specific shortcuts
  - Make accessible via Ctrl+? or Help menu
  - _Requirements: 5.1 through 5.8_

- [x] 25. Checkpoint - Keyboard shortcuts complete
  - Test all shortcuts on Windows, macOS, and Linux
  - Verify shortcuts don't conflict with system shortcuts
  - Ensure help dialog is accessible

### Phase 6: Dark Mode Implementation

- [x] 26. Create ThemeManager module
  - Implement theme detection and switching logic
  - Create CSS variable system for theming
  - Implement OS theme detection for 'system' mode
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 27. Create theme CSS files
  - Define CSS variables for light theme
  - Define CSS variables for dark theme
  - Ensure sufficient contrast for accessibility
  - Apply theme variables to all components
  - _Requirements: 6.7_

- [x] 28. Create ThemeSelector component
  - Add theme selector to Settings panel
  - Display options: System, Light, Dark
  - Implement selection handler
  - Show current theme selection
  - _Requirements: 6.1_

- [x] 29. Integrate theme persistence
  - Save theme preference to settings store
  - Load theme on application startup
  - Apply theme immediately on selection
  - _Requirements: 6.5, 6.6_

- [x] 30. Implement OS theme detection
  - Use Electron's nativeTheme API to detect system preference
  - Listen for system theme changes
  - Update application theme when system theme changes
  - _Requirements: 6.2_

- [x]* 30.1 Write unit tests for theme system
  - Test theme switching
  - Test persistence and loading
  - Test OS theme detection
  - _Requirements: 1.1_

- [x]* 30.2 Write property-based tests for theme
  - **Property 5: Theme Application Idempotence** - Validates: Requirements 6.3, 6.4
  - Verify applying theme twice equals applying once
  - _Requirements: 1.2_

- [x] 31. Checkpoint - Dark mode complete
  - Test theme switching in UI
  - Verify persistence across restart
  - Check contrast and readability in both themes

### Phase 7: Tab Drag-and-Drop Reordering

- [x] 32. Install drag-and-drop library
  - Add react-beautiful-dnd or similar library
  - Configure library in project
  - Update package.json and dependencies
  - _Requirements: 7.1 through 7.5_

- [x] 33. Implement TabReorderManager module
  - Create tab reordering logic
  - Implement drag start, drag over, and drop handlers
  - Maintain tab order state
  - _Requirements: 7.3, 7.4_

- [x] 34. Update TabBar component for drag-and-drop
  - Wrap tabs with drag-and-drop provider
  - Make tabs draggable
  - Show visual feedback during drag
  - Show drop target indicator
  - _Requirements: 7.1, 7.2_

- [x] 35. Persist tab order
  - Save tab order to settings on change
  - Restore tab order on application startup
  - Handle edge cases (closed tabs, new tabs)
  - _Requirements: 7.5_

- [x]* 35.1 Write unit tests for tab reordering
  - Test drag and drop operations
  - Test tab order persistence
  - Test edge cases
  - _Requirements: 1.1_

- [x]* 35.2 Write property-based tests for tab order
  - **Property 6: Tab Order Preservation** - Validates: Requirements 7.3, 7.4
  - Generate random drag sequences and verify final order
  - _Requirements: 1.2_

- [x] 36. Checkpoint - Tab reordering complete
  - Test drag-and-drop functionality
  - Verify tab order persists across restart
  - Ensure UI remains responsive

### Phase 8: Data Export and Import

- [x] 37. Create DataManager module
  - Define ExportData interface
  - Implement exportData method to collect all data
  - Implement importData with merge/replace modes
  - Implement validateExportData for format validation
  - _Requirements: 8.1 through 8.6_

- [x] 38. Implement export functionality
  - Create export dialog in Settings
  - Generate JSON export file with all data
  - Add timestamp and version information
  - Trigger file download
  - _Requirements: 8.1, 8.2_

- [x] 39. Implement import functionality
  - Create import dialog in Settings
  - Allow file selection
  - Validate imported file format
  - Show merge vs replace options
  - _Requirements: 8.3, 8.4_

- [x] 40. Implement data validation and error handling
  - Validate export file structure
  - Check version compatibility
  - Show detailed error messages
  - Offer rollback on import failure
  - _Requirements: 8.5_

- [x]* 40.1 Write unit tests for data export/import
  - Test export data generation
  - Test import with valid data
  - Test import with invalid data
  - Test merge and replace modes
  - _Requirements: 1.1_

- [x]* 40.2 Write property-based tests for data round-trip
  - **Property 7: Data Export-Import Round-Trip** - Validates: Requirements 8.2, 8.3, 8.4
  - Generate random data, export, import, and verify equivalence
  - _Requirements: 1.2_

- [x] 41. Add success/error notifications
  - Show success message on export completion
  - Show success message on import completion
  - Display details of what was transferred
  - Show error messages with troubleshooting hints
  - _Requirements: 8.6_

- [x] 42. Checkpoint - Data export/import complete
  - Test export with various data combinations
  - Test import with valid and invalid files
  - Verify data integrity after round-trip

### Phase 9: Integration and Final Testing

- [x] 43. Write integration tests
  - Test IPC communication between main and renderer
  - Test data persistence across components
  - Test feature interactions (e.g., bookmarks + search)
  - Test complete user workflows
  - _Requirements: 1.3_
  - **16 integration tests created and passing**

- [x] 44. Run full test suite and coverage analysis
  - Execute all unit tests
  - Execute all property-based tests
  - Generate coverage report
  - Verify 80%+ coverage for core modules
  - _Requirements: 1.4_
  - **Coverage Results:**
    - Statements: 93.5% ✅
    - Branches: 85.71% ✅
    - Functions: 96.19% ✅
    - Lines: 93.5% ✅

- [x] 45. Performance testing and optimization
  - Profile recommendation generation with large history
  - Optimize data loading and persistence
  - Test UI responsiveness with many bookmarks
  - Identify and fix performance bottlenecks
  - _Requirements: 1.1_
  - **All core operations complete within acceptable time limits**

- [x] 46. Final checkpoint - All features complete
  - Verify all requirements are met
  - Test all features end-to-end
  - Ensure no regressions in existing functionality
  - Document any known issues or limitations
  - **All 318 tests passing ✅**
  - **93.5% code coverage ✅**
  - **All 8 phases complete ✅**

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP, but are recommended for comprehensive quality
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and early issue detection
- Property-based tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All code should follow existing TypeScript and React conventions
- Tests should achieve 80%+ coverage for core modules

