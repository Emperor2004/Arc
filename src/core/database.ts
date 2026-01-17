import type { DatabaseManager as DatabaseManagerType } from './database/DatabaseManager';

// Detect if we're in the main process or renderer process
function isMainProcess(): boolean {
  try {
    // In Electron, process.type is undefined in main process, 'renderer' in renderer
    return typeof process !== 'undefined' && process.type !== 'renderer';
  } catch {
    return false;
  }
}

// Lazy import to avoid loading DatabaseManager in renderer
let DatabaseManagerClass: typeof DatabaseManagerType | null = null;
let DEFAULT_CONFIG: any = null;

async function loadDatabaseManager() {
  if (!DatabaseManagerClass) {
    const module = await import('./database/DatabaseManager');
    DatabaseManagerClass = module.DatabaseManager as any;
    DEFAULT_CONFIG = module.DEFAULT_CONFIG;
  }
}

// Get the singleton DatabaseManager instance (only in main process)
let manager: DatabaseManagerType | null = null;

/**
 * Get the DatabaseManager instance
 * Use this for all database operations
 * @throws Error if called from renderer process
 */
export async function getDatabaseManager(): Promise<DatabaseManagerType> {
  if (!isMainProcess()) {
    throw new Error(
      'Database access is not allowed from renderer process. ' +
      'Use IPC (window.electron.invoke) to communicate with the main process instead.'
    );
  }
  
  await loadDatabaseManager();
  
  if (!manager) {
    manager = (DatabaseManagerClass as any).getInstance(DEFAULT_CONFIG);
  }
  
  if (!manager) {
    throw new Error('Failed to initialize DatabaseManager');
  }
  
  return manager;
}

/**
 * Initialize database (call on app start in main process)
 * @throws Error if called from renderer process
 */
export async function initializeDatabase(): Promise<void> {
  if (!isMainProcess()) {
    throw new Error(
      'Database initialization is not allowed from renderer process. ' +
      'The database is automatically initialized in the main process.'
    );
  }
  
  const manager = await getDatabaseManager();
  await manager.initialize();
}

/**
 * Close database connection
 * @throws Error if called from renderer process
 */
export async function closeDatabase(): Promise<void> {
  if (!isMainProcess()) {
    throw new Error(
      'Database close is not allowed from renderer process. ' +
      'The database is automatically closed when the app quits.'
    );
  }
  
  const manager = await getDatabaseManager();
  await manager.close();
}

/**
 * Reset database (for testing only)
 * @throws Error if called from renderer process or in production
 */
export async function resetDatabase(): Promise<void> {
  if (!isMainProcess()) {
    throw new Error(
      'Database reset is not allowed from renderer process. ' +
      'This operation is only available in the main process for testing.'
    );
  }
  
  const manager = await getDatabaseManager();
  
  // Only allow reset in test mode
  if (process.env.NODE_ENV !== 'test' && process.env.VITEST !== 'true') {
    throw new Error('Database reset is only allowed in test mode.');
  }
  
  await manager.reset();
}
