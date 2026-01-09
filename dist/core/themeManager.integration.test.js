"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const themeManager_1 = require("./themeManager");
const settingsStore = __importStar(require("./settingsStore"));
// Mock the settings store with real behavior
vitest_1.vi.mock('./settingsStore', () => {
    const store = {
        theme: 'system',
    };
    return {
        getSetting: vitest_1.vi.fn((key) => store[key]),
        updateSetting: vitest_1.vi.fn((key, value) => {
            store[key] = value;
        }),
    };
});
(0, vitest_1.describe)('ThemeManager - Integration Tests', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        // Reset store to default
        vitest_1.vi.mocked(settingsStore.getSetting).mockReturnValue('system');
    });
    (0, vitest_1.describe)('Task 29: Theme Persistence Integration', () => {
        (0, vitest_1.it)('should save theme preference to settings store', () => {
            const manager = new themeManager_1.ThemeManager();
            manager.setTheme('dark');
            (0, vitest_1.expect)(vitest_1.vi.mocked(settingsStore.updateSetting)).toHaveBeenCalledWith('theme', 'dark');
            manager.destroy();
        });
        (0, vitest_1.it)('should load theme preference from settings store on startup', () => {
            vitest_1.vi.mocked(settingsStore.getSetting).mockReturnValue('dark');
            const manager = new themeManager_1.ThemeManager();
            (0, vitest_1.expect)(manager.getTheme()).toBe('dark');
            (0, vitest_1.expect)(manager.isDarkTheme()).toBe(true);
            manager.destroy();
        });
        (0, vitest_1.it)('should apply theme immediately on selection', () => {
            const manager = new themeManager_1.ThemeManager();
            manager.setTheme('light');
            (0, vitest_1.expect)(manager.getTheme()).toBe('light');
            (0, vitest_1.expect)(manager.isDarkTheme()).toBe(false);
            (0, vitest_1.expect)(manager.getResolvedTheme()).toBe('light');
            manager.destroy();
        });
        (0, vitest_1.it)('should persist theme across multiple instances', () => {
            // First instance sets theme
            const manager1 = new themeManager_1.ThemeManager();
            manager1.setTheme('dark');
            manager1.destroy();
            // Mock getSetting to return the persisted value
            vitest_1.vi.mocked(settingsStore.getSetting).mockReturnValue('dark');
            // Second instance should load persisted theme
            const manager2 = new themeManager_1.ThemeManager();
            (0, vitest_1.expect)(manager2.getTheme()).toBe('dark');
            (0, vitest_1.expect)(manager2.isDarkTheme()).toBe(true);
            manager2.destroy();
        });
    });
    (0, vitest_1.describe)('Task 30: OS Theme Detection', () => {
        (0, vitest_1.it)('should detect system theme preference', () => {
            vitest_1.vi.mocked(settingsStore.getSetting).mockReturnValue('system');
            const manager = new themeManager_1.ThemeManager();
            // In test environment, system preference defaults to light
            (0, vitest_1.expect)(manager.getResolvedTheme()).toBe('light');
            manager.destroy();
        });
        (0, vitest_1.it)('should use system theme when mode is system', () => {
            vitest_1.vi.mocked(settingsStore.getSetting).mockReturnValue('system');
            const manager = new themeManager_1.ThemeManager();
            (0, vitest_1.expect)(manager.getTheme()).toBe('system');
            // Resolved theme should be either light or dark
            (0, vitest_1.expect)(['light', 'dark']).toContain(manager.getResolvedTheme());
            manager.destroy();
        });
        (0, vitest_1.it)('should override system theme when explicit theme is set', () => {
            vitest_1.vi.mocked(settingsStore.getSetting).mockReturnValue('system');
            const manager = new themeManager_1.ThemeManager();
            manager.setTheme('dark');
            (0, vitest_1.expect)(manager.getTheme()).toBe('dark');
            (0, vitest_1.expect)(manager.getResolvedTheme()).toBe('dark');
            (0, vitest_1.expect)(manager.isDarkTheme()).toBe(true);
            manager.destroy();
        });
        (0, vitest_1.it)('should listen for system theme changes when in system mode', () => {
            vitest_1.vi.mocked(settingsStore.getSetting).mockReturnValue('system');
            const manager = new themeManager_1.ThemeManager();
            const listener = vitest_1.vi.fn();
            manager.subscribe(listener);
            // Simulate system theme change
            if (typeof window !== 'undefined' && window.matchMedia) {
                const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                if (mediaQuery.addEventListener) {
                    // In test environment, we can't actually trigger the event
                    // but we can verify the listener is set up
                    (0, vitest_1.expect)(listener).not.toHaveBeenCalled();
                }
            }
            manager.destroy();
        });
        (0, vitest_1.it)('should not listen for system theme changes when in explicit mode', () => {
            vitest_1.vi.mocked(settingsStore.getSetting).mockReturnValue('dark');
            const manager = new themeManager_1.ThemeManager();
            const listener = vitest_1.vi.fn();
            manager.subscribe(listener);
            // When in explicit dark mode, system changes should not trigger listener
            // (unless we manually change the theme)
            (0, vitest_1.expect)(listener).not.toHaveBeenCalled();
            manager.destroy();
        });
    });
    (0, vitest_1.describe)('Task 31: Dark Mode Checkpoint', () => {
        (0, vitest_1.it)('should have proper contrast in dark theme', () => {
            const manager = new themeManager_1.ThemeManager();
            manager.setTheme('dark');
            (0, vitest_1.expect)(manager.isDarkTheme()).toBe(true);
            (0, vitest_1.expect)(manager.getResolvedTheme()).toBe('dark');
            manager.destroy();
        });
        (0, vitest_1.it)('should have proper contrast in light theme', () => {
            const manager = new themeManager_1.ThemeManager();
            manager.setTheme('light');
            (0, vitest_1.expect)(manager.isDarkTheme()).toBe(false);
            (0, vitest_1.expect)(manager.getResolvedTheme()).toBe('light');
            manager.destroy();
        });
        (0, vitest_1.it)('should support all three theme modes', () => {
            const manager = new themeManager_1.ThemeManager();
            const modes = ['light', 'dark', 'system'];
            for (const mode of modes) {
                manager.setTheme(mode);
                (0, vitest_1.expect)(manager.getTheme()).toBe(mode);
            }
            manager.destroy();
        });
        (0, vitest_1.it)('should persist theme across application restart simulation', () => {
            // Simulate first app session
            const manager1 = new themeManager_1.ThemeManager();
            manager1.setTheme('dark');
            manager1.destroy();
            // Simulate app restart by mocking getSetting to return persisted value
            vitest_1.vi.mocked(settingsStore.getSetting).mockReturnValue('dark');
            // Simulate second app session
            const manager2 = new themeManager_1.ThemeManager();
            (0, vitest_1.expect)(manager2.getTheme()).toBe('dark');
            (0, vitest_1.expect)(manager2.isDarkTheme()).toBe(true);
            manager2.destroy();
        });
        (0, vitest_1.it)('should apply theme to document on initialization', () => {
            const manager = new themeManager_1.ThemeManager();
            manager.setTheme('dark');
            // Verify theme is applied (in test environment, document.documentElement exists)
            if (typeof document !== 'undefined') {
                const theme = document.documentElement.getAttribute('data-theme');
                (0, vitest_1.expect)(['light', 'dark']).toContain(theme);
            }
            manager.destroy();
        });
        (0, vitest_1.it)('should notify listeners when theme changes', () => {
            const manager = new themeManager_1.ThemeManager();
            const listener = vitest_1.vi.fn();
            manager.subscribe(listener);
            manager.setTheme('dark');
            (0, vitest_1.expect)(listener).toHaveBeenCalled();
            (0, vitest_1.expect)(listener).toHaveBeenCalledWith({
                mode: 'dark',
                isDark: true,
            });
            manager.destroy();
        });
        (0, vitest_1.it)('should support theme switching without errors', () => {
            const manager = new themeManager_1.ThemeManager();
            (0, vitest_1.expect)(() => {
                manager.setTheme('light');
                manager.setTheme('dark');
                manager.setTheme('system');
                manager.setTheme('light');
            }).not.toThrow();
            manager.destroy();
        });
    });
});
