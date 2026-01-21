# Implementation Plan: Ollama Detection Fix

## Overview

This implementation fixes the Ollama detection chain in Arc Browser's Jarvis integration. The core issues are incorrect health check logic, improper status propagation, and premature fallback triggering. We'll fix the OllamaClient health checks, enhance IPC status logging, and correct the fallback logic in useJarvisController.

## Tasks

- [x] 1. Build project and verify current behavior
  - Run `npm run build` to ensure project builds
  - Fix any build errors
  - Run `npm run dev` and test current Jarvis behavior
  - Document current logs in DevTools console
  - Verify Ollama is running with `ollama list`
  - _Requirements: All_

- [x] 2. Fix OllamaClient URL construction
  - [x] 2.1 Update constructor to remove trailing slash from baseUrl
    - In `src/core/ollamaClient.ts`, modify constructor
    - Add `this.baseUrl = baseUrl.replace(/\/$/, '');`
    - Ensure all URL constructions use `${this.baseUrl}/api/...` format
    - _Requirements: 4.5, 4.6_

  - [ ]* 2.2 Write property test for URL construction
    - **Property 1: URL Construction Correctness**
    - **Validates: Requirements 1.2, 2.1, 4.3, 4.4, 4.5, 4.6**
    - Generate random base URLs (with/without trailing slash)
    - Verify constructed URLs have no duplicate slashes
    - Verify URLs include protocol

- [x] 3. Enhance OllamaClient.isAvailable() logging
  - [x] 3.1 Add comprehensive logging to isAvailable()
    - Log the full URL being checked: `console.log('🔍 [Ollama] Checking availability at:', url);`
    - Log response details: status, ok, statusText
    - Log errors with type and message
    - Use emoji prefix 🔍 for all detection logs
    - _Requirements: 1.6, 1.7, 7.1, 7.2_

  - [ ]* 3.2 Write unit tests for isAvailable()
    - Test with mock HTTP 200 → returns true
    - Test with mock HTTP 500 → returns false
    - Test with network error → returns false
    - Test with timeout → returns false
    - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [x] 4. Enhance OllamaClient.listModels() logging
  - [x] 4.1 Add comprehensive logging to listModels()
    - Log the full URL being called
    - Log response status
    - Log model count and names: `console.log('🔍 [Ollama] Found models:', { count, names })`
    - Log errors and timeouts
    - _Requirements: 2.1, 2.2, 7.3_

  - [ ]* 4.2 Write property test for model detection
    - **Property 3: Model Detection Accuracy**
    - **Validates: Requirements 2.3, 2.4**
    - Generate random model lists (empty and non-empty)
    - Verify hasModels matches list.length > 0

- [x] 5. Enhance OllamaClient.getStatus() logging
  - [x] 5.1 Add comprehensive logging to getStatus()
    - Log when getStatus() is called
    - Log available result from isAvailable()
    - Log complete status object: `{ available, hasModels, modelCount }`
    - Log model names if available
    - _Requirements: 7.4_

  - [ ]* 5.2 Write unit tests for getStatus()
    - Test with server unavailable → returns available=false
    - Test with no models → returns hasModels=false
    - Test with models → returns hasModels=true, models array
    - _Requirements: 1.1, 2.3, 2.4_

- [x] 6. Checkpoint - Verify OllamaClient improvements
  - Run `npm run build`
  - Run `npm run dev`
  - Open DevTools console
  - Send Jarvis chat message
  - Verify logs show:
    - Full URLs being called
    - HTTP status codes
    - Model detection results
    - Status object details
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 7. Enhance IPC jarvis:chat handler logging
  - [x] 7.1 Add comprehensive logging at start of handler
    - Log when handler is called with message count
    - Log settings: `{ ollamaEnabled, endpoint, model }`
    - Log Ollama config being used
    - _Requirements: 3.6, 3.7, 7.5_

  - [x] 7.2 Add logging for status check results
    - Log "Checking Ollama status..." before getStatus()
    - Log complete status result: `{ available, hasModels, modelCount, modelNames }`
    - Log decision: "Ollama server not available" or "Ollama has no models" or "Using model: X"
    - _Requirements: 3.5, 7.5_

  - [x] 7.3 Add logging for chat request and response
    - Log before calling chatWithJarvis: `{ model, messageLength, historyCount, recCount }`
    - Log after response: `{ length, preview }`
    - Log errors with full details
    - _Requirements: 7.6_

  - [ ]* 7.4 Write unit tests for IPC handler
    - Test with ollamaEnabled=false → returns useFallback=true
    - Test with available=false → returns useFallback=true, correct message
    - Test with hasModels=false → returns useFallback=true, correct message
    - Test with available=true and hasModels=true → returns useFallback=false
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 8. Fix model selection logic in IPC handler
  - [x] 8.1 Add model validation and fallback selection
    - After getStatus(), check if configured model exists in status.models
    - Use `status.models.some(m => m.name === ollamaModel || m.name.startsWith(ollamaModel.split(':')[0]))`
    - If not found, use first available: `effectiveModel = status.models[0].name`
    - Log the model being used
    - _Requirements: 2.5, 2.6, 2.7, 2.8_

  - [ ]* 8.2 Write property test for model selection
    - **Property 4: Model Selection Logic**
    - **Validates: Requirements 2.5, 2.6, 2.7**
    - Generate random model lists and configured names
    - Verify correct model is selected

- [x] 9. Checkpoint - Verify IPC improvements
  - Run `npm run build`
  - Run `npm run dev`
  - Open DevTools console
  - Send Jarvis chat message
  - Verify logs show:
    - Settings loaded
    - Ollama config
    - Status check results with all details
    - Model selection decision
    - Chat request parameters
    - Response details
  - _Requirements: 3.5, 3.6, 3.7, 7.5, 7.6_

- [x] 10. Fix useJarvisController fallback logic
  - [x] 10.1 Update handleSend to properly handle useFallback flag
    - Add logging: `console.log('💬 [UI] Chat result:', { ok, useFallback, hasReply, hasError })`
    - When useFallback=false: Show AI reply, set status to idle, DO NOT call getJarvisReply()
    - When useFallback=true: Show error message if present, then call getJarvisReply() after 500ms
    - Add logging for each branch
    - _Requirements: 5.1, 5.4, 5.5, 5.6_

  - [ ]* 10.2 Write unit tests for handleSend fallback logic
    - Test with useFallback=false → AI reply shown, no fallback call
    - Test with useFallback=true → error shown, then fallback called
    - Test with ok=false → error shown
    - _Requirements: 5.1, 5.4, 5.5, 5.6_

- [x] 11. Verify error messages match requirements
  - [x] 11.1 Check IPC handler error messages
    - Verify unavailable message: "Ollama is not running. Start it with: ollama serve"
    - Verify no models message: "Ollama has no models installed. Install one with: ollama pull llama3"
    - Ensure messages match exactly
    - _Requirements: 5.2, 5.3_

  - [ ]* 11.2 Write property test for error messages
    - **Property 8: Fallback Message Accuracy**
    - **Validates: Requirements 5.2, 5.3**
    - Generate unavailable status → verify message contains "Ollama is not running"
    - Generate no-models status → verify message contains "No models installed"

- [x] 12. Test complete detection chain
  - [ ] 12.1 Test with Ollama running and models installed
    - Ensure Ollama is running: `ollama serve`
    - Ensure models installed: `ollama list`
    - Run `npm run dev`
    - Open Jarvis panel
    - Send chat message: "hello"
    - Verify AI response appears (not fallback)
    - Check DevTools logs for complete chain:
      - 💬 [UI] Sending chat message
      - 🔌 [IPC] jarvis:chat received
      - 🔌 [IPC] Settings loaded
      - 🔌 [IPC] Checking Ollama status
      - 🔍 [Ollama] Checking availability at: http://localhost:11434/api/tags
      - 🔍 [Ollama] Health check response: { status: 200, ok: true }
      - 🔍 [Ollama] Listing models
      - 🔍 [Ollama] Found models: { count: X, names: [...] }
      - 🔌 [IPC] Status check complete: { available: true, hasModels: true, modelCount: X }
      - 🔌 [IPC] Using model: llama3:latest
      - 🔌 [IPC] Calling Ollama chat
      - 🤖 [Ollama] chatWithJarvis called
      - 🤖 [Ollama] Response received
      - 🔌 [IPC] Ollama response received
      - 💬 [UI] Chat result: { ok: true, useFallback: false }
      - ✅ [UI] AI response received
    - _Requirements: 1.1, 1.3, 2.2, 2.3, 3.2, 5.1, 5.4_

  - [ ] 12.2 Test with Ollama not running
    - Stop Ollama: Close ollama serve
    - Send chat message: "hello"
    - Verify error message: "Ollama is not running. Start it with: ollama serve"
    - Verify fallback response: "I'm still learning to chat..."
    - Check DevTools logs:
      - 🔍 [Ollama] Health check failed
      - 🔌 [IPC] Ollama server not available
      - 🔌 [IPC] Returning fallback
      - 💬 [UI] Using fallback mode
    - _Requirements: 1.4, 3.3, 5.2, 5.6_

  - [ ] 12.3 Test with Ollama running but no models
    - Start Ollama: `ollama serve`
    - Remove all models (if possible) or use fresh Ollama install
    - Send chat message: "hello"
    - Verify error message: "Ollama has no models installed. Install one with: ollama pull llama3"
    - Verify fallback response appears
    - Check DevTools logs:
      - 🔍 [Ollama] Found models: { count: 0, names: [] }
      - 🔌 [IPC] Ollama has no models installed
      - 🔌 [IPC] Returning fallback
    - _Requirements: 2.4, 3.4, 5.3, 5.6_

  - [ ] 12.4 Test recovery after starting Ollama
    - Start with Ollama stopped
    - Send message → verify fallback
    - Start Ollama: `ollama serve`
    - Wait 30 seconds (cache expiration)
    - Send message → verify AI response
    - Verify no page refresh needed
    - _Requirements: 6.5, 8.1, 8.5_

- [ ] 13. Run automated tests
  - [ ] 13.1 Run unit tests
    - Run `npm test` or `npm run test:unit`
    - Verify all OllamaClient tests pass
    - Verify all IPC handler tests pass
    - Verify all useJarvisController tests pass
    - _Requirements: All_

  - [ ] 13.2 Run property-based tests
    - Run property tests for URL construction
    - Run property tests for model detection
    - Run property tests for model selection
    - Run property tests for error messages
    - Verify all tests pass with 100+ iterations
    - _Requirements: All_

- [ ] 14. Final verification and documentation
  - [ ] 14.1 Create test report
    - Document all test results
    - Include screenshots of logs
    - Include screenshots of UI behavior
    - Document any issues found
    - _Requirements: All_

  - [ ] 14.2 Update README or documentation
    - Document the fix
    - Explain the detection chain
    - Provide troubleshooting guide
    - Include example logs
    - _Requirements: All_

- [ ] 15. Final checkpoint - Complete verification
  - Run full test suite: `npm test`
  - Run build: `npm run build`
  - Manual testing checklist:
    - [ ] Ollama running + models → AI responses work
    - [ ] Ollama stopped → error message + fallback
    - [ ] Ollama running + no models → error message + fallback
    - [ ] Recovery works after starting Ollama (30 sec)
    - [ ] Logs show complete detection chain
    - [ ] URLs are correct (no duplicate slashes)
    - [ ] Model selection works correctly
    - [ ] Error messages match requirements
  - _Requirements: All_

## Notes

- Tasks marked with `*` are optional test tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Focus on logging first to enable debugging
- Test after each major change
- Use DevTools console extensively to verify logs
- The detection chain must work end-to-end: OllamaClient → IPC → useJarvisController → JarvisPanel
