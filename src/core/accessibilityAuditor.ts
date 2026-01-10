/**
 * Accessibility Auditor for Arc Browser
 * Implements WCAG 2.1 AA compliance checks and accessibility testing
 */

export interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info';
  rule: string;
  description: string;
  element?: string;
  selector?: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  wcagLevel: 'A' | 'AA' | 'AAA';
  wcagCriteria: string;
}

export interface AccessibilityAuditResult {
  passed: boolean;
  score: number; // 0-100
  totalChecks: number;
  passedChecks: number;
  issues: AccessibilityIssue[];
  summary: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
}

export interface KeyboardNavigationResult {
  passed: boolean;
  focusableElements: number;
  tabOrder: string[];
  issues: string[];
}

export interface ColorContrastResult {
  passed: boolean;
  ratio: number;
  minimumRequired: number;
  level: 'AA' | 'AAA';
}

export class AccessibilityAuditor {
  private document: Document;

  constructor(document: Document = window.document) {
    this.document = document;
  }

  /**
   * Run comprehensive accessibility audit
   */
  async runFullAudit(): Promise<AccessibilityAuditResult> {
    const issues: AccessibilityIssue[] = [];
    
    // Run all audit checks
    issues.push(...this.checkAriaLabels());
    issues.push(...this.checkKeyboardNavigation());
    issues.push(...this.checkColorContrast());
    issues.push(...this.checkSemanticHTML());
    issues.push(...this.checkFormLabels());
    issues.push(...this.checkHeadingStructure());
    issues.push(...this.checkImageAltText());
    issues.push(...this.checkFocusIndicators());
    issues.push(...this.checkReducedMotion());
    issues.push(...this.checkLandmarks());

    const summary = this.summarizeIssues(issues);
    const totalChecks = this.getTotalChecks();
    const passedChecks = totalChecks - issues.filter(i => i.type === 'error').length;
    const score = Math.round((passedChecks / totalChecks) * 100);

    return {
      passed: issues.filter(i => i.type === 'error').length === 0,
      score,
      totalChecks,
      passedChecks,
      issues,
      summary
    };
  }

  /**
   * Check ARIA labels on interactive elements
   */
  private checkAriaLabels(): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    
    // Interactive elements that need labels
    const interactiveSelectors = [
      'button:not([aria-label]):not([aria-labelledby]):not([title])',
      'input:not([aria-label]):not([aria-labelledby]):not([id])',
      'select:not([aria-label]):not([aria-labelledby]):not([id])',
      'textarea:not([aria-label]):not([aria-labelledby]):not([id])',
      '[role="button"]:not([aria-label]):not([aria-labelledby]):not([title])',
      '[role="tab"]:not([aria-label]):not([aria-labelledby])',
      '[role="menuitem"]:not([aria-label]):not([aria-labelledby])'
    ];

    interactiveSelectors.forEach(selector => {
      const elements = this.document.querySelectorAll(selector);
      elements.forEach((element, index) => {
        // Skip if element has text content that serves as label
        if (element.textContent?.trim()) return;
        
        issues.push({
          type: 'error',
          rule: 'aria-labels',
          description: `Interactive element lacks accessible name`,
          element: element.tagName.toLowerCase(),
          selector: this.getElementSelector(element),
          impact: 'serious',
          wcagLevel: 'A',
          wcagCriteria: '4.1.2 Name, Role, Value'
        });
      });
    });

    return issues;
  }

  /**
   * Check keyboard navigation functionality
   */
  private checkKeyboardNavigation(): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    
    // Find all focusable elements
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '[role="tab"]',
      '[role="menuitem"]'
    ];

    const focusableElements = this.document.querySelectorAll(
      focusableSelectors.join(', ')
    );

    // Check for keyboard traps
    focusableElements.forEach(element => {
      const tabIndex = element.getAttribute('tabindex');
      if (tabIndex && parseInt(tabIndex) > 0) {
        issues.push({
          type: 'warning',
          rule: 'keyboard-navigation',
          description: `Positive tabindex can disrupt natural tab order`,
          element: element.tagName.toLowerCase(),
          selector: this.getElementSelector(element),
          impact: 'moderate',
          wcagLevel: 'A',
          wcagCriteria: '2.1.1 Keyboard'
        });
      }
    });

    // Check for elements that should be focusable but aren't
    const clickableElements = this.document.querySelectorAll('[onclick], .clickable');
    clickableElements.forEach(element => {
      if (!this.isFocusable(element)) {
        issues.push({
          type: 'error',
          rule: 'keyboard-navigation',
          description: `Clickable element is not keyboard accessible`,
          element: element.tagName.toLowerCase(),
          selector: this.getElementSelector(element),
          impact: 'serious',
          wcagLevel: 'A',
          wcagCriteria: '2.1.1 Keyboard'
        });
      }
    });

    return issues;
  }

  /**
   * Check color contrast ratios
   */
  private checkColorContrast(): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    
    // Get all text elements
    const textElements = this.document.querySelectorAll('*');
    
    textElements.forEach(element => {
      if (!element.textContent?.trim()) return;
      
      try {
        // Check if window and getComputedStyle are available
        if (typeof window !== 'undefined' && window.getComputedStyle) {
          const styles = window.getComputedStyle(element);
          const color = styles.color;
          const backgroundColor = styles.backgroundColor;
          
          // Skip if no background color (transparent)
          if (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') {
            return;
          }
          
          const contrast = this.calculateContrastRatio(color, backgroundColor);
          const fontSize = parseFloat(styles.fontSize);
          const fontWeight = styles.fontWeight;
          
          // Determine minimum contrast requirement
          const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
          const minContrast = isLargeText ? 3.0 : 4.5;
          
          if (contrast < minContrast) {
            issues.push({
              type: 'error',
              rule: 'color-contrast',
              description: `Text contrast ratio ${contrast.toFixed(2)}:1 is below minimum ${minContrast}:1`,
              element: element.tagName.toLowerCase(),
              selector: this.getElementSelector(element),
              impact: 'serious',
              wcagLevel: 'AA',
              wcagCriteria: '1.4.3 Contrast (Minimum)'
            });
          }
        }
      } catch (error) {
        // Skip color contrast check if getComputedStyle is not available (e.g., in jsdom)
        // This is acceptable for testing environments
      }
    });

    return issues;
  }

  /**
   * Check semantic HTML usage
   */
  private checkSemanticHTML(): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    
    // Check for proper heading structure
    const headings = this.document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) {
      issues.push({
        type: 'warning',
        rule: 'semantic-html',
        description: 'No heading elements found - consider adding headings for structure',
        impact: 'moderate',
        wcagLevel: 'AA',
        wcagCriteria: '1.3.1 Info and Relationships'
      });
    }

    // Check for main landmark
    const main = this.document.querySelector('main, [role="main"]');
    if (!main) {
      issues.push({
        type: 'warning',
        rule: 'semantic-html',
        description: 'No main landmark found - consider adding <main> element',
        impact: 'moderate',
        wcagLevel: 'AA',
        wcagCriteria: '1.3.1 Info and Relationships'
      });
    }

    // Check for navigation landmark
    const nav = this.document.querySelector('nav, [role="navigation"]');
    if (!nav) {
      issues.push({
        type: 'info',
        rule: 'semantic-html',
        description: 'No navigation landmark found - consider adding <nav> element',
        impact: 'minor',
        wcagLevel: 'AA',
        wcagCriteria: '1.3.1 Info and Relationships'
      });
    }

    return issues;
  }

  /**
   * Check form labels
   */
  private checkFormLabels(): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    
    const inputs = this.document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const id = input.getAttribute('id');
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');
      
      // Check if input has associated label
      let hasLabel = false;
      if (id) {
        const label = this.document.querySelector(`label[for="${id}"]`);
        hasLabel = !!label;
      }
      
      if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
        issues.push({
          type: 'error',
          rule: 'form-labels',
          description: 'Form control lacks accessible label',
          element: input.tagName.toLowerCase(),
          selector: this.getElementSelector(input),
          impact: 'serious',
          wcagLevel: 'A',
          wcagCriteria: '3.3.2 Labels or Instructions'
        });
      }
    });

    return issues;
  }

  /**
   * Check heading structure
   */
  private checkHeadingStructure(): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    
    const headings = Array.from(this.document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let previousLevel = 0;
    
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1));
      
      // Check for skipped heading levels
      if (level > previousLevel + 1) {
        issues.push({
          type: 'warning',
          rule: 'heading-structure',
          description: `Heading level ${level} skips level ${previousLevel + 1}`,
          element: heading.tagName.toLowerCase(),
          selector: this.getElementSelector(heading),
          impact: 'moderate',
          wcagLevel: 'AA',
          wcagCriteria: '1.3.1 Info and Relationships'
        });
      }
      
      previousLevel = level;
    });

    return issues;
  }

  /**
   * Check image alt text
   */
  private checkImageAltText(): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    
    const images = this.document.querySelectorAll('img');
    images.forEach(img => {
      const alt = img.getAttribute('alt');
      const ariaLabel = img.getAttribute('aria-label');
      const role = img.getAttribute('role');
      
      // Skip decorative images
      if (role === 'presentation' || alt === '') return;
      
      if (!alt && !ariaLabel) {
        issues.push({
          type: 'error',
          rule: 'image-alt',
          description: 'Image lacks alternative text',
          element: 'img',
          selector: this.getElementSelector(img),
          impact: 'serious',
          wcagLevel: 'A',
          wcagCriteria: '1.1.1 Non-text Content'
        });
      }
    });

    return issues;
  }

  /**
   * Check focus indicators
   */
  private checkFocusIndicators(): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    
    // This is a simplified check - in a real implementation, you'd need to
    // actually test focus styles by programmatically focusing elements
    const focusableElements = this.document.querySelectorAll(
      'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach(element => {
      try {
        // Check if window and getComputedStyle are available
        if (typeof window !== 'undefined' && window.getComputedStyle) {
          const styles = window.getComputedStyle(element, ':focus');
          const outline = styles.outline;
          const outlineWidth = styles.outlineWidth;
          const boxShadow = styles.boxShadow;
          
          // Check if element has visible focus indicator
          if (outline === 'none' && outlineWidth === '0px' && boxShadow === 'none') {
            issues.push({
              type: 'warning',
              rule: 'focus-indicators',
              description: 'Element may lack visible focus indicator',
              element: element.tagName.toLowerCase(),
              selector: this.getElementSelector(element),
              impact: 'moderate',
              wcagLevel: 'AA',
              wcagCriteria: '2.4.7 Focus Visible'
            });
          }
        }
      } catch (error) {
        // Skip focus indicator check if getComputedStyle is not available (e.g., in jsdom)
        // This is acceptable for testing environments
      }
    });

    return issues;
  }

  /**
   * Check reduced motion support
   */
  private checkReducedMotion(): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    
    // Check if CSS respects prefers-reduced-motion
    const stylesheets = Array.from(this.document.styleSheets);
    let hasReducedMotionSupport = false;
    
    try {
      stylesheets.forEach(stylesheet => {
        if (stylesheet.cssRules) {
          Array.from(stylesheet.cssRules).forEach(rule => {
            if (rule instanceof CSSMediaRule && 
                rule.conditionText.includes('prefers-reduced-motion')) {
              hasReducedMotionSupport = true;
            }
          });
        }
      });
    } catch (e) {
      // Cross-origin stylesheets may not be accessible
    }
    
    if (!hasReducedMotionSupport) {
      issues.push({
        type: 'warning',
        rule: 'reduced-motion',
        description: 'No support for prefers-reduced-motion detected',
        impact: 'moderate',
        wcagLevel: 'AAA',
        wcagCriteria: '2.3.3 Animation from Interactions'
      });
    }

    return issues;
  }

  /**
   * Check landmark regions
   */
  private checkLandmarks(): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    
    const landmarks = [
      { selector: 'header, [role="banner"]', name: 'banner' },
      { selector: 'nav, [role="navigation"]', name: 'navigation' },
      { selector: 'main, [role="main"]', name: 'main' },
      { selector: 'aside, [role="complementary"]', name: 'complementary' },
      { selector: 'footer, [role="contentinfo"]', name: 'contentinfo' }
    ];

    landmarks.forEach(landmark => {
      const elements = this.document.querySelectorAll(landmark.selector);
      if (elements.length === 0 && landmark.name === 'main') {
        issues.push({
          type: 'warning',
          rule: 'landmarks',
          description: `Missing ${landmark.name} landmark`,
          impact: 'moderate',
          wcagLevel: 'AA',
          wcagCriteria: '1.3.1 Info and Relationships'
        });
      }
    });

    return issues;
  }

  /**
   * Test keyboard navigation programmatically
   */
  testKeyboardNavigation(): KeyboardNavigationResult {
    const focusableElements = this.getFocusableElements();
    const tabOrder: string[] = [];
    const issues: string[] = [];

    // Test tab order
    focusableElements.forEach((element, index) => {
      const selector = this.getElementSelector(element);
      tabOrder.push(selector);
      
      // Check if element can receive focus
      try {
        (element as HTMLElement).focus();
        if (this.document.activeElement !== element) {
          issues.push(`Element ${selector} cannot receive focus`);
        }
      } catch (e) {
        issues.push(`Error focusing element ${selector}: ${e}`);
      }
    });

    return {
      passed: issues.length === 0,
      focusableElements: focusableElements.length,
      tabOrder,
      issues
    };
  }

  /**
   * Test color contrast for specific elements
   */
  testColorContrast(foreground: string, background: string): ColorContrastResult {
    const ratio = this.calculateContrastRatio(foreground, background);
    const aaMinimum = 4.5;
    const aaaMinimum = 7.0;
    
    return {
      passed: ratio >= aaMinimum,
      ratio,
      minimumRequired: aaMinimum,
      level: ratio >= aaaMinimum ? 'AAA' : 'AA'
    };
  }

  /**
   * Helper methods
   */
  private getFocusableElements(): Element[] {
    const selectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '[role="tab"]',
      '[role="menuitem"]'
    ];

    return Array.from(this.document.querySelectorAll(selectors.join(', ')));
  }

  private isFocusable(element: Element): boolean {
    const focusableSelectors = [
      'button', 'input', 'select', 'textarea', 'a[href]', '[tabindex]',
      '[role="button"]', '[role="tab"]', '[role="menuitem"]'
    ];
    
    return focusableSelectors.some(selector => element.matches(selector));
  }

  private getElementSelector(element: Element): string {
    if (element.id) return `#${element.id}`;
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        return `${element.tagName.toLowerCase()}.${classes[0]}`;
      }
    }
    return element.tagName.toLowerCase();
  }

  private calculateContrastRatio(foreground: string, background: string): number {
    const fgLuminance = this.getLuminance(foreground);
    const bgLuminance = this.getLuminance(background);
    
    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  private getLuminance(color: string): number {
    // Simplified luminance calculation
    // In a real implementation, you'd parse RGB values properly
    const rgb = this.parseColor(color);
    if (!rgb) return 0;
    
    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  private parseColor(color: string): [number, number, number] | null {
    // Simplified color parsing - in reality you'd handle more formats
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }
    return null;
  }

  private summarizeIssues(issues: AccessibilityIssue[]) {
    return {
      critical: issues.filter(i => i.impact === 'critical').length,
      serious: issues.filter(i => i.impact === 'serious').length,
      moderate: issues.filter(i => i.impact === 'moderate').length,
      minor: issues.filter(i => i.impact === 'minor').length
    };
  }

  private getTotalChecks(): number {
    // Total number of accessibility checks performed
    return 50; // Approximate number based on all the checks above
  }
}

/**
 * High contrast mode detection and testing
 */
export class HighContrastTester {
  static isHighContrastMode(): boolean {
    // Check if high contrast mode is enabled
    if (window.matchMedia) {
      return window.matchMedia('(prefers-contrast: high)').matches ||
             window.matchMedia('(-ms-high-contrast: active)').matches;
    }
    return false;
  }

  static testHighContrastSupport(): boolean {
    // Test if the application properly supports high contrast mode
    const testElement = document.createElement('div');
    testElement.style.cssText = `
      position: absolute;
      left: -9999px;
      background: ButtonFace;
      color: ButtonText;
    `;
    
    document.body.appendChild(testElement);
    const styles = window.getComputedStyle(testElement);
    const hasSystemColors = styles.backgroundColor !== 'rgba(0, 0, 0, 0)';
    document.body.removeChild(testElement);
    
    return hasSystemColors;
  }
}

/**
 * Screen reader testing utilities
 */
export class ScreenReaderTester {
  static getAriaTree(): any {
    // Build a simplified representation of the accessibility tree
    const buildTree = (element: Element): any => {
      const role = element.getAttribute('role') || this.getImplicitRole(element);
      const name = this.getAccessibleName(element);
      const description = element.getAttribute('aria-describedby');
      
      const node: any = {
        tagName: element.tagName.toLowerCase(),
        role,
        name,
        description,
        children: []
      };
      
      Array.from(element.children).forEach(child => {
        if (!this.isHidden(child)) {
          node.children.push(buildTree(child));
        }
      });
      
      return node;
    };
    
    return buildTree(document.body);
  }

  private static getImplicitRole(element: Element): string {
    const tagName = element.tagName.toLowerCase();
    const roleMap: Record<string, string> = {
      'button': 'button',
      'a': element.hasAttribute('href') ? 'link' : 'generic',
      'input': this.getInputRole(element as HTMLInputElement),
      'select': 'combobox',
      'textarea': 'textbox',
      'h1': 'heading',
      'h2': 'heading',
      'h3': 'heading',
      'h4': 'heading',
      'h5': 'heading',
      'h6': 'heading',
      'nav': 'navigation',
      'main': 'main',
      'header': 'banner',
      'footer': 'contentinfo',
      'aside': 'complementary'
    };
    
    return roleMap[tagName] || 'generic';
  }

  private static getInputRole(input: HTMLInputElement): string {
    const type = input.type.toLowerCase();
    const roleMap: Record<string, string> = {
      'button': 'button',
      'submit': 'button',
      'reset': 'button',
      'checkbox': 'checkbox',
      'radio': 'radio',
      'range': 'slider'
    };
    
    return roleMap[type] || 'textbox';
  }

  private static getAccessibleName(element: Element): string {
    // Simplified accessible name calculation
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelElement = document.getElementById(ariaLabelledBy);
      if (labelElement) return labelElement.textContent || '';
    }
    
    if (element.tagName.toLowerCase() === 'input') {
      const id = element.getAttribute('id');
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) return label.textContent || '';
      }
    }
    
    return element.textContent?.trim() || '';
  }

  private static isHidden(element: Element): boolean {
    const ariaHidden = element.getAttribute('aria-hidden');
    if (ariaHidden === 'true') return true;
    
    const styles = window.getComputedStyle(element);
    return styles.display === 'none' || styles.visibility === 'hidden';
  }
}