# Implementation Plan: Arc Browser MVP Enhancements

## Overview

This implementation plan breaks down the Arc Browser MVP enhancements into discrete, manageable coding tasks. The plan follows the 5-phase approach outlined in the design document, building incrementally from command palette foundation through full integration. Each task includes specific requirements references and builds on existing v1.2.0 architecture patterns.

## Tasks

### Phase 1: Command Palette Foundation

- [x] 1. Create CommandRegistry core module
  - Implement CommandRegistry interface with command storage and retrieval
  - Create command registration and execution methods
  - Add command search and filtering functionality with fuzzy matching
  - Implement command categories and keyword support
  - _Requirements: 1.2, 1.3, 1.6_

- [ ]* 1.1 Write unit tests for CommandRegistry
  - Test command registration and retrieval
  - Test search filtering with various queries
  - Test command execution and error handling
  - _Requirements: 1.3, 1.4_

- [ ]* 1.2 Write property-based tests for CommandRegistry
  - **Property 2: Command Search Filtering Accuracy** - Validates: Requirements 1.3
  - **Property 10: Command Registry Serialization Round-Trip** - Validates: Requirements 8.4
  - Generate random commands and search queries
  - _Requirements: 1.3, 8.4_

- [x] 2. Implement CommandPalette React component
  - Create modal component with search input and command list
  - Implement keyboard navigation (arrow keys, Enter, Escape)
  - Add command execution and palette closing logic
  - Style with existing glassmorphism patterns
  - _Requirements: 1.2, 1.4, 1.5_

- [ ]* 2.1 Write unit tests for CommandPalette component
  - Test keyboard interactions and navigation
  - Test command selection and execution
  - Test search input and filtering
  - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 3. Add global keyboard shortcut integration
  - Extend existing KeyboardShortcutManager for Ctrl+K/Cmd+K
  - Integrate with App.tsx for global palette state management
  - Add palette open/close handlers and state management
  - _Requirements: 1.1_

- [ ]* 3.1 Write property-based tests for keyboard integration
  - **Property 1: Command Palette Keyboard Consistency** - Validates: Requirements 1.1
  - **Property 11: Keyboard Shortcut Conflict Prevention** - Validates: Requirements 6.7
  - Test keyboard shortcut registration and conflict detection
  - _Requirements: 1.1, 6.7_

- [x] 4. Wire basic commands to existing functionality
  - Implement tab commands (new, close, switch) using existing window.arc APIs
  - Add Jarvis focus command integration
  - Implement settings and history search commands
  - Add session restore command integration
  - _Requirements: 1.6_

- [x] 5. Checkpoint - Command Palette MVP complete
  - Test Ctrl+K/Cmd+K opens palette consistently
  - Verify all basic commands execute correctly
  - Ensure palette closes after command execution
  - Test search filtering works with various queries

### Phase 2: Enhanced Jarvis Page Analysis

- [x] 6. Implement page content extraction IPC handler
  - Add 'arc:getCurrentPageText' IPC handler in main process
  - Extract page content using webContents.executeJavaScript
  - Implement 8000 character limit and content truncation
  - Add error handling for no active tab scenarios
  - _Requirements: 2.1, 2.5, 2.6_

- [ ]* 6.1 Write unit tests for page content extraction
  - Test content extraction with various page types
  - Test character limit enforcement
  - Test error handling for edge cases
  - _Requirements: 2.1, 2.5, 2.6_

- [ ]* 6.2 Write property-based tests for content extraction
  - **Property 4: Page Content Extraction Bounds** - Validates: Requirements 2.5
  - Generate random content and verify length limits
  - _Requirements: 2.5_

- [x] 7. Create JarvisActions core module
  - Implement analyzeCurrentPage, summarizeCurrentPage, explainCurrentPageSimply methods
  - Integrate with existing Ollama client for AI processing
  - Create structured prompts for each analysis type
  - Add error handling and fallback messages
  - _Requirements: 2.2, 2.3, 2.4_

- [ ]* 7.1 Write unit tests for JarvisActions
  - Test each analysis method with mocked page content
  - Test Ollama integration and error handling
  - Test prompt generation and message formatting
  - _Requirements: 2.2, 2.3, 2.4_

- [ ]* 7.2 Write property-based tests for Jarvis integration
  - **Property 5: Jarvis Analysis Integration** - Validates: Requirements 2.7
  - Generate random page content and verify chat message format
  - _Requirements: 2.7_

- [x] 8. Enhance JarvisPanel component with analysis actions
  - Add "Analyze Page", "Summarize Page", "Explain Simply" buttons
  - Integrate with JarvisActions module for page analysis
  - Update existing chat flow to handle analysis results
  - Add loading states and error handling for analysis actions
  - _Requirements: 2.1, 2.3, 2.4, 2.7_

- [x] 9. Add Jarvis analysis commands to CommandRegistry
  - Register jarvis:analyze-page, jarvis:summarize-page, jarvis:explain-page commands
  - Wire commands to JarvisActions methods
  - Add appropriate command descriptions and keywords
  - _Requirements: 1.6_

- [x] 10. Checkpoint - Enhanced Jarvis complete
  - Test page analysis buttons work in Jarvis panel
  - Verify analysis results appear in chat interface
  - Test analysis commands work from command palette
  - Ensure error handling works for no active tab

### Phase 3: Lightweight Workspaces System

- [x] 11. Create Workspace data model and storage
  - Implement Workspace interface with session snapshot integration
  - Create WorkspaceStorage for JSON file persistence at data/workspaces.json
  - Add workspace validation and migration logic
  - Implement backup and recovery mechanisms
  - _Requirements: 3.1, 3.2, 3.6_

- [ ]* 11.1 Write unit tests for workspace storage
  - Test workspace saving and loading
  - Test data validation and error handling
  - Test backup and recovery mechanisms
  - _Requirements: 3.1, 3.2, 3.6_

- [ ]* 11.2 Write property-based tests for workspace persistence
  - **Property 6: Workspace Session Capture Completeness** - Validates: Requirements 3.1
  - **Property 7: Workspace Persistence Integrity** - Validates: Requirements 3.6
  - **Property 9: Workspace Serialization Round-Trip** - Validates: Requirements 7.5
  - Generate random workspace data and test persistence
  - _Requirements: 3.1, 3.6, 7.5_

- [x] 12. Implement WorkspaceManager core module
  - Create listWorkspaces, saveWorkspaceFromCurrentSession, loadWorkspace methods
  - Implement deleteWorkspace and updateWorkspace functionality
  - Add workspace name validation and duplicate handling
  - Integrate with existing SessionManager for session capture
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [ ]* 12.1 Write unit tests for WorkspaceManager
  - Test all CRUD operations for workspaces
  - Test integration with SessionManager
  - Test error handling and validation
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [ ]* 12.2 Write property-based tests for workspace operations
  - **Property 8: Workspace Restoration Accuracy** - Validates: Requirements 3.3
  - Generate random workspace configurations and test restoration
  - _Requirements: 3.3_

- [x] 13. Add workspace IPC handlers
  - Implement arc:listWorkspaces, arc:saveWorkspace, arc:loadWorkspace handlers
  - Add arc:deleteWorkspace and arc:switchWorkspace handlers
  - Integrate with existing session management IPC patterns
  - Add error handling and validation for all handlers
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 14. Add workspace commands to CommandRegistry
  - Register workspace:save, workspace:switch, workspace:delete commands
  - Implement workspace selection UI for switch command
  - Add workspace name input for save command
  - Wire commands to WorkspaceManager methods
  - _Requirements: 3.7_

- [x] 15. Create workspace selection UI components
  - Implement workspace list component for switching
  - Add workspace creation dialog with name input
  - Create workspace deletion confirmation dialog
  - Style components with existing glassmorphism patterns
  - _Requirements: 3.2, 3.4, 3.5_

- [x] 16. Checkpoint - Workspaces system complete
  - Test workspace saving captures all tabs and groups
  - Verify workspace switching restores correct session
  - Test workspace commands work from command palette
  - Ensure workspace persistence survives app restart

### Phase 4: Diagnostics Panel and Onboarding

- [x] 17. Create DiagnosticsProvider core module
  - Implement getDiagnosticsSnapshot method with all system status checks
  - Add Ollama, database, session, Jarvis, and app status collection
  - Implement runHealthCheck method for overall system health
  - Add error handling and fallback values for unavailable services
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ]* 17.1 Write unit tests for DiagnosticsProvider
  - Test status collection for all system components
  - Test error handling when services are unavailable
  - Test health check aggregation logic
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ]* 17.2 Write property-based tests for diagnostics
  - **Property 12: Diagnostics Data Completeness** - Validates: Requirements 4.1
  - Generate random system states and verify complete status reporting
  - _Requirements: 4.1_

- [x] 18. Implement DiagnosticsPanel React component
  - Create user-friendly status display with clear indicators
  - Add status cards for Ollama, database, session, Jarvis, and app
  - Implement non-technical language and helpful error messages
  - Style with existing glassmorphism patterns and status colors
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8_

- [ ]* 18.1 Write unit tests for DiagnosticsPanel
  - Test status display with various system states
  - Test error message formatting and user-friendly language
  - Test component accessibility and keyboard navigation
  - _Requirements: 4.1, 4.8_

- [x] 19. Add diagnostics IPC handler and command
  - Implement arc:getDiagnostics IPC handler
  - Register diagnostics:open command in CommandRegistry
  - Add diagnostics panel to main app navigation
  - Wire command to open diagnostics panel
  - _Requirements: 4.7_

- [x] 20. Create OnboardingManager core module
  - Implement isFirstRun, markOnboardingCompleted, skipOnboarding methods
  - Create onboarding state persistence to data/onboarding.json
  - Implement getOnboardingSteps with predefined step configuration
  - Add createDemoWorkspace method with preconfigured tabs
  - _Requirements: 5.1, 5.4, 5.5, 5.6, 5.8_

- [ ]* 20.1 Write unit tests for OnboardingManager
  - Test first-run detection and state persistence
  - Test onboarding completion and skip functionality
  - Test demo workspace creation with correct tabs
  - _Requirements: 5.1, 5.4, 5.5, 5.6, 5.8_

- [ ]* 20.2 Write property-based tests for onboarding
  - **Property 13: First-Run Detection Accuracy** - Validates: Requirements 5.1, 5.8
  - Test first-run detection across different installation states
  - _Requirements: 5.1, 5.8_

- [x] 21. Implement OnboardingFlow React component
  - Create modal/banner component with 3 feature highlights
  - Add step navigation with skip and complete options
  - Implement demo workspace creation offer
  - Style with existing glassmorphism patterns and animations
  - _Requirements: 5.2, 5.3, 5.5_

- [ ]* 21.1 Write unit tests for OnboardingFlow
  - Test step navigation and completion flow
  - Test skip functionality and demo workspace offer
  - Test component accessibility and keyboard navigation
  - _Requirements: 5.2, 5.3, 5.4, 5.5_

- [x] 22. Integrate onboarding with App.tsx startup
  - Add first-run detection on application startup
  - Trigger onboarding flow for new users
  - Add demo workspace command to CommandRegistry
  - Ensure onboarding only shows once per installation
  - _Requirements: 5.1, 5.7, 5.8_

- [x] 23. Checkpoint - Diagnostics and onboarding complete
  - Test diagnostics panel shows accurate system status
  - Verify onboarding triggers on first run only
  - Test demo workspace creation with correct tabs
  - Ensure all features accessible via command palette

### Phase 5: Integration and Polish

- [ ] 24. Implement comprehensive error handling
  - Add error boundaries for all new React components
  - Implement graceful degradation for service failures
  - Add user-friendly error messages and recovery options
  - Create error logging and reporting mechanisms
  - _Requirements: 6.2, 7.4, 8.5_

- [ ]* 24.1 Write property-based tests for error handling
  - **Property 14: Error Handling Resilience** - Validates: Requirements 7.4, 8.5
  - Generate invalid data and verify graceful error handling
  - _Requirements: 7.4, 8.5_

- [ ] 25. Add comprehensive integration tests
  - Test complete command palette workflow end-to-end
  - Test Jarvis page analysis integration with Ollama
  - Test workspace save/restore complete workflow
  - Test onboarding flow with demo workspace creation
  - _Requirements: 1.1, 2.7, 3.3, 5.5_

- [ ] 26. Performance optimization and testing
  - Optimize command search performance with debouncing
  - Implement workspace operation caching and compression
  - Add page analysis content caching (5 minutes)
  - Profile memory usage and implement cleanup
  - _Requirements: 6.5_

- [ ] 27. Accessibility improvements
  - Add ARIA labels and roles to all new components
  - Implement keyboard navigation for all interactive elements
  - Add screen reader announcements for dynamic content
  - Test with high contrast mode and screen readers
  - _Requirements: 4.8_

- [ ] 28. Add remaining property-based tests
  - **Property 3: Command Execution Completeness** - Validates: Requirements 1.4
  - Run comprehensive property test suite (100+ iterations each)
  - Verify all 14 correctness properties pass consistently
  - Add property test performance benchmarks
  - _Requirements: 1.4_

- [ ] 29. Final integration and manual testing
  - Test all features work together seamlessly
  - Verify no regressions in existing functionality
  - Test performance under realistic usage scenarios
  - Validate accessibility compliance and keyboard navigation
  - _Requirements: 6.1, 6.2_

- [ ] 30. Documentation and cleanup
  - Update README with new MVP features
  - Add inline code documentation for new modules
  - Create user guide for command palette and workspaces
  - Clean up temporary files and debug code
  - _Requirements: 6.3, 6.4_

- [ ] 31. Final checkpoint - MVP enhancements complete
  - All 14 correctness properties pass property-based tests
  - Command palette accessible via Ctrl+K with full functionality
  - Jarvis page analysis works with all three action types
  - Workspaces save/restore complete browsing sessions
  - Diagnostics panel shows user-friendly system status
  - Onboarding guides new users through key features
  - All features integrate seamlessly with existing architecture

## Notes

- Tasks marked with `*` are optional property-based and comprehensive tests
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and early issue detection
- Property-based tests validate universal correctness properties with 100+ iterations
- All new code follows existing TypeScript and React conventions
- Integration with existing v1.2.0 architecture patterns is maintained throughout
- Performance targets: Command search <50ms, Workspace ops <500ms, Page analysis <200ms
- Memory management: Cleanup event listeners, dispose large objects, limit retention
- Security: Content sanitization, input validation, rate limiting, no sensitive data exposure