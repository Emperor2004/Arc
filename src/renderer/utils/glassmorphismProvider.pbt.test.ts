/**
 * Property-Based Tests for Glassmorphism Provider
 * Feature: ui-rendering-fix
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { GlassmorphismProvider, GlassmorphismConfig } from './glassmorphismProvider';

describe('GlassmorphismProvider - Property-Based Tests', () => {
  let provider: GlassmorphismProvider;
  let testElements: HTMLElement[] = [];

  beforeEach(() => {
    provider = GlassmorphismProvider.getInstance();
  });

  afterEach(() => {
    // Clean up test elements
    testElements.forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    testElements = [];
  });

  /**
   * Helper to create a test element
   */
  function createTestElement(): HTMLElement {
    const element = document.createElement('div');
    document.body.appendChild(element);
    testElements.push(element);
    return element;
  }

  /**
   * Arbitrary for valid glassmorphism config
   */
  const validGlassmorphismConfigArb = fc.record({
    blurIntensity: fc.integer({ min: 0, max: 100 }),
    opacity: fc.double({ min: 0, max: 1 }),
    borderOpacity: fc.double({ min: 0, max: 1 }),
    shadowIntensity: fc.double({ min: 0, max: 1 }),
    gradientStops: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
  });

  /**
   * Feature: ui-rendering-fix, Property 2: Glassmorphism Styling Consistency
   * Validates: Requirements 2.1, 2.2, 2.3, 2.5
   * 
   * For any element with glassmorphism styling, it should have backdrop-filter blur effects,
   * semi-transparent backgrounds, and subtle borders/shadows applied consistently
   */
  it('Property 2: Glassmorphism Styling Consistency - all glass elements have consistent styling', () => {
    fc.assert(
      fc.property(validGlassmorphismConfigArb, (config) => {
        const element = createTestElement();
        
        // Apply glassmorphism effect
        provider.applyGlassEffect(element, config);
        
        // Check that background is set (semi-transparent)
        const hasBackground = element.style.background !== '';
        expect(hasBackground).toBe(true);
        
        // Check that background contains rgba with opacity
        const backgroundHasOpacity = element.style.background.includes('rgba');
        expect(backgroundHasOpacity).toBe(true);
        
        // Check that border is set (subtle borders)
        const hasBorder = element.style.border !== '';
        expect(hasBorder).toBe(true);
        
        // Check that box shadow is set (shadows for depth)
        const hasBoxShadow = element.style.boxShadow !== '';
        expect(hasBoxShadow).toBe(true);
        
        // Check that backdrop filter is set if supported (blur effects)
        const browserSupportsBackdrop = provider.validateBrowserSupport();
        if (browserSupportsBackdrop) {
          const hasBackdropFilter = 
            element.style.backdropFilter !== '' || 
            element.style.webkitBackdropFilter !== '';
          expect(hasBackdropFilter).toBe(true);
          
          // Verify blur is applied
          const hasBlur = 
            element.style.backdropFilter.includes('blur') ||
            element.style.webkitBackdropFilter.includes('blur');
          expect(hasBlur).toBe(true);
        }
        
        // All styling properties should be consistently applied
        return hasBackground && hasBorder && hasBoxShadow;
      }),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Generated styles match config values
   * 
   * For any valid config, the generated styles should accurately reflect
   * the config values
   */
  it('Property: Generated styles accurately reflect config values', () => {
    fc.assert(
      fc.property(validGlassmorphismConfigArb, (config) => {
        const styles = provider.generateGlassStyles(config);
        
        // Check blur intensity
        expect(styles.backdropFilter).toBe(`blur(${config.blurIntensity}px)`);
        expect(styles.WebkitBackdropFilter).toBe(`blur(${config.blurIntensity}px)`);
        
        // Check opacity in background
        expect(styles.background).toContain(`${config.opacity}`);
        
        // Check border opacity
        expect(styles.border).toContain(`${config.borderOpacity}`);
        
        // Check shadow intensity
        expect(styles.boxShadow).toContain(`${config.shadowIntensity}`);
        
        return true;
      }),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Multiple elements receive consistent styling
   * 
   * For any set of elements and a config, all elements should receive
   * the same glassmorphism styling
   */
  it('Property: Multiple elements receive consistent styling', () => {
    fc.assert(
      fc.property(
        validGlassmorphismConfigArb,
        fc.integer({ min: 2, max: 10 }),
        (config, numElements) => {
          const elements = Array.from({ length: numElements }, () => createTestElement());
          
          // Apply glass effect to all elements
          provider.applyGlassEffectToElements(elements, config);
          
          // Get styles from first element as reference
          const referenceStyles = {
            background: elements[0].style.background,
            border: elements[0].style.border,
            boxShadow: elements[0].style.boxShadow,
            backdropFilter: elements[0].style.backdropFilter,
            webkitBackdropFilter: elements[0].style.webkitBackdropFilter,
          };
          
          // All other elements should have the same styles
          for (let i = 1; i < elements.length; i++) {
            expect(elements[i].style.background).toBe(referenceStyles.background);
            expect(elements[i].style.border).toBe(referenceStyles.border);
            expect(elements[i].style.boxShadow).toBe(referenceStyles.boxShadow);
            expect(elements[i].style.backdropFilter).toBe(referenceStyles.backdropFilter);
            expect(elements[i].style.webkitBackdropFilter).toBe(referenceStyles.webkitBackdropFilter);
          }
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Config validation correctly identifies invalid configs
   * 
   * For any config with out-of-range values, validation should return false
   */
  it('Property: Config validation correctly identifies invalid configs', () => {
    fc.assert(
      fc.property(
        fc.record({
          blurIntensity: fc.integer({ min: -100, max: 200 }),
          opacity: fc.double({ min: -1, max: 2 }),
          borderOpacity: fc.double({ min: -1, max: 2 }),
          shadowIntensity: fc.double({ min: -1, max: 2 }),
        }),
        (config) => {
          const isValid = provider.validateConfig(config);
          
          // Check if validation result matches expected validity
          const shouldBeValid = 
            config.blurIntensity >= 0 && config.blurIntensity <= 100 &&
            config.opacity >= 0 && config.opacity <= 1 &&
            config.borderOpacity >= 0 && config.borderOpacity <= 1 &&
            config.shadowIntensity >= 0 && config.shadowIntensity <= 1;
          
          expect(isValid).toBe(shouldBeValid);
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Removing glass effect clears all styling
   * 
   * For any element with glass effect applied, removing it should clear
   * all glassmorphism-related styles
   */
  it('Property: Removing glass effect clears all styling', () => {
    fc.assert(
      fc.property(validGlassmorphismConfigArb, (config) => {
        const element = createTestElement();
        
        // Apply glass effect
        provider.applyGlassEffect(element, config);
        
        // Verify styles are applied
        const hasStylesBefore = 
          element.style.background !== '' ||
          element.style.backdropFilter !== '' ||
          element.style.border !== '' ||
          element.style.boxShadow !== '';
        expect(hasStylesBefore).toBe(true);
        
        // Remove glass effect
        provider.removeGlassEffect(element);
        
        // Verify all styles are cleared
        expect(element.style.background).toBe('');
        expect(element.style.backdropFilter).toBe('');
        expect(element.style.webkitBackdropFilter).toBe('');
        expect(element.style.border).toBe('');
        expect(element.style.boxShadow).toBe('');
        
        return true;
      }),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Theme-specific configs generate appropriate gradients
   * 
   * For any theme (light or dark), the generated gradients should be
   * appropriate for that theme
   */
  it('Property: Theme-specific configs generate appropriate gradients', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light' as const, 'dark' as const),
        (theme) => {
          const gradients = provider.generateGradients(theme);
          
          // Should return an array of gradient strings
          expect(Array.isArray(gradients)).toBe(true);
          expect(gradients.length).toBeGreaterThan(0);
          
          // All gradients should be strings containing 'linear-gradient'
          gradients.forEach(gradient => {
            expect(typeof gradient).toBe('string');
            expect(gradient).toContain('linear-gradient');
          });
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Browser support detection is consistent
   * 
   * For any number of calls, browser support detection should return
   * the same result
   */
  it('Property: Browser support detection is consistent', () => {
    const firstResult = provider.validateBrowserSupport();
    
    // Call multiple times
    for (let i = 0; i < 10; i++) {
      const result = provider.validateBrowserSupport();
      expect(result).toBe(firstResult);
    }
  });

  /**
   * Property: Default configs are valid
   * 
   * All default configs (default, light, dark) should pass validation
   */
  it('Property: Default configs are valid', () => {
    const defaultConfig = provider.getDefaultConfig();
    const lightConfig = provider.getLightThemeConfig();
    const darkConfig = provider.getDarkThemeConfig();
    
    expect(provider.validateConfig(defaultConfig)).toBe(true);
    expect(provider.validateConfig(lightConfig)).toBe(true);
    expect(provider.validateConfig(darkConfig)).toBe(true);
  });
});
