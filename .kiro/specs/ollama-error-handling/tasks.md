# Implementation Plan: Ollama Error Handling Enhancement

## Overview

This implementation enhances Ollama error handling in Jarvis to detect missing models, provide clear error messages, gracefully fall back to rule-based responses, and automatically recover when models are installed.

## Tasks

- [x] 1. Create OllamaError class and error types
  - Create `OllamaErrorType` enum with all error types (SERVER_NOT_RUNNING, NO_MODELS_INSTALLED, MODEL_NOT_FOUND, TIMEOUT, UNKNOWN)
  - Create `OllamaError` class extending Error with type and details properties
  - Export both from `src/core/ollamaClient.ts`
  - _Requirements: 1.3, 1.4_

- [ ]* 1.1 Write property test for OllamaError creation
  - **Property 1: Error Type Accuracy**
  - **Validates: Requirements 1.3, 1.4**

- [ ] 2. Add hasModels() method to OllamaClient
  - [x] 2.1 Implement `hasModels()` method that calls `listModels()` and returns true if length > 0
    - Handle errors by returning false
    - Add timeout of 2 seconds
    - _Requirements: 4.1, 4.3, 4.4_

  - [ ]* 2.2 Write property test for hasModels()
    - **Property 4: Model Detection Accuracy**
    - **Validates: Requirements 4.1, 4.3, 4.4**

- [ ] 3. Add getStatus() method to OllamaClient
  - [x] 3.1 Implement `getStatus()` method returning OllamaStatus object
    - Check if server is available using `isAvailable()`
    - If not available, return error with SERVER_NOT_RUNNING type
    - If available, call `listModels()` to get model list
    - If no models, return error with NO_MODELS_INSTALLED type
    - If models exist, return success status with model list
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 3.2 Write unit tests for getStatus()
    - Test server not running scenario
    - Test no models scenario
    - Test models available scenario
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 4. Enhance OllamaClient.chat() with better error handling
  - [x] 4.1 Add pre-check for models before making chat request
    - Call `hasModels()` before attempting chat
    - Throw OllamaError with NO_MODELS_INSTALLED if no models
    - Include installation instructions in error message (recommend llama3)
    - _Requirements: 1.1, 1.2, 2.1, 2.2_

  - [x] 4.2 Add specific 404 error handling
    - Check if response status is 404
    - Throw OllamaError with MODEL_NOT_FOUND type
    - Include model name and "ollama list" command in message
    - _Requirements: 1.2, 2.2, 2.3_

  - [x] 4.3 Add timeout error handling
    - Catch AbortError from timeout
    - Throw OllamaError with TIMEOUT type
    - _Requirements: 4.5_

  - [ ]* 4.4 Write unit tests for enhanced chat() error handling
    - Test no models scenario
    - Test 404 model not found scenario
    - Test timeout scenario
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3_

- [ ] 5. Checkpoint - Ensure all OllamaClient tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Add OllamaState to useJarvisController
  - [x] 6.1 Create OllamaState interface and add state to hook
    - Define interface with available, hasModels, lastChecked, cacheTimeout fields
    - Initialize state with useState
    - Set cacheTimeout to 30000ms (30 seconds)
    - _Requirements: 6.3, 6.4_

  - [x] 6.2 Create cache validation logic
    - Add helper function to check if cache is valid (now - lastChecked < cacheTimeout)
    - _Requirements: 6.3, 6.4_

  - [ ]* 6.3 Write property test for cache invalidation
    - **Property 3: Cache Invalidation**
    - **Validates: Requirements 6.3, 6.4**

- [ ] 7. Enhance getOllamaReply() with status checking and caching
  - [x] 7.1 Add cache check at start of function
    - Check if cache is valid using helper
    - If cache valid and hasModels is true, skip status check
    - If cache invalid or not available, call `getStatus()`
    - _Requirements: 3.4, 6.3, 6.4_

  - [x] 7.2 Update ollamaState based on status check
    - Set available, hasModels, and lastChecked fields
    - _Requirements: 6.1, 6.2_

  - [x] 7.3 Return error messages for different failure modes
    - If server not running, return message with "ollama serve" command
    - If no models, return message with "ollama pull llama3" command
    - Set shouldFallback flag to true for both cases
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1_

  - [x] 7.4 Add OllamaError handling in catch block
    - Check if error is instance of OllamaError
    - Return specific messages for NO_MODELS_INSTALLED and MODEL_NOT_FOUND types
    - Include installation/check commands in messages
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 7.5 Write property test for fallback consistency
    - **Property 2: Fallback Consistency**
    - **Validates: Requirements 3.1, 3.5**

  - [ ]* 7.6 Write property test for no repeated checks
    - **Property 7: No Repeated Checks**
    - **Validates: Requirements 3.4**

- [ ] 8. Update handleSend() to use enhanced getOllamaReply()
  - [x] 8.1 Pass ollamaState and setOllamaState to getOllamaReply()
    - Update function call with new parameters
    - _Requirements: 6.1, 6.2_

  - [x] 8.2 Handle shouldFallback flag in response
    - If shouldFallback is true, show error message first
    - Then call getJarvisReply() for rule-based response after 500ms delay
    - Show both messages in chat
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 8.3 Add logging for state transitions
    - Log when falling back to rule-based responses
    - Log when models become available
    - Use emoji prefixes for visual scanning
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 8.4 Write integration test for error flow
    - Test complete flow from Ollama unavailable to fallback
    - Test recovery when models become available
    - _Requirements: 3.1, 3.2, 3.3, 6.2, 8.1, 8.2_

- [ ] 9. Checkpoint - Ensure all hook tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Enhance Settings UI with Ollama status display
  - [ ] 10.1 Add ollamaStatus state to SettingsPanel component
    - Create state with available, hasModels, models, loading fields
    - Initialize with loading: true
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [ ] 10.2 Add useEffect to check Ollama status when settings open
    - Call `getOllamaClient().getStatus()` when ollamaEnabled is true
    - Update ollamaStatus state with results
    - _Requirements: 5.4_

  - [ ] 10.3 Add warning messages to UI
    - Show "Ollama is not running" message with "ollama serve" command when not available
    - Show "No models installed" message with "ollama pull llama3" command when no models
    - Style warnings with yellow/orange color and warning icon
    - _Requirements: 5.1, 5.2, 5.5_

  - [ ] 10.4 Update model dropdown to show status
    - Disable dropdown when no models available
    - Show "No models available" option when empty
    - Populate with actual model names when available
    - _Requirements: 5.1, 5.3_

  - [ ]* 10.5 Write unit tests for Settings UI status display
    - Test warning messages appear correctly
    - Test dropdown disabled state
    - Test model list population
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 11. Add CSS styling for Ollama warnings
  - [ ] 11.1 Add .ollama-warning class to global.css
    - Yellow/orange background color
    - Warning icon (⚠️)
    - Padding and margin for spacing
    - Monospace font for code snippets
    - _Requirements: 5.1, 5.2_

- [ ] 12. Update chatWithJarvis() to use selected model from settings
  - [x] 12.1 Get ollamaModel from settings instead of hardcoded 'llama2'
    - Pass model name from settings to chat request
    - Fall back to 'llama3' if not set
    - _Requirements: 5.3_

- [ ] 13. Final integration testing
  - [x] 13.1 Test complete user flow
    - Enable Ollama without models
    - Verify error message and fallback
    - Install a model
    - Verify automatic recovery within 30 seconds
    - Verify AI responses work
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 13.2 Write end-to-end integration test
    - Test full error recovery flow
    - Test settings UI integration
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
