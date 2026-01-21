# Design Document: Session Persistence & Tab Lifetime Fix

## Overview

This design addresses two critical issues in Arc Browser: (1) tabs being destroyed when switching between Browse and Settings sections, and (2) lack of session restoration on application restart. The solution involves modifying the component lifecycle management in App.tsx to prevent unmounting of BrowserShell, and enhancing the existing session management system to properly save and restore tab state.

The existing codebase already has foundational session management infrastructure (`sessionManager.ts`, `useSessionManager` hook, and IPC handlers), but it needs improvements in debouncing, incognito handling, and integration with the component lifecycle.

## Architecture

### Component Lifecycle Changes

**Current Problem:**
```typescript
{section === 'browser' && <BrowserShell ... />}
{section === 'settings' && <SettingsView ... />}
```

This conditional rendering unmounts BrowserShell when switching to Settings, destroying all tab state and webview instances.

**Solution:**
Both components will remain mounted, with visibility controlled via CSS:

```typescript
<div className={section === 'browser' ? 'view-visible' : 'view-hidden'}>
  <BrowserShell ... />
</div>
<div className={section === 'settings' ? 'view-visible' : 'view-hidden'}>
  <SettingsView ... />
</div>
```

CSS classes:
- `.view-visible`: `display: block; visibility: visible;`
- `.view-hidden`: `display: none;` (or `visibility: hidden` if we want to preserve layout)

### Session Storage Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Renderer Process                     │
│                                                              │
│  ┌──────────────┐         ┌─────────────────────┐          │
│  │ BrowserShell │────────▶│ useSessionManager   │          │
│  │              │         │ (debounced save)    │          │
│  └──────────────┘         └──────────┬──────────┘          │
│                                      │                       │
│                                      │ IPC Call              │
│                                      ▼                       │
│                           ┌──────────────────────┐          │
│                           │  window.arc.         │          │
│                           │  saveSession()       │          │
│                           └──────────┬───────────┘          │
└────────────────────────────────────────┼────────────────────┘
                                        │
                                        │ IPC
                                        ▼
┌─────────────────────────────────────────────────────────────┐
│                         Main Process                         │
│                                                              │
│  ┌──────────────┐         ┌─────────────────────┐          │
│  │ IPC Handler  │────────▶│  sessionManager.ts  │          │
│  │              │         │  - saveSession()    │          │
│  └──────────────┘         │  - loadSession()    │          │
│                           │  - clearSession()   │          │
│                           └──────────┬──────────┘          │
│                                      │                       │
│                                      ▼                       │
│                           ┌──────────────────────┐          │
│                           │  DatabaseManager     │          │
│                           │  (SQLite)            │          │
│                           └──────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. App.tsx Modifications

**Changes:**
- Replace conditional rendering with CSS-based visibility toggling
- Keep BrowserShell mounted at all times
- Add CSS classes for view visibility control

**New CSS Classes:**
```css
.view-visible {
  display: block;
  visibility: visible;
}

.view-hidden {
  display: none;
}
```

### 2. Enhanced useSessionManager Hook

**Current Implementation Issues:**
- Saves every 30 seconds regardless of changes
- No debouncing on tab changes
- Doesn't filter incognito tabs

**Enhanced Implementation:**

```typescript
export interface UseSessionManagerOptions {
  tabs: Tab[];
  activeTab: Tab | undefined;
  onRestoreTabs: (tabs: Tab[]) => void;
}

export const useSessionManager = ({ 
  tabs, 
  activeTab, 
  onRestoreTabs 
}: UseSessionManagerOptions) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedStateRef = useRef<string>('');

  // Debounced save function
  const debouncedSave = useCallback(async () => {
    try {
      if (!window.arc?.saveSession || !activeTab) return;

      // Filter out incognito tabs
      const normalTabs = tabs.filter(tab => !tab.incognito);
      
      if (normalTabs.length === 0) {
        // If only incognito tabs, clear session
        await window.arc.clearSession();
        return;
      }

      // Convert to TabSession format
      const tabSessions: TabSession[] = normalTabs.map(tab => ({
        id: tab.id,
        url: tab.url,
        title: tab.title,
        scrollPosition: { x: 0, y: 0 },
      }));

      // Only save if state has changed
      const currentState = JSON.stringify({ tabSessions, activeTabId: activeTab.id });
      if (currentState !== lastSavedStateRef.current) {
        await window.arc.saveSession(tabSessions, activeTab.id);
        lastSavedStateRef.current = currentState;
      }
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }, [tabs, activeTab]);

  // Trigger debounced save on tab changes
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave();
    }, 2000); // 2 second debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [tabs, activeTab, debouncedSave]);

  // Save on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      debouncedSave();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [debouncedSave]);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Check if session restore is enabled
        const settings = await window.arc.getSettings();
        if (settings?.restorePreviousSession === false) return;

        // Check if we should restore (via global flag set by App.tsx)
        const shouldRestore = (window as any).arcSessionRestore?.sessionChoice === 'restored';
        if (!shouldRestore) return;

        const result = await window.arc.loadSession();
        if (result?.ok && result.session?.tabs?.length > 0) {
          const restoredTabs: Tab[] = result.session.tabs.map((ts: TabSession) => ({
            id: ts.id,
            url: ts.url,
            title: ts.title,
            isActive: false,
            incognito: false,
          }));

          // Set active tab
          const activeTabId = result.session.activeTabId;
          const activeIndex = restoredTabs.findIndex(t => t.id === activeTabId);
          if (activeIndex >= 0) {
            restoredTabs[activeIndex].isActive = true;
          } else if (restoredTabs.length > 0) {
            restoredTabs[0].isActive = true;
          }

          onRestoreTabs(restoredTabs);
        }
      } catch (error) {
        console.error('Error restoring session:', error);
      }
    };

    restoreSession();
  }, [onRestoreTabs]);

  return {};
};
```

### 3. Session Manager (Core)

**Existing Implementation:** Already has `saveSession`, `loadSession`, `clearSession` functions that work with SQLite database.

**No changes needed** - the existing implementation is sufficient.

### 4. IPC Handlers

**Existing Implementation:** Already has handlers for:
- `arc:loadSession`
- `arc:saveSession`
- `arc:clearSession`
- `arc:restoreSession`

**No changes needed** - the existing IPC handlers are sufficient.

### 5. Preload Script

**Existing Implementation:** Already exposes session management methods via `window.arc`.

**No changes needed** - the existing preload script is sufficient.

## Data Models

### Tab Interface (Existing)
```typescript
interface Tab {
  id: string;
  url: string;
  title: string;
  isActive: boolean;
  incognito: boolean;
}
```

### TabSession Interface (Existing)
```typescript
interface TabSession {
  id: string;
  url: string;
  title: string;
  scrollPosition: { x: number; y: number };
  formData?: Record<string, any>;
  favicon?: string;
}
```

### SessionState Interface (Existing)
```typescript
interface SessionState {
  tabs: TabSession[];
  activeTabId: string;
  timestamp: number;
  version: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Component Persistence Across Section Switches
*For any* sequence of section switches between Browse and Settings, the BrowserShell component instance should remain mounted and preserve its internal state (tabs, active tab, webview instances).
**Validates: Requirements 1.1, 1.2, 1.3, 1.5**

### Property 2: Debounced Session Save
*For any* sequence of tab operations (add, remove, modify, activate), the session should be saved to storage within 2 seconds of the last operation, and no saves should occur if the state hasn't changed.
**Validates: Requirements 2.1, 2.4, 2.5**

### Property 3: Incognito Tab Filtering
*For any* session state containing a mix of normal and incognito tabs, the saved session should contain only the normal tabs and exclude all incognito tabs.
**Validates: Requirements 2.3, 4.1, 4.3**

### Property 4: Session Data Completeness
*For any* saved session containing normal tabs, each tab entry should include all required fields: id, url, title, and the session should include the active tab ID.
**Validates: Requirements 2.2**

### Property 5: Error Resilience
*For any* save operation that fails, the application should continue to function normally and log the error without crashing or losing existing state.
**Validates: Requirements 2.6**

### Property 6: Session Restore Round-Trip
*For any* valid session state that is saved and then restored, the restored tabs should match the saved tabs in terms of id, url, and title, and the active tab should match the saved active tab ID.
**Validates: Requirements 3.3, 3.5**

### Property 7: Invalid Session Handling
*For any* corrupted or invalid session data, the application should gracefully handle the error and start with a fresh session (single new tab) without crashing.
**Validates: Requirements 3.7**

### Property 8: IPC Error Propagation
*For any* IPC method call that fails in the main process, the error information should be returned to the renderer process in a structured format.
**Validates: Requirements 5.5**

### Property 9: Restored Tabs Are Never Incognito
*For any* session restoration operation, all restored tabs should have their incognito flag set to false, regardless of the saved session data.
**Validates: Requirements 4.2**



## Error Handling

### 1. Component Lifecycle Errors

**Scenario:** BrowserShell fails to render when hidden
**Handling:** 
- Wrap BrowserShell in error boundary
- Log error and display fallback UI
- Allow user to reset to default state

### 2. Session Save Failures

**Scenario:** Database write fails during session save
**Handling:**
- Log error with full context (timestamp, tab count, error message)
- Continue application execution without interruption
- Retry save on next debounce trigger
- Do not show error to user unless persistent

### 3. Session Load Failures

**Scenario:** Corrupted session data or database read error
**Handling:**
- Log error with details
- Validate session data structure before using
- If validation fails, start with fresh session (single new tab)
- Clear corrupted session from database

### 4. IPC Communication Failures

**Scenario:** IPC call times out or main process is unresponsive
**Handling:**
- Return structured error object: `{ ok: false, error: string }`
- Log error in both renderer and main process
- Provide fallback behavior (e.g., skip save, use default state)
- Do not crash application

### 5. Invalid Tab Data

**Scenario:** Tab has missing or malformed URL/title
**Handling:**
- Filter out invalid tabs during save
- Use default values for missing fields (empty string for title)
- Validate URLs before saving (must be non-empty string)
- Log warning for skipped tabs

### 6. Empty Session Edge Case

**Scenario:** All tabs are incognito when saving
**Handling:**
- Save empty session or clear existing session
- On restore, create single new tab as default
- Do not show restore dialog if session is empty

## Testing Strategy

### Unit Tests

Unit tests will focus on specific examples, edge cases, and error conditions:

**Component Lifecycle Tests:**
- Test that BrowserShell uses CSS classes for visibility
- Test that switching sections doesn't trigger unmount
- Test that hidden BrowserShell maintains state

**Session Manager Tests:**
- Test debounce timing with specific delays
- Test filtering of incognito tabs with known tab sets
- Test save/load with specific session data
- Test error handling with simulated failures

**IPC Handler Tests:**
- Test each IPC method with valid inputs
- Test error responses with simulated failures
- Test that handlers return correct data structures

**Edge Case Tests:**
- Empty session (no tabs)
- All incognito tabs
- Single tab
- Very large session (100+ tabs)
- Corrupted session data
- Missing required fields

### Property-Based Tests

Property-based tests will verify universal properties across all inputs using fast-check library (minimum 100 iterations per test):

**Property Test 1: Component Persistence**
- Generate: Random sequences of section switches
- Verify: Component instance remains the same, state is preserved
- **Feature: session-persistence-fix, Property 1: Component Persistence Across Section Switches**

**Property Test 2: Debounced Save Timing**
- Generate: Random sequences of tab operations with varying timing
- Verify: Saves occur within 2 seconds, no duplicate saves for same state
- **Feature: session-persistence-fix, Property 2: Debounced Session Save**

**Property Test 3: Incognito Filtering**
- Generate: Random tab sets with mix of normal and incognito tabs
- Verify: Saved session contains only normal tabs
- **Feature: session-persistence-fix, Property 3: Incognito Tab Filtering**

**Property Test 4: Session Data Completeness**
- Generate: Random tab configurations
- Verify: All required fields present in saved session
- **Feature: session-persistence-fix, Property 4: Session Data Completeness**

**Property Test 5: Error Resilience**
- Generate: Random save operations with simulated failures
- Verify: Application continues functioning, errors are logged
- **Feature: session-persistence-fix, Property 5: Error Resilience**

**Property Test 6: Round-Trip Consistency**
- Generate: Random session states
- Verify: Save then restore produces equivalent state
- **Feature: session-persistence-fix, Property 6: Session Restore Round-Trip**

**Property Test 7: Invalid Data Handling**
- Generate: Random corrupted/invalid session data
- Verify: Application handles gracefully, starts with fresh session
- **Feature: session-persistence-fix, Property 7: Invalid Session Handling**

**Property Test 8: IPC Error Propagation**
- Generate: Random IPC calls with simulated failures
- Verify: Errors are returned in structured format
- **Feature: session-persistence-fix, Property 8: IPC Error Propagation**

**Property Test 9: Restored Tab Incognito Flag**
- Generate: Random session data (including with incognito flags)
- Verify: All restored tabs have incognito=false
- **Feature: session-persistence-fix, Property 9: Restored Tabs Are Never Incognito**

### Integration Tests

Integration tests will verify the complete flow:

1. **Full Session Lifecycle Test:**
   - Create tabs, navigate to URLs
   - Verify session is saved
   - Restart application
   - Verify session is restored correctly

2. **Section Switch Integration Test:**
   - Open tabs in Browse section
   - Switch to Settings
   - Switch back to Browse
   - Verify tabs are unchanged

3. **Incognito Session Test:**
   - Open mix of normal and incognito tabs
   - Verify only normal tabs are saved
   - Restore session
   - Verify only normal tabs are restored

### Test Configuration

- **Property tests:** Minimum 100 iterations per test
- **Test framework:** Vitest for unit tests, fast-check for property-based tests
- **Coverage target:** 80% code coverage for new/modified code
- **CI Integration:** All tests must pass before merge

### Manual Testing Checklist

1. Open Arc, create multiple tabs with different URLs
2. Switch to Settings and back - verify tabs remain
3. Close Arc and reopen - verify restore dialog appears
4. Choose "Restore" - verify all tabs are restored correctly
5. Choose "Start Fresh" - verify new session starts
6. Open incognito tabs - verify they're not saved/restored
7. Test with 50+ tabs - verify performance is acceptable
8. Test with corrupted session data - verify graceful handling
