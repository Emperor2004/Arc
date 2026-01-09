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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fast_check_1 = __importDefault(require("fast-check"));
const themeManager_1 = require("./themeManager");
const settingsStore = __importStar(require("./settingsStore"));
// Mock the settings store
vitest_1.vi.mock('./settingsStore', () => ({
    getSetting: vitest_1.vi.fn(),
    updateSetting: vitest_1.vi.fn(),
}));
(0, vitest_1.describe)('ThemeManager - Property-Based Tests', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        vitest_1.vi.mocked(settingsStore.getSetting).mockReturnValue('system');
    });
    (0, vitest_1.describe)('Property 1: Theme Application Idempotence', () => {
        (0, vitest_1.it)('should be idempotent - applying theme twice equals applying once', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.constantFrom('light', 'dark', 'system'), (theme) => {
                const manager = new themeManager_1.ThemeManager();
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
                (0, vitest_1.expect)(firstState).toEqual(secondState);
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property 2: Theme Consistency', () => {
        (0, vitest_1.it)('should maintain consistency between getTheme and getResolvedTheme', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.constantFrom('light', 'dark', 'system'), (theme) => {
                const manager = new themeManager_1.ThemeManager();
                manager.setTheme(theme);
                const currentTheme = manager.getTheme();
                const resolvedTheme = manager.getResolvedTheme();
                const isDark = manager.isDarkTheme();
                manager.destroy();
                // If theme is 'dark', resolved should be 'dark' and isDark should be true
                if (currentTheme === 'dark') {
                    (0, vitest_1.expect)(resolvedTheme).toBe('dark');
                    (0, vitest_1.expect)(isDark).toBe(true);
                }
                // If theme is 'light', resolved should be 'light' and isDark should be false
                if (currentTheme === 'light') {
                    (0, vitest_1.expect)(resolvedTheme).toBe('light');
                    (0, vitest_1.expect)(isDark).toBe(false);
                }
                // If theme is 'system', resolved should be either 'light' or 'dark'
                if (currentTheme === 'system') {
                    (0, vitest_1.expect)(['light', 'dark']).toContain(resolvedTheme);
                    (0, vitest_1.expect)(typeof isDark).toBe('boolean');
                }
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property 3: Theme Transition Determinism', () => {
        (0, vitest_1.it)('should produce deterministic results for same theme sequence', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.array(fast_check_1.default.constantFrom('light', 'dark', 'system'), {
                minLength: 1,
                maxLength: 10,
            }), (themeSequence) => {
                // First run
                const manager1 = new themeManager_1.ThemeManager();
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
                const manager2 = new themeManager_1.ThemeManager();
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
                (0, vitest_1.expect)(result1).toEqual(result2);
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property 4: Listener Notification Consistency', () => {
        (0, vitest_1.it)('should notify listeners consistently for theme changes', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.constantFrom('light', 'dark', 'system'), (theme) => {
                const manager = new themeManager_1.ThemeManager();
                const notifications = [];
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
                    (0, vitest_1.expect)(notifications).toHaveLength(1);
                    // Notification should match the set theme
                    (0, vitest_1.expect)(notifications[0].mode).toBe(theme);
                    // isDark should be consistent with theme
                    if (theme === 'dark') {
                        (0, vitest_1.expect)(notifications[0].isDark).toBe(true);
                    }
                    else if (theme === 'light') {
                        (0, vitest_1.expect)(notifications[0].isDark).toBe(false);
                    }
                }
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property 5: Settings Persistence', () => {
        (0, vitest_1.it)('should call updateSetting for each theme change', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.constantFrom('light', 'dark', 'system'), (theme) => {
                vitest_1.vi.mocked(settingsStore.updateSetting).mockClear();
                const manager = new themeManager_1.ThemeManager();
                // First change to dark to ensure we're changing from something different
                manager.setTheme('dark');
                vitest_1.vi.mocked(settingsStore.updateSetting).mockClear();
                manager.setTheme(theme);
                manager.destroy();
                // If theme is different from 'dark', should have called updateSetting once
                if (theme !== 'dark') {
                    (0, vitest_1.expect)(vitest_1.vi.mocked(settingsStore.updateSetting)).toHaveBeenCalledTimes(1);
                    (0, vitest_1.expect)(vitest_1.vi.mocked(settingsStore.updateSetting)).toHaveBeenCalledWith('theme', theme);
                }
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property 6: No Duplicate Notifications', () => {
        (0, vitest_1.it)('should not notify listeners when setting same theme twice', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.constantFrom('light', 'dark', 'system'), (theme) => {
                const manager = new themeManager_1.ThemeManager();
                const notifications = [];
                manager.subscribe(() => {
                    notifications.push(1);
                });
                manager.setTheme(theme);
                const firstCount = notifications.length;
                manager.setTheme(theme);
                const secondCount = notifications.length;
                manager.destroy();
                // Should not have additional notifications
                (0, vitest_1.expect)(secondCount).toBe(firstCount);
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property 7: Unsubscribe Effectiveness', () => {
        (0, vitest_1.it)('should stop notifying after unsubscribe', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.tuple(fast_check_1.default.constantFrom('light', 'dark', 'system'), fast_check_1.default.constantFrom('light', 'dark', 'system')), ([theme1, theme2]) => {
                const manager = new themeManager_1.ThemeManager();
                const notifications = [];
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
                (0, vitest_1.expect)(afterUnsubscribe).toBe(beforeUnsubscribe);
            }), { numRuns: 100 });
        });
    });
});
