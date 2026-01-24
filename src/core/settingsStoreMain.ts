import { ArcSettings } from './types';
import { getDatabaseManager } from './database';
import { BrowserWindow } from 'electron';

// In-memory settings cache
let cachedSettings: ArcSettings | null = null;

// Debounced disk write timer
let diskWriteTimer: NodeJS.Timeout | null = null;
const DISK_WRITE_DEBOUNCE_MS = 500;

const DEFAULT_SETTINGS: ArcSettings = {
  theme: 'system',
  jarvisEnabled: true,
  useHistoryForRecommendations: true,
  incognitoEnabled: true,
  searchEngine: 'google',
  tabOrder: [],
  keyboardShortcutsEnabled: true,
  restorePreviousSession: true,
  // Personalization defaults
  recencyWeight: 0.5,
  frequencyWeight: 0.3,
  feedbackWeight: 0.2,
  minScore: 0.1,
  maxRecommendations: 5,
  ollamaModel: 'llama3:latest',
  ollamaEnabled: true,
  ollamaEndpoint: 'http://localhost:11434',
  // Translation defaults
  translationEnabled: true,
  defaultTargetLanguage: 'en',
  autoDetectLanguage: true,
  translationCacheEnabled: true,
  // Voice commands defaults
  voiceCommandsEnabled: true,
  voiceLanguage: 'en-US',
  voiceContinuousMode: false,
  voiceConfidenceThreshold: 0.7,
  // Accessibility defaults
  reducedMotion: false,
  highContrast: false,
  fontSize: 'medium',
  focusIndicators: true,
  screenReaderOptimizations: false,
  // Preloading defaults
  preloadingEnabled: false, // Disabled by default, requires user consent
  preloadingConsent: false,
  preloadingMaxConnections: 3,
  preloadingTimeout: 5000,
  preloadingOnlyOnWifi: true,
  preloadingMinConfidence: 0.3,
};

/**
 * Load settings from SQLite database (Node.js main process)
 */
export async function getSettings(): Promise<ArcSettings> {
  // Return cached settings if available
  if (cachedSettings) {
    return cachedSettings;
  }
  
  try {
    const db = await getDatabaseManager();
    
    // Load all settings from database
    const rows = await db.query<{ key: string; value: string }>(
      'SELECT key, value FROM settings'
    );
    
    // Convert rows to settings object
    const stored: Partial<ArcSettings> = {};
    for (const row of rows) {
      try {
        stored[row.key as keyof ArcSettings] = JSON.parse(row.value) as any;
      } catch {
        // If JSON parse fails, try direct assignment
        stored[row.key as keyof ArcSettings] = row.value as any;
      }
    }
    
    // Merge with defaults and cache
    cachedSettings = { ...DEFAULT_SETTINGS, ...stored };
    return cachedSettings;
  } catch (error) {
    console.error('Error loading settings from database:', error);
    // Return defaults and save them
    cachedSettings = DEFAULT_SETTINGS;
    await saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to SQLite database (Node.js main process)
 * This is the actual disk write operation
 */
async function saveSettings(settings: ArcSettings): Promise<void> {
  try {
    console.log('💾 [Settings] Persisting settings to disk');
    const db = await getDatabaseManager();
    
    // Save each setting as a key-value pair
    await db.execute('BEGIN TRANSACTION');
    
    try {
      for (const [key, value] of Object.entries(settings)) {
        const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
        await db.execute(
          'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
          [key, valueStr, Date.now()]
        );
      }
      
      await db.execute('COMMIT');
      console.log('💾 [Settings] Settings persisted to disk successfully');
    } catch (error) {
      await db.execute('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error saving settings to database:', error);
    throw error;
  }
}

/**
 * Debounced disk write - batches rapid updates
 */
function scheduleDiskWrite(settings: ArcSettings): void {
  // Clear existing timer
  if (diskWriteTimer) {
    clearTimeout(diskWriteTimer);
  }
  
  // Schedule new write
  diskWriteTimer = setTimeout(() => {
    saveSettings(settings).catch(error => {
      console.error('💾 [Settings] Failed to persist settings:', error);
    });
    diskWriteTimer = null;
  }, DISK_WRITE_DEBOUNCE_MS);
}

/**
 * Broadcast settings update to all renderer windows
 */
function broadcastSettingsUpdate(settings: ArcSettings): void {
  const windows = BrowserWindow.getAllWindows();
  console.log(`📢 [Settings] Broadcasting settings update to ${windows.length} window(s)`);
  
  windows.forEach(window => {
    if (!window.isDestroyed()) {
      window.webContents.send('settings:updated', settings);
    }
  });
}

/**
 * Update settings (Node.js main process)
 * Updates in-memory cache immediately, broadcasts to renderers, and schedules disk write
 */
export async function updateSettings(updates: Partial<ArcSettings>): Promise<ArcSettings> {
  try {
    console.log('🔧 [Settings] Updating settings:', Object.keys(updates));
    
    // Get current settings (from cache or database)
    const currentSettings = await getSettings();
    
    // Update in-memory cache immediately
    const newSettings = { ...currentSettings, ...updates };
    cachedSettings = newSettings;
    
    // Broadcast to all renderer windows immediately
    broadcastSettingsUpdate(newSettings);
    
    // Schedule debounced disk write
    scheduleDiskWrite(newSettings);
    
    return newSettings;
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
}

/**
 * Flush any pending disk writes immediately
 * Call this before app quit to ensure settings are saved
 */
export async function flushSettings(): Promise<void> {
  if (diskWriteTimer) {
    clearTimeout(diskWriteTimer);
    diskWriteTimer = null;
  }
  
  if (cachedSettings) {
    await saveSettings(cachedSettings);
  }
}

/**
 * Reset settings to defaults (Node.js main process)
 */
export async function resetSettings(): Promise<ArcSettings> {
  try {
    await saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error resetting settings:', error);
    throw error;
  }
}
