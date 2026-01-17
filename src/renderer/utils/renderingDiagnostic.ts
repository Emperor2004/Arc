/**
 * Rendering Diagnostic Utility
 * Helps diagnose white screen issues and rendering problems
 */

export interface CSSValidationResult {
  stylesLoaded: boolean;
  glassmorphismSupported: boolean;
  missingRules: string[];
  conflictingRules: string[];
  criticalStylesPresent: boolean;
}

export interface AssetValidationResult {
  allAssetsLoaded: boolean;
  failedAssets: string[];
  loadingAssets: string[];
  criticalAssetsLoaded: boolean;
}

export interface RenderingError {
  type: 'css' | 'js' | 'asset' | 'component' | 'react';
  message: string;
  element?: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ComponentValidationResult {
  reactMounted: boolean;
  arcRootPresent: boolean;
  headerPresent: boolean;
  navigationPresent: boolean;
  mainContentPresent: boolean;
  componentCount: number;
}

export class RenderingDiagnostic {
  private errors: RenderingError[] = [];

  /**
   * Check if React has mounted successfully and validate component structure
   */
  checkReactMount(): ComponentValidationResult {
    const result: ComponentValidationResult = {
      reactMounted: false,
      arcRootPresent: false,
      headerPresent: false,
      navigationPresent: false,
      mainContentPresent: false,
      componentCount: 0
    };

    try {
      const rootElement = document.getElementById('root');
      if (!rootElement) {
        this.addError('react', 'Root element not found', undefined, 'critical');
        return result;
      }

      // Check if React has rendered content
      const hasContent = rootElement.children.length > 0;
      if (!hasContent) {
        this.addError('react', 'Root element is empty - React may not have mounted', undefined, 'critical');
        return result;
      }

      result.reactMounted = true;

      // Check for Arc-specific elements
      const arcRoot = document.querySelector('.arc-root');
      if (arcRoot) {
        result.arcRootPresent = true;
        result.componentCount++;
      } else {
        this.addError('component', 'Arc root component not found', '.arc-root', 'critical');
      }

      // Check for header
      const header = document.querySelector('.arc-header');
      if (header) {
        result.headerPresent = true;
        result.componentCount++;
      } else {
        this.addError('component', 'Arc header component not found', '.arc-header', 'high');
      }

      // Check for navigation
      const navigation = document.querySelector('.arc-nav');
      if (navigation) {
        result.navigationPresent = true;
        result.componentCount++;
      } else {
        this.addError('component', 'Arc navigation component not found', '.arc-nav', 'medium');
      }

      // Check for main content
      const mainContent = document.querySelector('.arc-main');
      if (mainContent) {
        result.mainContentPresent = true;
        result.componentCount++;
      } else {
        this.addError('component', 'Arc main content component not found', '.arc-main', 'high');
      }

      console.log('✅ React mount check completed:', result);
      return result;
    } catch (error) {
      this.addError('js', `React mount check failed: ${error}`, undefined, 'critical');
      return result;
    }
  }

  /**
   * Validate CSS loading and parsing with enhanced checks
   */
  validateCSS(): CSSValidationResult {
    const result: CSSValidationResult = {
      stylesLoaded: false,
      glassmorphismSupported: false,
      missingRules: [],
      conflictingRules: [],
      criticalStylesPresent: false
    };

    try {
      // Check if stylesheets are loaded
      const stylesheets = Array.from(document.styleSheets);
      result.stylesLoaded = stylesheets.length > 0;

      if (!result.stylesLoaded) {
        this.addError('css', 'No stylesheets found', undefined, 'critical');
        return result;
      }

      // Check for critical CSS rules
      const criticalRules = [
        '.arc-root',
        '.glass-card',
        '.btn-primary',
        '.arc-nav',
        '.arc-header',
        '.arc-main'
      ];

      let criticalRulesFound = 0;
      for (const rule of criticalRules) {
        if (this.hasRule(rule)) {
          criticalRulesFound++;
        } else {
          result.missingRules.push(rule);
        }
      }

      result.criticalStylesPresent = criticalRulesFound >= criticalRules.length * 0.8; // 80% threshold

      // Check glassmorphism support
      result.glassmorphismSupported = this.checkGlassmorphismSupport();

      // Check for CSS variables
      const rootStyles = getComputedStyle(document.documentElement);
      const cssVariables = ['--text-primary', '--bg-dark', '--glass-bg', '--accent'];
      const missingVariables = cssVariables.filter(variable => 
        !rootStyles.getPropertyValue(variable)
      );

      if (missingVariables.length > 0) {
        this.addError('css', `Missing CSS variables: ${missingVariables.join(', ')}`, undefined, 'medium');
      }

      if (result.missingRules.length === 0) {
        console.log('✅ CSS validation passed');
      } else {
        console.warn('⚠️ Missing CSS rules:', result.missingRules);
        this.addError('css', `Missing CSS rules: ${result.missingRules.join(', ')}`, undefined, 'high');
      }

      return result;
    } catch (error) {
      this.addError('css', `CSS validation failed: ${error}`, undefined, 'critical');
      return result;
    }
  }

  /**
   * Verify asset loading with enhanced checks
   */
  verifyAssets(): AssetValidationResult {
    const result: AssetValidationResult = {
      allAssetsLoaded: true,
      failedAssets: [],
      loadingAssets: [],
      criticalAssetsLoaded: false
    };

    try {
      // Check images
      const images = Array.from(document.images);
      for (const img of images) {
        if (!img.complete) {
          result.loadingAssets.push(img.src);
          result.allAssetsLoaded = false;
        } else if (img.naturalWidth === 0) {
          result.failedAssets.push(img.src);
          result.allAssetsLoaded = false;
        }
      }

      // Check stylesheets
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      for (const link of links) {
        const href = (link as HTMLLinkElement).href;
        if (!this.isStylesheetLoaded(href)) {
          result.failedAssets.push(href);
          result.allAssetsLoaded = false;
        }
      }

      // Check for critical assets (fonts, main CSS)
      const criticalAssets = [
        'global.css',
        'index.css'
      ];

      let criticalAssetsFound = 0;
      for (const asset of criticalAssets) {
        const found = links.some(link => 
          (link as HTMLLinkElement).href.includes(asset)
        );
        if (found) {
          criticalAssetsFound++;
        }
      }

      result.criticalAssetsLoaded = criticalAssetsFound > 0;

      if (result.allAssetsLoaded) {
        console.log('✅ Asset verification passed');
      } else {
        console.warn('⚠️ Asset loading issues:', result);
        this.addError('asset', `Failed assets: ${result.failedAssets.join(', ')}`, undefined, 'medium');
      }

      return result;
    } catch (error) {
      this.addError('asset', `Asset verification failed: ${error}`, undefined, 'high');
      return result;
    }
  }

  /**
   * Detect rendering errors
   */
  detectRenderingErrors(): RenderingError[] {
    return this.errors;
  }

  /**
   * Run complete diagnostic with enhanced reporting
   */
  runDiagnostic(): {
    componentValidation: ComponentValidationResult;
    cssValid: CSSValidationResult;
    assetsValid: AssetValidationResult;
    errors: RenderingError[];
    overallHealth: 'healthy' | 'warning' | 'critical';
  } {
    console.log('🔍 Running comprehensive rendering diagnostic...');
    
    const componentValidation = this.checkReactMount();
    const cssValid = this.validateCSS();
    const assetsValid = this.verifyAssets();
    const errors = this.detectRenderingErrors();

    // Determine overall health
    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    const highErrors = errors.filter(e => e.severity === 'high');
    
    if (criticalErrors.length > 0 || !componentValidation.reactMounted) {
      overallHealth = 'critical';
    } else if (highErrors.length > 0 || !cssValid.criticalStylesPresent) {
      overallHealth = 'warning';
    }

    const result = {
      componentValidation,
      cssValid,
      assetsValid,
      errors,
      overallHealth
    };

    console.log('📊 Diagnostic results:', result);
    
    // Log summary
    if (overallHealth === 'critical') {
      console.error('🚨 CRITICAL: White screen likely due to:', criticalErrors.map(e => e.message));
    } else if (overallHealth === 'warning') {
      console.warn('⚠️ WARNING: Potential rendering issues detected');
    } else {
      console.log('✅ Rendering appears healthy');
    }
    
    return result;
  }

  /**
   * Add error to the error log with severity
   */
  private addError(type: RenderingError['type'], message: string, element?: string, severity: RenderingError['severity'] = 'medium'): void {
    this.errors.push({
      type,
      message,
      element,
      timestamp: Date.now(),
      severity
    });
  }

  /**
   * Check if a CSS rule exists
   */
  private hasRule(selector: string): boolean {
    try {
      const stylesheets = Array.from(document.styleSheets);
      for (const stylesheet of stylesheets) {
        try {
          const rules = Array.from(stylesheet.cssRules || []);
          for (const rule of rules) {
            if (rule instanceof CSSStyleRule && rule.selectorText?.includes(selector)) {
              return true;
            }
          }
        } catch (e) {
          // Cross-origin stylesheet, skip
          continue;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check glassmorphism support
   */
  private checkGlassmorphismSupport(): boolean {
    try {
      const testElement = document.createElement('div');
      testElement.style.backdropFilter = 'blur(10px)';
      return testElement.style.backdropFilter === 'blur(10px)';
    } catch (error) {
      return false;
    }
  }

  /**
   * Attempt to fix common white screen issues
   */
  attemptWhiteScreenFix(): {
    attempted: string[];
    successful: string[];
    failed: string[];
  } {
    const result = {
      attempted: [],
      successful: [],
      failed: []
    };

    console.log('🔧 Attempting white screen fixes...');

    // Fix 1: Ensure root element has proper styling
    try {
      result.attempted.push('Root element styling');
      const rootElement = document.getElementById('root');
      if (rootElement) {
        rootElement.style.width = '100%';
        rootElement.style.height = '100vh';
        rootElement.style.minHeight = '100vh';
        result.successful.push('Root element styling');
      } else {
        result.failed.push('Root element styling - element not found');
      }
    } catch (error) {
      result.failed.push(`Root element styling - ${error}`);
    }

    // Fix 2: Force CSS re-evaluation
    try {
      result.attempted.push('CSS re-evaluation');
      const arcRoot = document.querySelector('.arc-root') as HTMLElement;
      if (arcRoot) {
        // Force reflow
        arcRoot.style.display = 'none';
        arcRoot.offsetHeight; // Trigger reflow
        arcRoot.style.display = '';
        result.successful.push('CSS re-evaluation');
      } else {
        result.failed.push('CSS re-evaluation - arc-root not found');
      }
    } catch (error) {
      result.failed.push(`CSS re-evaluation - ${error}`);
    }

    // Fix 3: Ensure critical CSS variables are set
    try {
      result.attempted.push('CSS variables');
      const rootStyles = getComputedStyle(document.documentElement);
      const criticalVars = {
        '--bg-dark': '#0f1115',
        '--text-primary': '#ffffff',
        '--glass-bg': 'rgba(255, 255, 255, 0.08)',
        '--accent': '#2d7ff9'
      };

      let varsSet = 0;
      for (const [variable, fallback] of Object.entries(criticalVars)) {
        if (!rootStyles.getPropertyValue(variable)) {
          document.documentElement.style.setProperty(variable, fallback);
          varsSet++;
        }
      }

      if (varsSet > 0) {
        result.successful.push(`CSS variables (${varsSet} set)`);
      } else {
        result.successful.push('CSS variables (all present)');
      }
    } catch (error) {
      result.failed.push(`CSS variables - ${error}`);
    }

    // Fix 4: Check and fix React mounting
    try {
      result.attempted.push('React remount check');
      const rootElement = document.getElementById('root');
      if (rootElement && rootElement.children.length === 0) {
        // React hasn't mounted, this needs manual intervention
        result.failed.push('React remount check - no React content found');
      } else {
        result.successful.push('React remount check');
      }
    } catch (error) {
      result.failed.push(`React remount check - ${error}`);
    }

    console.log('🔧 White screen fix results:', result);
    return result;
  }
  /**
   * Check if stylesheet is loaded
   */
  private isStylesheetLoaded(href: string): boolean {
    try {
      const stylesheets = Array.from(document.styleSheets);
      return stylesheets.some(sheet => sheet.href === href);
    } catch (error) {
      return false;
    }
  }
}

// Global diagnostic instance
export const renderingDiagnostic = new RenderingDiagnostic();

// Auto-run diagnostic in development
if (process.env.NODE_ENV === 'development') {
  // Run diagnostic after DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => renderingDiagnostic.runDiagnostic(), 1000);
    });
  } else {
    setTimeout(() => renderingDiagnostic.runDiagnostic(), 1000);
  }
}