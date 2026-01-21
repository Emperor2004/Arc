# Requirements Document: Ollama Detection Fix

## Introduction

The Arc Browser's Jarvis AI assistant incorrectly detects Ollama as offline even when the Ollama server is running with models installed. Users see fallback messages ("Ollama is not running. Start it with: ollama serve" and "I'm still learning to chat...") despite having a functional Ollama setup. This specification addresses the complete detection chain from health checks to IPC status propagation to UI fallback logic.

## Glossary

- **Ollama**: Local LLM inference engine that runs AI models on the user's machine
- **Jarvis**: AI assistant integrated into Arc Browser that provides chat and recommendations
- **OllamaClient**: TypeScript class that communicates with the Ollama HTTP API
- **Health_Check**: HTTP request to verify Ollama server is running and responsive
- **Model_Detection**: Process of querying available models from Ollama
- **IPC**: Inter-Process Communication between renderer and main Electron processes
- **JarvisPanel**: React component that renders the Jarvis chat UI
- **Fallback_Logic**: Rule-based responses used when Ollama is unavailable
- **Status_Cache**: 30-second cache of Ollama availability status

## Requirements

### Requirement 1: Accurate Ollama Health Check

**User Story:** As a user, I want Arc to correctly detect when Ollama is running, so that Jarvis uses AI responses instead of fallback messages.

#### Acceptance Criteria

1. WHEN Ollama is running on the configured endpoint, THEN THE System SHALL detect it as available within 2 seconds
2. WHEN the health check queries the Ollama endpoint, THEN THE System SHALL use the correct URL path (/api/tags or /api/health)
3. WHEN the health check receives HTTP 200 response, THEN THE System SHALL mark Ollama as available
4. WHEN the health check fails due to network error, THEN THE System SHALL mark Ollama as unavailable
5. WHEN the health check times out after 2 seconds, THEN THE System SHALL mark Ollama as unavailable
6. THE System SHALL log the exact URL being called during health checks
7. THE System SHALL log the HTTP status code and response from health checks

### Requirement 2: Correct Model Detection

**User Story:** As a user, I want Arc to detect my installed Ollama models, so that Jarvis can use them for chat responses.

#### Acceptance Criteria

1. WHEN querying for models, THEN THE System SHALL call the /api/tags endpoint
2. WHEN the /api/tags response contains models, THEN THE System SHALL extract the model list
3. WHEN at least one model is installed, THEN THE System SHALL mark hasModels as true
4. WHEN the model list is empty, THEN THE System SHALL mark hasModels as false
5. WHEN the configured model name exists in the list, THEN THE System SHALL use that model
6. WHEN the configured model name does not exist, THEN THE System SHALL use the first available model
7. WHEN no model is configured, THEN THE System SHALL default to the first available model
8. THE System SHALL accept model names with version tags (e.g., "llama3:8b", "mistral:latest")

### Requirement 3: Reliable IPC Status Propagation

**User Story:** As a developer, I want the IPC handler to correctly propagate Ollama status to the renderer, so that the UI reflects the actual state.

#### Acceptance Criteria

1. WHEN the jarvis:chat IPC handler is called, THEN THE System SHALL check Ollama status using getStatus()
2. WHEN getStatus() returns available=true and hasModels=true, THEN THE System SHALL proceed with AI chat
3. WHEN getStatus() returns available=false, THEN THE System SHALL return useFallback=true with "Ollama is not running" message
4. WHEN getStatus() returns available=true but hasModels=false, THEN THE System SHALL return useFallback=true with "No models installed" message
5. THE System SHALL log the status check result (available, hasModels, model count)
6. THE System SHALL log the Ollama endpoint URL being used
7. THE System SHALL log the model name being used for chat requests

### Requirement 4: Correct Endpoint Configuration

**User Story:** As a user, I want Arc to use the correct Ollama endpoint, so that it connects to my running server.

#### Acceptance Criteria

1. WHEN no endpoint is configured, THEN THE System SHALL default to "http://localhost:11434"
2. WHEN an endpoint is configured in settings, THEN THE System SHALL use that endpoint
3. THE System SHALL validate that the endpoint includes protocol (http:// or https://)
4. THE System SHALL validate that the endpoint includes port if non-standard
5. WHEN constructing API URLs, THEN THE System SHALL append the correct path (/api/tags, /api/chat)
6. THE System SHALL not add duplicate slashes when combining base URL and path
7. THE System SHALL log the full constructed URL before making requests

### Requirement 5: Proper Fallback Triggering

**User Story:** As a user, I want fallback messages only when Ollama is truly unavailable, so that I get AI responses when my server is running.

#### Acceptance Criteria

1. WHEN Ollama is available and has models, THEN THE System SHALL never show fallback messages
2. WHEN Ollama is unavailable, THEN THE System SHALL show "Ollama is not running. Start it with: ollama serve"
3. WHEN Ollama is available but has no models, THEN THE System SHALL show "No models installed. Install one with: ollama pull llama3"
4. WHEN an AI response is received, THEN THE System SHALL display it without fallback text
5. WHEN the IPC handler returns useFallback=false, THEN THE JarvisPanel SHALL not call getJarvisReply()
6. WHEN the IPC handler returns useFallback=true, THEN THE JarvisPanel SHALL show the error message and then call getJarvisReply()

### Requirement 6: Status Cache Management

**User Story:** As a developer, I want the status cache to work correctly, so that we don't make excessive health check requests.

#### Acceptance Criteria

1. WHEN a status check succeeds, THEN THE System SHALL cache the result for 30 seconds
2. WHEN a status check fails, THEN THE System SHALL cache the result for 30 seconds
3. WHEN the cache is valid, THEN THE System SHALL use cached status without making HTTP requests
4. WHEN the cache expires, THEN THE System SHALL perform a new status check on the next request
5. WHEN Ollama transitions from unavailable to available, THEN THE System SHALL detect this within 30 seconds
6. THE System SHALL log when using cached status vs performing new checks

### Requirement 7: Comprehensive Logging

**User Story:** As a developer, I want detailed logs throughout the detection chain, so that I can diagnose issues quickly.

#### Acceptance Criteria

1. WHEN isAvailable() is called, THEN THE System SHALL log the URL being checked
2. WHEN isAvailable() receives a response, THEN THE System SHALL log the status code and result
3. WHEN listModels() is called, THEN THE System SHALL log the URL and response
4. WHEN getStatus() is called, THEN THE System SHALL log the complete status object
5. WHEN the IPC handler checks status, THEN THE System SHALL log available, hasModels, and model count
6. WHEN chatWithJarvis() is called, THEN THE System SHALL log the model name and endpoint
7. WHEN any HTTP request fails, THEN THE System SHALL log the error type and message
8. ALL logs SHALL use consistent emoji prefixes (🔍 for checks, ✅ for success, ❌ for errors)

### Requirement 8: Error Recovery

**User Story:** As a user, I want Jarvis to automatically recover when I start Ollama, so that I don't need to restart Arc.

#### Acceptance Criteria

1. WHEN Ollama starts after being stopped, THEN THE System SHALL detect it on the next chat request
2. WHEN models are installed after being missing, THEN THE System SHALL detect them within 30 seconds
3. WHEN status transitions from error to success, THEN THE System SHALL clear any cached error states
4. WHEN recovery occurs, THEN THE System SHALL log the status change
5. THE System SHALL not require page refresh or app restart to recover

### Requirement 9: Settings Integration

**User Story:** As a user, I want to configure my Ollama endpoint and model in settings, so that Arc uses my preferred configuration.

#### Acceptance Criteria

1. WHEN I set ollamaEndpoint in settings, THEN THE System SHALL use that endpoint for all requests
2. WHEN I set ollamaModel in settings, THEN THE System SHALL use that model for chat
3. WHEN ollamaEnabled is false, THEN THE System SHALL skip health checks and use fallback immediately
4. WHEN ollamaEnabled is true, THEN THE System SHALL perform health checks before each chat
5. THE System SHALL validate endpoint format before using it
6. THE System SHALL validate model name exists before using it

### Requirement 10: Test Environment Detection

**User Story:** As a developer, I want Ollama checks to behave correctly in test environments, so that tests don't fail due to missing Ollama.

#### Acceptance Criteria

1. WHEN running in test environment (NODE_ENV=test or VITEST=true), THEN THE System SHALL not log warnings for failed health checks
2. WHEN running in test environment, THEN THE System SHALL return false for isAvailable() without making HTTP requests
3. WHEN running in development, THEN THE System SHALL perform real health checks
4. WHEN running in production, THEN THE System SHALL perform real health checks
5. THE System SHALL detect test environment using process.env.NODE_ENV or window.__VITEST__
