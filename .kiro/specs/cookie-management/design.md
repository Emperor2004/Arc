# Design Document: Cookie Management

## Overview

This design document specifies the implementation of cookie management functionality for the Arc browser using Electron's session API. The system provides comprehensive cookie handling capabilities including storage, retrieval, clearing, and inspection of cookies. The implementation follows a layered architecture with clear separation between the main process (cookie operations), IPC communication layer, preload script (security boundary), and renderer UI components.

The cookie management system integrates seamlessly with Arc's existing architecture, respecting incognito session isolation and following established patterns for IPC communication and UI design.

## Architecture

### System Components

The cookie management system consists of four primary layers:

1. **Main Process Layer (Cookie Manager)**
   - Interfaces directly with Electron's `session.cookies` API
   - Manages both Normal_Session and Incognito_Session cookies
   - Implements cookie CRUD operations (Create, Read, Update, Delete)
   - Handles session resolution based on context

2. **IPC Communication Layer**
   - Exposes cookie operations through IPC handlers
   - Validates requests and parameters
   - Provides error handling and logging
   - Returns structured responses with status and data

3. **Preload Script Layer**
   - Acts as security boundary using contextBridge
   - Exposes type-safe cookie API to renderer processes
   - Translates renderer calls to IPC invocations
   - Provides TypeScript type definitions

4. **Renderer UI Layer**
   - Settings view with cookie management controls
   - Optional per-site cookie inspection interface
   - User feedback and confirmation dialogs
   - Integration with existing glassmorphism design

### Data Flow

```
User Action (Settings UI)
    ↓
window.arc.clearCookies()
    ↓
Preload Script (contextBridge)
    ↓
IPC Channel (arc:clearCookies)
    ↓
Main Process Handler
    ↓
Electron session.cookies API
    ↓
Response (success + count)
    ↓
UI Update (show message)
```

## Components and Interfaces

### Main Process: Cookie Manager

The cookie manager will be implemented in `src/main/ipc.ts` as IPC handlers that interact with Electron's session API.

#### Session Resolution

```typescript
function getSessionForContext(incognito: boolean = false): Electron.Session {
  if (incognito) {
    // Return incognito session partition
    return session.fromPartition('incognito', { cache: false });
  }
  // Return default session for normal browsing
  return session.defaultSession;
}
```

#### Cookie Operations

**Get Cookies**
```typescript
interface GetCookiesFilter {
  url?: string;
  domain?: string;
  name?: string;
}

async function getCookies(
  filter?: GetCookiesFilter,
  incognito: boolean = false
): Promise<Electron.Cookie[]> {
  const targetSession = getSessionForContext(incognito);
  const cookies = await targetSession.cookies.get(filter || {});
  return cookies;
}
```

**Clear All Cookies**
```typescript
interface ClearCookiesResult {
  ok: boolean;
  cleared: number;
  error?: string;
}

async function clearAllCookies(
  incognito: boolean = false
): Promise<ClearCookiesResult> {
  try {
    const targetSession = getSessionForContext(incognito);
    const cookies = await targetSession.cookies.get({});
    
    for (const cookie of cookies) {
      const url = constructCookieUrl(cookie);
      await targetSession.cookies.remove(url, cookie.name);
    }
    
    return { ok: true, cleared: cookies.length };
  } catch (error) {
    return {
      ok: false,
      cleared: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

**Clear Cookies for URL**
```typescript
async function clearCookiesForUrl(
  url: string,
  incognito: boolean = false
): Promise<ClearCookiesResult> {
  try {
    const targetSession = getSessionForContext(incognito);
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;
    
    // Get cookies matching the domain
    const cookies = await targetSession.cookies.get({ domain });
    
    for (const cookie of cookies) {
      const cookieUrl = constructCookieUrl(cookie);
      await targetSession.cookies.remove(cookieUrl, cookie.name);
    }
    
    return { ok: true, cleared: cookies.length };
  } catch (error) {
    return {
      ok: false,
      cleared: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

**Helper: Construct Cookie URL**
```typescript
function constructCookieUrl(cookie: Electron.Cookie): string {
  const protocol = cookie.secure ? 'https' : 'http';
  const domain = cookie.domain.startsWith('.') 
    ? cookie.domain.substring(1) 
    : cookie.domain;
  return `${protocol}://${domain}${cookie.path}`;
}
```

### IPC Handlers

The IPC handlers will be added to `src/main/ipc.ts` in the `setupIpc` function:

```typescript
// Cookie management handlers
ipcMain.handle('arc:getCookies', async (_event, filter?: GetCookiesFilter) => {
  try {
    const cookies = await getCookies(filter);
    return { ok: true, cookies };
  } catch (err) {
    console.error('Error in arc:getCookies handler:', err);
    return { 
      ok: false, 
      cookies: [],
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
});

ipcMain.handle('arc:clearCookies', async () => {
  try {
    const result = await clearAllCookies();
    return result;
  } catch (err) {
    console.error('Error in arc:clearCookies handler:', err);
    return { 
      ok: false, 
      cleared: 0,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
});

ipcMain.handle('arc:clearCookiesForUrl', async (_event, url: string) => {
  try {
    const result = await clearCookiesForUrl(url);
    return result;
  } catch (err) {
    console.error('Error in arc:clearCookiesForUrl handler:', err);
    return { 
      ok: false, 
      cleared: 0,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
});
```

### Preload Script API

The preload script (`src/main/preload.ts`) will expose cookie methods through the `window.arc` object:

```typescript
// Add to contextBridge.exposeInMainWorld('arc', { ... })

// Cookie methods
getCookies: (filter?: { url?: string; domain?: string; name?: string }) => 
  ipcRenderer.invoke('arc:getCookies', filter),
  
clearCookies: () => 
  ipcRenderer.invoke('arc:clearCookies'),
  
clearCookiesForUrl: (url: string) => 
  ipcRenderer.invoke('arc:clearCookiesForUrl', url),
```

### TypeScript Type Definitions

Add to `src/renderer/types/global.d.ts`:

```typescript
interface CookieInfo {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  expirationDate?: number;
}

interface ClearCookiesResult {
  ok: boolean;
  cleared: number;
  error?: string;
}

interface GetCookiesResult {
  ok: boolean;
  cookies: CookieInfo[];
  error?: string;
}

interface Window {
  arc: {
    // ... existing methods ...
    
    // Cookie methods
    getCookies(filter?: { 
      url?: string; 
      domain?: string; 
      name?: string 
    }): Promise<GetCookiesResult>;
    
    clearCookies(): Promise<ClearCookiesResult>;
    
    clearCookiesForUrl(url: string): Promise<ClearCookiesResult>;
  };
}
```

## Data Models

### Cookie Information

```typescript
interface CookieInfo {
  name: string;              // Cookie name
  value: string;             // Cookie value
  domain: string;            // Domain (e.g., ".example.com")
  path: string;              // Path (e.g., "/")
  secure: boolean;           // HTTPS only flag
  httpOnly: boolean;         // HTTP only flag (not accessible via JS)
  expirationDate?: number;   // Unix timestamp (optional for session cookies)
  sameSite?: 'no_restriction' | 'lax' | 'strict';  // SameSite attribute
}
```

### Operation Results

```typescript
interface ClearCookiesResult {
  ok: boolean;               // Operation success status
  cleared: number;           // Number of cookies removed
  error?: string;            // Error message if operation failed
}

interface GetCookiesResult {
  ok: boolean;               // Operation success status
  cookies: CookieInfo[];     // Array of cookie information
  error?: string;            // Error message if operation failed
}
```

### Cookie Filter

```typescript
interface GetCookiesFilter {
  url?: string;              // Filter by URL (includes domain and path)
  domain?: string;           // Filter by domain
  name?: string;             // Filter by cookie name
}
```

## Error Handling

### Error Categories

1. **Session Errors**: Session unavailable or not initialized
2. **URL Parsing Errors**: Invalid URL format provided
3. **Cookie Operation Errors**: Electron API failures
4. **Permission Errors**: Insufficient permissions to access cookies

### Error Handling Strategy

```typescript
async function handleCookieOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T | { ok: false; error: string }> {
  try {
    return await operation();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Cookie operation '${operationName}' failed:`, errorMessage);
    
    // Log for debugging without exposing sensitive cookie data
    console.error('Error details:', {
      operation: operationName,
      timestamp: new Date().toISOString(),
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });
    
    return {
      ok: false,
      error: `Failed to ${operationName}: ${errorMessage}`
    };
  }
}
```

### UI Error Display

```typescript
function showCookieError(operation: string, error?: string): void {
  const message = error 
    ? `Failed to ${operation}: ${error}`
    : `Failed to ${operation}. Please try again.`;
  
  showMessage(message);
}
```

## Testing Strategy

The cookie management feature will be tested using both unit tests and property-based tests to ensure comprehensive coverage and correctness.

### Unit Testing Approach

Unit tests will focus on:
- **Specific examples**: Testing cookie operations with known inputs and expected outputs
- **Edge cases**: Empty cookie stores, invalid URLs, malformed cookie data
- **Error conditions**: Session unavailable, permission denied, network errors
- **Integration points**: IPC handler responses, UI component interactions

Unit tests will use mocking to isolate components:
- Mock Electron's `session.cookies` API for main process tests
- Mock IPC communication for preload script tests
- Mock `window.arc` API for UI component tests

### Property-Based Testing Approach

Property-based tests will verify universal properties across randomized inputs. Each test will run a minimum of 100 iterations to ensure comprehensive coverage.

**Test Configuration**:
- Framework: fast-check (TypeScript property-based testing library)
- Iterations: 100 minimum per property test
- Each property test references its design document property using the tag format:
  `// Feature: cookie-management, Property {N}: {property_text}`

**Property Test Structure**:
```typescript
import * as fc from 'fast-check';

describe('Cookie Management Properties', () => {
  it('Property N: {property description}', () => {
    // Feature: cookie-management, Property N: {property text}
    fc.assert(
      fc.property(
        // Generators for random test data
        fc.record({
          name: fc.string(),
          value: fc.string(),
          domain: fc.domain(),
          // ... other cookie properties
        }),
        (cookie) => {
          // Property assertion
          // ...
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Test Organization

```
src/core/
  cookieManager.test.ts          # Unit tests for cookie operations
  cookieManager.pbt.test.ts      # Property-based tests

src/main/
  ipc.test.ts                    # Unit tests for IPC handlers (existing file)

src/renderer/components/
  SettingsView.test.tsx          # Unit tests for UI components (existing file)
```

### Mock Strategy

**Electron Session Mock**:
```typescript
const mockSession = {
  cookies: {
    get: jest.fn(),
    remove: jest.fn(),
    set: jest.fn()
  }
};
```

**IPC Mock**:
```typescript
const mockIpcRenderer = {
  invoke: jest.fn()
};
```


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

The following properties define the correctness criteria for the cookie management system. Each property is universally quantified and will be validated through property-based testing.

### Property 1: Cookie Retrieval with Filters

*For any* URL filter provided to getCookies, all returned cookies should match the filter criteria (domain, path, or name), and no cookies that don't match the filter should be included in the results.

**Validates: Requirements 1.3**

### Property 2: Cookie Attribute Preservation

*For any* cookie retrieved through getCookies, all cookie attributes (name, value, domain, path, secure, httpOnly, expirationDate, sameSite) should be present and unchanged from their stored values.

**Validates: Requirements 1.5**

### Property 3: Clear All Cookies Completeness

*For any* set of cookies in the Normal_Session, after calling clearCookies, getCookies should return an empty array, confirming all cookies were removed.

**Validates: Requirements 2.1**

### Property 4: Cookie Count Accuracy

*For any* cookie clearing operation (clearCookies or clearCookiesForUrl), the count returned in the result should exactly match the number of cookies that existed before the operation and matched the clearing criteria.

**Validates: Requirements 2.2, 3.2**

### Property 5: Session Isolation

*For any* cookie operation (get, clear, or set) performed on Normal_Session, the cookies in Incognito_Session should remain completely unchanged, and vice versa, ensuring complete isolation between session types.

**Validates: Requirements 2.3, 8.2, 8.4**

### Property 6: Clear Operation Success

*For any* valid cookie clearing operation (clearCookies or clearCookiesForUrl with valid URL), the operation should complete successfully and return ok: true in the result.

**Validates: Requirements 2.4**

### Property 7: Domain-Specific Cookie Clearing

*For any* URL provided to clearCookiesForUrl and any set of cookies, only cookies whose domain matches the URL's domain (including subdomain matching rules) should be removed, and all cookies from other domains should be preserved.

**Validates: Requirements 3.1, 3.3, 3.4**

### Property 8: IPC Response Structure

*For any* IPC handler invocation (getCookies, clearCookies, clearCookiesForUrl), the response should always contain an 'ok' boolean field, and when ok is true, should contain the relevant data field (cookies or cleared count), and when ok is false, should contain an error message.

**Validates: Requirements 4.5**

### Property 9: Session Context Resolution

*For any* cookie operation with an incognito context flag, the operation should use the Incognito_Session partition, and for any operation without the flag or with incognito: false, the operation should use the Normal_Session.

**Validates: Requirements 4.4, 8.1**

### Property 10: Preload IPC Invocation

*For any* call to window.arc cookie methods (getCookies, clearCookies, clearCookiesForUrl), the preload script should invoke the corresponding IPC handler with the correct channel name and parameters.

**Validates: Requirements 5.4**

### Property 11: UI Cookie Display

*For any* set of cookies returned from getCookies for the current site, the Settings UI should display all cookie names, domains, and expiration dates in the rendered output.

**Validates: Requirements 7.2**

### Property 12: UI Current Tab URL Usage

*For any* current tab URL, when viewing site-specific cookies, the getCookies call should use that exact URL as the filter parameter.

**Validates: Requirements 7.3**

### Property 13: UI API Invocation

*For any* click on the "Clear all cookies" button, the Settings UI should invoke window.arc.clearCookies and handle the response.

**Validates: Requirements 6.3**

### Property 14: UI Count Display

*For any* successful cookie clearing operation that returns a count, the Settings UI should display that exact count to the user in the feedback message.

**Validates: Requirements 6.4**

### Property 15: Error Response Structure

*For any* cookie operation that fails (throws an exception or encounters an error), the returned result should have ok: false and should include a descriptive error message in the error field.

**Validates: Requirements 10.1**

### Property 16: UI Error Display

*For any* error response received from a cookie API call, the Settings UI should display a user-friendly error message to the user.

**Validates: Requirements 10.2**

### Property 17: Invalid URL Error Handling

*For any* invalid URL string provided to clearCookiesForUrl (malformed, missing protocol, invalid characters), the function should return an error response rather than throwing an exception or crashing.

**Validates: Requirements 10.4**
