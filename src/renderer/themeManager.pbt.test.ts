import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { ThemeManager, ThemeMode } from '../core/themeManager';

// Mock window.arc for IPC
const mockArc = {
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
};

describe('ThemeManager - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).arc = mockArc;
    mockArc.getSettings.mockResolvedValue({ theme: 'system' });
    mockArc.updateSettings.mockResolvedValue({});
  });

  afterEach(() => {
    (window as any).arc = undefined;
  });

  describe('Property 1: Theme Mode Consistency', () => {
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

  describe('Property 2: Theme Transition Determinism', () => {
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

  describe('Property 3: Listener Subscription', () => {
    it('should support multiple listeners', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ThemeMode>('light', 'dark', 'system'),
          (theme) => {
            const manager = new ThemeManager();
            const listener1Calls: number[] = [];
            const listener2Calls: number[] = [];
            
            manager.subscribe(() => listener1Calls.push(1));
            manager.subscribe(() => listener2Calls.push(1));
            
            manager.setTheme(theme);
            
            manager.destroy();
            
            // Both listeners should be called the same number of times
            expect(listener1Calls.length).toBe(listener2Calls.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Unsubscribe Effectiveness', () => {
    it('should stop notifying after unsubscribe', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ThemeMode>('light', 'dark', 'system'),
          (theme) => {
            const manager = new ThemeManager();
            const notifications: number[] = [];
            
            const unsubscribe = manager.subscribe(() => {
              notifications.push(1);
            });
            
            manager.setTheme(theme);
            const beforeUnsubscribe = notifications.length;
            
            unsubscribe();
            manager.setTheme('light');
            manager.setTheme('dark');
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

  describe('Property 5: Idempotent Theme Setting', () => {
    it('should be idempotent - setting same theme twice has same effect', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ThemeMode>('light', 'dark', 'system'),
          (theme) => {
            const manager = new ThemeManager();
            
            manager.setTheme(theme);
            const firstState = {
              mode: manager.getTheme(),
              isDark: manager.isDarkTheme(),
              resolved: manager.getResolvedTheme(),
            };
            
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
});
