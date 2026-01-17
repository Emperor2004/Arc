import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSettings,
  updateSettings,
  getSetting,
  updateSetting,
  resetSettings,
} from './settingsStore';

describe('SettingsStore Module', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  describe('getSettings', () => {
    it('should return default settings when localStorage is empty', () => {
      const settings = getSettings();

      expect(settings.theme).toBe('system');
      expect(settings.jarvisEnabled).toBe(true);
      expect(settings.incognitoEnabled).toBe(true);
    });

    it('should load settings from localStorage', () => {
      const savedSettings = {
        theme: 'dark',
        jarvisEnabled: false,
        useHistoryForRecommendations: true,
        incognitoEnabled: true,
      };

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('arc-browser-settings', JSON.stringify(savedSettings));
      }

      const settings = getSettings();

      expect(settings.theme).toBe('dark');
      expect(settings.jarvisEnabled).toBe(false);
    });

    it('should merge saved settings with defaults', () => {
      const partialSettings = {
        theme: 'dark',
      };

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('arc-browser-settings', JSON.stringify(partialSettings));
      }

      const settings = getSettings();

      expect(settings.theme).toBe('dark');
      expect(settings.jarvisEnabled).toBe(true); // Default value
    });
  });

  describe('updateSettings', () => {
    it('should update multiple settings', () => {
      const updated = updateSettings({
        theme: 'dark',
        jarvisEnabled: false,
      });

      expect(updated.theme).toBe('dark');
      expect(updated.jarvisEnabled).toBe(false);
    });

    it('should preserve existing settings', () => {
      const existingSettings = {
        theme: 'light',
        jarvisEnabled: true,
        useHistoryForRecommendations: true,
        incognitoEnabled: true,
      };

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('arc-browser-settings', JSON.stringify(existingSettings));
      }

      const updated = updateSettings({ theme: 'dark' });

      expect(updated.theme).toBe('dark');
      expect(updated.jarvisEnabled).toBe(true);
    });

    it('should save settings to localStorage', () => {
      updateSettings({ theme: 'dark' });

      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('arc-browser-settings');
        expect(stored).toBeTruthy();
        if (stored) {
          const writtenData = JSON.parse(stored);
          expect(writtenData.theme).toBe('dark');
        }
      }
    });
  });

  describe('getSetting', () => {
    it('should get a specific setting', () => {
      const settings = {
        theme: 'dark',
        jarvisEnabled: false,
        useHistoryForRecommendations: true,
        incognitoEnabled: true,
      };

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('arc-browser-settings', JSON.stringify(settings));
      }

      const theme = getSetting('theme');

      expect(theme).toBe('dark');
    });

    it('should return default value if setting not found', () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('arc-browser-settings', '{}');
      }

      const jarvisEnabled = getSetting('jarvisEnabled');

      expect(jarvisEnabled).toBe(true);
    });
  });

  describe('updateSetting', () => {
    it('should update a specific setting', () => {
      const existingSettings = {
        theme: 'light',
        jarvisEnabled: true,
        useHistoryForRecommendations: true,
        incognitoEnabled: true,
      };

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('arc-browser-settings', JSON.stringify(existingSettings));
      }

      updateSetting('theme', 'dark');

      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('arc-browser-settings');
        expect(stored).toBeTruthy();
        if (stored) {
          const writtenData = JSON.parse(stored);
          expect(writtenData.theme).toBe('dark');
        }
      }
    });

    it('should preserve other settings', () => {
      const existingSettings = {
        theme: 'light',
        jarvisEnabled: true,
        useHistoryForRecommendations: true,
        incognitoEnabled: true,
      };

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('arc-browser-settings', JSON.stringify(existingSettings));
      }

      updateSetting('theme', 'dark');

      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('arc-browser-settings');
        expect(stored).toBeTruthy();
        if (stored) {
          const writtenData = JSON.parse(stored);
          expect(writtenData.jarvisEnabled).toBe(true);
        }
      }
    });
  });

  describe('resetSettings', () => {
    it('should reset settings to defaults', () => {
      const reset = resetSettings();

      expect(reset.theme).toBe('system');
      expect(reset.jarvisEnabled).toBe(true);
      expect(reset.incognitoEnabled).toBe(true);
    });

    it('should save default settings to localStorage', () => {
      resetSettings();

      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('arc-browser-settings');
        expect(stored).toBeTruthy();
        if (stored) {
          const writtenData = JSON.parse(stored);
          expect(writtenData.theme).toBe('system');
        }
      }
    });
  });
});
