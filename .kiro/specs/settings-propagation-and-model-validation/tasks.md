# Implementation Plan: Settings Propagation and Model Validation

## Overview

This implementation plan addresses settings propagation latency and Jarvis model validation issues through event-driven architecture and intelligent model fallback. Tasks are organized to deliver incremental value, with testing integrated throughout.

## Tasks

- [x] 1. Build project and verify baseline
  - Run `npm run build` to ensure clean starting point
  - Fix any existing build errors before proceeding
  - _Requirements: All_

- [x] 2. Implement event-driven settings propagation
  - [x] 2.1 Add settings event emission in main process
    - Modify `src/core/settingsStoreMain.ts` to emit 'settings:updated' events
    - Broadcast to all BrowserWindows after in-memory update
    - Implement debounced disk writes (500ms delay)
    - _Requirements: 1.1, 1.2, 2.1, 2.4, 10.1, 10.2, 10.3_
  
  - [x] 2.2 Expose settings subscription in preload
    - Add `onSettingsUpdated(callback)` method to preload script
    - Return unsubscribe function for cleanup
    - _Requirements: 2.2, 2.3_
  
  - [x] 2.3 Create SettingsContext for React
    - Create `src/renderer/contexts/SettingsContext.tsx`
    - Implement SettingsProvider with event subscription
    - Implement useSettings hook
    - Add optimistic updates for immediate UI feedback
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 2.4 Integrate SettingsContext into App
    - Wrap App component with SettingsProvider
    - Update SettingsView to use useSettings hook
    - Remove old useSettingsController hook
    - _Requirements: 3.2, 3.3_
  
  - [ ]* 2.5 Write property test for settings update immediacy
    - **Property 1: Settings Update Immediacy**
    - **Validates: Requirements 1.1, 1.2, 1.3**
    - Test that settings updates complete within 100ms
    - Use fast-check to generate random settings updates
  
  - [ ]* 2.6 Write property test for event broadcast
    - **Property 2: Settings Event Broadcast**
    - **Validates: Requirements 2.1, 2.4**
    - Test that events are emitted to all windows
    - Verify event emission happens before function returns

- [x] 3. Checkpoint - Verify settings propagation
  - Test settings changes in UI (toggle Jarvis, change theme)
  - Verify immediate UI updates (no lag)
  - Check console logs for event flow
  - Ensure all tests pass
  - Ask user if questions arise

- [x] 4. Implement model validation and fallback
  - [x] 4.1 Add model caching to OllamaClient
    - Implement `getInstalledModels()` with 60-second cache
    - Add cache invalidation logic
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 4.2 Implement model validation logic
    - Add `validateAndSelectModel()` method
    - Implement fallback priority: llama3 → mistral → first available
    - Return validation result with fallback flag and reason
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2_
  
  - [x] 4.3 Update chatWithJarvis to use validation
    - Call validateAndSelectModel before sending request
    - Use validated model for chat request
    - Return used model and fallback notice in response
    - _Requirements: 6.5, 7.3, 7.4_
  
  - [ ]* 4.4 Write property test for model cache validity
    - **Property 4: Model Cache Validity**
    - **Validates: Requirements 5.2, 5.3**
    - Test that cache is used when valid
    - Test that cache is refreshed when expired
  
  - [ ]* 4.5 Write property test for fallback model selection
    - **Property 6: Fallback Model Selection**
    - **Validates: Requirements 7.1, 7.2**
    - Generate random installed model lists
    - Verify fallback priority is followed
    - Test with various configured models

- [x] 5. Update IPC handler for model validation
  - [x] 5.1 Modify jarvis:chat handler
    - Call chatWithJarvis with configured model
    - Handle validation result and fallback notice
    - Prepend fallback notice to reply if present
    - Add detailed logging for model selection flow
    - _Requirements: 6.1, 7.3, 7.4, 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [x] 5.2 Add getOllamaModels IPC handler
    - Create handler to fetch installed models
    - Return list of model names
    - Handle errors gracefully
    - _Requirements: 5.1, 5.4, 8.1, 8.2_
  
  - [ ]* 5.3 Write property test for no invalid model requests
    - **Property 7: No Invalid Model Requests**
    - **Validates: Requirements 6.2, 6.3, 6.5**
    - Generate random model configurations
    - Verify only installed models are sent to Ollama
    - Use spy to capture actual model parameter

- [x] 6. Checkpoint - Verify model validation
  - Configure invalid model (e.g., llama2)
  - Send Jarvis chat message
  - Verify fallback model is used
  - Verify notice appears in response
  - Check console logs for validation flow
  - Ensure all tests pass
  - Ask user if questions arise

- [ ] 7. Update Settings UI for model selection
  - [ ] 7.1 Add model dropdown to SettingsView
    - Fetch available models on mount
    - Populate dropdown with installed models only
    - Show loading state while fetching
    - Show "No models installed" message if empty
    - Add installation instructions
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ] 7.2 Add model validation indicator
    - Highlight configured model if not installed
    - Show warning icon for invalid models
    - Refresh model list when settings panel opens
    - _Requirements: 8.3, 8.4_
  
  - [ ]* 7.3 Write unit tests for Settings UI
    - Test model dropdown population
    - Test empty state handling
    - Test loading state
    - Test model selection

- [ ] 8. Add comprehensive logging
  - [ ] 8.1 Add settings change tracing
    - Log settings changes in UI
    - Log IPC handler invocations
    - Log disk write operations
    - Log event broadcasts
    - Log component updates
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [ ] 8.2 Add model selection tracing
    - Log configured model
    - Log validation process
    - Log fallback selection
    - Log actual model sent to Ollama
    - Log response receipt
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 9. Integration testing and verification
  - [ ]* 9.1 Write integration test for settings flow
    - Test end-to-end settings update
    - Verify UI update, IPC call, event broadcast
    - Verify other components receive updates
  
  - [ ]* 9.2 Write integration test for model validation
    - Test with invalid configured model
    - Verify fallback selection
    - Verify response includes notice
    - Verify no errors logged
  
  - [ ]* 9.3 Write integration test for settings persistence
    - Change multiple settings rapidly
    - Verify single disk write
    - Verify all settings persisted

- [x] 10. Final checkpoint and manual testing
  - Run `npm run build` and fix any issues
  - Run all tests: `npm test`
  - Manual test: Toggle Jarvis on/off rapidly
  - Manual test: Change model to invalid value
  - Manual test: Send chat message with invalid model
  - Manual test: Verify model dropdown shows only installed models
  - Manual test: Install new model and verify it appears
  - Ensure all tests pass
  - Ask user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Build and test after each major section to catch issues early
