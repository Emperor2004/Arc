# Requirements Document: Settings Propagation and Model Validation

## Introduction

The Arc Browser currently has two critical issues affecting user experience: (1) Settings changes (Jarvis on/off, model selection, etc.) take a long time to take effect in the UI and behavior, and (2) Jarvis does not properly validate or use configured Ollama models, attempting to use non-installed models like "llama2" when valid models like "llama3" or "mistral" are available. This specification addresses both the settings propagation latency and the model validation/fallback logic.

## Glossary

- **Settings**: User preferences stored persistently (localStorage, file system, or database)
- **SettingsStore**: Core module responsible for reading and writing settings
- **SettingsView**: React component where users modify settings
- **IPC**: Inter-Process Communication between Electron renderer and main processes
- **Jarvis**: AI assistant integrated into Arc Browser
- **Ollama**: Local LLM inference engine that runs AI models
- **Model**: An AI language model (e.g., llama3, mistral, llama2) that can be installed in Ollama
- **OllamaClient**: TypeScript class that communicates with the Ollama HTTP API
- **Propagation**: The process of distributing settings changes to all consumers

## Requirements

### Requirement 1: Immediate Settings State Updates

**User Story:** As a user, I want settings changes to take effect immediately in the UI, so that I see instant feedback when I toggle options or change values.

#### Acceptance Criteria

1. WHEN a user changes a setting in the SettingsView, THEN the System SHALL update the in-memory state within 100 milliseconds
2. WHEN a setting is updated, THEN the System SHALL notify all renderer processes of the change immediately
3. WHEN a setting change notification is received, THEN consuming components SHALL re-render within one React frame (16ms)
4. THE System SHALL not use polling to detect settings changes
5. THE System SHALL not debounce settings state updates to the UI (disk writes may be debounced separately)

### Requirement 2: Event-Driven Settings Propagation

**User Story:** As a developer, I want settings changes to propagate via events, so that all components stay synchronized without polling.

#### Acceptance Criteria

1. WHEN the main process updates settings, THEN the System SHALL emit a 'settings:updated' IPC event to all renderer processes
2. THE preload script SHALL expose an `onSettingsUpdated(callback)` method for subscribing to settings changes
3. WHEN a renderer subscribes to settings updates, THEN the System SHALL invoke the callback immediately with current settings
4. WHEN settings change, THEN the System SHALL invoke all registered callbacks with the new settings object
5. THE System SHALL support multiple simultaneous subscribers without interference

### Requirement 3: Settings Context for React Components

**User Story:** As a developer, I want a centralized React context for settings, so that components automatically re-render when settings change.

#### Acceptance Criteria

1. THE System SHALL provide a SettingsContext that holds the current settings state
2. THE SettingsContext SHALL subscribe to 'settings:updated' events on mount
3. WHEN a 'settings:updated' event is received, THEN the SettingsContext SHALL update its state immediately
4. THE System SHALL provide a useSettings() hook that returns current settings and an update function
5. WHEN any component calls the update function, THEN all components using useSettings() SHALL receive the new values

### Requirement 4: Jarvis Settings Immediate Effect

**User Story:** As a user, I want Jarvis enable/disable and model changes to take effect immediately, so that I don't have to wait or refresh.

#### Acceptance Criteria

1. WHEN a user toggles jarvisEnabled in settings, THEN the JarvisPanel SHALL show or hide within 100 milliseconds
2. WHEN a user changes jarvisModel in settings, THEN the next Jarvis chat message SHALL use the new model
3. WHEN Jarvis settings change, THEN the System SHALL not require a page refresh or app restart
4. THE System SHALL apply Jarvis settings changes to in-progress operations (e.g., cancel old model requests)
5. WHEN jarvisEnabled is toggled off, THEN any in-progress Jarvis requests SHALL be cancelled

### Requirement 5: Installed Model Detection

**User Story:** As a user, I want Jarvis to automatically detect which models are installed in Ollama, so that it only attempts to use valid models.

#### Acceptance Criteria

1. WHEN Jarvis prepares to send a chat request, THEN the System SHALL query Ollama for the list of installed models
2. THE System SHALL cache the installed models list for 60 seconds to avoid excessive API calls
3. WHEN the cache expires, THEN the System SHALL refresh the installed models list on the next request
4. THE System SHALL expose a method `getInstalledModels()` that returns an array of model names
5. WHEN Ollama is not running, THEN `getInstalledModels()` SHALL return an empty array

### Requirement 6: Model Validation Before Use

**User Story:** As a user, I want Jarvis to validate that my configured model is installed before using it, so that I don't get errors from invalid models.

#### Acceptance Criteria

1. WHEN Jarvis prepares to send a chat request, THEN the System SHALL check if the configured model is in the installed models list
2. WHEN the configured model is not installed, THEN the System SHALL select a fallback model from the installed models
3. WHEN selecting a fallback model, THEN the System SHALL prefer models in this order: llama3, mistral, any other installed model
4. WHEN no models are installed, THEN the System SHALL return an error indicating "no models available"
5. THE System SHALL not attempt to send a chat request with a non-installed model

### Requirement 7: Automatic Model Fallback

**User Story:** As a user, I want Jarvis to automatically use an available model when my configured model is missing, so that chat continues to work.

#### Acceptance Criteria

1. WHEN the configured model (e.g., llama2) is not installed, THEN the System SHALL automatically select an installed model
2. WHEN using a fallback model, THEN the System SHALL log a warning indicating the model substitution
3. WHEN using a fallback model, THEN the System SHALL include a one-time notification in the chat response (e.g., "Using llama3 instead of llama2")
4. THE System SHALL not repeatedly notify about model fallback on every message
5. WHEN the configured model becomes available, THEN the System SHALL automatically switch back to it

### Requirement 8: Settings UI Model Validation

**User Story:** As a user, I want the settings UI to show me which models are actually installed, so that I can choose a valid model.

#### Acceptance Criteria

1. WHEN the settings panel displays the model dropdown, THEN the System SHALL populate it with only installed models
2. WHEN no models are installed, THEN the System SHALL display "No models installed - run 'ollama pull llama3'"
3. WHEN the configured model is not in the installed list, THEN the System SHALL highlight it with a warning icon
4. THE settings UI SHALL refresh the model list when opened or when focus returns to the settings panel
5. WHEN a user selects a model from the dropdown, THEN the System SHALL only allow selection of installed models

### Requirement 9: Model Validation Error Handling

**User Story:** As a developer, I want clear error messages when model validation fails, so that I can diagnose issues quickly.

#### Acceptance Criteria

1. WHEN the configured model is not installed, THEN the System SHALL log "⚠️ Model '{modelName}' not installed, using fallback"
2. WHEN no models are installed, THEN the System SHALL log "❌ No Ollama models installed"
3. WHEN model validation succeeds, THEN the System SHALL log "✅ Using model: {modelName}"
4. WHEN Ollama is unreachable during model validation, THEN the System SHALL log "⚠️ Cannot reach Ollama to validate models"
5. ALL model validation logs SHALL include timestamps and be easily searchable

### Requirement 10: Settings Persistence Optimization

**User Story:** As a developer, I want settings disk writes to be optimized without affecting UI responsiveness, so that the system is both fast and reliable.

#### Acceptance Criteria

1. WHEN a setting changes, THEN the System SHALL update in-memory state immediately (within 10ms)
2. WHEN a setting changes, THEN the System SHALL debounce disk writes by up to 500 milliseconds
3. WHEN multiple settings change rapidly, THEN the System SHALL batch them into a single disk write
4. WHEN the application exits, THEN the System SHALL flush any pending settings writes immediately
5. THE System SHALL not block UI updates while waiting for disk writes to complete

### Requirement 11: Settings Change Tracing

**User Story:** As a developer, I want to trace settings changes through the entire system, so that I can identify latency bottlenecks.

#### Acceptance Criteria

1. WHEN a setting changes in the UI, THEN the System SHALL log "🔧 Settings changed: {key}={value}"
2. WHEN the IPC handler receives a settings update, THEN the System SHALL log "📡 IPC received settings update"
3. WHEN settings are persisted to disk, THEN the System SHALL log "💾 Settings persisted to disk"
4. WHEN a settings update event is broadcast, THEN the System SHALL log "📢 Broadcasting settings update to {count} windows"
5. WHEN a component receives a settings update, THEN the System SHALL log "📥 Component received settings update"

### Requirement 12: Jarvis Model Selection Flow

**User Story:** As a developer, I want to trace the complete model selection flow, so that I can verify the correct model is being used.

#### Acceptance Criteria

1. WHEN Jarvis prepares a chat request, THEN the System SHALL log "🤖 Preparing chat with configured model: {modelName}"
2. WHEN validating the model, THEN the System SHALL log "🔍 Validating model against installed: [{models}]"
3. WHEN using a fallback model, THEN the System SHALL log "🔄 Fallback to model: {fallbackModel}"
4. WHEN sending the request to Ollama, THEN the System SHALL log "📤 Sending request to Ollama with model: {actualModel}"
5. WHEN receiving a response, THEN the System SHALL log "📥 Received response from model: {actualModel}"
