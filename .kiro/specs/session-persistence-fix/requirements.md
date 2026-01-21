# Requirements Document: Session Persistence & Tab Lifetime Fix

## Introduction

Arc Browser currently has two critical issues affecting user experience: (1) switching between Browse and Settings sections unmounts the BrowserShell component, destroying all active tabs and their state, and (2) the application does not restore the previous session when reopened. This feature will fix both issues by implementing proper component lifecycle management and persistent session storage.

## Glossary

- **BrowserShell**: The main component that manages and renders browser tabs and webviews
- **Session**: A collection of open tabs with their URLs, titles, and state at a specific point in time
- **Tab_State**: The complete state of a single tab including URL, title, scroll position, and other metadata
- **Incognito_Tab**: A private browsing tab whose state should never be persisted to disk
- **Normal_Tab**: A regular browsing tab whose state can be persisted
- **Section**: A top-level view in the application (Browse or Settings)
- **Component_Mounting**: The process of creating and rendering a React component
- **Component_Unmounting**: The process of destroying a React component and cleaning up its resources
- **Session_Store**: The persistent storage mechanism for saving and loading session data

## Requirements

### Requirement 1: Prevent Tab Loss on Section Switch

**User Story:** As a user, I want my open tabs and websites to remain loaded when I switch from Browse to Settings and back, so that I don't lose my browsing context.

#### Acceptance Criteria

1. WHEN a user switches from Browse section to Settings section, THE BrowserShell SHALL remain mounted in the DOM
2. WHEN a user switches from Settings section back to Browse section, THE BrowserShell SHALL display the same tabs and URLs that were open before
3. WHEN BrowserShell is hidden, THE component SHALL use CSS visibility controls without unmounting
4. WHEN a user navigates to a website then switches to Settings, THE website SHALL remain loaded in the background
5. WHEN a user returns to Browse section, THE active tab SHALL be the same tab that was active before switching

### Requirement 2: Persist Session to Storage

**User Story:** As a user, I want my browsing session to be automatically saved, so that my tabs are preserved if the application crashes or is closed.

#### Acceptance Criteria

1. WHEN tabs are added, removed, or modified, THE Session_Store SHALL save the current session state within 2 seconds
2. WHEN saving a session, THE Session_Store SHALL include all Normal_Tab instances with their URLs, titles, and active tab ID
3. WHEN saving a session, THE Session_Store SHALL exclude all Incognito_Tab instances
4. WHEN a tab URL changes, THE Session_Store SHALL update the saved session with the new URL
5. WHEN the active tab changes, THE Session_Store SHALL update the saved session with the new active tab ID
6. WHEN saving fails, THE Session_Store SHALL log the error without crashing the application

### Requirement 3: Restore Session on Application Launch

**User Story:** As a user, I want my previous browsing session to be restored when I reopen Arc, so that I can continue where I left off.

#### Acceptance Criteria

1. WHEN the application starts, THE Session_Store SHALL load the most recent saved session
2. WHEN a saved session exists, THE application SHALL display a restore dialog to the user
3. WHEN the user chooses to restore, THE BrowserShell SHALL recreate all Normal_Tab instances from the saved session
4. WHEN the user chooses to start fresh, THE Session_Store SHALL clear the saved session
5. WHEN restoring tabs, THE BrowserShell SHALL set the active tab to match the saved active tab ID
6. WHEN no saved session exists, THE BrowserShell SHALL create a single new tab as default
7. WHEN the saved session contains invalid data, THE application SHALL start with a fresh session

### Requirement 4: Handle Incognito Tabs Correctly

**User Story:** As a user, I want my incognito tabs to never be saved or restored, so that my private browsing remains private.

#### Acceptance Criteria

1. WHEN saving a session, THE Session_Store SHALL filter out all Incognito_Tab instances
2. WHEN restoring a session, THE BrowserShell SHALL only recreate Normal_Tab instances
3. WHEN a session contains both Normal_Tab and Incognito_Tab instances, THE Session_Store SHALL only persist Normal_Tab instances
4. WHEN the application closes with only Incognito_Tab instances open, THE Session_Store SHALL save an empty session

### Requirement 5: Provide IPC Interface for Session Management

**User Story:** As a developer, I want a clean IPC interface for session management, so that the renderer and main processes can communicate session state.

#### Acceptance Criteria

1. THE IPC_Handler SHALL provide a `loadLastSession` method that returns the most recent session or null
2. THE IPC_Handler SHALL provide a `saveCurrentSession` method that accepts a session state and persists it
3. THE IPC_Handler SHALL provide a `clearSession` method that deletes all saved sessions
4. WHEN IPC methods are called, THE handlers SHALL execute in the main process with database access
5. WHEN IPC methods fail, THE handlers SHALL return error information to the renderer

### Requirement 6: Maintain Build Stability

**User Story:** As a developer, I want all changes to maintain build stability, so that the application can be compiled and tested.

#### Acceptance Criteria

1. WHEN code changes are made, THE build process SHALL complete without errors
2. WHEN running `npm run build`, THE TypeScript compiler SHALL report no type errors
3. WHEN running tests, THE test suite SHALL pass all existing tests
4. WHEN new functionality is added, THE code SHALL include appropriate type definitions
