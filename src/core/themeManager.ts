export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeConfig {
  mode: ThemeMode;
  isDark: boolean;
}

/**
 * ThemeManager handles theme detection, switching, and persistence
 */
export class ThemeManager {
  private currentMode: ThemeMode = 'system';
  private isDark: boolean = false;
  private mediaQueryList: MediaQueryList | null = null;
  private listeners: Set<(config: ThemeConfig) => void> = new Set();

  constructor() {
    this.initializeTheme();
  }

  /**
   * Initialize theme on startup
   */
  private async initializeTheme(): Promise<void> {
    // Try to load theme from settings via IPC
    try {
      if (typeof window !== 'undefined' && (window as any).arc && (window as any).arc.getSettings) {
        const settings = await (window as any).arc.getSettings();
        this.currentMode = settings.theme || 'system';
      }
    } catch (error) {
      console.warn('Could not load theme from settings:', error);
    }

    this.isDark = this.resolveTheme();
    this.applyTheme();
    this.setupSystemThemeListener();
  }

  /**
   * Setup listener for system theme changes
   */
  private setupSystemThemeListener(): void {
    if (typeof window === 'undefined') return;

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
  private resolveTheme(): boolean {
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
  private applyTheme(): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    if (this.isDark) {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('theme-dark');
      root.classList.remove('theme-light');
    } else {
      root.setAttribute('data-theme', 'light');
      root.classList.add('theme-light');
      root.classList.remove('theme-dark');
    }
  }

  /**
   * Set theme mode and persist
   */
  async setTheme(mode: ThemeMode): Promise<void> {
    if (this.currentMode === mode) {
      return; // Idempotent - no change needed
    }

    this.currentMode = mode;
    this.isDark = this.resolveTheme();
    this.applyTheme();
    
    // Persist via IPC
    try {
      if (typeof window !== 'undefined' && (window as any).arc && (window as any).arc.updateSettings) {
        await (window as any).arc.updateSettings({ theme: mode });
      }
    } catch (error) {
      console.warn('Could not save theme to settings:', error);
    }
    
    this.notifyListeners();
  }

  /**
   * Get current theme mode
   */
  getTheme(): ThemeMode {
    return this.currentMode;
  }

  /**
   * Get resolved theme (light or dark)
   */
  getResolvedTheme(): 'light' | 'dark' {
    return this.isDark ? 'dark' : 'light';
  }

  /**
   * Check if current theme is dark
   */
  isDarkTheme(): boolean {
    return this.isDark;
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(listener: (config: ThemeConfig) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of theme change
   */
  private notifyListeners(): void {
    const config: ThemeConfig = {
      mode: this.currentMode,
      isDark: this.isDark,
    };
    this.listeners.forEach(listener => listener(config));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.listeners.clear();
    if (this.mediaQueryList && this.mediaQueryList.removeEventListener) {
      this.mediaQueryList.removeEventListener('change', () => {});
    }
  }
}

// Singleton instance
let themeManagerInstance: ThemeManager | null = null;

/**
 * Get or create the theme manager singleton
 */
export function getThemeManager(): ThemeManager {
  if (!themeManagerInstance) {
    themeManagerInstance = new ThemeManager();
  }
  return themeManagerInstance;
}
