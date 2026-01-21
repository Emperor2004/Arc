import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface DatabaseConfig {
  path: string;
  busyTimeout: number;
  enableWAL: boolean;
  cacheSize: number;
  pageSize: number;
  maxConnections: number;
  operationTimeout: number;
  queueTimeout: number;
  testMode: boolean;
  retryConfig: RetryConfig;
  gracefulDegradation: boolean;
}

export const DEFAULT_CONFIG: DatabaseConfig = {
  path: 'data/arc-browser.db',
  busyTimeout: 5000,
  enableWAL: true,
  cacheSize: 10000,
  pageSize: 4096,
  maxConnections: 1,
  operationTimeout: 30000, // 30 seconds
  queueTimeout: 60000, // 60 seconds
  testMode: false,
  gracefulDegradation: true,
  retryConfig: {
    maxAttempts: 3,
    initialDelay: 100,
    maxDelay: 2000,
    backoffMultiplier: 2
  }
};

export const TEST_CONFIG: DatabaseConfig = {
  ...DEFAULT_CONFIG,
  operationTimeout: 5000, // 5 seconds in tests
  queueTimeout: 10000, // 10 seconds in tests
  testMode: true,
  gracefulDegradation: true,
  retryConfig: {
    maxAttempts: 2,
    initialDelay: 50,
    maxDelay: 500,
    backoffMultiplier: 2
  }
};

export class TimeoutError extends Error {
  constructor(message: string, public operation: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public operation: string,
    public recoverable: boolean
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

interface QueuedOperation {
  id: string;
  operation: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: number;
  enqueuedAt: number;
  timeoutHandle?: NodeJS.Timeout;
}

class OperationQueue {
  private queue: QueuedOperation[] = [];
  private isProcessing: boolean = false;
  private operationIdCounter: number = 0;

  constructor(private config: DatabaseConfig) {}

  enqueue<T>(operation: () => Promise<T>, timeout?: number): Promise<T> {
    const effectiveTimeout = timeout ?? this.config.queueTimeout;
    const operationId = `op-${++this.operationIdCounter}`;

    return new Promise<T>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        // Remove from queue if still there
        const index = this.queue.findIndex(op => op.id === operationId);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }
        reject(new TimeoutError(
          `Operation ${operationId} timed out in queue after ${effectiveTimeout}ms`,
          'queue'
        ));
      }, effectiveTimeout);

      this.queue.push({
        id: operationId,
        operation,
        resolve,
        reject,
        timeout: effectiveTimeout,
        enqueuedAt: Date.now(),
        timeoutHandle
      });

      // Start processing if not already processing
      if (!this.isProcessing) {
        this.processNext();
      }
    });
  }

  private async processNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const op = this.queue.shift()!;

    // Clear the queue timeout since we're processing now
    if (op.timeoutHandle) {
      clearTimeout(op.timeoutHandle);
    }

    try {
      const result = await op.operation();
      op.resolve(result);
    } catch (error) {
      op.reject(error as Error);
    }

    // Process next operation
    await this.processNext();
  }

  clear(): void {
    // Clear all timeout handles
    for (const op of this.queue) {
      if (op.timeoutHandle) {
        clearTimeout(op.timeoutHandle);
      }
      op.reject(new Error('Operation queue cleared'));
    }
    this.queue = [];
    this.isProcessing = false;
  }

  getStats(): { pending: number; oldestAge: number } {
    const now = Date.now();
    const oldestAge = this.queue.length > 0
      ? now - Math.min(...this.queue.map(op => op.enqueuedAt))
      : 0;
    return {
      pending: this.queue.length,
      oldestAge
    };
  }
}

export class DatabaseManager {
  private db: Database.Database | null = null;
  private statementCache: Map<string, Database.Statement> = new Map();
  private writeQueue: OperationQueue;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private config: DatabaseConfig;

  private static instance: DatabaseManager | null = null;

  private constructor(config: DatabaseConfig) {
    this.config = config;
    this.writeQueue = new OperationQueue(config);
  }

  static getInstance(config?: DatabaseConfig): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager(config ?? DEFAULT_CONFIG);
    }
    return DatabaseManager.instance;
  }

  async initialize(): Promise<void> {
    // If already initialized, return immediately
    if (this.isInitialized && this.db) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = this._doInitialize();
    
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async _doInitialize(): Promise<void> {
    // Determine database path
    const dataDir = path.dirname(this.config.path);
    
    // Ensure directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Open database
    this.db = new Database(this.config.path);
    
    // Set busy timeout
    this.db.pragma(`busy_timeout = ${this.config.busyTimeout}`);
    
    // Enable WAL mode if configured
    if (this.config.enableWAL) {
      this.db.pragma('journal_mode = WAL');
    }
    
    // Set cache size
    this.db.pragma(`cache_size = ${this.config.cacheSize}`);
    
    // Set page size
    this.db.pragma(`page_size = ${this.config.pageSize}`);
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Initialize schema
    this.initializeSchema();

    this.isInitialized = true;
  }

  private initializeSchema(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Create schema version table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      )
    `);

    // Create sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tabs TEXT NOT NULL,
        activeTabId TEXT,
        timestamp INTEGER NOT NULL,
        version TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )
    `);

    // Create tab_groups table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tab_groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        tabIds TEXT NOT NULL,
        isCollapsed INTEGER NOT NULL DEFAULT 0,
        createdAt INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )
    `);

    // Create history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        title TEXT,
        visited_at INTEGER NOT NULL,
        visit_count INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )
    `);

    // Create bookmarks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        tags TEXT,
        favicon TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )
    `);

    // Create settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )
    `);

    // Create workspaces table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        sessionSnapshot TEXT NOT NULL,
        tags TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )
    `);

    // Create indices for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_timestamp ON sessions(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_tab_groups_createdAt ON tab_groups(createdAt DESC);
      CREATE INDEX IF NOT EXISTS idx_history_url ON history(url);
      CREATE INDEX IF NOT EXISTS idx_history_visited_at ON history(visited_at DESC);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_createdAt ON bookmarks(createdAt DESC);
      CREATE INDEX IF NOT EXISTS idx_workspaces_name ON workspaces(name);
      CREATE INDEX IF NOT EXISTS idx_workspaces_updatedAt ON workspaces(updatedAt DESC);
    `);

    // Create full-text search virtual table for history
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS history_fts USING fts5(
        url,
        title,
        content='history',
        content_rowid='id'
      )
    `);
  }

  async query<T>(sql: string, params?: any[], timeout?: number): Promise<T[]> {
    const effectiveTimeout = timeout ?? this.config.operationTimeout;
    
    return this.withTimeout(
      async () => {
        // Wait for database to be ready (will auto-initialize if needed)
        await this.waitForReady(effectiveTimeout);
        const stmt = this.getStatement(sql);
        return params ? stmt.all(...params) as T[] : stmt.all() as T[];
      },
      effectiveTimeout,
      `query: ${sql}`
    );
  }

  async execute(sql: string, params?: any[], timeout?: number): Promise<{ lastInsertRowid: number; changes: number }> {
    const effectiveTimeout = timeout ?? this.config.operationTimeout;
    
    return this.writeQueue.enqueue(
      () => this.withTimeout(
        async () => {
          // Wait for database to be ready (will auto-initialize if needed)
          await this.waitForReady(effectiveTimeout);
          const stmt = this.getStatement(sql);
          const result = params ? stmt.run(...params) : stmt.run();
          return {
            lastInsertRowid: result.lastInsertRowid as number,
            changes: result.changes,
          };
        },
        effectiveTimeout,
        `execute: ${sql}`
      ),
      effectiveTimeout
    );
  }

  async transaction(operations: Array<() => void>, timeout?: number): Promise<void> {
    const effectiveTimeout = timeout ?? this.config.operationTimeout;
    
    return this.writeQueue.enqueue(
      () => this.withTimeout(
        async () => {
          await this.waitForReady();
          if (!this.db) {
            throw new Error('Database not initialized');
          }
          
          // Use BEGIN IMMEDIATE for write transactions to prevent lock escalation
          const transaction = this.db.transaction(() => {
            for (const op of operations) {
              op();
            }
          });
          
          // Execute with immediate mode
          transaction.immediate();
        },
        effectiveTimeout,
        'transaction'
      ),
      effectiveTimeout
    );
  }

  /**
   * Execute multiple operations in a single transaction (batch operation)
   */
  async batch(operations: Array<{ sql: string; params?: any[] }>, timeout?: number): Promise<void> {
    const effectiveTimeout = timeout ?? this.config.operationTimeout;
    
    return this.writeQueue.enqueue(
      () => this.withTimeout(
        async () => {
          await this.waitForReady();
          if (!this.db) {
            throw new Error('Database not initialized');
          }
          
          const transaction = this.db.transaction(() => {
            for (const op of operations) {
              const stmt = this.getStatement(op.sql);
              if (op.params) {
                stmt.run(...op.params);
              } else {
                stmt.run();
              }
            }
          });
          
          transaction.immediate();
        },
        effectiveTimeout,
        'batch'
      ),
      effectiveTimeout
    );
  }

  /**
   * Verify that required indices exist
   */
  async verifyIndices(): Promise<{ missing: string[]; existing: string[] }> {
    await this.waitForReady();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const requiredIndices = [
      'idx_sessions_timestamp',
      'idx_tab_groups_createdAt'
    ];

    const existing: string[] = [];
    const missing: string[] = [];

    for (const indexName of requiredIndices) {
      const result = this.db.prepare(
        `SELECT name FROM sqlite_master WHERE type='index' AND name=?`
      ).get(indexName);

      if (result) {
        existing.push(indexName);
      } else {
        missing.push(indexName);
      }
    }

    return { missing, existing };
  }

  getStatement(sql: string): Database.Statement {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Check cache first
    if (this.statementCache.has(sql)) {
      return this.statementCache.get(sql)!;
    }

    // Prepare and cache statement
    const stmt = this.db.prepare(sql);
    this.statementCache.set(sql, stmt);
    return stmt;
  }

  async close(): Promise<void> {
    if (!this.db) {
      return;
    }

    // Clear pending operations
    this.abortPendingOperations();

    // Checkpoint WAL if enabled
    if (this.config.enableWAL) {
      try {
        this.db.pragma('wal_checkpoint(TRUNCATE)');
      } catch (error) {
        console.error('Error checkpointing WAL:', error);
      }
    }

    // Clear statement cache
    this.statementCache.clear();

    // Close database
    this.db.close();
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Check if database is closed
   */
  isClosed(): boolean {
    return !this.isInitialized && this.db === null;
  }

  async reset(): Promise<void> {
    await this.waitForReady();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Clear all data but keep connection open
    this.db.exec('DELETE FROM sessions');
    this.db.exec('DELETE FROM tab_groups');
    this.db.exec('DELETE FROM schema_version');
  }

  isReady(): boolean {
    return this.isInitialized && this.db !== null;
  }

  /**
   * Check if database connection is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      if (!this.db) {
        return false;
      }
      // Simple health check - try to query sqlite_master
      const stmt = this.db.prepare('SELECT 1 FROM sqlite_master LIMIT 1');
      stmt.all();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Attempt to reconnect to database
   */
  async reconnect(): Promise<void> {
    console.log('Attempting database reconnection...');
    
    // Close existing connection if any
    if (this.db) {
      try {
        this.db.close();
      } catch (error) {
        console.error('Error closing database during reconnect:', error);
      }
      this.db = null;
      this.isInitialized = false;
    }

    // Clear statement cache
    this.statementCache.clear();

    // Reinitialize
    await this.initialize();
    console.log('Database reconnection successful');
  }

  async waitForReady(timeout?: number): Promise<void> {
    const effectiveTimeout = timeout ?? this.config.operationTimeout;
    const startTime = Date.now();

    while (!this.isReady()) {
      if (Date.now() - startTime > effectiveTimeout) {
        throw new TimeoutError(
          `Database not ready after ${effectiveTimeout}ms`,
          'waitForReady'
        );
      }

      // If initialization is in progress, wait for it
      if (this.initPromise) {
        await this.initPromise;
        return;
      }

      // If not initialized and no init in progress, initialize now
      if (!this.isInitialized) {
        await this.initialize();
        return;
      }

      // Small delay before checking again
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  abortPendingOperations(): void {
    this.writeQueue.clear();
  }

  getQueueStats(): { pending: number; oldestAge: number } {
    return this.writeQueue.getStats();
  }

  private async withTimeout<T>(
    operation: () => Promise<T>,
    timeout: number,
    operationName: string
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new TimeoutError(
            `Operation '${operationName}' timed out after ${timeout}ms`,
            operationName
          )),
          timeout
        )
      )
    ]);
  }

  // For testing: reset singleton
  static resetInstance(): void {
    if (DatabaseManager.instance) {
      DatabaseManager.instance.abortPendingOperations();
      DatabaseManager.instance = null;
    }
  }
}
