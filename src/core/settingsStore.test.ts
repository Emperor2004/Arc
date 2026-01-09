import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  getSettings,
  updateSettings,
  getSetting,
  updateSetting,
  resetSettings,
} from './settingsStore';

// Mock fs module
vi.mock('fs');
vi.mock('path');

describe('SettingsStore Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock path.join to return a consistent path
    vi.mocked(path.join).mockReturnValue('/mock/settings.json');
    // Mock fs.existsSync to return true
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  describe('getSettings', () => {
    it('should return default settings when file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const settings = getSettings();

      expect(settings.theme).toBe('system');
      expect(settings.jarvisEnabled).toBe(true);
      expect(settings.incognitoEnabled).toBe(true);
    });

    it('should load settings from file', () => {
      const savedSettings = {
        theme: 'dark',
        jarvisEnabled: false,
        useHistoryForRecommendations: true,
        incognitoEnabled: true,
      };

      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(savedSettings));

      const settings = getSettings();

      expect(settings.theme).toBe('dark');
      expect(settings.jarvisEnabled).toBe(false);
    });

    it('should merge saved settings with defaults', () => {
      const partialSettings = {
        theme: 'dark',
      };

      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(partialSettings));

      const settings = getSettings();

      expect(settings.theme).toBe('dark');
      expect(settings.jarvisEnabled).toBe(true); // Default value
    });
  });

  describe('updateSettings', () => {
    it('should update multiple settings', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('{}');
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

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

      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingSettings));
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const updated = updateSettings({ theme: 'dark' });

      expect(updated.theme).toBe('dark');
      expect(updated.jarvisEnabled).toBe(true);
    });

    it('should save settings to file', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('{}');
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      updateSettings({ theme: 'dark' });

      expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData.theme).toBe('dark');
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

      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settings));

      const theme = getSetting('theme');

      expect(theme).toBe('dark');
    });

    it('should return default value if setting not found', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('{}');

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

      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingSettings));
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      updateSetting('theme', 'dark');

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData.theme).toBe('dark');
    });

    it('should preserve other settings', () => {
      const existingSettings = {
        theme: 'light',
        jarvisEnabled: true,
        useHistoryForRecommendations: true,
        incognitoEnabled: true,
      };

      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingSettings));
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      updateSetting('theme', 'dark');

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData.jarvisEnabled).toBe(true);
    });
  });

  describe('resetSettings', () => {
    it('should reset settings to defaults', () => {
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const reset = resetSettings();

      expect(reset.theme).toBe('system');
      expect(reset.jarvisEnabled).toBe(true);
      expect(reset.incognitoEnabled).toBe(true);
    });

    it('should save default settings to file', () => {
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      resetSettings();

      expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData.theme).toBe('system');
    });
  });
});
