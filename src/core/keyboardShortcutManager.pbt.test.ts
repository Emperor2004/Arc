import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { KeyboardShortcutManager } from './keyboardShortcutManager';

describe('KeyboardShortcutManager Properties', () => {
  describe('Property 8: Keyboard Shortcut Uniqueness', () => {
    it('should not allow duplicate shortcuts on same platform', () => {
      // Feature: arc-browser-enhancements, Property 8: Keyboard Shortcut Uniqueness
      fc.assert(
        fc.property(
          fc.constantFrom('win32', 'darwin', 'linux'),
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z0-9]$/i.test(s)),
          fc.array(fc.constantFrom('ctrl', 'shift', 'alt', 'meta'), { minLength: 0, maxLength: 3 }),
          (platform, key, modifiers) => {
            const manager = new KeyboardShortcutManager(platform);
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            manager.registerShortcut({
              id: 'test1',
              key,
              modifiers: modifiers as any,
              handler: handler1,
              platform,
            });

            manager.registerShortcut({
              id: 'test2',
              key,
              modifiers: modifiers as any,
              handler: handler2,
              platform,
            });

            const shortcuts = manager.getShortcuts();
            expect(shortcuts.length).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow same shortcut on different platforms', () => {
      // Feature: arc-browser-enhancements, Property 8: Keyboard Shortcut Uniqueness
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z0-9]$/i.test(s)),
          fc.array(fc.constantFrom('ctrl', 'shift', 'alt', 'meta'), { minLength: 0, maxLength: 3 }),
          (key, modifiers) => {
            const manager = new KeyboardShortcutManager('win32');
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            manager.registerShortcut({
              id: 'test1',
              key,
              modifiers: modifiers as any,
              handler: handler1,
              platform: 'win32',
            });

            manager.registerShortcut({
              id: 'test2',
              key,
              modifiers: modifiers as any,
              handler: handler2,
              platform: 'darwin',
            });

            // Only win32 shortcut should be registered on win32 manager
            const shortcuts = manager.getShortcuts();
            expect(shortcuts.length).toBe(1);
            expect(shortcuts[0].platform).toBe('win32');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain shortcut count invariant', () => {
      // Feature: arc-browser-enhancements, Property 8: Keyboard Shortcut Uniqueness
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 1 }).filter(s => /^[a-z0-9]$/i.test(s)),
              modifiers: fc.array(fc.constantFrom('ctrl', 'shift', 'alt', 'meta'), { minLength: 0, maxLength: 3 }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (shortcutConfigs) => {
            const manager = new KeyboardShortcutManager('win32');
            const uniqueShortcuts = new Set<string>();

            shortcutConfigs.forEach((config, index) => {
              const normalizedKey = config.key.toUpperCase();
              const key = `${config.modifiers.sort().join('+')}+${normalizedKey}`;
              uniqueShortcuts.add(key);

              manager.registerShortcut({
                id: `test${index}`,
                key: config.key,
                modifiers: config.modifiers as any,
                handler: vi.fn(),
              });
            });

            const registeredShortcuts = manager.getShortcuts();
            expect(registeredShortcuts.length).toBe(uniqueShortcuts.size);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Shortcut Registration Idempotence', () => {
    it('should produce same result when registering same shortcut twice', () => {
      // Feature: arc-browser-enhancements, Property 8: Keyboard Shortcut Uniqueness
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z0-9]$/i.test(s)),
          fc.array(fc.constantFrom('ctrl', 'shift', 'alt', 'meta'), { minLength: 0, maxLength: 3 }),
          (key, modifiers) => {
            const manager = new KeyboardShortcutManager('win32');
            const handler = vi.fn();

            manager.registerShortcut({
              id: 'test',
              key,
              modifiers: modifiers as any,
              handler,
            });

            const count1 = manager.getShortcuts().length;

            manager.registerShortcut({
              id: 'test',
              key,
              modifiers: modifiers as any,
              handler,
            });

            const count2 = manager.getShortcuts().length;

            expect(count1).toBe(count2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Shortcut Lookup Consistency', () => {
    it('should consistently find registered shortcuts', () => {
      // Feature: arc-browser-enhancements, Property 8: Keyboard Shortcut Uniqueness
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z0-9]$/i.test(s)),
          fc.array(fc.constantFrom('ctrl', 'shift', 'alt', 'meta'), { minLength: 0, maxLength: 3 }),
          (key, modifiers) => {
            const manager = new KeyboardShortcutManager('win32');
            const handler = vi.fn();

            manager.registerShortcut({
              id: 'test',
              key,
              modifiers: modifiers as any,
              handler,
            });

            const found1 = manager.hasShortcut(key, modifiers as any);
            const found2 = manager.hasShortcut(key, modifiers as any);

            expect(found1).toBe(found2);
            expect(found1).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not find unregistered shortcuts', () => {
      // Feature: arc-browser-enhancements, Property 8: Keyboard Shortcut Uniqueness
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z0-9]$/i.test(s)),
          fc.array(fc.constantFrom('ctrl', 'shift', 'alt', 'meta'), { minLength: 0, maxLength: 3 }),
          (key, modifiers) => {
            const manager = new KeyboardShortcutManager('win32');

            const found = manager.hasShortcut(key, modifiers as any);
            expect(found).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Shortcut Unregistration', () => {
    it('should remove shortcuts after unregistration', () => {
      // Feature: arc-browser-enhancements, Property 8: Keyboard Shortcut Uniqueness
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z0-9]$/i.test(s)),
          fc.array(fc.constantFrom('ctrl', 'shift', 'alt', 'meta'), { minLength: 0, maxLength: 3 }),
          (key, modifiers) => {
            const manager = new KeyboardShortcutManager('win32');
            const handler = vi.fn();

            manager.registerShortcut({
              id: 'test',
              key,
              modifiers: modifiers as any,
              handler,
            });

            expect(manager.hasShortcut(key, modifiers as any)).toBe(true);

            manager.unregisterShortcut(key, modifiers as any);

            expect(manager.hasShortcut(key, modifiers as any)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Platform Filtering', () => {
    it('should correctly filter shortcuts by platform', () => {
      // Feature: arc-browser-enhancements, Property 8: Keyboard Shortcut Uniqueness
      fc.assert(
        fc.property(
          fc.constantFrom('win32', 'darwin', 'linux'),
          (platform) => {
            const manager = new KeyboardShortcutManager(platform);
            const handler = vi.fn();

            manager.registerShortcut({
              id: 'test1',
              key: 't',
              modifiers: ['ctrl'],
              handler,
              platform: 'win32',
            });

            manager.registerShortcut({
              id: 'test2',
              key: 'n',
              modifiers: ['ctrl'],
              handler,
              platform: 'darwin',
            });

            manager.registerShortcut({
              id: 'test3',
              key: 'r',
              modifiers: ['ctrl'],
              handler,
            });

            const shortcuts = manager.getShortcutsByPlatform(platform);

            // Should include platform-specific and platform-agnostic shortcuts
            if (platform === 'win32') {
              expect(shortcuts.some(s => s.id === 'test1')).toBe(true);
              expect(shortcuts.some(s => s.id === 'test3')).toBe(true);
            } else if (platform === 'darwin') {
              expect(shortcuts.some(s => s.id === 'test2')).toBe(true);
              expect(shortcuts.some(s => s.id === 'test3')).toBe(true);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Clear Shortcuts', () => {
    it('should remove all shortcuts when cleared', () => {
      // Feature: arc-browser-enhancements, Property 8: Keyboard Shortcut Uniqueness
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z0-9]$/i.test(s)),
              modifiers: fc.array(fc.constantFrom('ctrl', 'shift', 'alt', 'meta'), { minLength: 0, maxLength: 3 }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (shortcutConfigs) => {
            const manager = new KeyboardShortcutManager('win32');

            shortcutConfigs.forEach((config, index) => {
              manager.registerShortcut({
                id: `test${index}`,
                key: config.key,
                modifiers: config.modifiers as any,
                handler: vi.fn(),
              });
            });

            expect(manager.getShortcuts().length).toBeGreaterThan(0);

            manager.clearShortcuts();

            expect(manager.getShortcuts().length).toBe(0);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
