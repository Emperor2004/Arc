import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeyboardShortcutManager, createDefaultShortcuts } from './keyboardShortcutManager';

// Mock KeyboardEvent for Node.js environment
class MockKeyboardEvent {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  defaultPrevented: boolean = false;

  constructor(type: string, init: any = {}) {
    this.key = init.key || '';
    this.ctrlKey = init.ctrlKey || false;
    this.shiftKey = init.shiftKey || false;
    this.altKey = init.altKey || false;
    this.metaKey = init.metaKey || false;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }
}

describe('KeyboardShortcutManager', () => {
  let manager: KeyboardShortcutManager;

  beforeEach(() => {
    manager = new KeyboardShortcutManager('win32');
  });

  describe('registerShortcut', () => {
    it('should register a shortcut', () => {
      const handler = vi.fn();
      manager.registerShortcut({
        id: 'test',
        key: 't',
        modifiers: ['ctrl'],
        handler,
      });

      expect(manager.hasShortcut('t', ['ctrl'])).toBe(true);
    });

    it('should not register duplicate shortcuts', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      manager.registerShortcut({
        id: 'test1',
        key: 't',
        modifiers: ['ctrl'],
        handler: handler1,
      });

      manager.registerShortcut({
        id: 'test2',
        key: 't',
        modifiers: ['ctrl'],
        handler: handler2,
      });

      const shortcuts = manager.getShortcuts();
      expect(shortcuts.length).toBe(1);
      expect(shortcuts[0].handler).toBe(handler1);
    });

    it('should respect platform-specific shortcuts', () => {
      const handler = vi.fn();
      manager.registerShortcut({
        id: 'test',
        key: 't',
        modifiers: ['ctrl'],
        handler,
        platform: 'darwin',
      });

      expect(manager.hasShortcut('t', ['ctrl'])).toBe(false);
    });

    it('should register shortcuts for matching platform', () => {
      const handler = vi.fn();
      manager.registerShortcut({
        id: 'test',
        key: 't',
        modifiers: ['ctrl'],
        handler,
        platform: 'win32',
      });

      expect(manager.hasShortcut('t', ['ctrl'])).toBe(true);
    });
  });

  describe('registerShortcuts', () => {
    it('should register multiple shortcuts', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      manager.registerShortcuts([
        {
          id: 'test1',
          key: 't',
          modifiers: ['ctrl'],
          handler: handler1,
        },
        {
          id: 'test2',
          key: 'n',
          modifiers: ['ctrl'],
          handler: handler2,
        },
      ]);

      expect(manager.hasShortcut('t', ['ctrl'])).toBe(true);
      expect(manager.hasShortcut('n', ['ctrl'])).toBe(true);
    });
  });

  describe('unregisterShortcut', () => {
    it('should unregister a shortcut', () => {
      const handler = vi.fn();
      manager.registerShortcut({
        id: 'test',
        key: 't',
        modifiers: ['ctrl'],
        handler,
      });

      expect(manager.hasShortcut('t', ['ctrl'])).toBe(true);

      manager.unregisterShortcut('t', ['ctrl']);
      expect(manager.hasShortcut('t', ['ctrl'])).toBe(false);
    });
  });

  describe('handleKeyDown', () => {
    it('should call handler for registered shortcut', async () => {
      const handler = vi.fn();
      manager.registerShortcut({
        id: 'test',
        key: 't',
        modifiers: ['ctrl'],
        handler,
      });

      const event = new MockKeyboardEvent('keydown', {
        key: 't',
        ctrlKey: true,
      }) as any;
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      const handled = await manager.handleKeyDown(event);

      expect(handled).toBe(true);
      expect(handler).toHaveBeenCalled();
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should return false for unregistered shortcut', async () => {
      const event = new MockKeyboardEvent('keydown', {
        key: 't',
        ctrlKey: true,
      }) as any;

      const handled = await manager.handleKeyDown(event);
      expect(handled).toBe(false);
    });

    it('should handle multiple modifiers', async () => {
      const handler = vi.fn();
      manager.registerShortcut({
        id: 'test',
        key: 'Delete',
        modifiers: ['ctrl', 'shift'],
        handler,
      });

      const event = new MockKeyboardEvent('keydown', {
        key: 'Delete',
        ctrlKey: true,
        shiftKey: true,
      }) as any;

      const handled = await manager.handleKeyDown(event);
      expect(handled).toBe(true);
      expect(handler).toHaveBeenCalled();
    });

    it('should not call handler if modifiers do not match', async () => {
      const handler = vi.fn();
      manager.registerShortcut({
        id: 'test',
        key: 't',
        modifiers: ['ctrl'],
        handler,
      });

      const event = new MockKeyboardEvent('keydown', {
        key: 't',
        ctrlKey: false,
      }) as any;

      const handled = await manager.handleKeyDown(event);
      expect(handled).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('getShortcuts', () => {
    it('should return all registered shortcuts', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      manager.registerShortcuts([
        {
          id: 'test1',
          key: 't',
          modifiers: ['ctrl'],
          handler: handler1,
        },
        {
          id: 'test2',
          key: 'n',
          modifiers: ['ctrl'],
          handler: handler2,
        },
      ]);

      const shortcuts = manager.getShortcuts();
      expect(shortcuts.length).toBe(2);
    });
  });

  describe('getShortcutsByPlatform', () => {
    it('should return shortcuts for specific platform', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      manager.registerShortcuts([
        {
          id: 'test1',
          key: 't',
          modifiers: ['ctrl'],
          handler: handler1,
          platform: 'win32',
        },
        {
          id: 'test2',
          key: 'n',
          modifiers: ['ctrl'],
          handler: handler2,
          platform: 'darwin',
        },
        {
          id: 'test3',
          key: 'r',
          modifiers: ['ctrl'],
          handler: handler3,
        },
      ]);

      // Manager is win32, so only win32 and platform-agnostic shortcuts are registered
      const winShortcuts = manager.getShortcutsByPlatform('win32');
      expect(winShortcuts.length).toBe(2); // win32-specific + platform-agnostic
      expect(winShortcuts.some(s => s.id === 'test1')).toBe(true);
      expect(winShortcuts.some(s => s.id === 'test3')).toBe(true);

      // darwin shortcuts won't be registered on win32 manager, but we can query them
      const macShortcuts = manager.getShortcutsByPlatform('darwin');
      expect(macShortcuts.length).toBe(1); // only platform-agnostic
      expect(macShortcuts.some(s => s.id === 'test3')).toBe(true);
    });
  });

  describe('clearShortcuts', () => {
    it('should clear all shortcuts', () => {
      const handler = vi.fn();
      manager.registerShortcut({
        id: 'test',
        key: 't',
        modifiers: ['ctrl'],
        handler,
      });

      expect(manager.getShortcuts().length).toBe(1);

      manager.clearShortcuts();
      expect(manager.getShortcuts().length).toBe(0);
    });
  });

  describe('createDefaultShortcuts', () => {
    it('should create default shortcuts for all platforms', () => {
      const handlers = {
        newTab: vi.fn(),
        newIncognitoTab: vi.fn(),
        closeTab: vi.fn(),
        nextTab: vi.fn(),
        previousTab: vi.fn(),
        focusAddressBar: vi.fn(),
        reloadPage: vi.fn(),
        clearData: vi.fn(),
      };

      const shortcuts = createDefaultShortcuts(handlers);

      expect(shortcuts.length).toBeGreaterThan(0);
      expect(shortcuts.some(s => s.id === 'new-tab')).toBe(true);
      expect(shortcuts.some(s => s.id === 'new-tab-mac')).toBe(true);
      expect(shortcuts.some(s => s.id === 'close-tab')).toBe(true);
      expect(shortcuts.some(s => s.id === 'next-tab')).toBe(true);
    });

    it('should have platform-specific shortcuts', () => {
      const handlers = {
        newTab: vi.fn(),
        newIncognitoTab: vi.fn(),
        closeTab: vi.fn(),
        nextTab: vi.fn(),
        previousTab: vi.fn(),
        focusAddressBar: vi.fn(),
        reloadPage: vi.fn(),
        clearData: vi.fn(),
      };

      const shortcuts = createDefaultShortcuts(handlers);

      const winShortcuts = shortcuts.filter(s => s.platform === 'win32');
      const macShortcuts = shortcuts.filter(s => s.platform === 'darwin');
      const crossPlatformShortcuts = shortcuts.filter(s => !s.platform);

      expect(winShortcuts.length).toBeGreaterThan(0);
      expect(macShortcuts.length).toBeGreaterThan(0);
      expect(crossPlatformShortcuts.length).toBeGreaterThan(0);
    });
  });

  describe('Shortcut uniqueness on same platform', () => {
    it('should not allow duplicate shortcuts on win32', () => {
      const manager32 = new KeyboardShortcutManager('win32');
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      manager32.registerShortcut({
        id: 'test1',
        key: 't',
        modifiers: ['ctrl'],
        handler: handler1,
        platform: 'win32',
      });

      manager32.registerShortcut({
        id: 'test2',
        key: 't',
        modifiers: ['ctrl'],
        handler: handler2,
        platform: 'win32',
      });

      const shortcuts = manager32.getShortcuts();
      expect(shortcuts.length).toBe(1);
    });

    it('should allow same key on different platforms', () => {
      const manager32 = new KeyboardShortcutManager('win32');
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      manager32.registerShortcut({
        id: 'test1',
        key: 't',
        modifiers: ['ctrl'],
        handler: handler1,
        platform: 'win32',
      });

      manager32.registerShortcut({
        id: 'test2',
        key: 't',
        modifiers: ['ctrl'],
        handler: handler2,
        platform: 'darwin',
      });

      const shortcuts = manager32.getShortcuts();
      expect(shortcuts.length).toBe(1); // Only win32 shortcut registered
    });
  });

  describe('Modifier order independence', () => {
    it('should treat modifiers in any order as same shortcut', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      manager.registerShortcut({
        id: 'test1',
        key: 'Delete',
        modifiers: ['ctrl', 'shift'],
        handler: handler1,
      });

      manager.registerShortcut({
        id: 'test2',
        key: 'Delete',
        modifiers: ['shift', 'ctrl'],
        handler: handler2,
      });

      const shortcuts = manager.getShortcuts();
      expect(shortcuts.length).toBe(1);
    });

    it('should handle keyboard event with modifiers in any order', async () => {
      const handler = vi.fn();
      manager.registerShortcut({
        id: 'test',
        key: 'Delete',
        modifiers: ['ctrl', 'shift'],
        handler,
      });

      const event = new MockKeyboardEvent('keydown', {
        key: 'Delete',
        shiftKey: true,
        ctrlKey: true,
      }) as any;

      const handled = await manager.handleKeyDown(event);
      expect(handled).toBe(true);
      expect(handler).toHaveBeenCalled();
    });
  });
});
