# Requirements Document: Jarvis Diagnostics and Fix

## Introduction

Despite previous implementation work on Jarvis integration, Ollama error handling, and cookie management, users are still experiencing issues: Jarvis does not use installed local models (llama3, mistral), encounters unclear errors, cookie clearing does not work, and recommendations are not visible. This specification addresses systematic diagnosis and fixing of these runtime issues.

## Glossary

- **Jarvis**: AI assistant integrated into Arc Browser that provides chat and recommendations
- **Ollama**: Local LLM inference engine that runs AI models on the user's machine
- **Model**: An AI language model (e.g., llama3, mistral) installed in Ollama
- **OllamaClient**: TypeScript class that communicates with the Ollama HTTP API
- **Recommender**: Core module that generates website recommendations based on browsing history
- **HistoryStore**: SQLite-based storage for browsing history
- **Cookie_Manager**: Main process component for cookie operations via Electron's session API
- **Settings_UI**: User interface component in the Settings view

## Requirements

### Requirement 1: Jarvis Model Selection and Usage

**User Story:** As a user, I want Jarvis to use my installed Ollama models (llama3, mistral), so that I receive AI-powered responses from my chosen model.

#### Acceptance Criteria

1. WHEN a user has installed models in Ollama (e.g., llama3, mistral), THEN the System SHALL detect and list these models
2. WHEN a user selects a model in Settings, THEN the System SHALL persist this selection
3. WHEN Jarvis sends a chat request, THEN the System SHALL use the selected model name in the Ollama API request
4. WHEN no model is selected, THEN the System SHALL default to "llama3"
5. THE System SHALL validate that the model name sent to Ollama matches an installed model
6. WHEN the model name is incorrect, THEN the System SHALL provide a clear error message listing available models

### Requirement 2: Jarvis Error Diagnosis and Reporting

**User Story:** As a user, I want clear error messages when Jarvis encounters problems, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN Ollama is not running, THEN the System SHALL display "Ollama is not running. Start it with: ollama serve"
2. WHEN Ollama has no models installed, THEN the System SHALL display "No models installed. Install one with: ollama pull llama3"
3. WHEN the selected model is not found, THEN the System SHALL display "Model '{name}' not found. Available models: {list}"
4. WHEN the Ollama request times out, THEN the System SHALL display "Request timed out. Check if Ollama is responding"
5. WHEN an unknown error occurs, THEN the System SHALL display the error message with technical details
6. ALL error messages SHALL be displayed in the Jarvis chat interface, not as browser alerts
7. THE System SHALL log all errors to the console with sufficient detail for debugging

### Requirement 3: Cookie Clearing Functionality

**User Story:** As a user, I want to clear cookies from Settings, so that I can reset my browsing sessions.

#### Acceptance Criteria

1. WHEN a user clicks "Clear cookies" in Settings, THEN the System SHALL remove all cookies from the default session
2. WHEN cookies are cleared, THEN the System SHALL display the count of removed cookies
3. WHEN constructing cookie removal URLs, THEN the System SHALL use the correct protocol (http/https) based on the cookie's secure flag
4. WHEN a cookie has no explicit domain, THEN the System SHALL handle it gracefully
5. THE System SHALL log each cookie removal attempt with success/failure status
6. WHEN cookie clearing completes, THEN the System SHALL verify that cookies are actually removed

### Requirement 4: Recommendations Visibility

**User Story:** As a user, I want to see Jarvis recommendations after browsing sites, so that I can discover relevant content.

#### Acceptance Criteria

1. WHEN a user browses websites, THEN the System SHALL record each visit in the SQLite history database
2. WHEN Jarvis loads recommendations, THEN the System SHALL query the history database for recent entries
3. WHEN history entries exist, THEN the System SHALL generate at least 1 recommendation
4. WHEN recommendations are generated, THEN the System SHALL display them as cards in the Jarvis panel
5. THE System SHALL log the number of history entries found and recommendations generated
6. WHEN no history exists, THEN the System SHALL display "Browse some sites to get recommendations"
7. WHEN recommendations fail to load, THEN the System SHALL display an error message

### Requirement 5: History Recording Pipeline

**User Story:** As a developer, I want to verify the complete history recording pipeline, so that I can identify where data is lost.

#### Acceptance Criteria

1. WHEN a page finishes loading, THEN the System SHALL trigger a page-loaded event
2. WHEN the page-loaded event fires, THEN the System SHALL call the IPC handler with URL, title, and timestamp
3. WHEN the IPC handler receives the event, THEN the System SHALL call historyStore.recordVisit()
4. WHEN recordVisit() is called, THEN the System SHALL insert or update the SQLite database
5. THE System SHALL log at each step: page load → IPC call → database write
6. WHEN querying history, THEN the System SHALL return the most recent entries first
7. THE System SHALL exclude internal pages (about:blank, chrome://) from history

### Requirement 6: Recommendations Generation Pipeline

**User Story:** As a developer, I want to verify the complete recommendations pipeline, so that I can identify where recommendations are lost.

#### Acceptance Criteria

1. WHEN getJarvisRecommendations() is called, THEN the System SHALL query historyStore.getRecentHistory()
2. WHEN history entries are retrieved, THEN the System SHALL pass them to the recommender
3. WHEN the recommender processes history, THEN the System SHALL apply scoring logic
4. WHEN recommendations are generated, THEN the System SHALL return an array of recommendation objects
5. THE System SHALL log the number of history entries used and recommendations created
6. WHEN recommendations are returned to the UI, THEN the System SHALL render them as cards
7. THE System SHALL log if any step returns empty results

### Requirement 7: Build Verification

**User Story:** As a developer, I want to ensure the project builds without errors, so that runtime issues are not caused by build problems.

#### Acceptance Criteria

1. WHEN running npm run build, THEN the System SHALL compile all TypeScript files without errors
2. WHEN build errors exist, THEN the System SHALL display clear error messages
3. THE System SHALL not proceed with testing or runtime verification until build succeeds
4. WHEN the build succeeds, THEN the System SHALL produce valid JavaScript output in the dist folder

### Requirement 8: Systematic Diagnosis Approach

**User Story:** As a developer, I want a systematic approach to diagnosing issues, so that I can identify root causes efficiently.

#### Acceptance Criteria

1. THE diagnosis process SHALL start with building the project
2. THE diagnosis process SHALL examine configuration files before code
3. THE diagnosis process SHALL add logging at each layer of the stack
4. THE diagnosis process SHALL test each component in isolation before integration
5. THE diagnosis process SHALL verify data flow from UI → IPC → Core → Storage
6. THE diagnosis process SHALL document findings at each step

### Requirement 9: Minimal Side Effects

**User Story:** As a developer, I want fixes to have minimal side effects, so that working functionality remains intact.

#### Acceptance Criteria

1. WHEN adding logging, THEN the System SHALL use temporary console.log statements that can be removed
2. WHEN fixing bugs, THEN the System SHALL change only the affected code paths
3. WHEN modifying functions, THEN the System SHALL preserve existing function signatures
4. THE System SHALL run existing tests after each fix to verify no regressions
5. WHEN fixes are complete, THEN the System SHALL remove temporary diagnostic code

### Requirement 10: Manual Verification

**User Story:** As a developer, I want to manually verify fixes, so that I can confirm they work in the actual application.

#### Acceptance Criteria

1. WHEN testing Jarvis chat, THEN the developer SHALL verify AI responses appear with Ollama running
2. WHEN testing cookie clearing, THEN the developer SHALL verify cookies are removed by checking browser storage
3. WHEN testing recommendations, THEN the developer SHALL browse sites and verify cards appear
4. THE developer SHALL test with Ollama stopped to verify error messages
5. THE developer SHALL test with no models installed to verify error messages
6. THE developer SHALL document manual test results
