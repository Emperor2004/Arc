/**
 * Glassmorphism Provider Utility
 * 
 * Provides utilities for applying and managing glassmorphism effects
 * across the application with browser support detection.
 */

export interface GlassmorphismConfig {
  blurIntensity: number;
  opacity: number;
  borderOpacity: number;
  shadowIntensity: number;
  gradientStops: string[];
}

export interface GlassmorphismStyles {
  background: string;
  backdropFilter: string;
  WebkitBackdropFilter: string;
  border: string;
  boxShadow: string;
}

export class GlassmorphismProvider {
  private static instance: GlassmorphismProvider;
  private browserSupportsBackdropFilter: boolean | null = null;

  private constructor() {
    this.browserSupportsBackdropFilter = this.detectBackdropFilterSupport();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): GlassmorphismProvider {
    if (!GlassmorphismProvider.instance) {
      GlassmorphismProvider.instance = new GlassmorphismProvider();
    }
    return GlassmorphismProvider.instance;
  }

  /**
   * Detect if browser supports backdrop-filter
   */
  private detectBackdropFilterSupport(): boolean {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return false;
    }

    try {
      const testElement = document.createElement('div');
      testElement.style.backdropFilter = 'blur(10px)';
      const supported = testElement.style.backdropFilter === 'blur(10px)';
      
      // Also check webkit prefix
      if (!supported) {
        testElement.style.webkitBackdropFilter = 'blur(10px)';
        return testElement.style.webkitBackdropFilter === 'blur(10px)';
      }
      
      return supported;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if browser supports backdrop-filter
   */
  public validateBrowserSupport(): boolean {
    if (this.browserSupportsBackdropFilter === null) {
      this.browserSupportsBackdropFilter = this.detectBackdropFilterSupport();
    }
    return this.browserSupportsBackdropFilter;
  }

  /**
   * Apply glassmorphism effect to an element
   */
  public applyGlassEffect(element: HTMLElement, config: GlassmorphismConfig): void {
    if (!element) {
      return;
    }

    const styles = this.generateGlassStyles(config);
    
    element.style.background = styles.background;
    element.style.border = styles.border;
    element.style.boxShadow = styles.boxShadow;
    
    if (this.validateBrowserSupport()) {
      element.style.backdropFilter = styles.backdropFilter;
      element.style.webkitBackdropFilter = styles.WebkitBackdropFilter;
    } else {
      // Fallback: use slightly more opaque background
      element.style.background = `rgba(255, 255, 255, ${Math.min(config.opacity + 0.1, 1)})`;
    }
  }

  /**
   * Generate glassmorphism styles object
   */
  public generateGlassStyles(config: GlassmorphismConfig): GlassmorphismStyles {
    const { blurIntensity, opacity, borderOpacity, shadowIntensity } = config;

    return {
      background: `rgba(255, 255, 255, ${opacity})`,
      backdropFilter: `blur(${blurIntensity}px)`,
      WebkitBackdropFilter: `blur(${blurIntensity}px)`,
      border: `1px solid rgba(255, 255, 255, ${borderOpacity})`,
      boxShadow: `0 8px 32px rgba(0, 0, 0, ${shadowIntensity})`,
    };
  }

  /**
   * Generate gradient backgrounds for themes
   */
  public generateGradients(theme: 'light' | 'dark'): string[] {
    if (theme === 'light') {
      return [
        'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(240, 240, 240, 0.8))',
        'linear-gradient(135deg, rgba(45, 127, 249, 0.1), rgba(45, 127, 249, 0.05))',
        'linear-gradient(135deg, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.02))',
      ];
    } else {
      return [
        'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04))',
        'linear-gradient(135deg, rgba(45, 127, 249, 0.2), rgba(45, 127, 249, 0.1))',
        'linear-gradient(135deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.2))',
      ];
    }
  }

  /**
   * Get default glassmorphism config
   */
  public getDefaultConfig(): GlassmorphismConfig {
    return {
      blurIntensity: 20,
      opacity: 0.08,
      borderOpacity: 0.12,
      shadowIntensity: 0.3,
      gradientStops: this.generateGradients('dark'),
    };
  }

  /**
   * Create a glassmorphism config for light theme
   */
  public getLightThemeConfig(): GlassmorphismConfig {
    return {
      blurIntensity: 20,
      opacity: 0.04,
      borderOpacity: 0.08,
      shadowIntensity: 0.15,
      gradientStops: this.generateGradients('light'),
    };
  }

  /**
   * Create a glassmorphism config for dark theme
   */
  public getDarkThemeConfig(): GlassmorphismConfig {
    return {
      blurIntensity: 20,
      opacity: 0.08,
      borderOpacity: 0.12,
      shadowIntensity: 0.3,
      gradientStops: this.generateGradients('dark'),
    };
  }

  /**
   * Validate glassmorphism config
   */
  public validateConfig(config: Partial<GlassmorphismConfig>): boolean {
    if (config.blurIntensity !== undefined && (config.blurIntensity < 0 || config.blurIntensity > 100)) {
      return false;
    }
    if (config.opacity !== undefined && (config.opacity < 0 || config.opacity > 1)) {
      return false;
    }
    if (config.borderOpacity !== undefined && (config.borderOpacity < 0 || config.borderOpacity > 1)) {
      return false;
    }
    if (config.shadowIntensity !== undefined && (config.shadowIntensity < 0 || config.shadowIntensity > 1)) {
      return false;
    }
    return true;
  }

  /**
   * Apply glassmorphism to multiple elements with the same config
   */
  public applyGlassEffectToElements(elements: HTMLElement[], config: GlassmorphismConfig): void {
    elements.forEach(element => this.applyGlassEffect(element, config));
  }

  /**
   * Remove glassmorphism effects from an element
   */
  public removeGlassEffect(element: HTMLElement): void {
    if (!element) {
      return;
    }

    element.style.background = '';
    element.style.backdropFilter = '';
    element.style.webkitBackdropFilter = '';
    element.style.border = '';
    element.style.boxShadow = '';
  }
}

// Export singleton instance
export const glassmorphismProvider = GlassmorphismProvider.getInstance();
