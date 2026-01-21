# Implementation Plan: Session Persistence & Tab Lifetime Fix

## Overview

This implementation plan addresses the two core issues: (1) preventing tab loss when switching between Browse and Settings sections by keeping BrowserShell mounted, and (2) implementing proper session restoration on application launch. The plan builds incrementally, with early validation through tests and checkpoints.

## Tasks

- [x] 1. Build project and fix any existing issues
  - Run `npm run build` to establish baseline
  - Fix any TypeScript errors or build issues
  - Ensure all existing tests pass
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 2. Fix component lifecycle in App.tsx
  - [x] 2.1 Modify App.tsx to keep BrowserShell mounted
    - Replace conditional rendering with CSS-based visibility
    - Add `.view-visible` and `.view-hidden` CSS classes
    - Ensure both BrowserShell and SettingsView render simultaneously
    - _Requirements: 1.1, 1.3_
  
  - [ ]* 2.2 Write property test for component persistence
    - **Property 1: Component Persistence Across Section Switches**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.5**
    - Generate random section switch sequences
    - Verify component instance and state preservation
  
  - [ ]* 2.3 Write unit tests for section switching
    - Test CSS class application
    - Test that BrowserShell doesn't unmount
    - Test state preservation across switches
    - _Requirements: 1.1, 1.2, 1.5_

- [x] 3. Checkpoint - Verify section switching works
  - Manually test switching between Browse and Settings
  - Verify tabs remain loaded and visible when returning to Browse
  - Ensure all tests pass, ask the user if questions arise

- [x] 4. Enhance useSessionManager hook with debouncing
  - [x] 4.1 Add debounced save logic to useSessionManager
    - Implement 2-second debounce on tab changes
    - Add state comparison to avoid duplicate saves
    - Filter out incognito tabs before saving
    - Handle empty session case (all incognito tabs)
    - _Requirements: 2.1, 2.3, 2.4, 2.5_
  
  - [ ]* 4.2 Write property test for debounced saves
    - **Property 2: Debounced Session Save**
    - **Validates: Requirements 2.1, 2.4, 2.5**
    - Generate random tab operation sequences
    - Verify saves occur within 2 seconds
    - Verify no duplicate saves for same state
  
  - [ ]* 4.3 Write property test for incognito filtering
    - **Property 3: Incognito Tab Filtering**
    - **Validates: Requirements 2.3, 4.1, 4.3**
    - Generate random tab sets with normal and incognito tabs
    - Verify saved session contains only normal tabs
  
  - [ ]* 4.4 Write property test for session data completeness
    - **Property 4: Session Data Completeness**
    - **Validates: Requirements 2.2**
    - Generate random tab configurations
    - Verify all required fields present in saved session

- [x] 5. Add error handling to session save operations
  - [x] 5.1 Implement error handling in useSessionManager
    - Wrap save operations in try-catch
    - Log errors without crashing
    - Continue application execution on save failure
    - _Requirements: 2.6_
  
  - [ ]* 5.2 Write property test for error resilience
    - **Property 5: Error Resilience**
    - **Validates: Requirements 2.6**
    - Generate random save operations with simulated failures
    - Verify application continues functioning
    - Verify errors are logged

- [x] 6. Checkpoint - Verify session saving works
  - Manually test that sessions are saved after tab changes
  - Verify incognito tabs are not saved
  - Check database to confirm session data is persisted
  - Ensure all tests pass, ask the user if questions arise

- [x] 7. Implement session restoration on app launch
  - [x] 7.1 Add session restore logic to useSessionManager
    - Load session on component mount
    - Check if restore is enabled in settings
    - Check if user chose to restore (via global flag)
    - Convert TabSession to Tab format
    - Set active tab from saved session
    - _Requirements: 3.1, 3.3, 3.5_
  
  - [ ]* 7.2 Write property test for round-trip consistency
    - **Property 6: Session Restore Round-Trip**
    - **Validates: Requirements 3.3, 3.5**
    - Generate random session states
    - Verify save then restore produces equivalent state
  
  - [ ]* 7.3 Write property test for restored tab incognito flag
    - **Property 9: Restored Tabs Are Never Incognito**
    - **Validates: Requirements 4.2**
    - Generate random session data
    - Verify all restored tabs have incognito=false

- [x] 8. Add validation and error handling for session restore
  - [x] 8.1 Implement session data validation
    - Validate session structure before using
    - Handle missing or invalid fields gracefully
    - Start with fresh session if validation fails
    - Clear corrupted session from database
    - _Requirements: 3.6, 3.7_
  
  - [ ]* 8.2 Write property test for invalid session handling
    - **Property 7: Invalid Session Handling**
    - **Validates: Requirements 3.7**
    - Generate random corrupted/invalid session data
    - Verify application handles gracefully
    - Verify fresh session is created

- [x] 9. Add IPC error handling improvements
  - [x] 9.1 Enhance IPC error responses
    - Ensure all IPC handlers return structured errors
    - Format: `{ ok: false, error: string }`
    - Log errors in both renderer and main process
    - _Requirements: 5.5_
  
  - [ ]* 9.2 Write property test for IPC error propagation
    - **Property 8: IPC Error Propagation**
    - **Validates: Requirements 5.5**
    - Generate random IPC calls with simulated failures
    - Verify errors are returned in structured format

- [x] 10. Checkpoint - Verify session restoration works
  - Manually test full session lifecycle
  - Open tabs, close app, reopen, verify restore dialog
  - Test "Restore" option - verify tabs are restored
  - Test "Start Fresh" option - verify new session starts
  - Ensure all tests pass, ask the user if questions arise

- [ ] 11. Integration testing and polish
  - [ ]* 11.1 Write integration test for full session lifecycle
    - Create tabs, save session, restart, restore
    - Verify end-to-end flow works correctly
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ]* 11.2 Write integration test for section switching
    - Open tabs, switch sections, verify preservation
    - _Requirements: 1.1, 1.2, 1.5_
  
  - [ ]* 11.3 Write integration test for incognito session
    - Mix of normal and incognito tabs
    - Verify only normal tabs saved and restored
    - _Requirements: 2.3, 4.1, 4.2, 4.3_

- [x] 12. Final build and validation
  - Run `npm run build` to ensure no build errors
  - Run full test suite (unit + property + integration)
  - Fix any failing tests
  - Verify TypeScript types are correct
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 13. Final checkpoint - Complete manual testing
  - Test all scenarios from manual testing checklist
  - Verify performance with 50+ tabs
  - Test edge cases (empty session, all incognito, corrupted data)
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The existing session management infrastructure (sessionManager.ts, IPC handlers, preload) requires no changes
- Focus is on App.tsx component lifecycle and useSessionManager hook enhancements
