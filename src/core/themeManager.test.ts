import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThemeManager, ThemeMode } from './themeManager';
import * as settingsStore from './settingsStore';

// Mock the settings store
vi.mock('./settingsStore', () => ({
  getSetting: vi.fn(),
  updateSetting: vi.fn(),
}));

describe('ThemeManager', () => {
  let themeManager: ThemeManager;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock getSetting to return 'system' by default
    vi.mocked(settingsStore.getSetting).mockReturnValue('system' as any);
    
    // Create new instance
    themeManager = new ThemeManager();
  });

  afterEach(() => {
    themeManager.destroy();
  });

  describe('initialization', () => {
    it('should initialize with theme from settings', () => {
      vi.mocked(settingsStore.getSetting).mockReturnValue('dark' as any);
      const manager = new ThemeManager();
      
      expect(manager.getTheme()).toBe('dark');
      manager.destroy();
    });

    it('should resolve theme correctly for dark mode', () => {
      vi.mocked(settingsStore.getSetting).mockReturnValue('dark' as any);
      const manager = new ThemeManager();
      
      expect(manager.isDarkTheme()).toBe(true);
      expect(manager.getResolvedTheme()).toBe('dark');
      manager.destroy();
    });

    it('should resolve theme correctly for light mode', () => {
      vi.mocked(settingsStore.getSetting).mockReturnValue('light' as any);
      const manager = new ThemeManager();
      
      expect(manager.isDarkTheme()).toBe(false);
      expect(manager.getResolvedTheme()).toBe('light');
      manager.destroy();
    });
  });

  describe('setTheme', () => {
    it('should change theme to dark', () => {
      themeManager.setTheme('dark');
      
      expect(themeManager.getTheme()).toBe('dark');
      expect(themeManager.isDarkTheme()).toBe(true);
      expect(vi.mocked(settingsStore.updateSetting)).toHaveBeenCalledWith('theme', 'dark');
    });

    it('should change theme to light', () => {
      themeManager.setTheme('light');
      
      expect(themeManager.getTheme()).toBe('light');
      expect(themeManager.isDarkTheme()).toBe(false);
      expect(vi.mocked(settingsStore.updateSetting)).toHaveBeenCalledWith('theme', 'light');
    });

    it('should change theme to system', () => {
      // First change to dark to ensure we're changing from something different
      themeManager.setTheme('dark');
      vi.mocked(settingsStore.updateSetting).mockClear();
      
      themeManager.setTheme('system');
      
      expect(themeManager.getTheme()).toBe('system');
      expect(vi.mocked(settingsStore.updateSetting)).toHaveBeenCalledWith('theme', 'system');
    });

    it('should be idempotent - setting same theme twice should only update once', () => {
      themeManager.setTheme('dark');
      vi.mocked(settingsStore.updateSetting).mockClear();
      
      themeManager.setTheme('dark');
      
      expect(vi.mocked(settingsStore.updateSetting)).not.toHaveBeenCalled();
    });
  });

  describe('getTheme', () => {
    it('should return current theme mode', () => {
      themeManager.setTheme('dark');
      expect(themeManager.getTheme()).toBe('dark');
      
      themeManager.setTheme('light');
      expect(themeManager.getTheme()).toBe('light');
    });
  });

  describe('getResolvedTheme', () => {
    it('should return dark for dark mode', () => {
      themeManager.setTheme('dark');
      expect(themeManager.getResolvedTheme()).toBe('dark');
    });

    it('should return light for light mode', () => {
      themeManager.setTheme('light');
      expect(themeManager.getResolvedTheme()).toBe('light');
    });

    it('should return light for system mode when system is light', () => {
      // Mock system preference as light
      vi.mocked(settingsStore.getSetting).mockReturnValue('system' as any);
      const manager = new ThemeManager();
      
      // In test environment, system preference defaults to light
      expect(manager.getResolvedTheme()).toBe('light');
      manager.destroy();
    });
  });

  describe('isDarkTheme', () => {
    it('should return true when theme is dark', () => {
      themeManager.setTheme('dark');
      expect(themeManager.isDarkTheme()).toBe(true);
    });

    it('should return false when theme is light', () => {
      themeManager.setTheme('light');
      expect(themeManager.isDarkTheme()).toBe(false);
    });
  });

  describe('subscribe', () => {
    it('should notify listener when theme changes', () => {
      const listener = vi.fn();
      themeManager.subscribe(listener);
      
      themeManager.setTheme('dark');
      
      expect(listener).toHaveBeenCalledWith({
        mode: 'dark',
        isDark: true,
      });
    });

    it('should notify listener with correct config', () => {
      const listener = vi.fn();
      themeManager.subscribe(listener);
      
      themeManager.setTheme('light');
      
      expect(listener).toHaveBeenCalledWith({
        mode: 'light',
        isDark: false,
      });
    });

    it('should return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = themeManager.subscribe(listener);
      
      themeManager.setTheme('dark');
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      themeManager.setTheme('light');
      
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should support multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      themeManager.subscribe(listener1);
      themeManager.subscribe(listener2);
      
      themeManager.setTheme('dark');
      
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe('destroy', () => {
    it('should clear all listeners', () => {
      const listener = vi.fn();
      themeManager.subscribe(listener);
      
      themeManager.destroy();
      themeManager.setTheme('dark');
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('theme transitions', () => {
    it('should transition from dark to light', () => {
      themeManager.setTheme('dark');
      expect(themeManager.isDarkTheme()).toBe(true);
      
      themeManager.setTheme('light');
      expect(themeManager.isDarkTheme()).toBe(false);
    });

    it('should transition from light to dark', () => {
      themeManager.setTheme('light');
      expect(themeManager.isDarkTheme()).toBe(false);
      
      themeManager.setTheme('dark');
      expect(themeManager.isDarkTheme()).toBe(true);
    });

    it('should transition through all modes', () => {
      const modes: ThemeMode[] = ['light', 'dark', 'system', 'light'];
      
      for (const mode of modes) {
        themeManager.setTheme(mode);
        expect(themeManager.getTheme()).toBe(mode);
      }
    });
  });
});
