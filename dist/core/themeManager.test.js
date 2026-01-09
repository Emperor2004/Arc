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
// Mock the settings store
vitest_1.vi.mock('./settingsStore', () => ({
    getSetting: vitest_1.vi.fn(),
    updateSetting: vitest_1.vi.fn(),
}));
(0, vitest_1.describe)('ThemeManager', () => {
    let themeManager;
    (0, vitest_1.beforeEach)(() => {
        // Reset mocks
        vitest_1.vi.clearAllMocks();
        // Mock getSetting to return 'system' by default
        vitest_1.vi.mocked(settingsStore.getSetting).mockReturnValue('system');
        // Create new instance
        themeManager = new themeManager_1.ThemeManager();
    });
    (0, vitest_1.afterEach)(() => {
        themeManager.destroy();
    });
    (0, vitest_1.describe)('initialization', () => {
        (0, vitest_1.it)('should initialize with theme from settings', () => {
            vitest_1.vi.mocked(settingsStore.getSetting).mockReturnValue('dark');
            const manager = new themeManager_1.ThemeManager();
            (0, vitest_1.expect)(manager.getTheme()).toBe('dark');
            manager.destroy();
        });
        (0, vitest_1.it)('should resolve theme correctly for dark mode', () => {
            vitest_1.vi.mocked(settingsStore.getSetting).mockReturnValue('dark');
            const manager = new themeManager_1.ThemeManager();
            (0, vitest_1.expect)(manager.isDarkTheme()).toBe(true);
            (0, vitest_1.expect)(manager.getResolvedTheme()).toBe('dark');
            manager.destroy();
        });
        (0, vitest_1.it)('should resolve theme correctly for light mode', () => {
            vitest_1.vi.mocked(settingsStore.getSetting).mockReturnValue('light');
            const manager = new themeManager_1.ThemeManager();
            (0, vitest_1.expect)(manager.isDarkTheme()).toBe(false);
            (0, vitest_1.expect)(manager.getResolvedTheme()).toBe('light');
            manager.destroy();
        });
    });
    (0, vitest_1.describe)('setTheme', () => {
        (0, vitest_1.it)('should change theme to dark', () => {
            themeManager.setTheme('dark');
            (0, vitest_1.expect)(themeManager.getTheme()).toBe('dark');
            (0, vitest_1.expect)(themeManager.isDarkTheme()).toBe(true);
            (0, vitest_1.expect)(vitest_1.vi.mocked(settingsStore.updateSetting)).toHaveBeenCalledWith('theme', 'dark');
        });
        (0, vitest_1.it)('should change theme to light', () => {
            themeManager.setTheme('light');
            (0, vitest_1.expect)(themeManager.getTheme()).toBe('light');
            (0, vitest_1.expect)(themeManager.isDarkTheme()).toBe(false);
            (0, vitest_1.expect)(vitest_1.vi.mocked(settingsStore.updateSetting)).toHaveBeenCalledWith('theme', 'light');
        });
        (0, vitest_1.it)('should change theme to system', () => {
            // First change to dark to ensure we're changing from something different
            themeManager.setTheme('dark');
            vitest_1.vi.mocked(settingsStore.updateSetting).mockClear();
            themeManager.setTheme('system');
            (0, vitest_1.expect)(themeManager.getTheme()).toBe('system');
            (0, vitest_1.expect)(vitest_1.vi.mocked(settingsStore.updateSetting)).toHaveBeenCalledWith('theme', 'system');
        });
        (0, vitest_1.it)('should be idempotent - setting same theme twice should only update once', () => {
            themeManager.setTheme('dark');
            vitest_1.vi.mocked(settingsStore.updateSetting).mockClear();
            themeManager.setTheme('dark');
            (0, vitest_1.expect)(vitest_1.vi.mocked(settingsStore.updateSetting)).not.toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('getTheme', () => {
        (0, vitest_1.it)('should return current theme mode', () => {
            themeManager.setTheme('dark');
            (0, vitest_1.expect)(themeManager.getTheme()).toBe('dark');
            themeManager.setTheme('light');
            (0, vitest_1.expect)(themeManager.getTheme()).toBe('light');
        });
    });
    (0, vitest_1.describe)('getResolvedTheme', () => {
        (0, vitest_1.it)('should return dark for dark mode', () => {
            themeManager.setTheme('dark');
            (0, vitest_1.expect)(themeManager.getResolvedTheme()).toBe('dark');
        });
        (0, vitest_1.it)('should return light for light mode', () => {
            themeManager.setTheme('light');
            (0, vitest_1.expect)(themeManager.getResolvedTheme()).toBe('light');
        });
        (0, vitest_1.it)('should return light for system mode when system is light', () => {
            // Mock system preference as light
            vitest_1.vi.mocked(settingsStore.getSetting).mockReturnValue('system');
            const manager = new themeManager_1.ThemeManager();
            // In test environment, system preference defaults to light
            (0, vitest_1.expect)(manager.getResolvedTheme()).toBe('light');
            manager.destroy();
        });
    });
    (0, vitest_1.describe)('isDarkTheme', () => {
        (0, vitest_1.it)('should return true when theme is dark', () => {
            themeManager.setTheme('dark');
            (0, vitest_1.expect)(themeManager.isDarkTheme()).toBe(true);
        });
        (0, vitest_1.it)('should return false when theme is light', () => {
            themeManager.setTheme('light');
            (0, vitest_1.expect)(themeManager.isDarkTheme()).toBe(false);
        });
    });
    (0, vitest_1.describe)('subscribe', () => {
        (0, vitest_1.it)('should notify listener when theme changes', () => {
            const listener = vitest_1.vi.fn();
            themeManager.subscribe(listener);
            themeManager.setTheme('dark');
            (0, vitest_1.expect)(listener).toHaveBeenCalledWith({
                mode: 'dark',
                isDark: true,
            });
        });
        (0, vitest_1.it)('should notify listener with correct config', () => {
            const listener = vitest_1.vi.fn();
            themeManager.subscribe(listener);
            themeManager.setTheme('light');
            (0, vitest_1.expect)(listener).toHaveBeenCalledWith({
                mode: 'light',
                isDark: false,
            });
        });
        (0, vitest_1.it)('should return unsubscribe function', () => {
            const listener = vitest_1.vi.fn();
            const unsubscribe = themeManager.subscribe(listener);
            themeManager.setTheme('dark');
            (0, vitest_1.expect)(listener).toHaveBeenCalledTimes(1);
            unsubscribe();
            themeManager.setTheme('light');
            (0, vitest_1.expect)(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
        });
        (0, vitest_1.it)('should support multiple listeners', () => {
            const listener1 = vitest_1.vi.fn();
            const listener2 = vitest_1.vi.fn();
            themeManager.subscribe(listener1);
            themeManager.subscribe(listener2);
            themeManager.setTheme('dark');
            (0, vitest_1.expect)(listener1).toHaveBeenCalledTimes(1);
            (0, vitest_1.expect)(listener2).toHaveBeenCalledTimes(1);
        });
    });
    (0, vitest_1.describe)('destroy', () => {
        (0, vitest_1.it)('should clear all listeners', () => {
            const listener = vitest_1.vi.fn();
            themeManager.subscribe(listener);
            themeManager.destroy();
            themeManager.setTheme('dark');
            (0, vitest_1.expect)(listener).not.toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('theme transitions', () => {
        (0, vitest_1.it)('should transition from dark to light', () => {
            themeManager.setTheme('dark');
            (0, vitest_1.expect)(themeManager.isDarkTheme()).toBe(true);
            themeManager.setTheme('light');
            (0, vitest_1.expect)(themeManager.isDarkTheme()).toBe(false);
        });
        (0, vitest_1.it)('should transition from light to dark', () => {
            themeManager.setTheme('light');
            (0, vitest_1.expect)(themeManager.isDarkTheme()).toBe(false);
            themeManager.setTheme('dark');
            (0, vitest_1.expect)(themeManager.isDarkTheme()).toBe(true);
        });
        (0, vitest_1.it)('should transition through all modes', () => {
            const modes = ['light', 'dark', 'system', 'light'];
            for (const mode of modes) {
                themeManager.setTheme(mode);
                (0, vitest_1.expect)(themeManager.getTheme()).toBe(mode);
            }
        });
    });
});
