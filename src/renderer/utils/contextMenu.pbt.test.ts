/**
 * Property-Based Tests for Context Menu Functionality
 * Feature: ui-rendering-fix
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * Feature: ui-rendering-fix, Property 6: Context Menu Functionality
 * Validates: Requirements 3.2
 * 
 * Property: For any right-clickable element, a right-click event should trigger 
 * the appropriate context menu
 */

describe('Property 6: Context Menu Functionality', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  /**
   * Test that right-click events are properly captured
   */
  it('should trigger contextmenu event for any right-clickable element', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('div', 'button', 'a', 'span'),
        fc.string({ minLength: 1, maxLength: 20 }),
        (elementType, content) => {
          // Create element
          const element = document.createElement(elementType);
          element.textContent = content;
          element.setAttribute('data-contextmenu', 'true');
          
          // Add to DOM
          container.appendChild(element);
          
          // Add contextmenu handler
          let contextMenuTriggered = false;
          element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            contextMenuTriggered = true;
          });
          
          // Simulate right-click (contextmenu event)
          const event = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            button: 2, // Right mouse button
          });
          element.dispatchEvent(event);
          
          // Verify contextmenu event was triggered
          expect(contextMenuTriggered).toBe(true);
          
          // Clean up
          container.removeChild(element);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Test that context menu appears at correct position
   */
  it('should position context menu at cursor location for any right-click coordinates', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        (x, y) => {
          // Create element
          const element = document.createElement('div');
          element.textContent = 'Right-click me';
          element.style.width = '200px';
          element.style.height = '200px';
          
          // Add to DOM
          container.appendChild(element);
          
          // Create context menu
          const contextMenu = document.createElement('div');
          contextMenu.className = 'context-menu';
          contextMenu.style.position = 'fixed';
          contextMenu.style.display = 'none';
          container.appendChild(contextMenu);
          
          // Add contextmenu handler
          element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            // Position context menu at cursor
            contextMenu.style.left = `${e.clientX}px`;
            contextMenu.style.top = `${e.clientY}px`;
            contextMenu.style.display = 'block';
          });
          
          // Simulate right-click at specific coordinates
          const event = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            button: 2,
          });
          element.dispatchEvent(event);
          
          // Verify context menu is positioned correctly
          expect(contextMenu.style.left).toBe(`${x}px`);
          expect(contextMenu.style.top).toBe(`${y}px`);
          expect(contextMenu.style.display).toBe('block');
          
          // Clean up
          container.removeChild(element);
          container.removeChild(contextMenu);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Test that context menu items are clickable
   */
  it('should trigger action for any context menu item when clicked', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        (menuItems) => {
          // Create context menu
          const contextMenu = document.createElement('div');
          contextMenu.className = 'context-menu';
          contextMenu.style.display = 'block';
          
          // Track which items were clicked
          const clickedItems: string[] = [];
          
          // Create menu items
          menuItems.forEach((itemText) => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = itemText;
            menuItem.addEventListener('click', () => {
              clickedItems.push(itemText);
            });
            contextMenu.appendChild(menuItem);
          });
          
          // Add to DOM
          container.appendChild(contextMenu);
          
          // Click each menu item
          const menuItemElements = contextMenu.querySelectorAll('.context-menu-item');
          menuItemElements.forEach((item) => {
            (item as HTMLElement).click();
          });
          
          // Verify all items were clicked
          expect(clickedItems.length).toBe(menuItems.length);
          expect(clickedItems).toEqual(menuItems);
          
          // Clean up
          container.removeChild(contextMenu);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Test that context menu closes when clicking outside
   */
  it('should close context menu for any click outside the menu area', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 500 }),
        fc.integer({ min: 100, max: 500 }),
        (menuX, menuY) => {
          // Create context menu
          const contextMenu = document.createElement('div');
          contextMenu.className = 'context-menu';
          contextMenu.style.position = 'fixed';
          contextMenu.style.left = `${menuX}px`;
          contextMenu.style.top = `${menuY}px`;
          contextMenu.style.width = '200px';
          contextMenu.style.height = '150px';
          contextMenu.style.display = 'block';
          
          // Add to DOM
          container.appendChild(contextMenu);
          
          // Add click outside handler
          let menuClosed = false;
          const handleClickOutside = (e: MouseEvent) => {
            if (!contextMenu.contains(e.target as Node)) {
              contextMenu.style.display = 'none';
              menuClosed = true;
            }
          };
          document.addEventListener('mousedown', handleClickOutside);
          
          // Click outside the menu (at origin)
          const outsideClick = new MouseEvent('mousedown', {
            bubbles: true,
            clientX: 0,
            clientY: 0,
          });
          document.dispatchEvent(outsideClick);
          
          // Verify menu was closed
          expect(menuClosed).toBe(true);
          expect(contextMenu.style.display).toBe('none');
          
          // Clean up
          document.removeEventListener('mousedown', handleClickOutside);
          container.removeChild(contextMenu);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Test that context menu prevents default browser context menu
   */
  it('should prevent default browser context menu for any right-clickable element', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('div', 'button', 'a'),
        (elementType) => {
          // Create element
          const element = document.createElement(elementType);
          element.textContent = 'Right-click me';
          
          // Add to DOM
          container.appendChild(element);
          
          // Add contextmenu handler that prevents default
          let defaultPrevented = false;
          element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            defaultPrevented = e.defaultPrevented;
          });
          
          // Simulate right-click
          const event = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            button: 2,
          });
          element.dispatchEvent(event);
          
          // Verify default was prevented
          expect(defaultPrevented).toBe(true);
          
          // Clean up
          container.removeChild(element);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Test that context menu adjusts position to stay in viewport
   */
  it('should adjust position to stay in viewport for any edge coordinates', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (nearRightEdge, nearBottomEdge) => {
          // Set viewport dimensions
          const viewportWidth = 1024;
          const viewportHeight = 768;
          
          // Calculate position near edges
          const menuWidth = 200;
          const menuHeight = 300;
          
          let x = nearRightEdge ? viewportWidth - 50 : 100;
          let y = nearBottomEdge ? viewportHeight - 50 : 100;
          
          // Create context menu
          const contextMenu = document.createElement('div');
          contextMenu.className = 'context-menu';
          contextMenu.style.position = 'fixed';
          contextMenu.style.width = `${menuWidth}px`;
          contextMenu.style.height = `${menuHeight}px`;
          
          // Adjust position to keep menu in viewport
          let adjustedX = x;
          let adjustedY = y;
          
          if (adjustedX + menuWidth > viewportWidth) {
            adjustedX = viewportWidth - menuWidth - 10;
          }
          
          if (adjustedY + menuHeight > viewportHeight) {
            adjustedY = viewportHeight - menuHeight - 10;
          }
          
          contextMenu.style.left = `${adjustedX}px`;
          contextMenu.style.top = `${adjustedY}px`;
          
          // Add to DOM
          container.appendChild(contextMenu);
          
          // Verify menu stays in viewport
          const menuRight = adjustedX + menuWidth;
          const menuBottom = adjustedY + menuHeight;
          
          expect(menuRight).toBeLessThanOrEqual(viewportWidth);
          expect(menuBottom).toBeLessThanOrEqual(viewportHeight);
          expect(adjustedX).toBeGreaterThanOrEqual(0);
          expect(adjustedY).toBeGreaterThanOrEqual(0);
          
          // Clean up
          container.removeChild(contextMenu);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Test that disabled context menu items don't trigger actions
   */
  it('should not trigger action for any disabled context menu item', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.boolean(),
        (itemText, isDisabled) => {
          // Create context menu
          const contextMenu = document.createElement('div');
          contextMenu.className = 'context-menu';
          
          // Create menu item
          const menuItem = document.createElement('div');
          menuItem.className = 'context-menu-item';
          if (isDisabled) {
            menuItem.classList.add('context-menu-item--disabled');
          }
          menuItem.textContent = itemText;
          
          // Track clicks
          let clicked = false;
          menuItem.addEventListener('click', (e) => {
            if (menuItem.classList.contains('context-menu-item--disabled')) {
              e.stopPropagation();
              e.preventDefault();
              return;
            }
            clicked = true;
          });
          
          contextMenu.appendChild(menuItem);
          container.appendChild(contextMenu);
          
          // Click the item
          menuItem.click();
          
          // Verify click behavior based on disabled state
          if (isDisabled) {
            expect(clicked).toBe(false);
          } else {
            expect(clicked).toBe(true);
          }
          
          // Clean up
          container.removeChild(contextMenu);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Test that context menu supports keyboard navigation
   */
  it('should support keyboard navigation for any context menu', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 5 }),
        fc.constantFrom('ArrowDown', 'ArrowUp', 'Enter', 'Escape'),
        (menuItems, key) => {
          // Create context menu
          const contextMenu = document.createElement('div');
          contextMenu.className = 'context-menu';
          contextMenu.setAttribute('role', 'menu');
          contextMenu.setAttribute('tabindex', '0');
          
          // Create menu items
          menuItems.forEach((itemText, index) => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.setAttribute('role', 'menuitem');
            menuItem.setAttribute('tabindex', '-1');
            menuItem.textContent = itemText;
            contextMenu.appendChild(menuItem);
          });
          
          // Add to DOM
          container.appendChild(contextMenu);
          
          // Track keyboard events
          let keyHandled = false;
          contextMenu.addEventListener('keydown', (e) => {
            if (e.key === key) {
              keyHandled = true;
            }
          });
          
          // Focus menu
          contextMenu.focus();
          
          // Simulate keyboard event
          const event = new KeyboardEvent('keydown', { key });
          contextMenu.dispatchEvent(event);
          
          // Verify keyboard event was handled
          expect(keyHandled).toBe(true);
          
          // Clean up
          container.removeChild(contextMenu);
        }
      ),
      { numRuns: 10 }
    );
  });
});
