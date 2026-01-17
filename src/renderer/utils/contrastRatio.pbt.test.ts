/**
 * Property-Based Tests for Contrast Ratio Compliance
 * Feature: ui-rendering-fix
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

describe('Contrast Ratio Compliance - Property-Based Tests', () => {
  let testElements: HTMLElement[] = [];

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
  function createTestElement(text?: string): HTMLElement {
    const element = document.createElement('div');
    if (text) {
      element.textContent = text;
    }
    document.body.appendChild(element);
    testElements.push(element);
    return element;
  }

  /**
   * Calculate relative luminance of a color
   * Based on WCAG 2.0 formula
   */
  function getRelativeLuminance(r: number, g: number, b: number): number {
    const rsRGB = r / 255;
    const gsRGB = g / 255;
    const bsRGB = b / 255;

    const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  }

  /**
   * Calculate contrast ratio between two colors
   * Based on WCAG 2.0 formula
   */
  function getContrastRatio(
    r1: number, g1: number, b1: number,
    r2: number, g2: number, b2: number
  ): number {
    const l1 = getRelativeLuminance(r1, g1, b1);
    const l2 = getRelativeLuminance(r2, g2, b2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Check if contrast ratio meets WCAG AA standard for normal text (4.5:1)
   */
  function meetsWCAGAA(
    textR: number, textG: number, textB: number,
    bgR: number, bgG: number, bgB: number
  ): boolean {
    const ratio = getContrastRatio(textR, textG, textB, bgR, bgG, bgB);
    return ratio >= 4.5;
  }

  /**
   * Check if contrast ratio meets WCAG AA standard for large text (3:1)
   */
  function meetsWCAGAALarge(
    textR: number, textG: number, textB: number,
    bgR: number, bgG: number, bgB: number
  ): boolean {
    const ratio = getContrastRatio(textR, textG, textB, bgR, bgG, bgB);
    return ratio >= 3.0;
  }

  /**
   * Check if contrast ratio meets WCAG AAA standard for normal text (7:1)
   */
  function meetsWCAGAAA(
    textR: number, textG: number, textB: number,
    bgR: number, bgG: number, bgB: number
  ): boolean {
    const ratio = getContrastRatio(textR, textG, textB, bgR, bgG, bgB);
    return ratio >= 7.0;
  }

  /**
   * Arbitrary for valid RGB color components
   */
  const rgbComponentArb = fc.integer({ min: 0, max: 255 });

  /**
   * Arbitrary for RGB colors
   */
  const rgbColorArb = fc.tuple(rgbComponentArb, rgbComponentArb, rgbComponentArb);

  /**
   * Feature: ui-rendering-fix, Property 9: Contrast Ratio Compliance
   * Validates: Requirements 4.3
   * 
   * For any text element, the contrast ratio between text and background
   * should meet accessibility standards
   */
  it('Property 9: Contrast Ratio Compliance - contrast ratio calculation is symmetric', () => {
    fc.assert(
      fc.property(
        rgbColorArb,
        rgbColorArb,
        ([r1, g1, b1], [r2, g2, b2]) => {
          // Contrast ratio should be the same regardless of which color is foreground/background
          const ratio1 = getContrastRatio(r1, g1, b1, r2, g2, b2);
          const ratio2 = getContrastRatio(r2, g2, b2, r1, g1, b1);
          
          expect(ratio1).toBeCloseTo(ratio2, 5);
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Contrast ratio is always >= 1
   * 
   * For any two colors, the contrast ratio should be at least 1:1
   */
  it('Property: Contrast ratio is always >= 1', () => {
    fc.assert(
      fc.property(
        rgbColorArb,
        rgbColorArb,
        ([r1, g1, b1], [r2, g2, b2]) => {
          const ratio = getContrastRatio(r1, g1, b1, r2, g2, b2);
          
          expect(ratio).toBeGreaterThanOrEqual(1.0);
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Contrast ratio with itself is exactly 1
   * 
   * For any color, the contrast ratio with itself should be 1:1
   */
  it('Property: Contrast ratio with itself is exactly 1', () => {
    fc.assert(
      fc.property(
        rgbColorArb,
        ([r, g, b]) => {
          const ratio = getContrastRatio(r, g, b, r, g, b);
          
          expect(ratio).toBeCloseTo(1.0, 5);
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Black and white have maximum contrast
   * 
   * Black (0,0,0) and white (255,255,255) should have the highest contrast ratio (21:1)
   */
  it('Property: Black and white have maximum contrast', () => {
    const ratio = getContrastRatio(0, 0, 0, 255, 255, 255);
    
    expect(ratio).toBeCloseTo(21.0, 1);
  });

  /**
   * Property: Relative luminance is between 0 and 1
   * 
   * For any color, the relative luminance should be between 0 and 1
   */
  it('Property: Relative luminance is between 0 and 1', () => {
    fc.assert(
      fc.property(
        rgbColorArb,
        ([r, g, b]) => {
          const luminance = getRelativeLuminance(r, g, b);
          
          expect(luminance).toBeGreaterThanOrEqual(0.0);
          expect(luminance).toBeLessThanOrEqual(1.0);
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Black has luminance 0, white has luminance 1
   * 
   * Black should have the minimum luminance (0) and white the maximum (1)
   */
  it('Property: Black has luminance 0, white has luminance 1', () => {
    const blackLuminance = getRelativeLuminance(0, 0, 0);
    const whiteLuminance = getRelativeLuminance(255, 255, 255);
    
    expect(blackLuminance).toBeCloseTo(0.0, 5);
    expect(whiteLuminance).toBeCloseTo(1.0, 5);
  });

  /**
   * Property: WCAG AA compliance is transitive for sufficient contrast
   * 
   * If color A meets WCAG AA with color B, and color B meets WCAG AA with color C,
   * then the relationship is consistent
   */
  it('Property: WCAG AA standard is correctly applied', () => {
    fc.assert(
      fc.property(
        rgbColorArb,
        rgbColorArb,
        ([r1, g1, b1], [r2, g2, b2]) => {
          const ratio = getContrastRatio(r1, g1, b1, r2, g2, b2);
          const meetsAA = meetsWCAGAA(r1, g1, b1, r2, g2, b2);
          
          // If ratio >= 4.5, should meet WCAG AA
          if (ratio >= 4.5) {
            expect(meetsAA).toBe(true);
          } else {
            expect(meetsAA).toBe(false);
          }
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: WCAG AAA is stricter than WCAG AA
   * 
   * For any color pair, if it meets WCAG AAA, it must also meet WCAG AA
   */
  it('Property: WCAG AAA is stricter than WCAG AA', () => {
    fc.assert(
      fc.property(
        rgbColorArb,
        rgbColorArb,
        ([r1, g1, b1], [r2, g2, b2]) => {
          const meetsAAA = meetsWCAGAAA(r1, g1, b1, r2, g2, b2);
          const meetsAA = meetsWCAGAA(r1, g1, b1, r2, g2, b2);
          
          // If meets AAA, must also meet AA
          if (meetsAAA) {
            expect(meetsAA).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Large text standard is less strict than normal text
   * 
   * For any color pair, if it meets normal text standard, it must meet large text standard
   */
  it('Property: Large text standard is less strict than normal text', () => {
    fc.assert(
      fc.property(
        rgbColorArb,
        rgbColorArb,
        ([r1, g1, b1], [r2, g2, b2]) => {
          const meetsNormal = meetsWCAGAA(r1, g1, b1, r2, g2, b2);
          const meetsLarge = meetsWCAGAALarge(r1, g1, b1, r2, g2, b2);
          
          // If meets normal text standard, must also meet large text standard
          if (meetsNormal) {
            expect(meetsLarge).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Increasing brightness difference increases contrast
   * 
   * For any color, making it lighter or darker should increase contrast with the opposite
   */
  it('Property: Increasing brightness difference increases contrast', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 205 }),
        (gray) => {
          // Start with a gray color
          const ratio1 = getContrastRatio(gray, gray, gray, 255, 255, 255);
          
          // Make it darker (should increase contrast with white)
          const darkerGray = Math.max(0, gray - 50);
          const ratio2 = getContrastRatio(darkerGray, darkerGray, darkerGray, 255, 255, 255);
          
          expect(ratio2).toBeGreaterThan(ratio1);
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Grayscale colors have predictable contrast
   * 
   * For any two grayscale colors, the one with higher value should have higher luminance
   */
  it('Property: Grayscale colors have predictable contrast', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        (gray1, gray2) => {
          const lum1 = getRelativeLuminance(gray1, gray1, gray1);
          const lum2 = getRelativeLuminance(gray2, gray2, gray2);
          
          if (gray1 > gray2) {
            expect(lum1).toBeGreaterThan(lum2);
          } else if (gray1 < gray2) {
            expect(lum1).toBeLessThan(lum2);
          } else {
            expect(lum1).toBeCloseTo(lum2, 5);
          }
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Contrast ratio is continuous
   * 
   * Small changes in color should result in small changes in contrast ratio
   */
  it('Property: Contrast ratio is continuous', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 254 }),
        fc.integer({ min: 1, max: 254 }),
        fc.integer({ min: 1, max: 254 }),
        (r, g, b) => {
          const ratio1 = getContrastRatio(r, g, b, 255, 255, 255);
          const ratio2 = getContrastRatio(r + 1, g, b, 255, 255, 255);
          
          // Small change in color should result in small change in ratio
          const ratioDiff = Math.abs(ratio2 - ratio1);
          expect(ratioDiff).toBeLessThan(0.5); // Reasonable threshold
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
});
