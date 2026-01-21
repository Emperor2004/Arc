# Implementation Plan: Jarvis Integration Fix

## Overview

This implementation fixes the complete Jarvis integration chain: chat messages will call Ollama via IPC, recommendations will use actual SQLite history, and the "Open" button will properly navigate to URLs.

## Tasks

- [x] 1. Build project and fix any build errors
  - Run `npm run build`
  - Fix any TypeScript or build errors
  - Verify build completes successfully
  - _Requirements: All_

- [x] 2. Add jarvis:chat IPC handler to main process
  - [x] 2.1 Add `jarvis:chat` handler to `setupIpc` function in `src/main/ipc.ts`
    - Accept messages array as parameter
    - Get settings to check if Ollama is enabled
    - If disabled, return `useFallback: true`
    - Get Ollama endpoint and model from settings
    - Create OllamaClient with endpoint
    - Check Ollama status (available, hasModels)
    - If not available or no models, return error message with `useFallback: true`
    - Get recent history (5 entries) and recommendations (3 entries) for context
    - Extract last user message from messages array
    - Call `ollamaClient.chatWithJarvis()` with message and context
    - Return `{ ok: true, reply: string, useFallback: false }` on success
    - Catch OllamaError and return appropriate error message with `useFallback: true`
    - Add comprehensive logging with emoji prefixes at each step
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 4.4, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4_

  - [ ]* 2.2 Write unit tests for jarvis:chat handler
    - Test with Ollama enabled and available
    - Test with Ollama disabled
    - Test with Ollama not running
    - Test with no models installed
    - Test error handling
    - _Requirements: 1.1, 1.2, 1.6, 4.4_

- [x] 3. Fix arc:navigate IPC handler
  - [x] 3.1 Update `arc:navigate` handler in `src/main/ipc.ts`
    - Uncomment the handler code
    - Normalize URL (prepend https:// if no protocol)
    - Get BrowserWindow from event.sender
    - Send 'navigate-to' event to window.webContents with URL
    - Add error handling if window not found
    - Add logging with emoji prefixes
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.6, 5.3_

  - [ ]* 3.2 Write unit tests for arc:navigate handler
    - Test with valid URL
    - Test with URL missing protocol
    - Test with empty URL
    - Test error handling
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Add jarvisChat to preload script
  - [x] 4.1 Add `jarvisChat` method to `contextBridge.exposeInMainWorld` in `src/main/preload.ts`
    - Accept messages array parameter
    - Call `ipcRenderer.invoke('jarvis:chat', messages)`
    - Return promise with result
    - _Requirements: 4.1, 4.4_

  - [ ]* 4.2 Write unit tests for preload jarvisChat
    - Test IPC invocation
    - Test parameter passing
    - _Requirements: 4.1, 4.4_

- [x] 5. Update useJarvisController to use IPC for chat
  - [x] 5.1 Replace `handleSend` function in `src/renderer/hooks/useJarvisController.ts`
    - Remove direct Ollama client usage
    - Check if `window.arc.jarvisChat` exists
    - If exists, call `window.arc.jarvisChat(newMessages)`
    - Handle response: if `useFallback` is true, show error message then fallback
    - If `useFallback` is false, show AI reply
    - If API not available, use local fallback
    - Add comprehensive logging with emoji prefixes
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 4.1, 4.4, 5.1, 5.2_

  - [x] 5.2 Remove `getOllamaReply` function and `ollamaState` management
    - Delete `getOllamaReply` function (no longer needed)
    - Delete `ollamaState` useState and related code
    - Delete `isCacheValid` helper function
    - Clean up imports
    - _Requirements: 1.1_

  - [ ]* 5.3 Write unit tests for updated handleSend
    - Test with IPC available and Ollama working
    - Test with IPC available but Ollama unavailable
    - Test with IPC not available (fallback)
    - Test error handling
    - _Requirements: 1.1, 1.2, 1.6, 4.1_

- [x] 6. Checkpoint - Test chat functionality
  - Build project: `npm run build`
  - Run application: `npm run dev`
  - Ensure Ollama is running with a model installed
  - Send a chat message in Jarvis
  - Verify AI response appears (not fallback)
  - Check DevTools console for logs at each layer
  - Stop Ollama and send another message
  - Verify error message + fallback response
  - _Requirements: 1.1, 1.2, 1.6, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7. Add navigation event listener in renderer
  - [x] 7.1 Add navigation listener in `src/renderer/App.tsx` (or main app component)
    - In useEffect, check if `window.arc.onNavigation` exists
    - Register listener with `window.arc.onNavigation(handleNavigation)`
    - In handler, find active tab
    - Update tab's URL and set isLoading to true
    - Add logging with emoji prefixes
    - _Requirements: 3.1, 3.2, 4.6, 5.3_

  - [ ]* 7.2 Write unit tests for navigation listener
    - Test listener registration
    - Test tab URL update on navigation event
    - Test with no active tab
    - _Requirements: 3.1, 3.2_

- [x] 8. Verify handleOpen in useJarvisController
  - [x] 8.1 Review `handleOpen` function in `src/renderer/hooks/useJarvisController.ts`
    - Ensure it calls `window.arc.navigate(url)` if no onNavigate prop
    - Ensure it calls `onNavigate(url)` if prop is provided
    - Verify URL is passed correctly
    - Add logging
    - _Requirements: 3.1, 3.2, 4.3_

  - [ ]* 8.2 Write unit tests for handleOpen
    - Test with onNavigate prop
    - Test without onNavigate prop (uses window.arc.navigate)
    - Test with empty URL
    - _Requirements: 3.1, 3.2_

- [x] 9. Checkpoint - Test navigation functionality
  - Build project: `npm run build`
  - Run application: `npm run dev`
  - Browse several websites to populate history
  - Open Jarvis panel
  - Verify recommendations appear
  - Click "Open" on a recommendation
  - Verify the URL loads in the current tab
  - Check DevTools console for navigation logs
  - _Requirements: 3.1, 3.2, 3.5, 5.3_

- [x] 10. Verify history recording in WebviewContainer
  - [x] 10.1 Review `did-finish-load` event handler in webview component
    - Ensure handler calls `window.arc.pageLoaded()` with correct payload
    - Verify payload includes url, title, tabId, incognito
    - Ensure incognito tabs are marked correctly
    - Add logging with emoji prefixes
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 5.3_

  - [ ]* 10.2 Write unit tests for history recording
    - Test page load triggers pageLoaded IPC
    - Test incognito tabs skip history
    - Test internal pages skip history
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [x] 11. Verify recommendations use SQLite history
  - [x] 11.1 Review `getJarvisRecommendations` in `src/core/recommender.ts`
    - Confirm it calls `getRecentHistory()` from historyStoreMain
    - Confirm it queries SQLite database
    - Verify it returns empty array when no history
    - Add logging to show how many history entries loaded
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.3_

  - [ ]* 11.2 Write unit tests for recommendations with real history
    - Test with empty history returns empty state
    - Test with history generates recommendations
    - Test recommendations include actual URLs from history
    - _Requirements: 2.1, 2.2, 2.5_

- [x] 12. Add comprehensive logging throughout
  - [x] 12.1 Add logs to IPC handlers
    - Log when handlers are invoked
    - Log parameters received
    - Log results returned
    - Use emoji prefixes: 🤖 for chat, 🔗 for navigate, 💡 for recommendations
    - _Requirements: 5.2, 5.3, 5.4, 5.7_

  - [x] 12.2 Add logs to useJarvisController
    - Log when sending messages
    - Log IPC responses
    - Log fallback usage
    - Use emoji prefixes: 💬 for messages, ✅ for success, ❌ for errors
    - _Requirements: 5.1, 5.2, 5.6, 5.7_

  - [x] 12.3 Add logs to navigation flow
    - Log when navigate is called
    - Log when navigation event is received
    - Log tab updates
    - Use emoji prefixes: 🔗 for navigate, 📍 for events
    - _Requirements: 5.3, 5.7_

  - [x] 12.4 Add logs to history recording
    - Log when page loads
    - Log when history is recorded
    - Log when incognito skips recording
    - Use emoji prefixes: 📄 for page loads, 📚 for history
    - _Requirements: 5.3, 5.7_

- [ ] 13. Final integration testing
  - [ ] 13.1 Test complete chat flow
    - Start Ollama with llama3 model
    - Send various chat messages
    - Verify AI responses
    - Check logs at each layer (UI → Preload → IPC → Ollama)
    - Stop Ollama
    - Send message and verify fallback
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
    - **STATUS**: Ready for manual testing

  - [ ] 13.2 Test complete recommendation flow
    - Clear history and feedback
    - Browse 10 different websites
    - Open Jarvis panel
    - Verify recommendations based on actual browsing
    - Verify reasons mention actual sites
    - Check logs for history query
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.3_
    - **STATUS**: Ready for manual testing

  - [ ] 13.3 Test complete navigation flow
    - Get recommendations
    - Click "Open" on each recommendation
    - Verify each URL loads correctly
    - Verify URLs without protocol work
    - Check logs for navigation events
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.3_
    - **STATUS**: Ready for manual testing

  - [ ] 13.4 Test error recovery
    - Test with Ollama not running
    - Test with no models installed
    - Test with invalid model name
    - Verify graceful fallback in all cases
    - Verify clear error messages
    - _Requirements: 9.1, 9.2, 9.3, 9.6_
    - **STATUS**: Ready for manual testing

  - [ ] 13.5 Test UI state management
    - Verify "thinking" status during requests
    - Verify "error" status on failures
    - Verify "idle" status after completion
    - Verify loading indicators for recommendations
    - Verify empty state messages
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
    - **STATUS**: Ready for manual testing

- [ ] 14. Final checkpoint - Ensure all functionality works
  - Run full test suite: `npm test`
  - Run build: `npm run build`
  - Manual testing checklist:
    - [ ] Chat with Ollama returns AI responses
    - [ ] Chat without Ollama returns fallback
    - [ ] Recommendations based on real history
    - [ ] "Open" button navigates to URLs
    - [ ] History is recorded on page loads
    - [ ] Logs appear at all layers
    - [ ] Error messages are clear and actionable
  - _Requirements: All_

## Notes

- Tasks marked with `*` are optional test tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Focus on one task at a time
- Test after each major change
- Use DevTools console to verify logs at each layer

