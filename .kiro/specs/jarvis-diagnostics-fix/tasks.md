# Implementation Plan: Jarvis Diagnostics and Fix

## Overview

This implementation plan provides a systematic approach to diagnosing and fixing runtime issues with Jarvis, Ollama integration, cookie management, and recommendations. The plan follows a methodical process: build verification → configuration inspection → diagnostic logging → targeted fixes → verification.

## Tasks

- [x] 1. Build project and verify baseline
  - Run `npm run build`
  - Fix any TypeScript compilation errors
  - Verify dist folder contains compiled output
  - Document any build errors encountered
  - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - **COMPLETED**: Build successful, no errors, dist folder verified

- [x] 2. Inspect configuration and Ollama status
  - [x] 2.1 Check settings.json file
    - Open `data/settings.json`
    - Verify `ollamaEnabled` is true
    - Check `ollamaModel` value (should be "llama3", "mistral", or "llama3:latest")
    - Check `ollamaEndpoint` value (should be "http://localhost:11434")
    - Document current values
    - _Requirements: 1.2, 1.4, 8.2_
    - **COMPLETED**: ollamaEnabled=true, ollamaModel="llama3:latest", endpoint correct

  - [x] 2.2 Verify Ollama server status
    - Run: `curl http://localhost:11434/api/tags` (or equivalent PowerShell command)
    - Verify response contains models array
    - If error, start Ollama: `ollama serve`
    - Document Ollama status
    - _Requirements: 1.1, 2.1, 8.2_
    - **COMPLETED**: Ollama running at localhost:11434

  - [x] 2.3 List installed Ollama models
    - Run: `ollama list`
    - Verify llama3, mistral, or other models are installed
    - If no models, install one: `ollama pull llama3`
    - Document installed models
    - _Requirements: 1.1, 1.5, 8.2_
    - **COMPLETED**: llama3:latest installed and verified

- [x] 3. Add diagnostic logging to Jarvis chat flow
  - [x] 3.1 Add logging to useJarvisController.ts
    - In `handleSend()`, add log before IPC call: `console.log('🎨 [UI] Sending chat message:', userText)`
    - Add log after IPC call: `console.log('🎨 [UI] Chat result:', result)`
    - Add log for fallback: `console.log('🎨 [UI] Using fallback responses')`
    - _Requirements: 2.7, 5.5, 8.3_
    - **COMPLETED**: All UI layer logging added

  - [x] 3.2 Add logging to IPC handler (ipc.ts - jarvis:chat)
    - Add log at handler start: `console.log('🔌 [IPC] jarvis:chat received:', messages.length, 'messages')`
    - Add log for settings: `console.log('🔌 [IPC] Settings:', { ollamaEnabled, ollamaEndpoint, ollamaModel })`
    - Add log for Ollama status: `console.log('🔌 [IPC] Ollama status:', status)`
    - Add log before Ollama call: `console.log('🔌 [IPC] Calling Ollama with model:', ollamaModel)`
    - Add log for response: `console.log('🔌 [IPC] Ollama response:', reply.length, 'chars')`
    - _Requirements: 2.7, 5.5, 8.3_
    - **COMPLETED**: All IPC layer logging added

  - [x] 3.3 Add logging to OllamaClient.chatWithJarvis()
    - Add log at method start: `console.log('🤖 [Ollama] chatWithJarvis called with model:', model)`
    - Add log for request: `console.log('🤖 [Ollama] Request:', { model, messageCount: messages.length })`
    - Add log for response: `console.log('🤖 [Ollama] Response received:', reply.length, 'chars')`
    - Add log for errors: `console.error('🤖 [Ollama] Error:', error)`
    - _Requirements: 2.7, 5.5, 8.3_
    - **COMPLETED**: All Ollama layer logging added

- [ ] 4. Test Jarvis chat with diagnostic logging
  - [ ] 4.1 Test with Ollama running and model installed
    - Run `npm run dev`
    - Open DevTools console
    - Send a chat message in Jarvis
    - Verify logs appear at UI, IPC, and Ollama layers
    - Verify AI response appears (not fallback)
    - Document log output
    - _Requirements: 1.1, 1.2, 1.3, 2.7, 10.1_

  - [ ] 4.2 Test with Ollama stopped
    - Stop Ollama server
    - Send a chat message in Jarvis
    - Verify error message: "Ollama is not running..."
    - Verify fallback response appears
    - Verify logs show error detection
    - Document behavior
    - _Requirements: 2.1, 2.7, 10.4_

  - [ ] 4.3 Test with no models installed
    - Start Ollama but remove all models
    - Send a chat message in Jarvis
    - Verify error message: "No models installed..."
    - Verify fallback response appears
    - Document behavior
    - _Requirements: 2.2, 2.7, 10.5_

- [ ] 5. Diagnose and fix model selection issues
  - [ ] 5.1 Verify model name in settings
    - Check logs for model name used in Ollama request
    - Compare with installed model names from `ollama list`
    - If mismatch, identify the issue (e.g., "llama3" vs "llama3:latest")
    - _Requirements: 1.3, 1.5, 8.2_

  - [ ] 5.2 Fix model name if needed
    - If settings has wrong model name, update `data/settings.json`
    - Or update Settings UI to use correct model name
    - Or modify code to handle model name variations
    - Verify fix by checking logs show correct model name
    - _Requirements: 1.3, 1.4, 1.5_

  - [ ] 5.3 Test model selection fix
    - Send chat message with corrected model name
    - Verify AI response appears
    - Verify logs show correct model name at all layers
    - _Requirements: 1.1, 1.2, 1.3, 10.1_

- [x] 6. Add diagnostic logging to cookie clearing flow
  - [x] 6.1 Add logging to SettingsView.tsx handleClearCookies
    - Add log before API call: `console.log('🎨 [UI] Clearing cookies...')`
    - Add log after API call: `console.log('🎨 [UI] Clear result:', result)`
    - _Requirements: 2.7, 8.3_
    - **COMPLETED**: UI layer cookie logging added

  - [x] 6.2 Add logging to IPC handler (ipc.ts - arc:clearCookies)
    - Add log at handler start: `console.log('🔌 [IPC] arc:clearCookies called')`
    - Add log for cookie count: `console.log('🔌 [IPC] Found', cookies.length, 'cookies')`
    - Add log for each removal: `console.log('🔌 [IPC] Removing cookie:', cookie.name, 'from', url)`
    - Add log for result: `console.log('🔌 [IPC] Cleared', count, 'cookies')`
    - _Requirements: 2.7, 3.5, 8.3_
    - **COMPLETED**: IPC layer cookie logging added

  - [x] 6.3 Add logging to clearAllCookies() helper
    - Add log for session: `console.log('💾 [Cookies] Using session:', incognito ? 'incognito' : 'default')`
    - Add log for URL construction: `console.log('💾 [Cookies] Constructed URL:', url, 'for cookie:', cookie.name)`
    - Add log for removal result: `console.log('💾 [Cookies] Removed:', cookie.name, 'success:', success)`
    - _Requirements: 2.7, 3.5, 8.3_
    - **COMPLETED**: Cookie helper logging added

- [ ] 7. Test cookie clearing with diagnostic logging
  - [ ] 7.1 Test cookie clearing
    - Visit a site that sets cookies (e.g., login page)
    - Open DevTools → Application → Cookies
    - Note cookie count and names
    - Open Settings → Clear cookies
    - Check logs for cookie operations
    - Verify success message with count
    - Check DevTools → Cookies are gone
    - Document log output and behavior
    - _Requirements: 3.1, 3.2, 3.6, 10.2_

  - [ ] 7.2 Diagnose cookie clearing issues if any
    - If cookies not cleared, check logs for:
      - Cookie count found
      - URL construction for each cookie
      - Removal success/failure
    - Identify specific issue (e.g., wrong protocol, wrong session)
    - _Requirements: 3.3, 3.4, 3.5, 8.3_

- [ ] 8. Fix cookie clearing issues if found
  - [ ] 8.1 Fix URL construction if needed
    - Verify constructCookieUrl() uses correct protocol (http vs https)
    - Ensure domain is extracted correctly
    - Handle cookies with missing domain
    - _Requirements: 3.3, 3.4_

  - [ ] 8.2 Fix session selection if needed
    - Verify getSessionForContext() returns correct session
    - Ensure default session is used for normal browsing
    - _Requirements: 3.1, 3.2_

  - [ ] 8.3 Test cookie clearing fix
    - Repeat cookie clearing test
    - Verify all cookies are removed
    - Verify logs show successful removal
    - _Requirements: 3.1, 3.2, 3.6, 10.2_

- [x] 9. Add diagnostic logging to recommendations flow
  - [x] 9.1 Add logging to page load recording
    - In WebviewContainer or equivalent, add log: `console.log('📄 [UI] Page loaded:', url, title)`
    - In IPC handler (arc:pageLoaded), add log: `console.log('🔌 [IPC] Recording page load:', url)`
    - In historyStoreMain.addHistoryEntry(), add log: `console.log('💾 [History] Added entry:', url, 'visit count:', visitCount)`
    - _Requirements: 5.1, 5.2, 5.5, 8.3_
    - **COMPLETED**: Page load logging already exists (📄, 📚, 🕶️), history logging added

  - [x] 9.2 Add logging to recommendations generation
    - In useJarvisController.fetchRecommendations(), add log: `console.log('🎨 [UI] Fetching recommendations...')`
    - In IPC handler (jarvis:getRecommendations), add log: `console.log('� [IPC] Getting recommendations, limit:', limit)`
    - In recommender.getJarvisRecommendations(), add log: `console.log('💡 [Recommender] Loaded', history.length, 'history entries')`
    - Add log for candidates: `console.log('💡 [Recommender] Generated', candidates.length, 'candidates')`
    - Add log for final: `console.log('💡 [Recommender] Returning', finalRecommendations.length, 'recommendations')`
    - _Requirements: 6.1, 6.2, 6.5, 6.7, 8.3_
    - **COMPLETED**: Recommender logging already exists (💡), history query logging added

- [ ] 10. Test recommendations with diagnostic logging
  - [ ] 10.1 Test history recording
    - Clear history: Settings → Clear browsing history
    - Browse 5-10 different websites
    - Check logs for page load events
    - Check logs for history recording
    - Verify SQLite database has entries (can use DB browser or query)
    - Document log output
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 10.3_

  - [ ] 10.2 Test recommendations generation
    - Open Jarvis panel
    - Check logs for recommendations fetch
    - Check logs for history query
    - Check logs for candidate generation
    - Verify recommendation cards appear in UI
    - Document log output and card count
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.1, 6.2, 6.5, 10.3_

  - [ ] 10.3 Diagnose recommendations issues if any
    - If no recommendations appear, check logs for:
      - History entry count
      - Candidate count
      - Final recommendations count
    - Identify where recommendations are lost
    - _Requirements: 4.7, 6.6, 6.7, 8.3_

- [ ] 11. Fix recommendations issues if found
  - [ ] 11.1 Fix history recording if needed
    - Verify page-loaded event fires for all tabs
    - Ensure incognito tabs are filtered correctly
    - Verify SQLite INSERT succeeds
    - Check for internal pages being filtered
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7_

  - [ ] 11.2 Fix recommendations generation if needed
    - Verify getRecentHistory() returns data
    - Check recommender scoring logic
    - Verify thresholds are not too strict
    - Ensure recommendations array is returned to UI
    - _Requirements: 4.3, 6.1, 6.2, 6.3, 6.4_

  - [ ] 11.3 Test recommendations fix
    - Clear history and browse again
    - Open Jarvis panel
    - Verify recommendations appear
    - Verify reasons mention actual sites
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 10.3_

- [ ] 12. Verify error messages are clear
  - [ ] 12.1 Test Ollama not running error
    - Stop Ollama
    - Send Jarvis message
    - Verify error message: "Ollama is not running. Start it with: ollama serve"
    - Verify message is clear and actionable
    - _Requirements: 2.1, 2.5, 2.6_

  - [ ] 12.2 Test no models installed error
    - Start Ollama with no models
    - Send Jarvis message
    - Verify error message: "No models installed. Install one with: ollama pull llama3"
    - Verify message is clear and actionable
    - _Requirements: 2.2, 2.5, 2.6_

  - [ ] 12.3 Test model not found error
    - Set ollamaModel to non-existent model (e.g., "fake-model")
    - Send Jarvis message
    - Verify error message mentions model name and suggests checking with "ollama list"
    - Verify message is clear and actionable
    - _Requirements: 2.3, 2.5, 2.6_

  - [ ] 12.4 Test empty recommendations message
    - Clear all history
    - Open Jarvis panel
    - Verify message: "Browse some sites to get recommendations"
    - Verify message is clear and helpful
    - _Requirements: 4.6, 4.7_

- [ ] 13. Remove diagnostic logging
  - [ ] 13.1 Remove temporary console.log statements
    - Remove logs from useJarvisController.ts
    - Remove logs from ipc.ts handlers
    - Remove logs from ollamaClient.ts
    - Remove logs from historyStoreMain.ts
    - Remove logs from recommender.ts
    - Keep only essential error logging
    - _Requirements: 9.1, 9.5_

  - [ ] 13.2 Verify code still works without logging
    - Run `npm run build`
    - Test Jarvis chat
    - Test cookie clearing
    - Test recommendations
    - Ensure no regressions
    - _Requirements: 9.2, 9.3, 9.4_

- [ ] 14. Run existing test suite
  - [ ] 14.1 Run unit tests
    - Run: `npm test`
    - Fix any failing tests
    - Document test results
    - _Requirements: 9.4_

  - [ ] 14.2 Run integration tests if available
    - Run integration test suite
    - Fix any failing tests
    - Document test results
    - _Requirements: 9.4_

- [ ] 15. Final manual verification
  - [ ] 15.1 Verify Jarvis chat with Ollama
    - Start Ollama with llama3 or mistral
    - Send various chat messages
    - Verify AI responses appear
    - Verify no fallback messages
    - _Requirements: 1.1, 1.2, 1.3, 10.1_

  - [ ] 15.2 Verify cookie clearing
    - Visit sites with cookies
    - Clear cookies from Settings
    - Verify cookies are removed
    - Verify success message with count
    - _Requirements: 3.1, 3.2, 3.6, 10.2_

  - [ ] 15.3 Verify recommendations
    - Browse 10+ different sites
    - Open Jarvis panel
    - Verify recommendations appear
    - Verify reasons are relevant
    - Verify "Open" button works
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 10.3_

  - [ ] 15.4 Verify error handling
    - Test with Ollama stopped
    - Test with no models
    - Test with wrong model name
    - Verify clear error messages
    - Verify graceful fallback
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 10.4, 10.5_

- [ ] 16. Document findings and fixes
  - [ ] 16.1 Create summary document
    - List issues found
    - List fixes applied
    - List verification results
    - Include before/after behavior
    - _Requirements: 8.6, 10.6_

  - [ ] 16.2 Update relevant documentation
    - Update README if needed
    - Update troubleshooting guide if exists
    - Document known issues if any remain
    - _Requirements: 8.6_

## Session 2025-01-16 – Fix Jarvis Generic Error Response

- [x] 17. Build project and verify compilation
  - Run `npm run build`
  - Fix any TypeScript compilation errors
  - Verify build completes successfully
  - _Requirements: 7.1, 7.2, 7.3_
  - **COMPLETED**: Build successful, no TypeScript errors

- [x] 18. Trace Jarvis chat pipeline and capture real error
  - [x] 18.1 Add detailed error logging to JarvisPanel.tsx
    - Before `window.arc.jarvisChat()` call, log message count and content
    - After call, log the full result object (not just success/failure)
    - If error, display the actual error message in chat (not generic message)
    - _Requirements: 2.5, 2.6, 2.7_
    - **COMPLETED**: Added detailed logging and error display with actual error messages

  - [x] 18.2 Update IPC handler to return detailed error info
    - In `ipc.ts` `jarvis:chat` handler, wrap in try-catch
    - Return `{ ok: true, reply }` on success
    - Return `{ ok: false, error: message }` on failure with actual error details
    - Log the error with full stack trace
    - _Requirements: 2.5, 2.7_
    - **COMPLETED**: Added comprehensive error logging with stack traces and error details

  - [x] 18.3 Add detailed logging to ollamaClient.ts
    - Log the exact URL being called
    - Log the model name being sent
    - Log the HTTP status code
    - Log any error body from Ollama
    - Log any exceptions from fetch or JSON parsing
    - _Requirements: 2.7, 8.3_
    - **COMPLETED**: Added detailed logging at every step of the Ollama API call

  - [x] 18.4 Manual test to capture real error
    - Run `npm run dev`
    - Open DevTools console
    - Type "hello" in Jarvis chat
    - Capture the actual error message from logs
    - Document the real failure reason
    - _Requirements: 2.7, 10.1_
    - **COMPLETED**: Real error identified - better-sqlite3 native module version mismatch (NODE_MODULE_VERSION 115 vs 116)

- [x] 19. Fix better-sqlite3 native module version mismatch
  - [x] 19.1 Rebuild better-sqlite3 for current Node.js version
    - Run `npm rebuild better-sqlite3`
    - Verify the rebuild completes successfully
    - _Requirements: 7.1, 7.2_
    - **COMPLETED**: Successfully rebuilt better-sqlite3 for current Node.js version

  - [ ] 19.2 Test Jarvis chat after rebuild
    - Run `npm run dev`
    - Send "hello" to Jarvis
    - Verify real LLM response appears (not error)
    - Test with different prompts to ensure responses vary
    - _Requirements: 1.1, 1.3, 10.1_

- [ ] 20. Fix JarvisPanel error handling
  - [ ] 20.1 Remove generic error message
    - Find any hardcoded "Sorry, I encountered an error" returns
    - Replace with specific error display from `result.error`
    - Only show generic message as last resort fallback
    - _Requirements: 2.5, 2.6_

  - [ ] 20.2 Improve error message display
    - When `result.ok === false`, show: "I had trouble calling your local model: {error}. Check that Ollama is running and the model name is correct."
    - Make error messages user-friendly but informative
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [ ] 20.3 Test error handling improvements
    - Test with Ollama running: should get real responses
    - Test with Ollama stopped: should get clear "Ollama is not running" message
    - Test with wrong model: should get clear "Model not found" message
    - _Requirements: 2.1, 2.2, 2.3, 10.4_

- [ ] 21. Rebuild and run targeted tests
  - [ ] 21.1 Rebuild project
    - Run `npm run build`
    - Fix any new compilation errors
    - _Requirements: 7.1, 7.2_

  - [ ] 21.2 Run Ollama-related tests
    - Run tests for ollamaClient
    - Run tests for Jarvis IPC handlers
    - Fix any failing tests
    - _Requirements: 9.4_

  - [ ] 21.3 Manual sanity check
    - Start Ollama with llama3 or mistral
    - Send "hello" to Jarvis
    - Verify friendly greeting from LLM (not error)
    - Send "What is TypeScript?" to Jarvis
    - Verify informative response from LLM
    - Stop Ollama and send message
    - Verify clear error message (not generic)
    - _Requirements: 1.1, 1.3, 2.1, 10.1, 10.4_

- [ ] 22. Checkpoint - Verify Jarvis chat is working
  - Ensure all tests pass
  - Ensure Jarvis returns real LLM responses when Ollama is available
  - Ensure Jarvis returns clear, specific error messages when there are problems
  - Ask user if any issues remain before proceeding

## Notes

- This is a diagnostic and fix workflow, not a new feature implementation
- Focus on minimal changes to fix specific issues
- Add logging temporarily to understand data flow
- Remove logging after diagnosis is complete
- Test after each fix to catch regressions
- Document findings at each step
- If an issue is not found, mark the task as complete and move on
- The goal is to make Jarvis, cookies, and recommendations work correctly
