import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThemeManager, ThemeMode } from '../core/themeManager';

// Mock window.arc for IPC
const mockArc = {
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
};

describe('ThemeManager', () => {
  let themeManager: ThemeManager;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup window.arc mock
    (window as any).arc = mockArc;
    mockArc.getSettings.mockResolvedValue({ theme: 'system' });
    mockArc.updateSettings.mockResolvedValue({});
    
    // Create new instance
    themeManager = new ThemeManager();
  });

  afterEach(() => {
    if (themeManager) {
      themeManager.destroy();
    }
    (window as any).arc = undefined;
  });

  describe('initialization', () => {
    it('should initialize with theme from settings', async () => {
      mockArc.getSettings.mockResolvedValue({ theme: 'dark' });
      const manager = new ThemeManager();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(manager.getTheme()).toBe('dark');
      manager.destroy();
    });

    it('should resolve theme correctly for dark mode', async () => {
      mockArc.getSettings.mockResolvedValue({ theme: 'dark' });
      const manager = new ThemeManager();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(manager.isDarkTheme()).toBe(true);
      expect(manager.getResolvedTheme()).toBe('dark');
      manager.destroy();
    });

    it('should resolve theme correctly for light mode', async () => {
      mockArc.getSettings.mockResolvedValue({ theme: 'light' });
      const manager = new ThemeManager();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(manager.isDarkTheme()).toBe(false);
      expect(manager.getResolvedTheme()).toBe('light');
      manager.destroy();
    });
  });

  describe('setTheme', () => {
    it('should change theme to dark', async () => {
      await themeManager.setTheme('dark');
      
      expect(themeManager.getTheme()).toBe('dark');
      expect(themeManager.isDarkTheme()).toBe(true);
      expect(mockArc.updateSettings).toHaveBeenCalledWith({ theme: 'dark' });
    });

    it('should change theme to light', async () => {
      await themeManager.setTheme('light');
      
      expect(themeManager.getTheme()).toBe('light');
      expect(themeManager.isDarkTheme()).toBe(false);
      expect(mockArc.updateSettings).toHaveBeenCalledWith({ theme: 'light' });
    });

    it('should change theme to system', async () => {
      // First change to dark to ensure we're changing from something different
      await themeManager.setTheme('dark');
      mockArc.updateSettings.mockClear();
      
      await themeManager.setTheme('system');
      
      expect(themeManager.getTheme()).toBe('system');
      expect(mockArc.updateSettings).toHaveBeenCalledWith({ theme: 'system' });
    });

    it('should be idempotent - setting same theme twice should only update once', async () => {
      await themeManager.setTheme('dark');
      mockArc.updateSettings.mockClear();
      
      await themeManager.setTheme('dark');
      
      expect(mockArc.updateSettings).not.toHaveBeenCalled();
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

    it('should return light for system mode when system is light', async () => {
      // Mock system preference as light
      mockArc.getSettings.mockResolvedValue({ theme: 'system' });
      const manager = new ThemeManager();
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 50));
      
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
    it('should notify listener when theme changes', async () => {
      const listener = vi.fn();
      themeManager.subscribe(listener);
      
      await themeManager.setTheme('dark');
      
      expect(listener).toHaveBeenCalledWith({
        mode: 'dark',
        isDark: true,
      });
    });

    it('should notify listener with correct config', async () => {
      const listener = vi.fn();
      themeManager.subscribe(listener);
      
      await themeManager.setTheme('light');
      
      expect(listener).toHaveBeenCalledWith({
        mode: 'light',
        isDark: false,
      });
    });

    it('should return unsubscribe function', async () => {
      const listener = vi.fn();
      const unsubscribe = themeManager.subscribe(listener);
      
      await themeManager.setTheme('dark');
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      await themeManager.setTheme('light');
      
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should support multiple listeners', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      themeManager.subscribe(listener1);
      themeManager.subscribe(listener2);
      
      await themeManager.setTheme('dark');
      
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
    it('should transition from dark to light', async () => {
      await themeManager.setTheme('dark');
      expect(themeManager.isDarkTheme()).toBe(true);
      
      await themeManager.setTheme('light');
      expect(themeManager.isDarkTheme()).toBe(false);
    });

    it('should transition from light to dark', async () => {
      await themeManager.setTheme('light');
      expect(themeManager.isDarkTheme()).toBe(false);
      
      await themeManager.setTheme('dark');
      expect(themeManager.isDarkTheme()).toBe(true);
    });

    it('should transition through all modes', async () => {
      const modes: ThemeMode[] = ['light', 'dark', 'system', 'light'];
      
      for (const mode of modes) {
        await themeManager.setTheme(mode);
        expect(themeManager.getTheme()).toBe(mode);
      }
    });
  });
});
