# Design Document: Session Persistence UI Regression Fix

## Overview

This design addresses three UI regressions introduced by recent session persistence changes: (1) Jarvis panel appearing at the bottom instead of the right side, (2) URL bar being hidden under the header, and (3) missing session restore prompt on startup. The solution involves targeted CSS and layout fixes, proper component visibility management, and implementing a user-facing session restore dialog flow.

## Architecture

The fix follows a minimal, surgical approach targeting only the affected areas:

1. **Layout System**: Restore the two-pane horizontal flex layout for Browse section
2. **Header Positioning**: Ensure proper spacing between header and main content
3. **Session Restore UX**: Implement a user-prompted restore flow on startup
4. **Component Lifecycle**: Maintain existing session persistence without breaking tab state

The architecture preserves all existing functionality while fixing only the visual and UX regressions.

## Components and Interfaces

### 1. App.tsx Layout Structure

**Current Problem**: The layout classes and conditional rendering are causing Jarvis to appear at the bottom.

**Solution**: Ensure proper flex-direction and visibility control.

```typescript
// Main layout structure (Browse section)
<main 
  className={`arc-main ${section === 'browser' ? `arc-main--${layoutMode}` : ''}`}
  style={{ display: section === 'browser' ? 'flex' : 'none' }}
>
  {/* Left pane: BrowserShell */}
  {layoutMode !== 'jarvis_max' && (
    <section className="arc-main-left">
      <BrowserShell ... />
    </section>
  )}
  
  {/* Right pane: Jarvis */}
  {layoutMode !== 'browser_max' && settings.jarvisEnabled && (
    <aside className="arc-main-right">
      <JarvisPanel ... />
    </aside>
  )}
</main>

// Settings section (separate main element)
<main 
  className="arc-main arc-main--settings"
  style={{ display: section === 'settings' ? 'flex' : 'none' }}
>
  <SettingsView />
</main>
```

**Key Changes**:
- Remove `view-visible` and `view-hidden` classes from main elements
- Use inline `display` style for section visibility
- Ensure `arc-main` always uses `flex-direction: row` for Browse section
- Keep Jarvis conditional on both `layoutMode` and `settings.jarvisEnabled`

### 2. CSS Layout Fixes

**Current Problem**: CSS may have conflicting rules or missing flex-direction specification.

**Solution**: Ensure explicit flex-direction and proper spacing.

```css
/* Ensure Browse section uses horizontal layout */
.arc-main {
  flex: 1 1 auto;
  display: flex;
  flex-direction: row;  /* CRITICAL: Must be row, not column */
  gap: 12px;
  overflow: hidden;
  min-height: 0;
}

/* Settings section uses different layout */
.arc-main--settings {
  flex-direction: column;  /* Settings can be column */
  justify-content: flex-start;
  padding: 0 20px;
}

/* Ensure proper header spacing */
.arc-header {
  flex: 0 0 auto;
  padding: 8px 12px;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;  /* Not absolute */
  z-index: 1;
}

/* Ensure main content doesn't overlap header */
.arc-root {
  height: 100vh;
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 12px;
  box-sizing: border-box;
  position: relative;
}
```

**Key Changes**:
- Explicitly set `flex-direction: row` on `.arc-main` (not on `.arc-main--settings`)
- Ensure `.arc-header` uses `position: relative` not `absolute`
- Verify `.arc-root` uses `flex-direction: column` for vertical stacking

### 3. Session Restore Dialog Component

**Current Implementation**: SessionRestoreDialog exists but may not be properly triggered.

**Solution**: Ensure proper state management and dialog display logic.

```typescript
// In App.tsx
const [sessionToRestore, setSessionToRestore] = useState<SessionState | null>(null);
const [showRestoreDialog, setShowRestoreDialog] = useState(false);

useEffect(() => {
  const checkSessionRestore = async () => {
    try {
      const settings = await window.arc.getSettings();
      const restoreEnabled = settings?.restorePreviousSession !== false;
      
      if (restoreEnabled && window.arc.loadSession) {
        const result = await window.arc.loadSession();
        if (result?.ok && result.session?.tabs?.length > 0) {
          setSessionToRestore(result.session);
          setShowRestoreDialog(true);  // Show dialog, don't auto-restore
        }
      }
    } catch (error) {
      console.error('Error checking session restore:', error);
    }
  };

  checkSessionRestore();
}, []);

const handleRestoreSession = (tabs: TabSession[]) => {
  if (window.arc?.restoreSession) {
    window.arc.restoreSession(tabs);
  }
  setShowRestoreDialog(false);
  setSessionToRestore(null);
};

const handleStartFresh = async () => {
  try {
    if (window.arc?.clearSession) {
      await window.arc.clearSession();
    }
  } catch (error) {
    console.error('Error clearing session:', error);
  }
  setShowRestoreDialog(false);
  setSessionToRestore(null);
};
```

**Key Changes**:
- Set `showRestoreDialog` to true when session is found
- Don't automatically restore - wait for user choice
- Clear dialog state after user makes a choice

### 4. BrowserShell Integration

**Current Problem**: BrowserShell may be auto-restoring tabs without user confirmation.

**Solution**: Only restore tabs when user explicitly chooses to restore.

```typescript
// In useSessionManager or BrowserShell
useEffect(() => {
  // Check if user chose to restore via global flag
  const arcSessionRestore = (window as any).arcSessionRestore;
  
  if (arcSessionRestore?.sessionChoice === 'restored' && arcSessionRestore?.restoreTabs) {
    // User chose to restore - tabs will be restored via restoreTabs callback
    // Don't auto-load here
  } else if (arcSessionRestore?.sessionChoice === 'fresh') {
    // User chose fresh start - initialize with default tab
    // This is the default behavior
  }
  // If sessionChoice is null/undefined, user hasn't been prompted yet
  // Don't load anything automatically
}, []);
```

**Key Changes**:
- Don't auto-restore tabs on mount
- Wait for user's explicit choice via dialog
- Only initialize default tab if user chooses "Start fresh"

## Data Models

### SessionState

```typescript
interface SessionState {
  tabs: TabSession[];
  activeTabId: string;
  timestamp: number;
}

interface TabSession {
  id: string;
  url: string;
  title: string;
  isIncognito: boolean;
}
```

No changes to data models - they remain as defined in the session persistence implementation.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Two-Pane Layout Preservation

*For any* application state where the Browse section is active and Jarvis is enabled, the layout should display BrowserShell on the left and Jarvis_Panel on the right in a horizontal flex layout.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Header Non-Overlap

*For any* window size and application state, the URL_Bar should be fully visible and not overlapped by the Header.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 3: Session Restore User Confirmation

*For any* application startup where a Saved_Session exists, the System should display the Session_Restore_Dialog and wait for user confirmation before restoring tabs.

**Validates: Requirements 3.1, 3.2, 3.7**

### Property 4: Restore Action Completeness

*For any* user action of clicking "Restore" in the Session_Restore_Dialog, all tabs from the Saved_Session should be recreated in the BrowserShell.

**Validates: Requirements 3.3**

### Property 5: Fresh Start Action

*For any* user action of clicking "Start fresh" in the Session_Restore_Dialog, the System should initialize with a single default tab and optionally clear the Saved_Session.

**Validates: Requirements 3.4, 3.5**

### Property 6: No Auto-Restore

*For any* application startup, tabs should not be automatically restored without user confirmation when a Saved_Session exists.

**Validates: Requirements 3.7**

### Property 7: Functionality Preservation

*For any* UI fix applied, all existing tab management, Jarvis chat, settings management, and session persistence functionality should continue to work unchanged.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**

## Error Handling

### Layout Rendering Errors

**Error**: Jarvis panel not rendering or appearing in wrong position
**Handling**: 
- Log layout mode and section state to console
- Verify `settings.jarvisEnabled` is true
- Check CSS classes applied to main container
- Fallback: Ensure at least BrowserShell renders

### Session Restore Errors

**Error**: Failed to load session from storage
**Handling**:
- Catch error in `checkSessionRestore`
- Log error to console
- Continue with default initialization (single tab)
- Don't show restore dialog if session load fails

**Error**: Failed to restore tabs after user confirmation
**Handling**:
- Catch error in `handleRestoreSession`
- Log error to console
- Show error message to user
- Fall back to default single tab

### Header Overlap Errors

**Error**: URL bar still hidden after fixes
**Handling**:
- Verify `.arc-root` flex-direction is column
- Check `.arc-header` position is relative
- Ensure adequate margin/padding between header and main
- Use browser dev tools to inspect z-index and positioning

## Testing Strategy

### Unit Tests

1. **Layout Component Tests**
   - Test that Browse section renders with flex-direction: row
   - Test that Jarvis appears on right when enabled
   - Test that Settings section doesn't show Jarvis
   - Test layout mode transitions (normal, browser_max, jarvis_max)

2. **Session Restore Dialog Tests**
   - Test dialog appears when session exists
   - Test dialog doesn't appear when no session
   - Test "Restore" button calls correct handler
   - Test "Start fresh" button calls correct handler
   - Test dialog closes after user choice

3. **CSS Layout Tests**
   - Test header positioning is relative
   - Test main container flex-direction
   - Test adequate spacing between header and content

### Property-Based Tests

1. **Property 1: Two-Pane Layout Preservation**
   - Generate random application states (section, layoutMode, jarvisEnabled)
   - Verify layout structure matches expected configuration
   - Verify Jarvis position when enabled

2. **Property 3: Session Restore User Confirmation**
   - Generate random session states
   - Verify dialog appears on startup
   - Verify no auto-restore occurs

3. **Property 7: Functionality Preservation**
   - Generate random user interactions (tab operations, settings changes)
   - Verify all operations work after UI fixes
   - Verify session persistence still functions

### Integration Tests

1. **Full Layout Flow**
   - Start app → verify layout
   - Switch to Settings → verify Jarvis hidden
   - Switch back to Browse → verify Jarvis reappears on right
   - Maximize browser → verify Jarvis hidden
   - Restore normal → verify two-pane layout

2. **Session Restore Flow**
   - Create tabs → close app
   - Reopen app → verify dialog appears
   - Click "Restore" → verify tabs restored
   - Close app again
   - Reopen app → click "Start fresh" → verify single tab

3. **Header Visibility Flow**
   - Start app → verify URL bar visible
   - Resize window → verify URL bar remains visible
   - Navigate to different URLs → verify no overlap

### Manual Testing Checklist

- [ ] Jarvis panel appears on right side in Browse section
- [ ] URL bar is fully visible and not covered by header
- [ ] Session restore dialog appears on startup with saved tabs
- [ ] "Restore" button correctly restores all tabs
- [ ] "Start fresh" button creates single default tab
- [ ] Switching to Settings hides Jarvis
- [ ] Switching back to Browse shows Jarvis on right
- [ ] All tab operations work (create, close, switch)
- [ ] Jarvis chat functionality works
- [ ] Settings can be changed and saved
- [ ] Sessions are still automatically saved on tab changes
- [ ] Layout works at different window sizes

## Implementation Notes

### Build-First Approach

1. Run `npm run build` before making any changes
2. Fix any existing build errors
3. Make targeted changes to layout and session restore
4. Run `npm run build` after each change to verify
5. Run tests to ensure no regressions

### Minimal Changes Philosophy

- Only modify files directly related to the regressions
- Don't refactor unrelated code
- Preserve all existing functionality
- Use inline styles for visibility control if needed
- Keep CSS changes minimal and targeted

### Files to Modify

1. `src/renderer/App.tsx` - Layout structure and session restore logic
2. `src/renderer/styles/global.css` - Layout CSS fixes (if needed)
3. `src/renderer/components/SessionRestoreDialog.tsx` - Verify dialog logic (if needed)

### Files NOT to Modify

- Session persistence core logic (`sessionManager.ts`, IPC handlers)
- BrowserShell tab management
- Jarvis panel functionality
- Settings management
- Any other unrelated components

## Success Criteria

1. Jarvis panel appears on the right side of Browse section (not bottom)
2. URL bar is fully visible without header overlap
3. Session restore dialog appears on startup when saved session exists
4. User can choose to restore or start fresh
5. All existing functionality continues to work
6. Build completes without errors
7. All tests pass
8. Manual testing confirms all issues resolved
