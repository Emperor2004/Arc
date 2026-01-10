"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeManager = void 0;
exports.getThemeManager = getThemeManager;
/**
 * ThemeManager handles theme detection, switching, and persistence
 */
class ThemeManager {
    constructor() {
        this.currentMode = 'system';
        this.isDark = false;
        this.mediaQueryList = null;
        this.listeners = new Set();
        this.initializeTheme();
    }
    /**
     * Initialize theme on startup
     */
    async initializeTheme() {
        // Try to load theme from settings via IPC
        try {
            if (typeof window !== 'undefined' && window.arc && window.arc.getSettings) {
                const settings = await window.arc.getSettings();
                this.currentMode = settings.theme || 'system';
            }
        }
        catch (error) {
            console.warn('Could not load theme from settings:', error);
        }
        this.isDark = this.resolveTheme();
        this.applyTheme();
        this.setupSystemThemeListener();
    }
    /**
     * Setup listener for system theme changes
     */
    setupSystemThemeListener() {
        if (typeof window === 'undefined')
            return;
        // Check if prefers-color-scheme is supported
        if (window.matchMedia) {
            this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
            // Use addEventListener for modern browsers
            if (this.mediaQueryList.addEventListener) {
                this.mediaQueryList.addEventListener('change', (e) => {
                    if (this.currentMode === 'system') {
                        this.isDark = e.matches;
                        this.applyTheme();
                        this.notifyListeners();
                    }
                });
            }
        }
    }
    /**
     * Resolve the actual theme (light or dark) based on current mode
     */
    resolveTheme() {
        if (this.currentMode === 'dark') {
            return true;
        }
        if (this.currentMode === 'light') {
            return false;
        }
        // system mode - detect from OS
        if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    }
    /**
     * Apply theme to the document
     */
    applyTheme() {
        if (typeof document === 'undefined')
            return;
        const root = document.documentElement;
        if (this.isDark) {
            root.setAttribute('data-theme', 'dark');
            root.classList.add('theme-dark');
            root.classList.remove('theme-light');
        }
        else {
            root.setAttribute('data-theme', 'light');
            root.classList.add('theme-light');
            root.classList.remove('theme-dark');
        }
    }
    /**
     * Set theme mode and persist
     */
    async setTheme(mode) {
        if (this.currentMode === mode) {
            return; // Idempotent - no change needed
        }
        this.currentMode = mode;
        this.isDark = this.resolveTheme();
        this.applyTheme();
        // Persist via IPC
        try {
            if (typeof window !== 'undefined' && window.arc && window.arc.updateSettings) {
                await window.arc.updateSettings({ theme: mode });
            }
        }
        catch (error) {
            console.warn('Could not save theme to settings:', error);
        }
        this.notifyListeners();
    }
    /**
     * Get current theme mode
     */
    getTheme() {
        return this.currentMode;
    }
    /**
     * Get resolved theme (light or dark)
     */
    getResolvedTheme() {
        return this.isDark ? 'dark' : 'light';
    }
    /**
     * Check if current theme is dark
     */
    isDarkTheme() {
        return this.isDark;
    }
    /**
     * Subscribe to theme changes
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    /**
     * Notify all listeners of theme change
     */
    notifyListeners() {
        const config = {
            mode: this.currentMode,
            isDark: this.isDark,
        };
        this.listeners.forEach(listener => listener(config));
    }
    /**
     * Cleanup resources
     */
    destroy() {
        this.listeners.clear();
        if (this.mediaQueryList && this.mediaQueryList.removeEventListener) {
            this.mediaQueryList.removeEventListener('change', () => { });
        }
    }
}
exports.ThemeManager = ThemeManager;
// Singleton instance
let themeManagerInstance = null;
/**
 * Get or create the theme manager singleton
 */
function getThemeManager() {
    if (!themeManagerInstance) {
        themeManagerInstance = new ThemeManager();
    }
    return themeManagerInstance;
}
