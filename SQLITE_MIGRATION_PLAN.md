# SQLite Migration Plan

## Current State

According to README.md:
- **SQLite Database** should store: History, Tab Groups, Session Data, Settings
- **JSON Storage (localStorage)** should store: User Feedback, Personalization

## Current Implementation

- ✅ **Tab Groups**: Already using SQLite (`tabGroupManager.ts`)
- ✅ **Session Data**: Already using SQLite (`sessionManager.ts`)
- ❌ **History**: Using localStorage (`historyStore.ts`)
- ❌ **Bookmarks**: Using localStorage (`bookmarkStore.ts`)
- ❌ **Settings**: Using localStorage (`settingsStore.ts` and `settingsStoreMain.ts`)
- ✅ **Feedback**: Using localStorage (correct per README)

## Migration Steps

### 1. Database Schema ✅
- Added `history` table with full-text search support
- Added `bookmarks` table
- Added `settings` table (key-value store)

### 2. Create SQLite-based Store Implementations

#### historyStoreMain.ts
- Use SQLite for all operations
- Support full-text search via FTS5
- Maintain same API as current historyStore

#### bookmarkStoreMain.ts
- Use SQLite for all operations
- Maintain same API as current bookmarkStore

#### settingsStoreMain.ts (already exists)
- Update to use SQLite instead of localStorage
- Use key-value table structure

### 3. Update IPC Handlers
- Update IPC handlers to use `*Main` versions
- Keep renderer-safe versions for direct access (if needed)

### 4. Migration Strategy
- On first run, migrate existing localStorage data to SQLite
- Provide fallback for renderer process (use IPC)

## Files to Create/Modify

1. ✅ `src/core/database/DatabaseManager.ts` - Added schema
2. ⏳ `src/core/historyStoreMain.ts` - Create SQLite version
3. ⏳ `src/core/bookmarkStoreMain.ts` - Create SQLite version
4. ⏳ `src/core/settingsStoreMain.ts` - Update to use SQLite
5. ⏳ `src/main/ipc.ts` - Update imports to use Main versions
6. ⏳ Migration utility to move localStorage → SQLite
