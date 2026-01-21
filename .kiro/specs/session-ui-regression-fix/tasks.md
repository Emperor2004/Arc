# Implementation Plan: Session Persistence UI Regression Fix

## Overview

This implementation plan fixes three UI regressions: (1) Jarvis panel moved to bottom instead of right side, (2) URL bar hidden under header, and (3) missing session restore prompt. The approach is surgical and minimal, targeting only the affected areas while preserving all existing functionality.

## Tasks

- [x] 1. Build project and fix any existing issues
  - Run `npm run build` to establish baseline
  - Fix any TypeScript errors or build issues
  - Document current build status
  - _Requirements: 5.1, 5.2_

- [x] 2. Fix two-pane layout (Jarvis on right)
  - [x] 2.1 Inspect and fix App.tsx layout structure
    - Review current JSX structure for Browse section
    - Ensure `arc-main` uses proper flex layout
    - Verify Jarvis conditional rendering logic
    - Remove conflicting visibility classes if present
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 2.2 Fix CSS flex-direction for Browse section
    - Ensure `.arc-main` has `flex-direction: row`
    - Verify `.arc-main-left` and `.arc-main-right` flex properties
    - Check that `.arc-main--settings` doesn't affect Browse layout
    - _Requirements: 1.1, 1.4_
  
  - [ ]* 2.3 Write unit test for two-pane layout
    - Test Browse section renders with horizontal layout
    - Test Jarvis appears on right when enabled
    - Test Settings section doesn't show Jarvis
    - _Requirements: 1.1, 1.2, 1.6_
  
  - [ ]* 2.4 Write property test for layout preservation
    - **Property 1: Two-Pane Layout Preservation**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
    - Generate random application states
    - Verify Jarvis position when enabled

- [x] 3. Checkpoint - Verify layout is fixed
  - Run `npm run dev` and manually test
  - Verify Jarvis appears on right in Browse
  - Verify Settings doesn't show Jarvis
  - Ensure all tests pass, ask the user if questions arise

- [x] 4. Fix header and URL bar visibility
  - [x] 4.1 Inspect header positioning in CSS
    - Verify `.arc-header` uses `position: relative`
    - Check z-index values don't cause overlap
    - Ensure `.arc-root` uses `flex-direction: column`
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 4.2 Ensure adequate spacing between header and main
    - Check margin-bottom on `.arc-header`
    - Verify padding on `.arc-main`
    - Test at different window sizes
    - _Requirements: 2.4, 2.5_
  
  - [ ]* 4.3 Write unit test for header visibility
    - Test header doesn't overlap main content
    - Test URL bar is visible
    - _Requirements: 2.1, 2.5_
  
  - [ ]* 4.4 Write property test for header non-overlap
    - **Property 2: Header Non-Overlap**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
    - Generate random window sizes
    - Verify URL bar always visible

- [x] 5. Checkpoint - Verify header fix
  - Run `npm run dev` and manually test
  - Verify URL bar is fully visible
  - Test at different window sizes
  - Ensure all tests pass, ask the user if questions arise

- [x] 6. Implement session restore prompt UX
  - [x] 6.1 Fix session restore dialog trigger logic
    - Review `checkSessionRestore` in App.tsx
    - Ensure dialog shows when session exists
    - Verify no auto-restore occurs
    - Set proper state flags for dialog visibility
    - _Requirements: 3.1, 3.2, 3.7_
  
  - [x] 6.2 Implement restore and fresh start handlers
    - Verify `handleRestoreSession` calls IPC correctly
    - Verify `handleStartFresh` clears session
    - Ensure dialog closes after user choice
    - Update global flags for BrowserShell
    - _Requirements: 3.3, 3.4, 3.5_
  
  - [x] 6.3 Prevent auto-restore in BrowserShell
    - Review session loading logic in useSessionManager
    - Ensure tabs only restore on user confirmation
    - Remove any auto-restore on mount
    - _Requirements: 3.7_
  
  - [ ]* 6.4 Write unit tests for session restore dialog
    - Test dialog appears when session exists
    - Test dialog doesn't appear when no session
    - Test "Restore" button behavior
    - Test "Start fresh" button behavior
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ]* 6.5 Write property test for user confirmation
    - **Property 3: Session Restore User Confirmation**
    - **Validates: Requirements 3.1, 3.2, 3.7**
    - Generate random session states
    - Verify dialog appears and no auto-restore
  
  - [ ]* 6.6 Write property test for restore completeness
    - **Property 4: Restore Action Completeness**
    - **Validates: Requirements 3.3**
    - Generate random saved sessions
    - Verify all tabs restored on user confirmation

- [x] 7. Checkpoint - Verify session restore UX
  - Create tabs and close app
  - Reopen and verify dialog appears
  - Test "Restore" option
  - Test "Start fresh" option
  - Ensure all tests pass, ask the user if questions arise

- [x] 8. Verify existing functionality preserved
  - [x] 8.1 Test tab management operations
    - Create new tabs
    - Close tabs
    - Switch between tabs
    - Verify incognito tabs work
    - _Requirements: 4.1_
  
  - [x] 8.2 Test Jarvis functionality
    - Verify Jarvis chat works
    - Test Jarvis recommendations
    - Test Jarvis navigation
    - _Requirements: 4.2_
  
  - [x] 8.3 Test settings management
    - Open Settings section
    - Change settings
    - Verify settings persist
    - _Requirements: 4.3_
  
  - [x] 8.4 Test session persistence
    - Create tabs
    - Verify automatic save occurs
    - Check database for saved session
    - _Requirements: 4.4, 4.6_
  
  - [x] 8.5 Test section switching
    - Switch Browse → Settings
    - Verify BrowserShell remains mounted
    - Switch Settings → Browse
    - Verify tabs preserved
    - _Requirements: 4.5_
  
  - [ ]* 8.6 Write property test for functionality preservation
    - **Property 7: Functionality Preservation**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**
    - Generate random user interactions
    - Verify all operations work after fixes

- [x] 9. Final build and validation
  - Run `npm run build` to ensure no build errors
  - Run full test suite (unit + property)
  - Fix any failing tests
  - Verify TypeScript types are correct
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 10. Final checkpoint - Complete manual testing
  - [ ] Jarvis panel on right in Browse ✓
  - [ ] URL bar fully visible ✓
  - [ ] Session restore dialog on startup ✓
  - [ ] "Restore" works correctly ✓
  - [ ] "Start fresh" works correctly ✓
  - [ ] Settings section works ✓
  - [ ] Tab operations work ✓
  - [ ] Jarvis chat works ✓
  - [ ] Session auto-save works ✓
  - [ ] Layout responsive at different sizes ✓
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Focus on minimal, targeted changes to avoid breaking existing functionality
- Always run build before and after changes to catch errors early
- Manual testing is critical for visual/UX issues
