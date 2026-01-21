# Requirements Document: Jarvis Integration Fix

## Introduction

The Arc Browser's Jarvis AI assistant is currently not functioning correctly. Chat messages only return fallback responses instead of calling Ollama, recommendations are not based on actual SQLite history data, and the "Open" button on recommendation cards does not navigate to the recommended URLs. This specification addresses the complete integration chain from UI to backend services.

## Glossary

- **Jarvis**: AI assistant integrated into Arc Browser that provides chat and recommendations
- **Ollama**: Local LLM inference engine that runs AI models on the user's machine
- **JarvisPanel**: React component that renders the Jarvis chat and recommendations UI
- **SQLite**: Database system used to store browsing history and feedback
- **Recommendation**: A suggested website based on browsing history and user feedback
- **IPC**: Inter-Process Communication between renderer and main Electron processes

## Requirements

### Requirement 1: Jarvis Chat Integration with Ollama

**User Story:** As a user, I want Jarvis to respond to my chat messages using the Ollama LLM, so that I receive intelligent AI-powered responses instead of fallback messages.

#### Acceptance Criteria

1. WHEN a user sends a chat message AND Ollama is enabled AND running, THEN the System SHALL send the message to Ollama via HTTP request
2. WHEN Ollama returns a response, THEN the System SHALL display the LLM-generated text in the chat interface
3. WHEN the Ollama request is in progress, THEN the System SHALL show a "thinking" status indicator
4. THE System SHALL include recent browsing history as context in the Ollama request
5. THE System SHALL include current recommendations as context in the Ollama request
6. WHEN Ollama is not running OR not enabled, THEN the System SHALL fall back to rule-based responses with a clear explanation

### Requirement 2: SQLite History Integration for Recommendations

**User Story:** As a user, I want Jarvis recommendations to be based on my actual browsing history, so that suggestions are relevant to my usage patterns.

#### Acceptance Criteria

1. WHEN Jarvis loads recommendations, THEN the System SHALL query the SQLite database for recent history entries
2. WHEN the history database contains entries, THEN the System SHALL use those entries to generate recommendations
3. WHEN a user visits a website, THEN the System SHALL record the visit in the SQLite database with URL, title, and timestamp
4. THE System SHALL retrieve at least the 50 most recent history entries for recommendation generation
5. WHEN the history database is empty, THEN the System SHALL display a message explaining that browsing history is needed

### Requirement 3: Recommendation "Open" Button Functionality

**User Story:** As a user, I want to click the "Open" button on a recommendation card to navigate to that website, so that I can quickly access suggested content.

#### Acceptance Criteria

1. WHEN a user clicks the "Open" button on a recommendation card, THEN the System SHALL navigate to the recommendation's URL
2. WHEN navigating from a recommendation, THEN the System SHALL use the current active tab (not create a new tab)
3. WHEN the URL does not include a protocol, THEN the System SHALL prepend "https://" before navigation
4. THE System SHALL validate that the URL is not empty before attempting navigation
5. WHEN navigation is triggered, THEN the System SHALL close the Jarvis panel to show the loaded page

### Requirement 4: IPC Communication Chain Integrity

**User Story:** As a developer, I want all IPC handlers properly wired between renderer and main processes, so that Jarvis features work reliably.

#### Acceptance Criteria

1. THE System SHALL expose `window.arc.jarvisChat` in the preload script for sending chat messages
2. THE System SHALL expose `window.arc.getJarvisRecommendations` in the preload script for fetching recommendations
3. THE System SHALL expose `window.arc.navigate` in the preload script for URL navigation
4. THE System SHALL implement `ipcMain.handle('jarvis:chat')` to process chat requests
5. THE System SHALL implement `ipcMain.handle('jarvis:getRecommendations')` to fetch recommendations
6. THE System SHALL implement `ipcMain.handle('arc:navigate')` to handle navigation requests
7. WHEN any IPC call fails, THEN the System SHALL log the error with sufficient detail for debugging

### Requirement 5: Jarvis Chat Request Flow

**User Story:** As a developer, I want to trace the complete chat request flow, so that I can identify where failures occur.

#### Acceptance Criteria

1. WHEN a user sends a chat message, THEN the System SHALL log the message at the UI layer
2. WHEN the IPC call is made, THEN the System SHALL log the invocation in the preload layer
3. WHEN the main process receives the request, THEN the System SHALL log the handler invocation
4. WHEN the Ollama HTTP request is made, THEN the System SHALL log the URL, model, and message count
5. WHEN the Ollama response is received, THEN the System SHALL log the response length
6. WHEN any error occurs, THEN the System SHALL log the error with stack trace
7. ALL logs SHALL use consistent emoji prefixes for easy visual scanning

### Requirement 6: Recommendation Generation Logic

**User Story:** As a user, I want recommendations to reflect my actual browsing patterns, so that suggestions are personalized and useful.

#### Acceptance Criteria

1. WHEN generating recommendations, THEN the System SHALL analyze visit frequency for each domain
2. WHEN generating recommendations, THEN the System SHALL consider recency of visits
3. WHEN generating recommendations, THEN the System SHALL incorporate user feedback (if available)
4. THE System SHALL generate at least 3 recommendations when sufficient history exists
5. THE System SHALL include a reason for each recommendation (e.g., "You visit this often")
6. WHEN multiple sites have similar scores, THEN the System SHALL prioritize more recent visits

### Requirement 7: History Recording on Page Load

**User Story:** As a user, I want my browsing history to be automatically recorded, so that Jarvis can make informed recommendations.

#### Acceptance Criteria

1. WHEN a page finishes loading in any tab, THEN the System SHALL record the visit in SQLite
2. WHEN recording a visit, THEN the System SHALL store the URL, title, timestamp, and tab ID
3. THE System SHALL handle page load events from all tabs, not just the active tab
4. WHEN a page load event has no title, THEN the System SHALL use the URL as the title
5. THE System SHALL not record visits to internal pages (e.g., "about:blank", "chrome://")

### Requirement 8: Ollama Client Configuration

**User Story:** As a user, I want Jarvis to use my configured Ollama settings, so that chat works with my preferred model and server.

#### Acceptance Criteria

1. WHEN making an Ollama request, THEN the System SHALL use the model specified in user settings
2. WHEN no model is specified in settings, THEN the System SHALL default to "llama3"
3. WHEN making an Ollama request, THEN the System SHALL use the base URL from settings
4. WHEN no base URL is specified, THEN the System SHALL default to "http://localhost:11434"
5. THE System SHALL validate that the Ollama server is reachable before attempting chat

### Requirement 9: Error Recovery and Fallback

**User Story:** As a user, I want Jarvis to remain functional even when Ollama is unavailable, so that I can still get basic assistance.

#### Acceptance Criteria

1. WHEN Ollama is not running, THEN the System SHALL display a clear message explaining how to start it
2. WHEN Ollama has no models installed, THEN the System SHALL display instructions for installing a model
3. WHEN falling back to rule-based responses, THEN the System SHALL still provide helpful answers for common queries
4. THE System SHALL respond to "history" queries by showing recent browsing history
5. THE System SHALL respond to "recommendations" queries by refreshing the recommendations panel
6. WHEN Ollama becomes available after being unavailable, THEN the System SHALL automatically resume using it

### Requirement 10: UI State Management

**User Story:** As a user, I want the Jarvis UI to accurately reflect the system state, so that I understand what's happening.

#### Acceptance Criteria

1. WHEN Jarvis is processing a request, THEN the System SHALL display a "thinking" status
2. WHEN an error occurs, THEN the System SHALL display an "error" status with details
3. WHEN Jarvis is idle, THEN the System SHALL display an "idle" status
4. WHEN recommendations are loading, THEN the System SHALL show a loading indicator
5. WHEN recommendations are empty, THEN the System SHALL show an appropriate empty state message

