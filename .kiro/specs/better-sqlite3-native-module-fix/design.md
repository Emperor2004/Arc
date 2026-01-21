# Design Document: better-sqlite3 Native Module Fix

## Overview

This design addresses the ABI mismatch between better-sqlite3 (compiled for Node.js v20 MODULE_VERSION 115) and Electron v25 (requires MODULE_VERSION 116). The fix involves rebuilding the native module for Electron's Node.js version and ensuring the build process maintains this compatibility going forward.

**Environment Context:**
- Node.js: v20.13.1 (MODULE_VERSION 115)
- Electron: v25.9.8 (MODULE_VERSION 116)
- better-sqlite3: v12.5.0
- npm: 10.5.2

## Architecture

### Current Problem

The application uses Electron, which bundles its own Node.js runtime. When better-sqlite3 is installed via `npm install`, it compiles against the system Node.js (v20, MODULE_VERSION 115). However, when the Electron app runs, it uses Electron's Node.js (MODULE_VERSION 116), causing an ABI mismatch.

### Solution Architecture

```
┌─────────────────────────────────────────┐
│         npm install                      │
│  (installs dependencies)                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    postinstall hook                      │
│  electron-builder install-app-deps       │
│  (rebuilds native modules for Electron)  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   better-sqlite3.node                    │
│   Compiled for Electron v25              │
│   (MODULE_VERSION 116)                   │
└─────────────────────────────────────────┘
```

### Build Process Flow

1. **Clean Installation**: Remove existing node_modules to ensure fresh build
2. **Dependency Installation**: Run `npm install` to fetch packages
3. **Native Module Rebuild**: Use `electron-builder install-app-deps` (already in postinstall) or manual `npx electron-rebuild`
4. **Verification**: Test database operations and Jarvis functionality

## Components and Interfaces

### 1. Package Configuration (package.json)

**Current State:**
- Has `postinstall: "electron-builder install-app-deps"` which should rebuild native modules
- May not be executing correctly or may need explicit electron-rebuild

**Required Changes:**
- Verify postinstall hook executes
- Add explicit rebuild script for manual fixes: `"rebuild": "electron-rebuild -f -w better-sqlite3"`
- Ensure @electron/rebuild is available (electron-builder should provide this)

### 2. Native Module Rebuild Process

**Tool Options:**
- `electron-builder install-app-deps`: Automatic, runs on postinstall
- `npx electron-rebuild`: Manual, explicit rebuild for Electron
- `npm rebuild better-sqlite3 --build-from-source`: Would rebuild for Node.js (wrong target)

**Selected Approach:**
Use `electron-rebuild` to explicitly target Electron's Node.js version.

### 3. Database Manager Integration

**Location:** `src/core/database/DatabaseManager.ts`

**Current Behavior:**
- Attempts to load better-sqlite3
- Fails with MODULE_VERSION mismatch
- Error propagates to all database stores

**Expected Behavior After Fix:**
- Loads better-sqlite3 successfully
- Initializes database connections
- Executes queries without ABI errors

### 4. Jarvis Integration

**Location:** `src/core/ollamaClient.ts`, `src/renderer/components/JarvisPanel.tsx`

**Current Behavior:**
- Database error occurs before Ollama call
- Error message incorrectly suggests Ollama issue
- User sees: "Check that Ollama is running and the model name is correct"

**Expected Behavior After Fix:**
- Database operations succeed
- Jarvis can access recommendation/history data
- Actual Ollama errors (if any) are reported correctly

## Data Models

No data model changes required. The fix operates at the build/compilation level.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Native Module ABI Compatibility
*For any* Electron application startup, the loaded better-sqlite3 module SHALL have MODULE_VERSION matching Electron's Node.js version (116 for Electron v25)
**Validates: Requirements 1.1, 1.2**

### Property 2: Database Operation Success
*For any* database operation (read, write, query) after the fix, the operation SHALL complete without throwing ABI mismatch errors
**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 3: Jarvis Error Accuracy
*For any* Jarvis message request, IF a database error occurs, THEN it SHALL NOT be a better-sqlite3 ABI error
**Validates: Requirements 4.1, 4.2, 4.3**

### Property 4: Build Process Idempotence
*For any* clean installation followed by rebuild, the native module SHALL consistently compile for the correct Electron version
**Validates: Requirements 2.1, 2.2**

### Property 5: Test Suite Execution
*For any* test that uses database functionality, the test SHALL execute without MODULE_VERSION errors
**Validates: Requirements 5.2**

## Error Handling

### Current Error

```
Error: The module '...\better_sqlite3.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 115. This version of Node.js requires
NODE_MODULE_VERSION 116. Please try re-compiling or re-installing
the module (for instance, using 'npm rebuild' or 'npm install').
```

### Error Prevention Strategy

1. **Postinstall Hook**: Ensure `electron-builder install-app-deps` runs successfully
2. **Manual Rebuild Script**: Provide `npm run rebuild` for explicit fixes
3. **CI/CD Integration**: Document rebuild requirements for deployment pipelines
4. **Developer Documentation**: Add troubleshooting guide for native module issues

### Graceful Degradation

If better-sqlite3 fails to load:
- Application should log clear error message
- Suggest running `npm run rebuild`
- Prevent cascade failures in unrelated features

## Testing Strategy

### Unit Tests

Unit tests will verify specific scenarios:
- Database connection establishment
- Query execution without errors
- Error message accuracy in Jarvis

### Property-Based Tests

Property-based tests will verify universal behaviors:
- Module version compatibility across different load scenarios
- Database operations succeed for various query types
- Build process consistency across clean installs

### Integration Tests

Integration tests will verify end-to-end flows:
- Application startup with database initialization
- Jarvis message flow with database access
- History/bookmark operations through UI

### Manual Verification Steps

1. **Clean Install Test**:
   - Delete node_modules
   - Run `npm install`
   - Verify no ABI errors in console
   - Start app and check database operations

2. **Jarvis Functionality Test**:
   - Start Ollama with a model
   - Send message to Jarvis
   - Verify response or appropriate Ollama error (not database error)

3. **Database Operations Test**:
   - Add bookmark
   - View history
   - Change settings
   - Verify all persist correctly

### Test Configuration

- Use vitest for unit and property tests
- Use fast-check for property-based testing
- Minimum 100 iterations per property test
- Tag format: **Feature: better-sqlite3-native-module-fix, Property {number}: {property_text}**
