/**
 * Renderer-safe settings service
 * Communicates with main process for settings operations
 */

import { ArcSettings } from '../../core/types';

// Default settings for development
const DEFAULT_SETTINGS: ArcSettings = {
  theme: 'system',
  jarvisEnabled: true,
  useHistoryForRecommendations: true,
  incognitoEnabled: true,
  searchEngine: 'google',
  restorePreviousSession: true,
  personalization: {
    frequencyWeight: 0.4,
    recencyWeight: 0.3,
    feedbackWeight: 0.3,
    diversityThreshold: 0.7,
    minConfidenceScore: 0.1,
    maxRecommendations: 10,
    ollamaModel: 'llama3:latest',
    ollamaEndpoint: 'http://localhost:11434'
  }
};

// In-memory settings for development
let memorySettings: ArcSettings = { ...DEFAULT_SETTINGS };

export function getSettings(): ArcSettings {
  // In development, use memory storage
  if (process.env.NODE_ENV === 'development') {
    return memorySettings;
  }
  
  // In production, this would communicate with main process via IPC
  return DEFAULT_SETTINGS;
}

export function updateSettings(updates: Partial<ArcSettings>): void {
  // In development, use memory storage
  if (process.env.NODE_ENV === 'development') {
    memorySettings = { ...memorySettings, ...updates };
    return;
  }
  
  // In production, this would communicate with main process via IPC
  console.log('Settings update requested:', updates);
}

export function updateSetting<K extends keyof ArcSettings>(key: K, value: ArcSettings[K]): void {
  updateSettings({ [key]: value } as Partial<ArcSettings>);
}

export function resetSettings(): void {
  // In development, reset to defaults
  if (process.env.NODE_ENV === 'development') {
    memorySettings = { ...DEFAULT_SETTINGS };
    return;
  }
  
  // In production, this would communicate with main process via IPC
  console.log('Settings reset requested');
}