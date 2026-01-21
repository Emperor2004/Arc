# Design Document: Jarvis Diagnostics and Fix

## Overview

This design provides a systematic approach to diagnosing and fixing runtime issues with Jarvis, Ollama integration, cookie management, and recommendations. The approach follows a methodical diagnostic process: build verification → configuration inspection → code path tracing → targeted fixes → verification.

## Architecture

### Diagnostic Flow

```
Build Verification
    ↓
Configuration Inspection (Settings, Ollama status)
    ↓
Code Path Tracing (Add logging at each layer)
    ↓
Component Isolation Testing
    ↓
Targeted Fixes
    ↓
Integration Verification
```

### Key Components

1. **OllamaClient** (`src/core/ollamaClient.ts`)
   - Handles communication with Ollama HTTP API
   - Provides model listing, status checking, and chat functionality
   - Already has error handling with OllamaError types

2. **Jarvis IPC Handler** (`src/main/ipc.ts` - `jarvis:chat`)
   - Receives chat messages from renderer
   - Checks Ollama status and model availability
   - Calls OllamaClient.chatWithJarvis()
   - Returns responses or fallback indicators

3. **useJarvisController** (`src/renderer/hooks/useJarvisController.ts`)
   - Manages Jarvis UI state
   - Sends chat messages via IPC
   - Handles responses and fallback logic

4. **Recommender** (`src/core/recommender.ts`)
   - Generates recommendations from history
   - Uses historyStoreMain to query SQLite
   - Applies scoring and filtering logic

5. **HistoryStore** (`src/core/historyStoreMain.ts`)
   - Records page visits in SQLite
   - Provides query methods for recent history

6. **Cookie Manager** (`src/main/ipc.ts` - cookie handlers)
   - Manages cookies via Electron session API
   - Provides get, clear, and clear-by-URL operations

## Components and Interfaces

### Diagnostic Logging Interface

```typescript
interface DiagnosticLog {
  layer: 'UI' | 'IPC' | 'Core' | 'Storage';
  component: string;
  action: string;
  data?: any;
  timestamp: number;
}
```

### Model Selection Flow

```
Settings UI
    ↓ (ollamaModel setting)
IPC Handler (jarvis:chat)
    ↓ (reads settings.ollamaModel)
OllamaClient.chatWithJarvis(model)
    ↓ (uses model parameter)
Ollama HTTP API (/api/chat with model field)
```

### Cookie Clearing Flow

```
Settings UI (handleClearCookies)
    ↓ (window.arc.clearCookies())
Preload (ipcRenderer.invoke('arc:clearCookies'))
    ↓
IPC Handler (arc:clearCookies)
    ↓
clearAllCookies() helper
    ↓ (session.cookies.get() → session.cookies.remove())
Electron Session API
```

### Recommendations Flow

```
Page Load Event
    ↓ (did-finish-load in webview)
IPC Handler (arc:pageLoaded)
    ↓
historyStoreMain.addHistoryEntry()
    ↓
SQLite INSERT/UPDATE
    
---

JarvisPanel (fetchRecommendations)
    ↓ (window.arc.getJarvisRecommendations())
IPC Handler (jarvis:getRecommendations)
    ↓
recommender.getJarvisRecommendations()
    ↓
historyStoreMain.getRecentHistory()
    ↓
SQLite SELECT
    ↓
Scoring & Filtering
    ↓
Return recommendations array
```

## Data Models

### Ollama Status

```typescript
interface OllamaStatus {
  available: boolean;      // Server is running
  hasModels: boolean;      // At least one model installed
  models: OllamaModel[];   // List of installed models
  error?: OllamaError;     // Error if any
}
```

### Settings (Relevant Fields)

```typescript
interface ArcSettings {
  ollamaEnabled: boolean;
  ollamaEndpoint: string;  // e.g., "http://localhost:11434"
  ollamaModel: string;     // e.g., "llama3:latest" or "mistral"
  jarvisEnabled: boolean;
  useHistoryForRecommendations: boolean;
}
```

### Cookie Result

```typescript
interface ClearCookiesResult {
  ok: boolean;
  cleared: number;
  error?: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Model Name Propagation
*For any* selected model in settings, when Jarvis sends a chat request, the Ollama API request should contain that exact model name.
**Validates: Requirements 1.3, 1.5**

### Property 2: Cookie URL Construction
*For any* cookie with a secure flag, the removal URL should use "https://" protocol; for cookies without secure flag, it should use "http://".
**Validates: Requirements 3.3**

### Property 3: History Recording Completeness
*For any* non-incognito page load event, a corresponding entry should exist in the SQLite history table after the event completes.
**Validates: Requirements 5.3, 5.4**

### Property 4: Recommendations Non-Empty
*For any* history database with at least 3 distinct domains, getJarvisRecommendations() should return at least 1 recommendation.
**Validates: Requirements 4.3**

### Property 5: Error Message Clarity
*For any* Ollama error type (SERVER_NOT_RUNNING, NO_MODELS_INSTALLED, MODEL_NOT_FOUND), the error message should include actionable instructions.
**Validates: Requirements 2.1, 2.2, 2.3**

### Property 6: Cookie Clearing Verification
*For any* successful clearCookies() call, a subsequent getCookies() call should return an empty array.
**Validates: Requirements 3.6**

### Property 7: Logging Completeness
*For any* Jarvis chat request, logs should appear at UI layer, IPC layer, and Core layer.
**Validates: Requirements 2.7, 5.5**

## Error Handling

### Ollama Connection Errors

**Detection:**
- OllamaClient.isAvailable() returns false
- Fetch to `/api/tags` fails with network error

**Handling:**
- Return OllamaError with type SERVER_NOT_RUNNING
- Display message: "Ollama is not running. Start it with: ollama serve"
- Set useFallback: true in IPC response

### Missing Models Error

**Detection:**
- OllamaClient.listModels() returns empty array
- OllamaClient.hasModels() returns false

**Handling:**
- Return OllamaError with type NO_MODELS_INSTALLED
- Display message: "No models installed. Install one with: ollama pull llama3"
- Set useFallback: true in IPC response

### Model Not Found Error

**Detection:**
- Ollama API returns 404 status
- Model name in request doesn't match installed models

**Handling:**
- Return OllamaError with type MODEL_NOT_FOUND
- Display message: "Model '{name}' not found. Available models: {list}"
- Suggest checking with: ollama list

### Cookie Clearing Errors

**Detection:**
- session.cookies.remove() throws exception
- Invalid URL format in clearCookiesForUrl()

**Handling:**
- Log error with details
- Return { ok: false, cleared: 0, error: message }
- Display user-friendly error in Settings UI

### Empty Recommendations

**Detection:**
- historyStoreMain.getRecentHistory() returns empty array
- recommender.getJarvisRecommendations() returns empty array

**Handling:**
- Display message: "Browse some sites to get recommendations"
- Log: "No history found, returning empty recommendations"
- Do not treat as error (expected state for new users)

## Testing Strategy

### Diagnostic Testing Approach

1. **Build Verification**
   - Run `npm run build`
   - Fix any TypeScript errors
   - Verify dist folder contains compiled output

2. **Configuration Inspection**
   - Check settings.json for ollamaModel value
   - Verify Ollama is running: `curl http://localhost:11434/api/tags`
   - List installed models: `ollama list`

3. **Component Isolation**
   - Test OllamaClient directly with known model
   - Test historyStore queries in isolation
   - Test cookie operations with test cookies

4. **Integration Testing**
   - Test complete chat flow with logging
   - Test complete recommendations flow with logging
   - Test cookie clearing with verification

### Unit Tests

- Test OllamaClient.getStatus() with various server states
- Test cookie URL construction with secure/non-secure cookies
- Test recommender with empty/populated history
- Test error message formatting for each error type

### Property-Based Tests

- Property 1: Model name propagation (generate random model names)
- Property 2: Cookie URL construction (generate random cookies)
- Property 3: History recording (generate random page loads)
- Property 4: Recommendations non-empty (generate random history)

### Manual Verification

1. **Jarvis Chat with Ollama**
   - Start Ollama: `ollama serve`
   - Ensure model installed: `ollama pull llama3`
   - Open Arc, send Jarvis message
   - Verify AI response (not fallback)
   - Check console logs at each layer

2. **Jarvis Chat without Ollama**
   - Stop Ollama
   - Send Jarvis message
   - Verify error message: "Ollama is not running..."
   - Verify fallback response appears

3. **Cookie Clearing**
   - Visit site that sets cookies (e.g., login page)
   - Open DevTools → Application → Cookies
   - Note cookie count
   - Open Settings → Clear cookies
   - Verify success message with count
   - Check DevTools → Cookies are gone

4. **Recommendations**
   - Clear history and feedback
   - Browse 5-10 different sites
   - Open Jarvis panel
   - Verify recommendation cards appear
   - Verify reasons mention actual sites visited

## Diagnostic Implementation Plan

### Phase 1: Build and Configuration

1. Run `npm run build` and fix any errors
2. Check `data/settings.json` for:
   - `ollamaEnabled`: should be true
   - `ollamaModel`: should be "llama3" or "mistral" or "llama3:latest"
   - `ollamaEndpoint`: should be "http://localhost:11434"
3. Verify Ollama status:
   - Run: `curl http://localhost:11434/api/tags`
   - Should return JSON with models array
4. List installed models:
   - Run: `ollama list`
   - Should show llama3, mistral, or other models

### Phase 2: Add Diagnostic Logging

Add temporary logging at each layer:

**UI Layer (useJarvisController.ts):**
```typescript
console.log('🎨 [UI] Sending chat message:', userText);
console.log('🎨 [UI] Chat result:', result);
```

**IPC Layer (ipc.ts):**
```typescript
console.log('🔌 [IPC] jarvis:chat received');
console.log('🔌 [IPC] Settings:', { ollamaEnabled, ollamaEndpoint, ollamaModel });
console.log('🔌 [IPC] Ollama status:', status);
console.log('🔌 [IPC] Sending to Ollama with model:', ollamaModel);
```

**Core Layer (ollamaClient.ts):**
```typescript
console.log('🤖 [Ollama] chatWithJarvis called with model:', model);
console.log('🤖 [Ollama] Request body:', { model, messages: messages.length });
console.log('🤖 [Ollama] Response received:', reply.length, 'chars');
```

**Storage Layer (historyStoreMain.ts):**
```typescript
console.log('💾 [History] addHistoryEntry:', url);
console.log('💾 [History] getRecentHistory returned:', entries.length, 'entries');
```

### Phase 3: Targeted Fixes

Based on diagnostic findings, apply fixes:

**Fix 1: Model Selection**
- Ensure settings.ollamaModel is read correctly
- Verify model name is passed to chatWithJarvis()
- Check for model name mismatches (e.g., "llama3" vs "llama3:latest")

**Fix 2: Cookie URL Construction**
- Verify constructCookieUrl() uses correct protocol
- Handle cookies with missing domain gracefully
- Log each cookie removal attempt

**Fix 3: History Recording**
- Verify page-loaded event fires for all tabs
- Check that incognito tabs are correctly filtered
- Ensure SQLite INSERT succeeds

**Fix 4: Recommendations Generation**
- Verify getRecentHistory() returns data
- Check recommender scoring logic
- Ensure recommendations array is returned to UI

### Phase 4: Verification

1. Run `npm run build` again
2. Test each fixed component manually
3. Verify logs show expected flow
4. Remove temporary diagnostic logging
5. Run existing test suite

## Implementation Notes

### Minimal Side Effects

- Use `console.log()` for temporary logging (easy to remove)
- Do not modify function signatures
- Do not change existing logic unless fixing a bug
- Test after each fix to catch regressions

### Common Issues and Solutions

**Issue: Model name mismatch**
- Symptom: 404 error from Ollama
- Solution: Check exact model name with `ollama list`, update settings or use full name (e.g., "llama3:latest")

**Issue: Cookies not clearing**
- Symptom: Cookies still present after clear
- Solution: Verify URL construction includes protocol, check session is correct

**Issue: No recommendations**
- Symptom: Empty array returned
- Solution: Check history has entries, verify recommender logic, check scoring thresholds

**Issue: Jarvis always uses fallback**
- Symptom: Never gets AI responses
- Solution: Check ollamaEnabled setting, verify Ollama is running, check model availability

### Logging Conventions

- 🎨 UI layer
- 🔌 IPC layer
- 🤖 Ollama/Core layer
- 💾 Storage layer
- ✅ Success
- ❌ Error
- ⚠️ Warning
- 💡 Info

## Dependencies

- Electron session API for cookie management
- SQLite (via better-sqlite3) for history storage
- Ollama HTTP API for AI chat
- React hooks for UI state management

## Performance Considerations

- Cookie operations are synchronous and fast
- History queries use indexed SQLite tables
- Ollama requests have 30-second timeout
- Recommendations are cached for 5 minutes

## Security Considerations

- Cookie operations respect session isolation (normal vs incognito)
- Ollama runs locally (no data sent to external servers)
- History is stored locally in SQLite
- Settings are stored in local JSON file
