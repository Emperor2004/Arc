# Environment Documentation

## Session 2026-01-16 – Fix better-sqlite3 ABI mismatch

### Current Environment

- **Node.js Version**: v20.13.1 (NODE_MODULE_VERSION 115)
- **npm Version**: 10.5.2
- **Electron Version**: v25.9.8 (NODE_MODULE_VERSION 116)
- **better-sqlite3 Version**: v12.5.0
- **Operating System**: Windows (win32)
- **Package Manager**: npm (package-lock.json present)

### Problem Description

The module `better_sqlite3.node` was compiled against Node.js v20 (NODE_MODULE_VERSION 115), but Electron v25 requires NODE_MODULE_VERSION 116. This causes the following error:

```
Error: The module '...\better_sqlite3.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 115. This version of Node.js requires
NODE_MODULE_VERSION 116. Please try re-compiling or re-installing
the module (for instance, using 'npm rebuild' or 'npm install').
```

### Impact

- **Database Operations**: All database stores (history, bookmarks, settings, sessions) fail to initialize
- **Jarvis AI Assistant**: Fails with misleading error message suggesting Ollama connectivity issues
- **Application Stability**: Core features dependent on SQLite are non-functional

### Root Cause

When `npm install` runs, better-sqlite3 compiles its native addon against the system Node.js (v20). However, Electron bundles its own Node.js runtime (v25 uses a different ABI version). The postinstall hook `electron-builder install-app-deps` should rebuild native modules for Electron, but it appears to not be executing correctly or needs explicit invocation.

### Solution Approach

1. Explicitly rebuild better-sqlite3 for Electron v25 using `electron-rebuild`
2. Verify the postinstall hook is working correctly
3. Add manual rebuild scripts for future maintenance
4. Test all database-dependent functionality
