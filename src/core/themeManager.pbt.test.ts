import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { ThemeManager, ThemeMode } from './themeManager';
import * as settingsStore from './settingsStore';

// Mock the settings store
vi.mock('./settingsStore', () => ({
  getSetting: vi.fn(),
  updateSetting: vi.fn(),
}));

describe('ThemeManager - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsStore.getSetting).mockReturnValue('system' as any);
  });

  describe('Property 1: Theme Application Idempotence', () => {
    it('should be idempotent - applying theme twice equals applying once', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ThemeMode>('light', 'dark', 'system'),
          (theme) => {
            const manager = new ThemeManager();
            
            // Apply theme once
            manager.setTheme(theme);
            const firstState = {
              mode: manager.getTheme(),
              isDark: manager.isDarkTheme(),
              resolved: manager.getResolvedTheme(),
            };
            
            // Apply same theme again
            manager.setTheme(theme);
            const secondState = {
              mode: manager.getTheme(),
              isDark: manager.isDarkTheme(),
              resolved: manager.getResolvedTheme(),
            };
            
            manager.destroy();
            
            // States should be identical
            expect(firstState).toEqual(secondState);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Theme Consistency', () => {
    it('should maintain consistency between getTheme and getResolvedTheme', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ThemeMode>('light', 'dark', 'system'),
          (theme) => {
            const manager = new ThemeManager();
            manager.setTheme(theme);
            
            const currentTheme = manager.getTheme();
            const resolvedTheme = manager.getResolvedTheme();
            const isDark = manager.isDarkTheme();
            
            manager.destroy();
            
            // If theme is 'dark', resolved should be 'dark' and isDark should be true
            if (currentTheme === 'dark') {
              expect(resolvedTheme).toBe('dark');
              expect(isDark).toBe(true);
            }
            
            // If theme is 'light', resolved should be 'light' and isDark should be false
            if (currentTheme === 'light') {
              expect(resolvedTheme).toBe('light');
              expect(isDark).toBe(false);
            }
            
            // If theme is 'system', resolved should be either 'light' or 'dark'
            if (currentTheme === 'system') {
              expect(['light', 'dark']).toContain(resolvedTheme);
              expect(typeof isDark).toBe('boolean');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Theme Transition Determinism', () => {
    it('should produce deterministic results for same theme sequence', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom<ThemeMode>('light', 'dark', 'system'), {
            minLength: 1,
            maxLength: 10,
          }),
          (themeSequence) => {
            // First run
            const manager1 = new ThemeManager();
            for (const theme of themeSequence) {
              manager1.setTheme(theme);
            }
            const result1 = {
              theme: manager1.getTheme(),
              isDark: manager1.isDarkTheme(),
              resolved: manager1.getResolvedTheme(),
            };
            manager1.destroy();
            
            // Second run with same sequence
            const manager2 = new ThemeManager();
            for (const theme of themeSequence) {
              manager2.setTheme(theme);
            }
            const result2 = {
              theme: manager2.getTheme(),
              isDark: manager2.isDarkTheme(),
              resolved: manager2.getResolvedTheme(),
            };
            manager2.destroy();
            
            // Results should be identical
            expect(result1).toEqual(result2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Listener Notification Consistency', () => {
    it('should notify listeners consistently for theme changes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ThemeMode>('light', 'dark', 'system'),
          (theme) => {
            const manager = new ThemeManager();
            const notifications: Array<{ mode: ThemeMode; isDark: boolean }> = [];
            
            manager.subscribe((config) => {
              notifications.push({ mode: config.mode, isDark: config.isDark });
            });
            
            // First change to dark to ensure we're changing from something different
            manager.setTheme('dark');
            notifications.length = 0; // Clear notifications from first change
            
            manager.setTheme(theme);
            
            manager.destroy();
            
            // If theme is different from 'dark', should have exactly one notification
            if (theme !== 'dark') {
              expect(notifications).toHaveLength(1);
              
              // Notification should match the set theme
              expect(notifications[0].mode).toBe(theme);
              
              // isDark should be consistent with theme
              if (theme === 'dark') {
                expect(notifications[0].isDark).toBe(true);
              } else if (theme === 'light') {
                expect(notifications[0].isDark).toBe(false);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Settings Persistence', () => {
    it('should call updateSetting for each theme change', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ThemeMode>('light', 'dark', 'system'),
          (theme) => {
            vi.mocked(settingsStore.updateSetting).mockClear();
            const manager = new ThemeManager();
            
            // First change to dark to ensure we're changing from something different
            manager.setTheme('dark');
            vi.mocked(settingsStore.updateSetting).mockClear();
            
            manager.setTheme(theme);
            
            manager.destroy();
            
            // If theme is different from 'dark', should have called updateSetting once
            if (theme !== 'dark') {
              expect(vi.mocked(settingsStore.updateSetting)).toHaveBeenCalledTimes(1);
              expect(vi.mocked(settingsStore.updateSetting)).toHaveBeenCalledWith('theme', theme);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: No Duplicate Notifications', () => {
    it('should not notify listeners when setting same theme twice', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ThemeMode>('light', 'dark', 'system'),
          (theme) => {
            const manager = new ThemeManager();
            const notifications: number[] = [];
            
            manager.subscribe(() => {
              notifications.push(1);
            });
            
            manager.setTheme(theme);
            const firstCount = notifications.length;
            
            manager.setTheme(theme);
            const secondCount = notifications.length;
            
            manager.destroy();
            
            // Should not have additional notifications
            expect(secondCount).toBe(firstCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: Unsubscribe Effectiveness', () => {
    it('should stop notifying after unsubscribe', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.constantFrom<ThemeMode>('light', 'dark', 'system'),
            fc.constantFrom<ThemeMode>('light', 'dark', 'system')
          ),
          ([theme1, theme2]) => {
            const manager = new ThemeManager();
            const notifications: number[] = [];
            
            const unsubscribe = manager.subscribe(() => {
              notifications.push(1);
            });
            
            manager.setTheme(theme1);
            const beforeUnsubscribe = notifications.length;
            
            unsubscribe();
            manager.setTheme(theme2);
            const afterUnsubscribe = notifications.length;
            
            manager.destroy();
            
            // Should not have additional notifications after unsubscribe
            expect(afterUnsubscribe).toBe(beforeUnsubscribe);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
