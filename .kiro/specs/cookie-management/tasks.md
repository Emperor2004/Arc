# Implementation Plan: Cookie Management

## Overview

This implementation plan breaks down the cookie management feature into discrete, incremental tasks. Each task builds on previous work and includes references to the specific requirements being implemented. The plan follows a bottom-up approach: starting with core cookie operations in the main process, then adding IPC communication, exposing APIs through the preload script, and finally implementing the UI components.

## Tasks

- [x] 1. Build project and verify baseline
  - Run `npm run build` to ensure project compiles
  - Fix any existing build issues before adding new code
  - Verify tests pass with `npm test`
  - _Requirements: 9.1_

- [ ] 2. Implement core cookie operations in main process
  - [x] 2.1 Create cookie manager helper functions in `src/main/ipc.ts`
    - Implement `getSessionForContext(incognito: boolean)` to resolve session
    - Implement `constructCookieUrl(cookie)` helper for URL construction
    - Implement `getCookies(filter?, incognito?)` function
    - Implement `clearAllCookies(incognito?)` function
    - Implement `clearCookiesForUrl(url, incognito?)` function
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 8.1_

  - [ ]* 2.2 Write property test for cookie attribute preservation
    - **Property 2: Cookie Attribute Preservation**
    - **Validates: Requirements 1.5**

  - [ ]* 2.3 Write property test for session isolation
    - **Property 5: Session Isolation**
    - **Validates: Requirements 2.3, 8.2, 8.4**

  - [ ]* 2.4 Write property test for domain-specific clearing
    - **Property 7: Domain-Specific Cookie Clearing**
    - **Validates: Requirements 3.1, 3.3, 3.4**

  - [ ]* 2.5 Write unit tests for cookie manager functions
    - Test getCookies with various filters
    - Test clearAllCookies returns correct count
    - Test clearCookiesForUrl with valid and invalid URLs
    - Test constructCookieUrl helper
    - _Requirements: 9.2_

- [ ] 3. Add IPC handlers for cookie operations
  - [x] 3.1 Add IPC handlers to `setupIpc` function in `src/main/ipc.ts`
    - Add `arc:getCookies` handler
    - Add `arc:clearCookies` handler
    - Add `arc:clearCookiesForUrl` handler
    - Include error handling and logging for each handler
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.5_

  - [ ]* 3.2 Write property test for IPC response structure
    - **Property 8: IPC Response Structure**
    - **Validates: Requirements 4.5**

  - [ ]* 3.3 Write property test for error response structure
    - **Property 15: Error Response Structure**
    - **Validates: Requirements 10.1**

  - [ ]* 3.4 Write unit tests for IPC handlers
    - Mock Electron session.cookies API
    - Test each handler with valid inputs
    - Test error handling for each handler
    - _Requirements: 9.2_

- [ ] 4. Checkpoint - Verify main process implementation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Expose cookie APIs through preload script
  - [x] 5.1 Add cookie methods to `window.arc` in `src/main/preload.ts`
    - Add `getCookies(filter?)` method
    - Add `clearCookies()` method
    - Add `clearCookiesForUrl(url)` method
    - Each method should invoke corresponding IPC handler
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 5.2 Add TypeScript type definitions in `src/renderer/types/global.d.ts`
    - Define `CookieInfo` interface
    - Define `ClearCookiesResult` interface
    - Define `GetCookiesResult` interface
    - Extend `Window.arc` interface with cookie methods
    - _Requirements: 5.5_

  - [ ]* 5.3 Write property test for preload IPC invocation
    - **Property 10: Preload IPC Invocation**
    - **Validates: Requirements 5.4**

  - [ ]* 5.4 Write unit tests for preload script
    - Mock ipcRenderer.invoke
    - Test each method calls correct IPC channel
    - Test parameters are passed correctly
    - _Requirements: 9.3_

- [ ] 6. Implement cookie management UI in Settings
  - [x] 6.1 Add Cookies section to `src/renderer/components/SettingsView.tsx`
    - Add new "Cookies" settings card in the Data section
    - Add descriptive text about cookie management
    - Add "Clear all cookies" button with confirmation dialog
    - Add click handler that calls `window.arc.clearCookies()`
    - Display success message with count of cleared cookies
    - Display error message if operation fails
    - Follow existing glassmorphism styling patterns
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 10.2_

  - [ ]* 6.2 Write property test for UI API invocation
    - **Property 13: UI API Invocation**
    - **Validates: Requirements 6.3**

  - [ ]* 6.3 Write property test for UI count display
    - **Property 14: UI Count Display**
    - **Validates: Requirements 6.4**

  - [ ]* 6.4 Write property test for UI error display
    - **Property 16: UI Error Display**
    - **Validates: Requirements 10.2**

  - [ ]* 6.5 Write unit tests for Settings UI cookie controls
    - Test Cookies section renders
    - Test "Clear all cookies" button exists
    - Test button click calls API
    - Test success message displays count
    - Test error message displays on failure
    - _Requirements: 9.3_

- [x] 7. Checkpoint - Verify basic cookie management works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Add optional per-site cookie inspection feature
  - [x] 8.1 Add per-site cookie view to Settings UI
    - Add "View cookies for current site" button/section
    - Implement state to track current tab URL
    - Add click handler that calls `window.arc.getCookies({ url: currentUrl })`
    - Display cookie list with name, domain, and expiration
    - Add "Clear cookies for this site" button
    - Add click handler that calls `window.arc.clearCookiesForUrl(currentUrl)`
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [ ]* 8.2 Write property test for UI cookie display
    - **Property 11: UI Cookie Display**
    - **Validates: Requirements 7.2**

  - [ ]* 8.3 Write property test for UI current tab URL usage
    - **Property 12: UI Current Tab URL Usage**
    - **Validates: Requirements 7.3**

  - [ ]* 8.4 Write unit tests for per-site cookie inspection
    - Test "View cookies" button renders when enabled
    - Test cookie list displays correct information
    - Test "Clear cookies for this site" button works
    - _Requirements: 9.3_

- [ ] 9. Add comprehensive error handling and validation
  - [x] 9.1 Add URL validation to `clearCookiesForUrl`
    - Validate URL format before processing
    - Return error for invalid URLs
    - Add try-catch for URL parsing
    - _Requirements: 10.3, 10.4_

  - [ ]* 9.2 Write property test for invalid URL error handling
    - **Property 17: Invalid URL Error Handling**
    - **Validates: Requirements 10.4**

  - [ ]* 9.3 Write unit tests for error handling
    - Test session unavailable scenario
    - Test invalid URL handling
    - Test error logging doesn't expose cookie data
    - _Requirements: 10.3, 10.5_

- [ ] 10. Final integration and testing
  - [ ] 10.1 Run full test suite
    - Run all unit tests: `npm test`
    - Run all property-based tests
    - Verify all tests pass
    - _Requirements: 9.5_

  - [x] 10.2 Build and manual verification
    - Run `npm run build` and fix any issues
    - Launch application and test cookie clearing in Settings
    - Visit a website, verify cookies are stored
    - Clear cookies via Settings, verify they're removed
    - Test per-site cookie inspection (if implemented)
    - Verify incognito sessions remain isolated
    - _Requirements: 9.1_

- [ ] 11. Final checkpoint - Complete implementation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: main process → IPC → preload → UI
- All cookie operations respect session isolation between normal and incognito modes
