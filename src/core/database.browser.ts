/**
 * Browser-safe database fallback
 * This file is used when the code is bundled for the renderer process
 * It provides clear error messages instead of attempting database operations
 */

export class DatabaseManager {
  static getInstance() {
    throw new Error(
      'Database access is not allowed from renderer process. ' +
      'Use IPC (window.electron.invoke) to communicate with the main process instead. ' +
      'Available IPC channels: arc:getRecentHistory, arc:saveSession, arc:loadSession, etc.'
    );
  }
}

export function getDatabaseManager(): never {
  throw new Error(
    'Database access is not allowed from renderer process. ' +
    'Use IPC (window.electron.invoke) to communicate with the main process instead. ' +
    'Available IPC channels: arc:getRecentHistory, arc:saveSession, arc:loadSession, etc.'
  );
}

export async function initializeDatabase(): Promise<never> {
  throw new Error(
    'Database initialization is not allowed from renderer process. ' +
    'The database is automatically initialized in the main process.'
  );
}

export async function closeDatabase(): Promise<never> {
  throw new Error(
    'Database close is not allowed from renderer process. ' +
    'The database is automatically closed when the app quits.'
  );
}

export async function resetDatabase(): Promise<never> {
  throw new Error(
    'Database reset is not allowed from renderer process. ' +
    'This operation is only available in the main process for testing.'
  );
}