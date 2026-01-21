# Design Document: Settings Propagation and Model Validation

## Overview

This design addresses two critical issues in the Arc Browser: (1) slow settings propagation causing UI lag when users change settings, and (2) Jarvis attempting to use non-installed Ollama models without proper validation or fallback. The solution implements event-driven settings updates with React Context and adds intelligent model validation with automatic fallback selection.

## Architecture

### Current Architecture Problems

**Settings Flow (Current - Problematic):**
```
SettingsView → updateSetting() → IPC → settingsStoreMain → disk write
                                                                ↓
SettingsView → (no notification) → must poll or re-fetch manually
```

**Model Selection (Current - Problematic):**
```
Settings: ollamaModel = "llama2"
         ↓
IPC Handler → ollamaClient.chatWithJarvis(model: "llama2")
         ↓
Ollama API → 404 Model Not Found
         ↓
Error → Fallback message (treats as "Ollama offline")
```

### Proposed Architecture

**Settings Flow (New - Event-Driven):**
```
SettingsView → updateSetting() → IPC → settingsStoreMain → disk write (debounced)
                                              ↓
                                        Broadcast 'settings:updated' event
                                              ↓
                                        All renderer windows
                                              ↓
                                        SettingsContext updates
                                              ↓
                                        All consumers re-render immediately
```

**Model Selection (New - Validated):**
```
Settings: ollamaModel = "llama2"
         ↓
IPC Handler → Validate model against installed models
         ↓
Model not found → Select fallback (llama3 → mistral → first available)
         ↓
ollamaClient.chatWithJarvis(model: "llama3")
         ↓
Success → Return response + notification about model substitution
```

## Components and Interfaces

### 1. Settings Store (Main Process)

**File:** `src/core/settingsStoreMain.ts`

**Current Implementation:**
- Reads/writes settings to SQLite database
- No event emission on updates
- Synchronous in-memory operations

**Required Changes:**
```typescript
import { BrowserWindow } from 'electron';

// Add event emission after settings update
export async function updateSettings(
  updates: Partial<ArcSettings>
): Promise<ArcSettings> {
  // Update in-memory state immediately
  const newSettings = { ...currentSettings, ...updates };
  currentSettings = newSettings;
  
  // Broadcast to all renderer windows immediately
  BrowserWindow.getAllWindows().forEach(window => {
    window.webContents.send('settings:updated', newSettings);
  });
  
  // Debounce disk write (500ms)
  debouncedDiskWrite(newSettings);
  
  return newSettings;
}
```

### 2. Preload Script

**File:** `src/main/preload.ts`

**Required Changes:**
```typescript
contextBridge.exposeInMainWorld('arc', {
  // ... existing methods ...
  
  // Add settings subscription
  onSettingsUpdated: (callback: (settings: ArcSettings) => void) => {
    const handler = (_event: any, settings: ArcSettings) => callback(settings);
    ipcRenderer.on('settings:updated', handler);
    
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener('settings:updated', handler);
    };
  },
});
```

### 3. Settings Context (Renderer)

**New File:** `src/renderer/contexts/SettingsContext.tsx`

```typescript
interface SettingsContextValue {
  settings: ArcSettings;
  loading: boolean;
  updateSettings: (updates: Partial<ArcSettings>) => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ArcSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Load initial settings
    window.arc.getSettings().then(s => {
      setSettings(s);
      setLoading(false);
    });
    
    // Subscribe to updates
    const unsubscribe = window.arc.onSettingsUpdated((newSettings) => {
      console.log('📥 [SettingsContext] Received settings update');
      setSettings(newSettings);
    });
    
    return unsubscribe;
  }, []);
  
  const updateSettings = async (updates: Partial<ArcSettings>) => {
    // Optimistic update
    setSettings(prev => ({ ...prev, ...updates }));
    
    // Persist to main process
    await window.arc.updateSettings(updates);
  };
  
  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};
```

### 4. Ollama Client Model Validation

**File:** `src/core/ollamaClient.ts`

**Required Changes:**
```typescript
export class OllamaClient {
  private modelCache: {
    models: string[];
    timestamp: number;
  } | null = null;
  
  private readonly MODEL_CACHE_TTL = 60000; // 60 seconds
  
  /**
   * Get list of installed model names (cached)
   */
  async getInstalledModels(): Promise<string[]> {
    const now = Date.now();
    
    // Return cached if still valid
    if (this.modelCache && (now - this.modelCache.timestamp) < this.MODEL_CACHE_TTL) {
      return this.modelCache.models;
    }
    
    try {
      const models = await this.listModels();
      const modelNames = models.map(m => m.name);
      
      this.modelCache = {
        models: modelNames,
        timestamp: now
      };
      
      return modelNames;
    } catch (error) {
      console.error('⚠️ [Ollama] Failed to get installed models:', error);
      return [];
    }
  }
  
  /**
   * Validate model and select fallback if needed
   */
  async validateAndSelectModel(configuredModel: string): Promise<{
    model: string;
    isFallback: boolean;
    reason?: string;
  }> {
    console.log('🔍 [Ollama] Validating model:', configuredModel);
    
    const installedModels = await this.getInstalledModels();
    console.log('🔍 [Ollama] Installed models:', installedModels);
    
    if (installedModels.length === 0) {
      throw new OllamaError(
        'No models installed. Install one with: ollama pull llama3',
        OllamaErrorType.NO_MODELS_INSTALLED
      );
    }
    
    // Check if configured model exists (exact match or prefix match)
    const modelExists = installedModels.some(m => 
      m === configuredModel || 
      m.startsWith(configuredModel.split(':')[0])
    );
    
    if (modelExists) {
      console.log('✅ [Ollama] Using configured model:', configuredModel);
      return {
        model: configuredModel,
        isFallback: false
      };
    }
    
    // Select fallback model
    const fallbackPriority = ['llama3', 'llama3:latest', 'mistral', 'mistral:latest'];
    
    for (const fallback of fallbackPriority) {
      const found = installedModels.find(m => 
        m === fallback || m.startsWith(fallback.split(':')[0])
      );
      if (found) {
        console.log('🔄 [Ollama] Fallback to model:', found);
        return {
          model: found,
          isFallback: true,
          reason: `Model '${configuredModel}' not installed, using '${found}' instead`
        };
      }
    }
    
    // Use first available model as last resort
    const firstModel = installedModels[0];
    console.log('🔄 [Ollama] Fallback to first available model:', firstModel);
    return {
      model: firstModel,
      isFallback: true,
      reason: `Model '${configuredModel}' not installed, using '${firstModel}' instead`
    };
  }
  
  /**
   * Chat with automatic model validation
   */
  async chatWithJarvis(
    userMessage: string,
    context: {
      recentHistory?: Array<{ url: string; title: string }>;
      recommendations?: Array<{ url: string; title: string; reason: string }>;
    },
    configuredModel: string = 'llama3:latest'
  ): Promise<{ reply: string; usedModel: string; fallbackNotice?: string }> {
    console.log('🤖 [Ollama] chatWithJarvis called with configured model:', configuredModel);
    
    // Validate and select model
    const { model, isFallback, reason } = await this.validateAndSelectModel(configuredModel);
    
    // Build messages
    const systemPrompt = `You are Jarvis, an AI assistant integrated into the Arc Browser...`;
    const messages: OllamaChatMessage[] = [
      { role: 'system', content: systemPrompt },
      // ... add context ...
      { role: 'user', content: userMessage }
    ];
    
    console.log('📤 [Ollama] Sending request to Ollama with model:', model);
    
    // Send request
    const reply = await this.chat({
      model,
      messages,
      options: { temperature: 0.8 }
    });
    
    console.log('📥 [Ollama] Received response:', reply.length, 'characters');
    
    return {
      reply,
      usedModel: model,
      fallbackNotice: isFallback ? reason : undefined
    };
  }
}
```

### 5. IPC Handler Updates

**File:** `src/main/ipc.ts`

**Required Changes:**
```typescript
ipcMain.handle('jarvis:chat', async (_event, messages: Array<{from: string; text: string}>) => {
  try {
    console.log('🔌 [IPC] jarvis:chat received');
    
    const settings = await getSettings();
    
    if (!settings.ollamaEnabled) {
      return { ok: true, reply: null, useFallback: true };
    }
    
    const ollamaEndpoint = settings.ollamaEndpoint || 'http://localhost:11434';
    const configuredModel = settings.ollamaModel || 'llama3:latest';
    
    console.log('🔌 [IPC] Settings:', { endpoint: ollamaEndpoint, model: configuredModel });
    
    const { getOllamaClient } = await import('../core/ollamaClient');
    const ollamaClient = getOllamaClient(ollamaEndpoint);
    
    // Check if Ollama is available
    const available = await ollamaClient.isAvailable();
    if (!available) {
      return {
        ok: true,
        reply: 'Ollama is not running. Start it with: ollama serve',
        useFallback: true
      };
    }
    
    // Get context
    const recentHistory = await getRecentHistory(5);
    const recommendations = await getJarvisRecommendations(3);
    const userMessage = messages[messages.length - 1]?.text || '';
    
    // Call with automatic model validation
    const result = await ollamaClient.chatWithJarvis(
      userMessage,
      {
        recentHistory: recentHistory.map(h => ({ url: h.url, title: h.title || h.url })),
        recommendations: recommendations.map(r => ({ url: r.url, title: r.title || r.url, reason: r.reason }))
      },
      configuredModel
    );
    
    console.log('🔌 [IPC] Chat result:', {
      usedModel: result.usedModel,
      hasFallbackNotice: !!result.fallbackNotice
    });
    
    // Prepend fallback notice to reply if present
    let finalReply = result.reply;
    if (result.fallbackNotice) {
      finalReply = `ℹ️ ${result.fallbackNotice}\n\n${result.reply}`;
    }
    
    return {
      ok: true,
      reply: finalReply,
      usedModel: result.usedModel,
      useFallback: false
    };
  } catch (err) {
    console.error('❌ [IPC] Error in jarvis:chat:', err);
    
    if (err && typeof err === 'object' && 'type' in err) {
      const ollamaError = err as any;
      return {
        ok: true,
        reply: ollamaError.message,
        useFallback: true
      };
    }
    
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      useFallback: true
    };
  }
});
```

### 6. Settings UI Model Dropdown

**File:** `src/renderer/components/SettingsView.tsx`

**Required Changes:**
```typescript
const [availableModels, setAvailableModels] = useState<string[]>([]);
const [loadingModels, setLoadingModels] = useState(false);

// Load available models when settings panel opens
useEffect(() => {
  if (settings.ollamaEnabled) {
    loadAvailableModels();
  }
}, [settings.ollamaEnabled]);

const loadAvailableModels = async () => {
  setLoadingModels(true);
  try {
    // Call IPC to get installed models
    const result = await window.arc.getOllamaModels();
    if (result.ok) {
      setAvailableModels(result.models);
    }
  } catch (error) {
    console.error('Failed to load Ollama models:', error);
  } finally {
    setLoadingModels(false);
  }
};

// In JSX:
<div className="settings-item">
  <label className="settings-label">
    <span>Ollama Model</span>
    <select
      value={settings.ollamaModel}
      onChange={(e) => handleUpdateSetting('ollamaModel', e.target.value)}
      disabled={!settings.ollamaEnabled || loadingModels}
    >
      {loadingModels && <option>Loading models...</option>}
      {!loadingModels && availableModels.length === 0 && (
        <option>No models installed</option>
      )}
      {availableModels.map(model => (
        <option key={model} value={model}>{model}</option>
      ))}
    </select>
  </label>
  {!loadingModels && availableModels.length === 0 && (
    <p className="settings-hint">
      Install a model with: <code>ollama pull llama3</code>
    </p>
  )}
</div>
```

## Data Models

### Settings Update Event

```typescript
interface SettingsUpdateEvent {
  type: 'settings:updated';
  payload: ArcSettings;
}
```

### Model Validation Result

```typescript
interface ModelValidationResult {
  model: string;           // The model to use
  isFallback: boolean;     // Whether this is a fallback model
  reason?: string;         // Explanation if fallback was used
}
```

### Chat Response

```typescript
interface ChatResponse {
  ok: boolean;
  reply?: string;
  usedModel?: string;
  useFallback: boolean;
  error?: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Settings Update Immediacy

*For any* settings change initiated by the user, the in-memory state SHALL be updated within 100 milliseconds, and all subscribed components SHALL receive the update within one React render cycle (16ms).

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Settings Event Broadcast

*For any* settings update in the main process, a 'settings:updated' event SHALL be emitted to all renderer windows before the function returns.

**Validates: Requirements 2.1, 2.4**

### Property 3: Settings Context Synchronization

*For any* 'settings:updated' event received by a renderer, the SettingsContext SHALL update its state and trigger re-renders of all consuming components.

**Validates: Requirements 3.2, 3.3**

### Property 4: Model Cache Validity

*For any* request to get installed models, if the cache is less than 60 seconds old, the cached value SHALL be returned without making an API call.

**Validates: Requirements 5.2, 5.3**

### Property 5: Model Validation Before Use

*For any* chat request, the system SHALL validate that the configured model exists in the installed models list before attempting to use it.

**Validates: Requirements 6.1, 6.5**

### Property 6: Fallback Model Selection

*For any* configured model that is not installed, the system SHALL select a fallback model from the installed models in priority order (llama3 → mistral → first available).

**Validates: Requirements 7.1, 7.2**

### Property 7: No Invalid Model Requests

*For any* chat request sent to Ollama, the model parameter SHALL be a model that exists in the installed models list.

**Validates: Requirements 6.2, 6.3, 6.5**

### Property 8: Fallback Notification

*For any* chat response where a fallback model was used, the response SHALL include a one-time notification explaining the model substitution.

**Validates: Requirements 7.3, 7.4**

### Property 9: Settings Disk Write Debouncing

*For any* sequence of settings updates within 500ms, only one disk write SHALL occur, but all in-memory updates and event broadcasts SHALL happen immediately.

**Validates: Requirements 10.1, 10.2, 10.3**

### Property 10: Jarvis Settings Immediate Effect

*For any* change to jarvisEnabled or jarvisModel settings, the next Jarvis operation SHALL use the new values without requiring a page refresh.

**Validates: Requirements 4.1, 4.2, 4.3**

## Error Handling

### Settings Propagation Errors

1. **IPC Communication Failure:**
   - Log error with context
   - Keep local state optimistic
   - Retry on next user interaction

2. **Disk Write Failure:**
   - Log error with full details
   - Keep in-memory state valid
   - Show user notification if critical

3. **Event Subscription Failure:**
   - Log error
   - Fall back to polling (degraded mode)
   - Attempt to re-subscribe on next mount

### Model Validation Errors

1. **Ollama Unreachable:**
   - Return empty model list
   - Show clear error in UI
   - Provide instructions to start Ollama

2. **No Models Installed:**
   - Throw OllamaError with NO_MODELS_INSTALLED type
   - Show installation instructions
   - Suggest: `ollama pull llama3`

3. **Model List API Failure:**
   - Log error with details
   - Return cached list if available
   - Fall back to configured model (may fail later)

4. **All Fallback Models Missing:**
   - Use first available model
   - Log warning
   - Notify user of unexpected model

## Testing Strategy

### Unit Tests

**Settings Propagation:**
- Test settings store emits events on update
- Test preload exposes subscription API
- Test SettingsContext updates on events
- Test debounced disk writes
- Test optimistic updates

**Model Validation:**
- Test model cache TTL behavior
- Test exact model name matching
- Test prefix model name matching (e.g., "llama3" matches "llama3:latest")
- Test fallback priority order
- Test empty model list handling
- Test model validation with various installed models

### Property-Based Tests

Each property test must run minimum 100 iterations and reference its design property.

**Property 1: Settings Update Immediacy**
```typescript
// Feature: settings-propagation-and-model-validation, Property 1
test('settings updates complete within 100ms', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.record({
        jarvisEnabled: fc.boolean(),
        ollamaModel: fc.constantFrom('llama3', 'mistral', 'llama2'),
        theme: fc.constantFrom('light', 'dark', 'system')
      }),
      async (updates) => {
        const start = Date.now();
        await updateSettings(updates);
        const elapsed = Date.now() - start;
        expect(elapsed).toBeLessThan(100);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 6: Fallback Model Selection**
```typescript
// Feature: settings-propagation-and-model-validation, Property 6
test('fallback model selection follows priority', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.array(fc.constantFrom('llama3', 'mistral', 'codellama', 'phi'), { minLength: 1 }),
      fc.string(),
      async (installedModels, configuredModel) => {
        // Mock installed models
        mockInstalledModels(installedModels);
        
        const result = await validateAndSelectModel(configuredModel);
        
        if (installedModels.includes(configuredModel)) {
          expect(result.isFallback).toBe(false);
          expect(result.model).toBe(configuredModel);
        } else {
          expect(result.isFallback).toBe(true);
          // Should prefer llama3, then mistral, then first available
          if (installedModels.includes('llama3')) {
            expect(result.model).toBe('llama3');
          } else if (installedModels.includes('mistral')) {
            expect(result.model).toBe('mistral');
          } else {
            expect(result.model).toBe(installedModels[0]);
          }
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 7: No Invalid Model Requests**
```typescript
// Feature: settings-propagation-and-model-validation, Property 7
test('never sends invalid model to Ollama', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.array(fc.constantFrom('llama3', 'mistral', 'codellama'), { minLength: 1 }),
      fc.string(),
      fc.string(),
      async (installedModels, configuredModel, userMessage) => {
        mockInstalledModels(installedModels);
        
        const chatSpy = jest.spyOn(ollamaClient, 'chat');
        
        await ollamaClient.chatWithJarvis(userMessage, {}, configuredModel);
        
        const usedModel = chatSpy.mock.calls[0][0].model;
        expect(installedModels).toContain(usedModel);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Tests

1. **End-to-End Settings Flow:**
   - User changes setting in UI
   - Verify immediate UI update
   - Verify IPC call made
   - Verify event broadcast
   - Verify other components update

2. **End-to-End Model Validation:**
   - Configure invalid model
   - Send chat message
   - Verify fallback model used
   - Verify response includes notice
   - Verify no errors logged

3. **Settings Persistence:**
   - Change multiple settings rapidly
   - Verify only one disk write
   - Restart app
   - Verify settings persisted correctly

### Manual Testing

1. **Settings Responsiveness:**
   - Toggle Jarvis on/off rapidly
   - Verify UI responds instantly
   - Verify JarvisPanel shows/hides immediately

2. **Model Fallback:**
   - Set model to "llama2" (not installed)
   - Send Jarvis message
   - Verify response uses llama3
   - Verify notice about model substitution

3. **Model Dropdown:**
   - Open settings
   - Verify dropdown shows only installed models
   - Install new model with `ollama pull`
   - Refresh settings
   - Verify new model appears
