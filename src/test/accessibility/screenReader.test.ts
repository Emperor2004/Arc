import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import App from '../../renderer/App';
import { ScreenReaderTester } from '../../core/accessibilityAuditor';

/**
 * Screen Reader Accessibility Tests
 * Tests screen reader compatibility and ARIA implementation
 */

describe('Screen Reader Accessibility', () => {
  beforeEach(() => {
    // Mock window.arc API
    (window as any).arc = {
      getSettings: vi.fn().mockResolvedValue({
        searchEngine: 'google',
        incognitoEnabled: true,
        restorePreviousSession: false
      })
    };

    // Mock process.platform
    Object.defineProperty(process, 'platform', {
      value: 'win32'
    });
  });

  describe('ARIA Labels and Descriptions', () => {
    it('should have proper ARIA labels on interactive elements', () => {
      const { container } = render(<App />);
      
      // Find interactive elements without text content
      const buttons = container.querySelectorAll('button');
      const inputs = container.querySelectorAll('input');
      const selects = container.querySelectorAll('select');
      
      const unlabeledElements: Element[] = [];
      
      [...buttons, ...inputs, ...selects].forEach(element => {
        const hasTextContent = element.textContent?.trim();
        const hasAriaLabel = element.getAttribute('aria-label');
        const hasAriaLabelledBy = element.getAttribute('aria-labelledby');
        const hasTitle = element.getAttribute('title');
        const hasId = element.getAttribute('id');
        
        // For inputs, check if there's an associated label
        let hasAssociatedLabel = false;
        if (element.tagName.toLowerCase() === 'input' && hasId) {
          const label = container.querySelector(`label[for="${hasId}"]`);
          hasAssociatedLabel = !!label;
        }
        
        const hasAccessibleName = hasTextContent || hasAriaLabel || hasAriaLabelledBy || hasTitle || hasAssociatedLabel;
        
        if (!hasAccessibleName) {
          unlabeledElements.push(element);
        }
      });
      
      // Allow some unlabeled elements but flag if there are too many
      if (unlabeledElements.length > 0) {
        console.warn(`Found ${unlabeledElements.length} unlabeled interactive elements:`, unlabeledElements);
      }
      
      expect(unlabeledElements.length).toBeLessThan(3);
    });

    it('should use appropriate ARIA roles', () => {
      const { container } = render(<App />);
      
      // Check for proper role usage
      const elementsWithRoles = container.querySelectorAll('[role]');
      
      const validRoles = [
        'button', 'link', 'tab', 'tablist', 'tabpanel', 'menu', 'menuitem',
        'dialog', 'alertdialog', 'banner', 'navigation', 'main', 'complementary',
        'contentinfo', 'search', 'form', 'region', 'article', 'section',
        'heading', 'list', 'listitem', 'grid', 'gridcell', 'row', 'columnheader',
        'rowheader', 'presentation', 'none', 'application', 'document'
      ];
      
      elementsWithRoles.forEach(element => {
        const role = element.getAttribute('role');
        expect(validRoles).toContain(role);
      });
    });

    it('should have proper heading structure', () => {
      const { container } = render(<App />);
      
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
      
      if (headings.length > 0) {
        // Should start with h1
        const firstHeading = headings[0];
        const firstLevel = getHeadingLevel(firstHeading);
        expect(firstLevel).toBe(1);
        
        // Check heading hierarchy
        let previousLevel = 1;
        Array.from(headings).forEach((heading, index) => {
          if (index === 0) return;
          
          const currentLevel = getHeadingLevel(heading);
          
          // Should not skip more than one level
          expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
          previousLevel = currentLevel;
        });
      }
    });

    it('should have proper form labels', () => {
      const { container } = render(<App />);
      
      const formControls = container.querySelectorAll('input, select, textarea');
      const unlabeledControls: Element[] = [];
      
      formControls.forEach(control => {
        const id = control.getAttribute('id');
        const ariaLabel = control.getAttribute('aria-label');
        const ariaLabelledBy = control.getAttribute('aria-labelledby');
        
        let hasLabel = false;
        
        // Check for associated label
        if (id) {
          const label = container.querySelector(`label[for="${id}"]`);
          hasLabel = !!label;
        }
        
        // Check for ARIA labeling
        if (ariaLabel || ariaLabelledBy) {
          hasLabel = true;
        }
        
        if (!hasLabel) {
          unlabeledControls.push(control);
        }
      });
      
      expect(unlabeledControls.length).toBe(0);
    });
  });

  describe('Landmark Regions', () => {
    it('should have proper landmark structure', () => {
      const { container } = render(<App />);
      
      // Check for main landmark
      const main = container.querySelector('main, [role="main"]');
      expect(main).toBeTruthy();
      
      // Check for navigation landmark
      const nav = container.querySelector('nav, [role="navigation"]');
      // Navigation is optional but recommended
      
      // Check for banner (header)
      const banner = container.querySelector('header, [role="banner"]');
      // Banner is optional but recommended
      
      // If multiple landmarks of same type exist, they should be labeled
      const navElements = container.querySelectorAll('nav, [role="navigation"]');
      if (navElements.length > 1) {
        navElements.forEach(nav => {
          const hasLabel = nav.getAttribute('aria-label') || nav.getAttribute('aria-labelledby');
          expect(hasLabel).toBeTruthy();
        });
      }
    });

    it('should have unique landmark labels when multiple exist', () => {
      const { container } = render(<App />);
      
      const landmarkTypes = ['navigation', 'complementary', 'contentinfo'];
      
      landmarkTypes.forEach(landmarkType => {
        const landmarks = container.querySelectorAll(`[role="${landmarkType}"], ${getLandmarkTag(landmarkType)}`);
        
        if (landmarks.length > 1) {
          const labels = new Set();
          landmarks.forEach(landmark => {
            const label = landmark.getAttribute('aria-label') || 
                         landmark.getAttribute('aria-labelledby') ||
                         landmark.textContent?.trim().substring(0, 50);
            
            expect(label).toBeTruthy();
            expect(labels.has(label)).toBe(false); // Should be unique
            labels.add(label);
          });
        }
      });
    });
  });

  describe('ARIA States and Properties', () => {
    it('should use aria-expanded correctly on expandable elements', () => {
      const { container } = render(<App />);
      
      const expandableElements = container.querySelectorAll('[aria-expanded]');
      
      expandableElements.forEach(element => {
        const expanded = element.getAttribute('aria-expanded');
        expect(['true', 'false']).toContain(expanded);
        
        // If expanded is true, there should be associated content
        if (expanded === 'true') {
          const controls = element.getAttribute('aria-controls');
          if (controls) {
            const controlledElement = container.querySelector(`#${controls}`);
            expect(controlledElement).toBeTruthy();
          }
        }
      });
    });

    it('should use aria-selected correctly on selectable elements', () => {
      const { container } = render(<App />);
      
      const selectableElements = container.querySelectorAll('[aria-selected]');
      
      selectableElements.forEach(element => {
        const selected = element.getAttribute('aria-selected');
        expect(['true', 'false']).toContain(selected);
      });
    });

    it('should use aria-checked correctly on checkable elements', () => {
      const { container } = render(<App />);
      
      const checkableElements = container.querySelectorAll('[aria-checked]');
      
      checkableElements.forEach(element => {
        const checked = element.getAttribute('aria-checked');
        expect(['true', 'false', 'mixed']).toContain(checked);
      });
    });

    it('should use aria-disabled correctly', () => {
      const { container } = render(<App />);
      
      const elementsWithAriaDisabled = container.querySelectorAll('[aria-disabled]');
      
      elementsWithAriaDisabled.forEach(element => {
        const disabled = element.getAttribute('aria-disabled');
        expect(['true', 'false']).toContain(disabled);
        
        // If aria-disabled is true, element should not be focusable
        if (disabled === 'true') {
          const tabIndex = element.getAttribute('tabindex');
          expect(tabIndex).toBe('-1');
        }
      });
    });
  });

  describe('Live Regions', () => {
    it('should use aria-live for dynamic content updates', () => {
      const { container } = render(<App />);
      
      // Look for elements that might contain dynamic content
      const liveRegions = container.querySelectorAll('[aria-live]');
      
      liveRegions.forEach(region => {
        const liveValue = region.getAttribute('aria-live');
        expect(['polite', 'assertive', 'off']).toContain(liveValue);
      });
    });

    it('should announce important status changes', () => {
      const { container } = render(<App />);
      
      // Look for status regions
      const statusRegions = container.querySelectorAll('[role="status"], [role="alert"]');
      
      statusRegions.forEach(region => {
        // Status regions should be live regions
        const ariaLive = region.getAttribute('aria-live');
        const role = region.getAttribute('role');
        
        if (role === 'alert') {
          // Alerts are implicitly assertive
          expect(ariaLive === 'assertive' || ariaLive === null).toBe(true);
        } else if (role === 'status') {
          // Status is implicitly polite
          expect(ariaLive === 'polite' || ariaLive === null).toBe(true);
        }
      });
    });
  });

  describe('Screen Reader Navigation', () => {
    it('should provide skip links for efficient navigation', () => {
      const { container } = render(<App />);
      
      // Look for skip links (usually at the beginning of the page)
      const skipLinks = container.querySelectorAll('a[href^="#"]');
      
      skipLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href !== '#') {
          const target = container.querySelector(href);
          expect(target).toBeTruthy();
        }
      });
    });

    it('should have proper reading order', () => {
      const { container } = render(<App />);
      
      // Get all focusable and readable elements in DOM order
      const readableElements = container.querySelectorAll('h1, h2, h3, h4, h5, h6, p, button, input, select, textarea, a, [role="button"], [role="link"]');
      
      // Check that elements appear in logical reading order
      let previousTop = -1;
      let previousLeft = -1;
      
      Array.from(readableElements).forEach(element => {
        const rect = element.getBoundingClientRect();
        
        // Skip hidden elements
        if (rect.width === 0 && rect.height === 0) return;
        
        // Elements should generally flow top to bottom, left to right
        if (previousTop !== -1) {
          // Allow some tolerance for elements on the same line
          if (rect.top > previousTop + 10) {
            // New line - left position can reset
            previousLeft = -1;
          } else if (rect.top >= previousTop - 10 && rect.top <= previousTop + 10) {
            // Same line - should be to the right of previous element
            expect(rect.left).toBeGreaterThanOrEqual(previousLeft - 10);
          }
        }
        
        previousTop = rect.top;
        previousLeft = rect.left;
      });
    });
  });

  describe('ARIA Tree Structure', () => {
    it('should build proper accessibility tree', () => {
      render(<App />);
      
      // Mock document.body for the static method
      const tree = ScreenReaderTester.getAriaTree();
      
      expect(tree).toBeTruthy();
      expect(tree).toHaveProperty('tagName');
      expect(tree).toHaveProperty('role');
      expect(tree).toHaveProperty('children');
      expect(Array.isArray(tree.children)).toBe(true);
    });

    it('should have meaningful accessible names throughout the tree', () => {
      render(<App />);
      
      const tree = ScreenReaderTester.getAriaTree();
      const elementsWithoutNames: any[] = [];
      
      function checkTree(node: any) {
        // Interactive elements should have accessible names
        const interactiveRoles = ['button', 'link', 'tab', 'menuitem', 'textbox', 'combobox'];
        
        if (interactiveRoles.includes(node.role) && !node.name) {
          elementsWithoutNames.push(node);
        }
        
        if (node.children) {
          node.children.forEach(checkTree);
        }
      }
      
      checkTree(tree);
      
      // Allow some elements without names but flag if there are too many
      expect(elementsWithoutNames.length).toBeLessThan(5);
    });
  });
});

/**
 * Helper functions
 */
function getHeadingLevel(element: Element): number {
  const tagName = element.tagName.toLowerCase();
  if (tagName.match(/^h[1-6]$/)) {
    return parseInt(tagName.charAt(1));
  }
  
  const ariaLevel = element.getAttribute('aria-level');
  if (ariaLevel) {
    return parseInt(ariaLevel);
  }
  
  return 1; // Default to level 1
}

function getLandmarkTag(role: string): string {
  const roleToTag: Record<string, string> = {
    'navigation': 'nav',
    'banner': 'header',
    'contentinfo': 'footer',
    'complementary': 'aside',
    'main': 'main'
  };
  
  return roleToTag[role] || '';
}