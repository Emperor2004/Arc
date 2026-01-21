# Requirements Document: Ollama Error Handling Enhancement

## Introduction

The Arc Browser's Jarvis AI assistant integrates with Ollama for AI-powered chat responses. Currently, when Ollama is enabled but no models are installed, users receive a generic error message that doesn't explain the root cause. This enhancement will provide clear, actionable error messages and graceful degradation when Ollama models are missing or unavailable.

## Glossary

- **Ollama**: Local LLM inference engine that runs AI models on the user's machine
- **Jarvis**: AI assistant integrated into Arc Browser that provides recommendations and chat
- **Model**: An AI language model (e.g., llama2, mistral) that must be installed in Ollama
- **OllamaClient**: TypeScript class that communicates with the Ollama HTTP API
- **Settings**: User preferences stored in localStorage and file system

## Requirements

### Requirement 1: Detect Missing Models

**User Story:** As a user, I want to know when Ollama has no models installed, so that I understand why Jarvis cannot respond with AI.

#### Acceptance Criteria

1. WHEN the OllamaClient attempts to list models AND Ollama returns an empty model list, THEN the System SHALL detect this as a "no models installed" state
2. WHEN the OllamaClient attempts to chat AND receives a 404 error, THEN the System SHALL check if models are installed
3. WHEN no models are installed, THEN the System SHALL return a specific error type indicating "NO_MODELS_INSTALLED"
4. THE System SHALL distinguish between "Ollama not running" and "no models installed" error states

### Requirement 2: Provide Clear Error Messages

**User Story:** As a user, I want clear instructions when Ollama models are missing, so that I know how to fix the problem.

#### Acceptance Criteria

1. WHEN Jarvis detects no models are installed, THEN the System SHALL display a message explaining that Ollama needs models
2. WHEN displaying the error message, THEN the System SHALL include the command to install a model (e.g., "ollama pull llama3")
3. WHEN displaying the error message, THEN the System SHALL suggest checking installed models with "ollama list"
4. THE error message SHALL be user-friendly and avoid technical jargon where possible
5. THE error message SHALL be displayed in the Jarvis chat interface, not as a browser alert

### Requirement 3: Graceful Fallback to Rule-Based Responses

**User Story:** As a user, I want Jarvis to still respond helpfully when Ollama models are missing, so that the chat feature remains functional.

#### Acceptance Criteria

1. WHEN Ollama is enabled BUT no models are installed, THEN the System SHALL automatically fall back to rule-based responses
2. WHEN falling back to rule-based responses, THEN the System SHALL inform the user that AI features are unavailable
3. WHEN using fallback mode, THEN the System SHALL continue to provide history and recommendation queries
4. THE System SHALL not repeatedly check for models on every message (cache the "no models" state)
5. WHEN a user sends a message in fallback mode, THEN the System SHALL respond within 1 second

### Requirement 4: Model Availability Check

**User Story:** As a developer, I want a reliable way to check if Ollama has usable models, so that the application can make informed decisions about AI features.

#### Acceptance Criteria

1. THE OllamaClient SHALL provide a method `hasModels()` that returns true if at least one model is installed
2. WHEN `hasModels()` is called, THEN the System SHALL query the `/api/tags` endpoint
3. WHEN the model list is empty, THEN `hasModels()` SHALL return false
4. WHEN the model list contains at least one model, THEN `hasModels()` SHALL return true
5. THE `hasModels()` check SHALL complete within 2 seconds or timeout

### Requirement 5: Settings UI Model List Enhancement

**User Story:** As a user, I want to see if models are installed in the settings UI, so that I know whether Ollama is properly configured.

#### Acceptance Criteria

1. WHEN the settings panel displays the Ollama model dropdown AND no models are installed, THEN the System SHALL show a message "No models installed"
2. WHEN no models are installed, THEN the System SHALL display instructions to install a model (recommending llama3)
3. WHEN models are available, THEN the System SHALL populate the dropdown with installed model names
4. THE settings UI SHALL refresh the model list when the user returns to the settings panel
5. WHEN Ollama is not running, THEN the System SHALL display "Ollama not running" instead of "No models installed"

### Requirement 6: Retry Logic After Model Installation

**User Story:** As a user, I want Jarvis to automatically detect when I install a model, so that I don't have to restart the browser.

#### Acceptance Criteria

1. WHEN the System is in "no models" fallback mode AND a user sends a message, THEN the System SHALL re-check if models are now available
2. WHEN models become available after being unavailable, THEN the System SHALL automatically switch from fallback to AI mode
3. THE System SHALL cache the "no models" state for 30 seconds to avoid excessive API calls
4. WHEN the cache expires, THEN the System SHALL re-check model availability on the next user message
5. WHEN switching from fallback to AI mode, THEN the System SHALL inform the user that AI features are now active

### Requirement 7: Logging and Debugging

**User Story:** As a developer, I want detailed logs about Ollama connection issues, so that I can diagnose problems quickly.

#### Acceptance Criteria

1. WHEN the OllamaClient detects no models, THEN the System SHALL log "⚠️ Ollama has no models installed"
2. WHEN the OllamaClient receives a 404 error, THEN the System SHALL log the full error response
3. WHEN falling back to rule-based responses, THEN the System SHALL log "📝 Falling back to rule-based responses (no models)"
4. WHEN models become available after being unavailable, THEN the System SHALL log "✅ Ollama models now available"
5. ALL Ollama-related logs SHALL use emoji prefixes for easy visual scanning

### Requirement 8: Error Recovery

**User Story:** As a user, I want Jarvis to recover automatically when Ollama issues are resolved, so that I have a seamless experience.

#### Acceptance Criteria

1. WHEN Ollama transitions from "not running" to "running", THEN the System SHALL detect this on the next user message
2. WHEN Ollama transitions from "no models" to "models available", THEN the System SHALL detect this within 30 seconds
3. WHEN an error state is resolved, THEN the System SHALL clear any cached error states
4. THE System SHALL not require a page refresh to recover from Ollama errors
5. WHEN recovery occurs, THEN the System SHALL provide a success message to the user
