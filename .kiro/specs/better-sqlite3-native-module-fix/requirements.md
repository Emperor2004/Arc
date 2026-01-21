# Requirements Document

## Introduction

Fix the better-sqlite3 native module ABI mismatch that prevents Jarvis and database operations from functioning. The module was compiled against Node.js MODULE_VERSION 115 but Electron v25 requires MODULE_VERSION 116, causing runtime errors that break core functionality.

## Glossary

- **Native_Module**: A Node.js addon compiled from C/C++ code that must match the exact Node.js ABI version
- **ABI**: Application Binary Interface - the compiled interface version that must match between the module and runtime
- **Electron**: Desktop application framework that uses its own Node.js version (v25.9.8 uses MODULE_VERSION 116)
- **better-sqlite3**: Native SQLite3 database module used by the application
- **Jarvis**: AI assistant feature that depends on database functionality
- **Database_Stores**: Core data persistence layer (history, bookmarks, settings) that uses better-sqlite3

## Requirements

### Requirement 1: Native Module Compilation

**User Story:** As a developer, I want better-sqlite3 compiled for the correct Electron version, so that database operations work without ABI errors.

#### Acceptance Criteria

1. WHEN better-sqlite3 is installed, THE Build_System SHALL compile it against Electron v25's Node.js ABI (MODULE_VERSION 116)
2. WHEN the application starts, THE Native_Module SHALL load without version mismatch errors
3. WHEN database operations execute, THE better-sqlite3 module SHALL function correctly in the Electron main process
4. THE Build_System SHALL use electron-rebuild or equivalent to ensure correct ABI targeting

### Requirement 2: Clean Installation Process

**User Story:** As a developer, I want a reliable installation process, so that native modules are always built correctly.

#### Acceptance Criteria

1. WHEN running npm install, THE postinstall script SHALL rebuild native modules for Electron
2. WHEN native module mismatches occur, THE developer SHALL be able to run a rebuild command to fix them
3. THE package.json SHALL include appropriate scripts for rebuilding native modules
4. WHEN dependencies are installed, THE system SHALL verify no other native module mismatches exist

### Requirement 3: Database Functionality Restoration

**User Story:** As a user, I want database operations to work reliably, so that my browsing data persists correctly.

#### Acceptance Criteria

1. WHEN the application accesses the database, THE Database_Stores SHALL execute queries without errors
2. WHEN reading history data, THE system SHALL retrieve records successfully
3. WHEN writing bookmark data, THE system SHALL persist records successfully
4. WHEN accessing settings, THE system SHALL read and write configuration without errors

### Requirement 4: Jarvis Error Resolution

**User Story:** As a user, I want Jarvis to work without database errors, so that I can interact with the AI assistant.

#### Acceptance Criteria

1. WHEN Jarvis receives a message, THE system SHALL NOT throw better-sqlite3 ABI errors
2. WHEN Jarvis fails, THE error message SHALL reflect the actual issue (Ollama connectivity, model availability) not database errors
3. WHEN Jarvis accesses recommendation data, THE Database_Stores SHALL respond without native module errors
4. IF Ollama is running and configured correctly, THEN Jarvis SHALL respond to user messages successfully

### Requirement 5: Build and Test Verification

**User Story:** As a developer, I want automated verification, so that I can confirm the fix works across all code paths.

#### Acceptance Criteria

1. WHEN running npm run build, THE build process SHALL complete without native module errors
2. WHEN running database tests, THE test suite SHALL execute without ABI mismatch errors
3. WHEN running the application in development mode, THE console SHALL not show better-sqlite3 version errors
4. THE verification process SHALL confirm all database-dependent features work correctly
