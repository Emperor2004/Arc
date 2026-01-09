"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const keyboardShortcutManager_1 = require("./keyboardShortcutManager");
// Mock KeyboardEvent for Node.js environment
class MockKeyboardEvent {
    constructor(type, init = {}) {
        this.defaultPrevented = false;
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
(0, vitest_1.describe)('KeyboardShortcutManager', () => {
    let manager;
    (0, vitest_1.beforeEach)(() => {
        manager = new keyboardShortcutManager_1.KeyboardShortcutManager('win32');
    });
    (0, vitest_1.describe)('registerShortcut', () => {
        (0, vitest_1.it)('should register a shortcut', () => {
            const handler = vitest_1.vi.fn();
            manager.registerShortcut({
                id: 'test',
                key: 't',
                modifiers: ['ctrl'],
                handler,
            });
            (0, vitest_1.expect)(manager.hasShortcut('t', ['ctrl'])).toBe(true);
        });
        (0, vitest_1.it)('should not register duplicate shortcuts', () => {
            const handler1 = vitest_1.vi.fn();
            const handler2 = vitest_1.vi.fn();
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
            (0, vitest_1.expect)(shortcuts.length).toBe(1);
            (0, vitest_1.expect)(shortcuts[0].handler).toBe(handler1);
        });
        (0, vitest_1.it)('should respect platform-specific shortcuts', () => {
            const handler = vitest_1.vi.fn();
            manager.registerShortcut({
                id: 'test',
                key: 't',
                modifiers: ['ctrl'],
                handler,
                platform: 'darwin',
            });
            (0, vitest_1.expect)(manager.hasShortcut('t', ['ctrl'])).toBe(false);
        });
        (0, vitest_1.it)('should register shortcuts for matching platform', () => {
            const handler = vitest_1.vi.fn();
            manager.registerShortcut({
                id: 'test',
                key: 't',
                modifiers: ['ctrl'],
                handler,
                platform: 'win32',
            });
            (0, vitest_1.expect)(manager.hasShortcut('t', ['ctrl'])).toBe(true);
        });
    });
    (0, vitest_1.describe)('registerShortcuts', () => {
        (0, vitest_1.it)('should register multiple shortcuts', () => {
            const handler1 = vitest_1.vi.fn();
            const handler2 = vitest_1.vi.fn();
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
            (0, vitest_1.expect)(manager.hasShortcut('t', ['ctrl'])).toBe(true);
            (0, vitest_1.expect)(manager.hasShortcut('n', ['ctrl'])).toBe(true);
        });
    });
    (0, vitest_1.describe)('unregisterShortcut', () => {
        (0, vitest_1.it)('should unregister a shortcut', () => {
            const handler = vitest_1.vi.fn();
            manager.registerShortcut({
                id: 'test',
                key: 't',
                modifiers: ['ctrl'],
                handler,
            });
            (0, vitest_1.expect)(manager.hasShortcut('t', ['ctrl'])).toBe(true);
            manager.unregisterShortcut('t', ['ctrl']);
            (0, vitest_1.expect)(manager.hasShortcut('t', ['ctrl'])).toBe(false);
        });
    });
    (0, vitest_1.describe)('handleKeyDown', () => {
        (0, vitest_1.it)('should call handler for registered shortcut', async () => {
            const handler = vitest_1.vi.fn();
            manager.registerShortcut({
                id: 'test',
                key: 't',
                modifiers: ['ctrl'],
                handler,
            });
            const event = new MockKeyboardEvent('keydown', {
                key: 't',
                ctrlKey: true,
            });
            const preventDefaultSpy = vitest_1.vi.spyOn(event, 'preventDefault');
            const handled = await manager.handleKeyDown(event);
            (0, vitest_1.expect)(handled).toBe(true);
            (0, vitest_1.expect)(handler).toHaveBeenCalled();
            (0, vitest_1.expect)(preventDefaultSpy).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should return false for unregistered shortcut', async () => {
            const event = new MockKeyboardEvent('keydown', {
                key: 't',
                ctrlKey: true,
            });
            const handled = await manager.handleKeyDown(event);
            (0, vitest_1.expect)(handled).toBe(false);
        });
        (0, vitest_1.it)('should handle multiple modifiers', async () => {
            const handler = vitest_1.vi.fn();
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
            });
            const handled = await manager.handleKeyDown(event);
            (0, vitest_1.expect)(handled).toBe(true);
            (0, vitest_1.expect)(handler).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should not call handler if modifiers do not match', async () => {
            const handler = vitest_1.vi.fn();
            manager.registerShortcut({
                id: 'test',
                key: 't',
                modifiers: ['ctrl'],
                handler,
            });
            const event = new MockKeyboardEvent('keydown', {
                key: 't',
                ctrlKey: false,
            });
            const handled = await manager.handleKeyDown(event);
            (0, vitest_1.expect)(handled).toBe(false);
            (0, vitest_1.expect)(handler).not.toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('getShortcuts', () => {
        (0, vitest_1.it)('should return all registered shortcuts', () => {
            const handler1 = vitest_1.vi.fn();
            const handler2 = vitest_1.vi.fn();
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
            (0, vitest_1.expect)(shortcuts.length).toBe(2);
        });
    });
    (0, vitest_1.describe)('getShortcutsByPlatform', () => {
        (0, vitest_1.it)('should return shortcuts for specific platform', () => {
            const handler1 = vitest_1.vi.fn();
            const handler2 = vitest_1.vi.fn();
            const handler3 = vitest_1.vi.fn();
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
            (0, vitest_1.expect)(winShortcuts.length).toBe(2); // win32-specific + platform-agnostic
            (0, vitest_1.expect)(winShortcuts.some(s => s.id === 'test1')).toBe(true);
            (0, vitest_1.expect)(winShortcuts.some(s => s.id === 'test3')).toBe(true);
            // darwin shortcuts won't be registered on win32 manager, but we can query them
            const macShortcuts = manager.getShortcutsByPlatform('darwin');
            (0, vitest_1.expect)(macShortcuts.length).toBe(1); // only platform-agnostic
            (0, vitest_1.expect)(macShortcuts.some(s => s.id === 'test3')).toBe(true);
        });
    });
    (0, vitest_1.describe)('clearShortcuts', () => {
        (0, vitest_1.it)('should clear all shortcuts', () => {
            const handler = vitest_1.vi.fn();
            manager.registerShortcut({
                id: 'test',
                key: 't',
                modifiers: ['ctrl'],
                handler,
            });
            (0, vitest_1.expect)(manager.getShortcuts().length).toBe(1);
            manager.clearShortcuts();
            (0, vitest_1.expect)(manager.getShortcuts().length).toBe(0);
        });
    });
    (0, vitest_1.describe)('createDefaultShortcuts', () => {
        (0, vitest_1.it)('should create default shortcuts for all platforms', () => {
            const handlers = {
                newTab: vitest_1.vi.fn(),
                newIncognitoTab: vitest_1.vi.fn(),
                closeTab: vitest_1.vi.fn(),
                nextTab: vitest_1.vi.fn(),
                previousTab: vitest_1.vi.fn(),
                focusAddressBar: vitest_1.vi.fn(),
                reloadPage: vitest_1.vi.fn(),
                clearData: vitest_1.vi.fn(),
            };
            const shortcuts = (0, keyboardShortcutManager_1.createDefaultShortcuts)(handlers);
            (0, vitest_1.expect)(shortcuts.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(shortcuts.some(s => s.id === 'new-tab')).toBe(true);
            (0, vitest_1.expect)(shortcuts.some(s => s.id === 'new-tab-mac')).toBe(true);
            (0, vitest_1.expect)(shortcuts.some(s => s.id === 'close-tab')).toBe(true);
            (0, vitest_1.expect)(shortcuts.some(s => s.id === 'next-tab')).toBe(true);
        });
        (0, vitest_1.it)('should have platform-specific shortcuts', () => {
            const handlers = {
                newTab: vitest_1.vi.fn(),
                newIncognitoTab: vitest_1.vi.fn(),
                closeTab: vitest_1.vi.fn(),
                nextTab: vitest_1.vi.fn(),
                previousTab: vitest_1.vi.fn(),
                focusAddressBar: vitest_1.vi.fn(),
                reloadPage: vitest_1.vi.fn(),
                clearData: vitest_1.vi.fn(),
            };
            const shortcuts = (0, keyboardShortcutManager_1.createDefaultShortcuts)(handlers);
            const winShortcuts = shortcuts.filter(s => s.platform === 'win32');
            const macShortcuts = shortcuts.filter(s => s.platform === 'darwin');
            const crossPlatformShortcuts = shortcuts.filter(s => !s.platform);
            (0, vitest_1.expect)(winShortcuts.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(macShortcuts.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(crossPlatformShortcuts.length).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('Shortcut uniqueness on same platform', () => {
        (0, vitest_1.it)('should not allow duplicate shortcuts on win32', () => {
            const manager32 = new keyboardShortcutManager_1.KeyboardShortcutManager('win32');
            const handler1 = vitest_1.vi.fn();
            const handler2 = vitest_1.vi.fn();
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
            (0, vitest_1.expect)(shortcuts.length).toBe(1);
        });
        (0, vitest_1.it)('should allow same key on different platforms', () => {
            const manager32 = new keyboardShortcutManager_1.KeyboardShortcutManager('win32');
            const handler1 = vitest_1.vi.fn();
            const handler2 = vitest_1.vi.fn();
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
            (0, vitest_1.expect)(shortcuts.length).toBe(1); // Only win32 shortcut registered
        });
    });
    (0, vitest_1.describe)('Modifier order independence', () => {
        (0, vitest_1.it)('should treat modifiers in any order as same shortcut', () => {
            const handler1 = vitest_1.vi.fn();
            const handler2 = vitest_1.vi.fn();
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
            (0, vitest_1.expect)(shortcuts.length).toBe(1);
        });
        (0, vitest_1.it)('should handle keyboard event with modifiers in any order', async () => {
            const handler = vitest_1.vi.fn();
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
            });
            const handled = await manager.handleKeyDown(event);
            (0, vitest_1.expect)(handled).toBe(true);
            (0, vitest_1.expect)(handler).toHaveBeenCalled();
        });
    });
});
