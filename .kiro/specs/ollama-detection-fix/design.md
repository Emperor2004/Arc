# Design Document: Ollama Detection Fix

## Overview

This design addresses the systematic failure of Ollama detection in Arc Browser's Jarvis integration. The core issue is that the health check and model detection logic incorrectly reports Ollama as unavailable even when the server is running with models installed. This causes Jarvis to always use fallback responses instead of AI-powered chat.

The fix involves:
1. Correcting the health check endpoint and validation logic
2. Improving model detection to handle various model name formats
3. Ensuring IPC properly propagates real status to the renderer
4. Fixing fallback logic to only trigger when truly necessary
5. Adding comprehensive logging for debugging

## Architecture

### Component Interaction Flow

```
User sends chat message
    ↓
JarvisPanel (renderer)
    ↓
useJarvisController.handleSend()
    ↓
window.arc.jarvisChat(messages) [IPC]
    ↓
ipcMain.handle('jarvis:chat') [main process]
    ↓
getSettings() → check ollamaEnabled
    ↓
getOllamaClient(endpoint)
    ↓
ollamaClient.getStatus()
    ├─→ isAvailable() [HTTP GET /api/tags]
    └─→ listModels() [HTTP GET /api/tags]
    ↓
Decision: available && hasModels?
    ├─ YES → chatWithJarvis() [HTTP POST /api/chat]
    │         ↓
    │         Return { ok: true, reply: string, useFallback: false }
    │
    └─ NO → Return { ok: true, reply: errorMsg, useFallback: true }
    ↓
JarvisPanel receives result
    ├─ useFallback=false → Display AI reply
    └─ useFallback=true → Display error + call getJarvisReply()
```

### Key Components

1. **OllamaClient** (`src/core/ollamaClient.ts`)
   - Manages HTTP communication with Ollama server
   - Performs health checks and model detection
   - Provides status information

2. **IPC Handler** (`src/main/ipc.ts`)
   - Receives chat requests from renderer
   - Checks Ollama status before attempting chat
   - Returns structured response with useFallback flag

3. **useJarvisController** (`src/renderer/hooks/useJarvisController.ts`)
   - Manages chat UI state
   - Calls IPC for chat requests
   - Handles fallback logic based on response

4. **JarvisPanel** (`src/renderer/components/JarvisPanel.tsx`)
   - Displays chat messages and status
   - Shows appropriate UI based on status

## Components and Interfaces

### OllamaClient Enhancements

The `OllamaClient` class needs corrections to its health check and model detection:

```typescript
class OllamaClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = 'http://localhost:11434', timeout: number = 30000) {
    // Ensure baseUrl doesn't have trailing slash
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeout = timeout;
  }

  /**
   * Check if Ollama server is running
   * FIXED: Correct endpoint, better logging, proper error handling
   */
  async isAvailable(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/api/tags`;
      console.log('🔍 [Ollama] Checking availability at:', url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      
      console.log('🔍 [Ollama] Health check response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });
      
      return response.ok;
    } catch (error) {
      if (!isTestEnvironment()) {
        console.log('🔍 [Ollama] Health check failed:', {
          error: error instanceof Error ? error.message : String(error),
          type: error instanceof Error ? error.name : typeof error
        });
      }
      return false;
    }
  }

  /**
   * Get list of available models
   * FIXED: Better error handling, model name extraction
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const url = `${this.baseUrl}/api/tags`;
      console.log('🔍 [Ollama] Listing models at:', url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.log('🔍 [Ollama] List models failed:', {
          status: response.status,
          statusText: response.statusText
        });
        throw new Error(`Failed to list models: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      const models = data.models || [];
      
      console.log('🔍 [Ollama] Found models:', {
        count: models.length,
        names: models.map((m: OllamaModel) => m.name)
      });
      
      return models;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🔍 [Ollama] List models timed out');
        throw new Error('Request to Ollama timed out');
      }
      console.error('🔍 [Ollama] Error listing models:', error);
      throw error;
    }
  }

  /**
   * Get detailed Ollama status
   * FIXED: Better logging, clearer status reporting
   */
  async getStatus(): Promise<OllamaStatus> {
    console.log('🔍 [Ollama] Getting status...');
    
    const available = await this.isAvailable();
    console.log('🔍 [Ollama] Available:', available);
    
    if (!available) {
      return {
        available: false,
        hasModels: false,
        models: [],
        error: new OllamaError(
          'Ollama server is not running',
          OllamaErrorType.SERVER_NOT_RUNNING
        )
      };
    }
    
    try {
      const models = await this.listModels();
      const hasModels = models.length > 0;
      
      console.log('🔍 [Ollama] Status result:', {
        available: true,
        hasModels,
        modelCount: models.length
      });
      
      if (!hasModels) {
        return {
          available: true,
          hasModels: false,
          models: [],
          error: new OllamaError(
            'No models installed in Ollama',
            OllamaErrorType.NO_MODELS_INSTALLED
          )
        };
      }
      
      return {
        available: true,
        hasModels: true,
        models
      };
    } catch (error) {
      console.log('🔍 [Ollama] Status check error:', error);
      return {
        available: true,
        hasModels: false,
        models: [],
        error: new OllamaError(
          'Failed to check models',
          OllamaErrorType.UNKNOWN,
          error
        )
      };
    }
  }
}
```

### IPC Handler Enhancements

The `jarvis:chat` handler needs better status checking and logging:

```typescript
ipcMain.handle('jarvis:chat', async (_event, messages: Array<{from: string; text: string}>) => {
  try {
    console.log('🔌 [IPC] jarvis:chat received:', messages.length, 'messages');
    
    // Get settings
    const settings = await getSettings();
    console.log('🔌 [IPC] Settings loaded:', {
      ollamaEnabled: settings.ollamaEnabled,
      endpoint: settings.ollamaEndpoint || 'default',
      model: settings.ollamaModel || 'default'
    });
    
    if (!settings.ollamaEnabled) {
      console.log('🔌 [IPC] Ollama disabled in settings, using fallback');
      return {
        ok: true,
        reply: null,
        useFallback: true
      };
    }
    
    // Get Ollama configuration
    const ollamaEndpoint = settings.ollamaEndpoint || 'http://localhost:11434';
    const ollamaModel = settings.ollamaModel || 'llama3:latest';
    
    console.log('🔌 [IPC] Ollama config:', {
      endpoint: ollamaEndpoint,
      model: ollamaModel
    });
    
    // Get Ollama client
    const { getOllamaClient } = await import('../core/ollamaClient');
    const ollamaClient = getOllamaClient(ollamaEndpoint);
    
    // Check Ollama status
    console.log('🔌 [IPC] Checking Ollama status...');
    const status = await ollamaClient.getStatus();
    
    console.log('🔌 [IPC] Status check complete:', {
      available: status.available,
      hasModels: status.hasModels,
      modelCount: status.models.length,
      modelNames: status.models.map(m => m.name)
    });
    
    // Handle unavailable server
    if (!status.available) {
      console.log('🔌 [IPC] Ollama server not available');
      return {
        ok: true,
        reply: 'Ollama is not running. Start it with: ollama serve',
        useFallback: true
      };
    }
    
    // Handle no models
    if (!status.hasModels) {
      console.log('🔌 [IPC] Ollama has no models installed');
      return {
        ok: true,
        reply: 'Ollama has no models installed. Install one with: ollama pull llama3',
        useFallback: true
      };
    }
    
    // Validate model exists
    const modelExists = status.models.some(m => 
      m.name === ollamaModel || 
      m.name.startsWith(ollamaModel.split(':')[0])
    );
    
    let effectiveModel = ollamaModel;
    if (!modelExists) {
      console.log('🔌 [IPC] Configured model not found, using first available');
      effectiveModel = status.models[0].name;
    }
    
    console.log('🔌 [IPC] Using model:', effectiveModel);
    
    // Get context
    const recentHistory = await getRecentHistory(5);
    const recommendations = await getJarvisRecommendations(3);
    
    // Get user message
    const userMessage = messages[messages.length - 1]?.text || '';
    
    console.log('🔌 [IPC] Calling Ollama chat:', {
      model: effectiveModel,
      messageLength: userMessage.length,
      historyCount: recentHistory.length,
      recCount: recommendations.length
    });
    
    // Call Ollama
    const reply = await ollamaClient.chatWithJarvis(
      userMessage,
      {
        recentHistory: recentHistory.map(h => ({
          url: h.url,
          title: h.title || h.url
        })),
        recommendations: recommendations.map(r => ({
          url: r.url,
          title: r.title || r.url,
          reason: r.reason
        }))
      },
      effectiveModel
    );
    
    console.log('🔌 [IPC] Ollama response received:', {
      length: reply.length,
      preview: reply.substring(0, 100) + (reply.length > 100 ? '...' : '')
    });
    
    return {
      ok: true,
      reply,
      useFallback: false
    };
  } catch (err) {
    console.error('❌ [IPC] Error in jarvis:chat:', {
      error: err instanceof Error ? err.message : String(err),
      type: err instanceof Error ? err.name : typeof err,
      stack: err instanceof Error ? err.stack : undefined
    });
    
    // Handle OllamaError
    if (err && typeof err === 'object' && 'type' in err) {
      const ollamaError = err as any;
      console.log('🔌 [IPC] Returning OllamaError as fallback:', ollamaError.message);
      return {
        ok: true,
        reply: ollamaError.message,
        useFallback: true
      };
    }
    
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: errorMessage,
      useFallback: true
    };
  }
});
```

### useJarvisController Enhancements

The hook needs to properly handle the useFallback flag:

```typescript
const handleSend = async () => {
  if (!input.trim()) return;

  const userText = input.trim();
  const newMessages = [...messages, { from: 'user' as const, text: userText }];
  setMessages(newMessages);
  setInput('');
  
  // Reset textarea height
  const textarea = document.querySelector('.jarvis-panel textarea') as HTMLTextAreaElement;
  if (textarea) {
    textarea.style.height = 'auto';
  }

  setStatus('thinking');

  try {
    console.log('💬 [UI] Sending chat message:', userText.substring(0, 50) + '...');
    
    // Check if jarvisChat API is available
    if (window.arc && window.arc.jarvisChat) {
      console.log('💬 [UI] Using IPC jarvisChat API');
      
      const result = await window.arc.jarvisChat(newMessages);
      
      console.log('💬 [UI] Chat result:', {
        ok: result.ok,
        useFallback: result.useFallback,
        hasReply: !!result.reply,
        hasError: !!result.error
      });
      
      // Handle error response
      if (!result.ok) {
        console.error('❌ [UI] Chat request failed:', result.error);
        const errorMessage = result.error 
          ? `Error: ${result.error}`
          : 'Sorry, I encountered an error. Please try again.';
        
        setMessages(prev => [...prev, { 
          from: 'jarvis', 
          text: errorMessage
        }]);
        setStatus('error');
        return;
      }
      
      // Handle fallback mode
      if (result.useFallback) {
        console.log('💬 [UI] Using fallback mode');
        
        // Show error message if provided
        if (result.reply) {
          console.log('💬 [UI] Showing error message:', result.reply);
          setMessages(prev => [...prev, { from: 'jarvis', text: result.reply }]);
        }
        
        // Then provide fallback response
        setTimeout(async () => {
          console.log('💬 [UI] Getting fallback response');
          const fallbackReply = await getJarvisReply(userText);
          setMessages(prev => [...prev, { from: 'jarvis', text: fallbackReply.text }]);
          
          if (fallbackReply.action === 'refresh') {
            fetchRecommendations();
          } else {
            setStatus('idle');
          }
        }, 500);
      } else {
        // Success - show AI response
        console.log('✅ [UI] AI response received');
        setMessages(prev => [...prev, { from: 'jarvis', text: result.reply }]);
        setStatus('idle');
      }
    } else {
      console.warn('⚠️ [UI] jarvisChat API not available, using local fallback');
      
      // Fallback to local rule-based responses
      setTimeout(async () => {
        const reply = await getJarvisReply(userText);
        setMessages(prev => [...prev, { from: 'jarvis', text: reply.text }]);

        if (reply.action === 'refresh') {
          fetchRecommendations();
        } else {
          setStatus('idle');
        }
      }, 600);
    }
  } catch (error) {
    console.error('❌ [UI] Error in handleSend:', error);
    setMessages(prev => [...prev, { 
      from: 'jarvis', 
      text: 'Sorry, I encountered an unexpected error. Please try again.' 
    }]);
    setStatus('error');
  }
};
```

## Data Models

### OllamaStatus Interface

```typescript
interface OllamaStatus {
  available: boolean;      // Server is running and responsive
  hasModels: boolean;      // At least one model is installed
  models: OllamaModel[];   // List of installed models
  error?: OllamaError;     // Error if status check failed
}
```

### Chat Response Interface

```typescript
interface ChatResponse {
  ok: boolean;             // Request succeeded
  reply: string;           // AI response or error message
  useFallback: boolean;    // Should use fallback responses
  error?: string;          // Error message if ok=false
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: URL Construction Correctness
*For any* base URL and API path, the constructed URL should have the correct format with no duplicate slashes, include the protocol, and match the expected endpoint pattern.
**Validates: Requirements 1.2, 2.1, 4.3, 4.4, 4.5, 4.6**

### Property 2: Health Check Status Determination
*For any* HTTP response from a health check, if the response is OK (status 200), the system should mark Ollama as available; otherwise, it should mark it as unavailable.
**Validates: Requirements 1.3, 1.4**

### Property 3: Model Detection Accuracy
*For any* model list response, if the list contains at least one model, hasModels should be true; if the list is empty, hasModels should be false.
**Validates: Requirements 2.3, 2.4**

### Property 4: Model Selection Logic
*For any* model list and configured model name, if the configured model exists in the list, use it; otherwise, use the first available model; if no model is configured, default to the first available model.
**Validates: Requirements 2.5, 2.6, 2.7**

### Property 5: Model Name Format Acceptance
*For any* model name with version tag format (name:version), the system should accept and use it correctly.
**Validates: Requirements 2.8**

### Property 6: IPC Status Check Invocation
*For any* jarvis:chat IPC call, the system should invoke getStatus() before attempting to chat.
**Validates: Requirements 3.1**

### Property 7: AI Chat Conditional Execution
*For any* status result where available=true and hasModels=true, the system should proceed with chatWithJarvis(); for any other status, it should return useFallback=true.
**Validates: Requirements 3.2, 3.3, 3.4**

### Property 8: Fallback Message Accuracy
*For any* unavailable status, the error message should contain "Ollama is not running"; for any no-models status, the error message should contain "No models installed".
**Validates: Requirements 5.2, 5.3**

### Property 9: Fallback Triggering Correctness
*For any* successful Ollama response (available=true, hasModels=true), useFallback should be false and no fallback messages should be shown; for any failure, useFallback should be true.
**Validates: Requirements 5.1, 5.4, 5.5, 5.6**

### Property 10: Cache Behavior Consistency
*For any* status check result, the system should cache it for 30 seconds; within that time, subsequent checks should use the cached value without making HTTP requests; after expiration, the next check should make a new HTTP request.
**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 11: Automatic Recovery
*For any* status transition from unavailable to available or from no-models to has-models, the system should detect the change within 30 seconds (cache expiration) without requiring page refresh or app restart.
**Validates: Requirements 6.5, 8.1, 8.2, 8.3, 8.5**

### Property 12: Comprehensive Logging
*For any* health check, model query, status check, or chat request, the system should log the URL, request parameters, response status, and result with consistent emoji prefixes.
**Validates: Requirements 1.6, 1.7, 3.5, 3.6, 3.7, 4.7, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 8.4**

### Property 13: Settings Integration
*For any* settings configuration (endpoint, model, enabled flag), the system should use those values for all Ollama operations; when values are missing, it should use documented defaults.
**Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6**

### Property 14: Test Environment Behavior
*For any* test environment (NODE_ENV=test or VITEST=true), the system should skip real HTTP requests and suppress warning logs; in non-test environments, it should perform real checks.
**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

## Error Handling

### Network Errors

When network errors occur (connection refused, timeout, DNS failure):
1. Log the error with details
2. Mark Ollama as unavailable
3. Return appropriate error message to user
4. Cache the unavailable status for 30 seconds

### HTTP Errors

When HTTP errors occur (404, 500, etc.):
1. Log the status code and response
2. For 404 on /api/chat: return "Model not found" error
3. For other errors: return generic "Ollama error" message
4. Mark as unavailable or no-models depending on error

### Timeout Handling

When requests timeout:
1. Abort the request using AbortController
2. Log the timeout
3. Mark as unavailable
4. Return timeout error message

### Error Recovery

The system automatically recovers from errors:
1. Cache expires after 30 seconds
2. Next chat request triggers new status check
3. If Ollama is now available, chat proceeds normally
4. No user action required

## Testing Strategy

### Unit Tests

Unit tests will verify specific behaviors and edge cases:

1. **URL Construction Tests**
   - Test with various base URLs (with/without trailing slash)
   - Test with various paths
   - Verify no duplicate slashes
   - Verify protocol is present

2. **Health Check Tests**
   - Test with mock HTTP 200 response → available=true
   - Test with mock HTTP 500 response → available=false
   - Test with network error → available=false
   - Test with timeout → available=false

3. **Model Detection Tests**
   - Test with empty model list → hasModels=false
   - Test with non-empty model list → hasModels=true
   - Test model name extraction

4. **Model Selection Tests**
   - Test with configured model in list → uses configured
   - Test with configured model not in list → uses first
   - Test with no configured model → uses first

5. **IPC Handler Tests**
   - Test with ollamaEnabled=false → useFallback=true
   - Test with available=false → useFallback=true
   - Test with hasModels=false → useFallback=true
   - Test with available=true and hasModels=true → useFallback=false

6. **Fallback Logic Tests**
   - Test useFallback=false → no getJarvisReply() call
   - Test useFallback=true → getJarvisReply() called

### Property-Based Tests

Property-based tests will verify universal properties across many inputs:

1. **Property 1: URL Construction** (100+ iterations)
   - Generate random base URLs and paths
   - Verify constructed URLs are valid
   - Verify no duplicate slashes
   - Verify protocol present

2. **Property 3: Model Detection** (100+ iterations)
   - Generate random model lists (empty and non-empty)
   - Verify hasModels matches list.length > 0

3. **Property 4: Model Selection** (100+ iterations)
   - Generate random model lists and configured names
   - Verify selection logic is correct

4. **Property 9: Fallback Triggering** (100+ iterations)
   - Generate random status results
   - Verify useFallback matches status

5. **Property 10: Cache Behavior** (100+ iterations)
   - Generate random cache states and timestamps
   - Verify cache hit/miss logic

### Integration Tests

Integration tests will verify end-to-end flows:

1. **Complete Chat Flow with Ollama Available**
   - Start mock Ollama server
   - Send chat message
   - Verify AI response received
   - Verify no fallback messages

2. **Complete Chat Flow with Ollama Unavailable**
   - Stop mock Ollama server
   - Send chat message
   - Verify error message shown
   - Verify fallback response shown

3. **Recovery Flow**
   - Start with Ollama unavailable
   - Send message → get fallback
   - Start Ollama
   - Wait 30 seconds (cache expiration)
   - Send message → get AI response

4. **Model Selection Flow**
   - Configure specific model
   - Verify that model is used
   - Configure non-existent model
   - Verify first available model is used

### Manual Testing Checklist

1. Start Ollama with llama3 model
2. Send chat message → verify AI response
3. Stop Ollama
4. Send chat message → verify error + fallback
5. Start Ollama again
6. Wait 30 seconds
7. Send chat message → verify AI response
8. Check DevTools console for logs at each step
9. Verify logs show correct URLs, status, and model names

## Implementation Notes

### Critical Fixes

1. **URL Construction**: Ensure baseUrl doesn't have trailing slash, then append paths with leading slash
2. **Health Check**: Use /api/tags endpoint (not /api/health which doesn't exist)
3. **Status Logging**: Log complete status object including available, hasModels, modelCount
4. **Model Selection**: Handle model names with version tags (e.g., "llama3:8b")
5. **Fallback Logic**: Only trigger when useFallback=true, not on every response

### Performance Considerations

1. **Timeout Values**: 2 seconds for health checks, 5 seconds for model listing, 30 seconds for chat
2. **Cache Duration**: 30 seconds to balance responsiveness and API load
3. **Abort Controllers**: Always use AbortController to prevent hanging requests

### Security Considerations

1. **URL Validation**: Validate endpoint URLs before using them
2. **Error Messages**: Don't expose internal errors to users
3. **Test Environment**: Disable real HTTP requests in tests to prevent external calls

## Dependencies

- `node-fetch` or native `fetch` for HTTP requests
- `AbortController` for request timeouts
- Electron IPC for renderer-main communication
- Settings store for configuration
- History and recommendation stores for context

## Migration Path

This is a bug fix, not a breaking change. No migration needed.

Existing code will continue to work, but with corrected behavior:
- Health checks will succeed when Ollama is running
- Model detection will find installed models
- Fallback will only trigger when truly necessary
- Logs will provide better debugging information

## Future Enhancements

1. **Status Indicator**: Add visual indicator in JarvisPanel showing Ollama status (Online/Offline/Loading)
2. **Model Selector**: Allow users to switch models without going to settings
3. **Retry Logic**: Automatically retry failed requests with exponential backoff
4. **Health Check Interval**: Periodically check Ollama status in background
5. **Model Download**: Integrate ollama pull command to download models from UI
