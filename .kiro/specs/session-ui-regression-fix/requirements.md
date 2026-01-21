# Requirements Document: Session Persistence UI Regression Fix

## Introduction

Recent session persistence changes introduced three critical UI regressions: (1) the Jarvis panel moved from the right side to the bottom of the screen, (2) the URL text box is partially or fully hidden under the top header, and (3) the application no longer prompts users to restore their previous session on startup. This feature will fix these regressions while maintaining all existing functionality for tabs, Jarvis, settings, and persistence.

## Glossary

- **System**: The Arc Browser application
- **Jarvis_Panel**: The AI assistant interface panel that should appear on the right side of the Browse view
- **BrowserShell**: The main component containing the browser card with URL bar and webview
- **URL_Bar**: The address input field where users enter website URLs
- **Header**: The top navigation bar displaying "Arc + Jarvis" and section controls
- **Browse_Section**: The main browsing view containing BrowserShell and Jarvis_Panel
- **Settings_Section**: The settings configuration view
- **Two_Pane_Layout**: A horizontal flex layout with browser content on the left and Jarvis on the right
- **Session_Restore_Dialog**: A UI component that prompts users to restore their previous session
- **Saved_Session**: A persisted collection of tabs from a previous application session

## Requirements

### Requirement 1: Restore Two-Pane Layout with Jarvis on Right

**User Story:** As a user, I want the Jarvis panel to appear on the right side of the Browse view, so that I have a consistent side-by-side layout for browsing and AI assistance.

#### Acceptance Criteria

1. WHEN the Browse section is active and Jarvis is enabled, THE System SHALL display a two-pane horizontal layout
2. WHEN displaying the two-pane layout, THE BrowserShell SHALL occupy the left pane
3. WHEN displaying the two-pane layout, THE Jarvis_Panel SHALL occupy the right pane
4. WHEN the layout is rendered, THE main container SHALL use `flex-direction: row` not `column`
5. WHEN Jarvis is disabled, THE BrowserShell SHALL occupy the full width
6. WHEN switching to Settings section, THE Jarvis_Panel SHALL not be visible

### Requirement 2: Fix Header and URL Bar Visibility

**User Story:** As a user, I want the URL bar to be fully visible and not covered by the header, so that I can see and interact with the address field without obstruction.

#### Acceptance Criteria

1. WHEN the application renders, THE URL_Bar SHALL be fully visible below the Header
2. WHEN the Header is positioned, THE System SHALL ensure it does not overlap the BrowserShell content
3. WHEN the layout is rendered, THE Header SHALL use relative positioning without overlaying main content
4. WHEN the main content area is rendered, THE System SHALL provide adequate top margin or padding to prevent overlap
5. WHEN the user resizes the window, THE URL_Bar SHALL remain fully visible at all window sizes

### Requirement 3: Add Session Restore Prompt on Startup

**User Story:** As a user, I want to be asked whether to restore my previous session when I launch Arc, so that I can choose to continue where I left off or start fresh.

#### Acceptance Criteria

1. WHEN the application starts and a Saved_Session exists, THE System SHALL display the Session_Restore_Dialog
2. WHEN the Session_Restore_Dialog is displayed, THE System SHALL show "Restore" and "Start fresh" options
3. WHEN the user clicks "Restore", THE System SHALL load all tabs from the Saved_Session
4. WHEN the user clicks "Start fresh", THE System SHALL initialize with a single default tab
5. WHEN the user clicks "Start fresh", THE System SHALL optionally clear the Saved_Session from storage
6. WHEN no Saved_Session exists, THE System SHALL initialize with a single default tab without showing the dialog
7. WHEN the Session_Restore_Dialog is shown, THE System SHALL not automatically restore tabs without user confirmation

### Requirement 4: Maintain Existing Functionality

**User Story:** As a user, I want all existing features to continue working after the UI fixes, so that my browsing experience is not disrupted.

#### Acceptance Criteria

1. WHEN UI fixes are applied, THE System SHALL preserve all tab management functionality
2. WHEN UI fixes are applied, THE System SHALL preserve Jarvis chat functionality
3. WHEN UI fixes are applied, THE System SHALL preserve settings management functionality
4. WHEN UI fixes are applied, THE System SHALL preserve session persistence functionality
5. WHEN switching between Browse and Settings, THE BrowserShell SHALL remain mounted and preserve tab state
6. WHEN tabs are modified, THE System SHALL continue to save sessions automatically

### Requirement 5: Maintain Build Stability

**User Story:** As a developer, I want all changes to maintain build stability, so that the application can be compiled and tested without errors.

#### Acceptance Criteria

1. WHEN code changes are made, THE build process SHALL complete without errors
2. WHEN running `npm run build`, THE TypeScript compiler SHALL report no type errors
3. WHEN running tests, THE test suite SHALL pass all existing tests
4. WHEN new functionality is added, THE code SHALL include appropriate type definitions
5. WHEN changes are made, THE System SHALL fix any existing build errors before implementing new features
