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

## Session 2025-01-23 – AI & Intelligence Enhancements

### Phase 6: Project Setup and Build Verification

- [x] 32. Build project and fix issues
  - Run `npm run build` to verify current state
  - Fix any TypeScript errors or build warnings
  - Ensure all existing tests pass with `npm test`
  - Document any breaking changes or dependencies

### Phase 7: Smart Bookmarking System

- [x] 33. Create bookmark data model and storage
  - Implement `Bookmark` interface: `{ id, url, title, createdAt, tags?, folderId?, favicon? }`
  - Implement `BookmarkFolder` interface: `{ id, name, createdAt, smart?, rule?, color? }`
  - Create `core/bookmarkStore.ts` with SQLite tables or JSON storage at `data/bookmarks.json`
  - Add basic CRUD APIs: `addBookmark`, `listBookmarks`, `listFolders`, `assignFolder`, `deleteBookmark`
  - _Reuses: database.ts patterns, settingsStore.ts structure_

- [x] 34. Implement AI-powered bookmark organization
  - Create `core/bookmarkAI.ts` for intelligent bookmark categorization
  - Implement `suggestFoldersForBookmarks(bookmarks)` using ollamaClient
  - Create prompts for folder suggestion and bookmark classification
  - Add caching mechanism for AI suggestions to avoid repeated API calls
  - Handle Ollama unavailable scenarios with fallback heuristics
  - _Reuses: ollamaClient.ts, personalizationManager.ts patterns_

- [x] 35. Build smart folder views and UI
  - Create `BookmarksPanel.tsx` component with glassmorphism styling
  - Add "Add bookmark" button for current tab
  - Implement "Smart organize" button that runs AI categorization
  - Create smart folder views: Work, Learning, News, Shopping, etc.
  - Add bookmark search and filtering capabilities
  - Integrate with existing command palette for bookmark commands
  - _Reuses: existing panel patterns, glassmorphism styles_

- [x] 36. Add bookmark commands to CommandRegistry
  - Register `bookmark:add`, `bookmark:organize`, `bookmark:search` commands
  - Add `bookmark:open-panel` command for quick access
  - Wire commands to bookmark store operations
  - Add keyboard shortcuts for common bookmark actions
  - _Reuses: commandRegistry.ts, defaultCommands.ts patterns_

### Phase 8: Content Summarization & Reading Lists

- [x] 37. Enhance page content extraction
  - Extend existing `arc:getCurrentPageText` IPC handler
  - Create `core/pageContent.ts` utility for text extraction and cleaning
  - Add content preprocessing: remove ads, navigation, extract main content
  - Implement content caching to avoid repeated extraction
  - Add metadata extraction: reading time, word count, language detection
  - _Reuses: existing IPC patterns, jarvisActions.ts content extraction_

- [x] 38. Build summarization pipeline
  - Create `core/summarization.ts` with multiple summary types
  - Implement `summarizePage(text, options)` using ollamaClient
  - Add summary types: short (1-2 sentences), bullet points, key insights
  - Include estimated reading time and topic classification
  - Add summary quality scoring and fallback options
  - _Reuses: ollamaClient.ts, jarvisActions.ts prompt patterns_

- [x] 39. Implement reading list storage and management
  - Create `core/readingListStore.ts` with `ReadingItem` interface
  - Add `ReadingItem`: `{ id, url, title, savedAt, summary?, tags?, readingTime?, progress? }`
  - Implement CRUD operations: save, list, update, delete, mark as read
  - Add auto-summarization option when saving articles
  - Create reading progress tracking and statistics
  - _Reuses: database.ts patterns, workspaceManager.ts storage_

- [x] 40. Build reading list UI components
  - Create `ReadingListPanel.tsx` with article cards and summaries
  - Add "Save to reading list" button in BrowserShell and JarvisPanel
  - Implement reading list filters: unread, by topic, by date
  - Add "Open & re-summarize" action for saved articles
  - Create reading progress indicators and statistics view
  - _Reuses: existing panel patterns, glassmorphism styling_

### Phase 9: Translation Services

- [x] 41. Create translation core system
  - Implement `core/translation.ts` with language detection and translation
  - Add `detectLanguage(text)` using LLM or heuristic methods
  - Implement `translateText(text, targetLang)` via ollamaClient
  - Create translation caching to avoid repeated API calls
  - Add support for common language pairs and auto-detection
  - _Reuses: ollamaClient.ts, pageContent.ts for text extraction_

- [x] 42. Build translation UI and integration
  - Add "Translate page" button in BrowserShell or language control
  - Create translation side panel showing original and translated text
  - Implement per-paragraph translation for selected text (optional)
  - Store last used translation language in settingsStore
  - Add translation quality indicators and retry options
  - _Reuses: existing panel patterns, settingsStore.ts_

- [x] 43. Integrate translation with Jarvis
  - Add Jarvis quick actions: "Translate this page to [language]"
  - Create translation commands for command palette
  - Add translation to page analysis workflow
  - Implement voice-activated translation commands
  - _Reuses: jarvisActions.ts, commandRegistry.ts patterns_

### Phase 10: Voice Commands System

- [x] 44. Implement audio capture and speech recognition
  - Create `VoiceController.tsx` component with Web Speech API
  - Add microphone permission handling and audio capture
  - Implement speech-to-text using webkitSpeechRecognition (MVP)
  - Add voice activity detection and noise filtering
  - Maintain Electron security (contextIsolation, sandbox)
  - _Reuses: existing component patterns, security practices_

- [x] 45. Build voice command processing pipeline
  - Create `core/voiceCommands.ts` for intent parsing and execution
  - Implement rule-based + LLM intent classification
  - Map voice commands to actions: tabs, navigation, Jarvis, bookmarks
  - Add command confidence scoring and disambiguation
  - Create fallback handling for unrecognized commands
  - _Reuses: ollamaClient.ts, commandRegistry.ts, jarvisActions.ts_

- [x] 46. Create voice feedback UI and integration
  - Add floating microphone button in BrowserShell
  - Implement voice states: idle, listening, processing, error
  - Show recognized command text and execution feedback
  - Add voice command help and training mode
  - Create voice shortcuts for common actions
  - _Reuses: existing UI patterns, glassmorphism styling_

### Phase 11: Predictive Navigation System

- [x] 47. Enhance history and personalization data
  - Extend historyStore to include visit patterns and context
  - Add features: visit count, recency, time-of-day patterns, referrers
  - Create user behavior analysis: browsing sessions, topic interests
  - Implement privacy-safe feature extraction and storage
  - Add data cleanup and retention policies
  - _Reuses: historyStore.ts, personalizationManager.ts_

- [x] 48. Build predictive navigation engine
  - Create `core/predictiveNavigation.ts` with ML-lite ranking model
  - Implement URL prediction based on current context and history
  - Add prediction types: top sites, next likely page, personalized shortcuts
  - Create prediction confidence scoring and filtering
  - Add real-time prediction updates based on user behavior
  - _Reuses: personalizationManager.ts, historyStore.ts patterns_

- [x] 49. Integrate predictions with address bar
  - Enhance existing address bar component with AI suggestions
  - Merge history search results with predictive suggestions
  - Add visual labels for AI suggestions ("Suggested", "Popular")
  - Implement prediction ranking and relevance scoring
  - Add user feedback mechanism for prediction quality
  - _Reuses: existing address bar component, search patterns_

- [x] 50. Implement safe preloading system
  - Add connection preloading for top predicted URLs
  - Implement DNS pre-resolution and connection warming
  - Create privacy-safe preloading with user consent
  - Add preloading controls in Settings with clear explanations
  - Monitor preloading effectiveness and resource usage
  - _Reuses: settingsStore.ts, existing privacy patterns_

### Phase 12: Integration, Testing, and Polish

- [ ] 51. Add comprehensive unit tests
  - Test bookmark AI organization with mocked ollamaClient
  - Test summarization and translation pipelines
  - Test voice command intent mapping with synthetic data
  - Test predictive navigation ranking algorithms
  - Add property-based tests for data serialization
  - _Reuses: existing test patterns, fast-check library_

- [ ] 52. Implement integration tests
  - Test end-to-end bookmark organization workflow
  - Test reading list save and summarization flow
  - Test voice command execution and feedback
  - Test predictive navigation and preloading
  - Test cross-feature interactions and data consistency
  - _Reuses: existing integration test patterns_

- [ ] 53. Performance optimization and monitoring
  - Optimize AI API calls with batching and caching
  - Implement lazy loading for bookmark and reading list data
  - Add performance monitoring for voice recognition
  - Optimize predictive navigation computation
  - Add memory management for large datasets
  - _Reuses: existing performance patterns, LRU caching_

- [ ] 54. Accessibility and user experience improvements
  - Add ARIA labels and keyboard navigation for all new components
  - Implement screen reader support for voice commands
  - Add high contrast mode support for new UI elements
  - Create user onboarding for AI features
  - Add feature discovery and help documentation
  - _Reuses: existing accessibility patterns, onboarding system_

- [ ] 55. Final integration and manual testing
  - Test all AI features work together seamlessly
  - Verify no regressions in existing functionality
  - Test performance under realistic usage scenarios
  - Validate privacy and security considerations
  - Test offline graceful degradation
  - _Reuses: existing testing procedures_

- [ ] 56. Documentation and cleanup
  - Update README with new AI & Intelligence features
  - Add inline code documentation for new modules
  - Create user guide for AI features and voice commands
  - Clean up temporary files and debug code
  - Update project architecture documentation
  - _Reuses: existing documentation patterns_

- [ ] 57. Final checkpoint - AI & Intelligence Enhancements complete
  - Smart bookmarking with AI organization working end-to-end
  - Content summarization and reading lists functional
  - Translation services integrated with page analysis
  - Voice commands working for major browser actions
  - Predictive navigation providing relevant suggestions
  - All features integrate seamlessly with existing architecture
  - Performance targets met: AI responses <2s, voice recognition <1s
  - Privacy and security requirements satisfied

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