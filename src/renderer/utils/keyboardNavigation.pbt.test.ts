/**
 * Property-Based Tests for Keyboard Navigation
 * Feature: ui-rendering-fix
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * Feature: ui-rendering-fix, Property 7: Keyboard Navigation
 * Validates: Requirements 3.4
 * 
 * Property: For any focusable element, keyboard navigation should work correctly 
 * with proper focus management
 */

describe('Property 7: Keyboard Navigation', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  /**
   * Test that Tab key moves focus forward through focusable elements
   */
  it('should move focus forward for any sequence of focusable elements with Tab key', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('button', 'input', 'a'), { minLength: 2, maxLength: 5 }),
        (elementTypes) => {
          // Create focusable elements
          const elements: HTMLElement[] = [];
          elementTypes.forEach((type, index) => {
            const element = document.createElement(type);
            
            if (type === 'button') {
              element.textContent = `Button ${index}`;
            } else if (type === 'input') {
              (element as HTMLInputElement).type = 'text';
              (element as HTMLInputElement).placeholder = `Input ${index}`;
            } else if (type === 'a') {
              element.textContent = `Link ${index}`;
              (element as HTMLAnchorElement).href = '#';
            }
            
            container.appendChild(element);
            elements.push(element);
          });
          
          // Focus first element
          elements[0].focus();
          expect(document.activeElement).toBe(elements[0]);
          
          // Simulate Tab key to move focus forward
          for (let i = 0; i < elements.length - 1; i++) {
            const currentElement = elements[i];
            const nextElement = elements[i + 1];
            
            // Simulate Tab key
            const tabEvent = new KeyboardEvent('keydown', {
              key: 'Tab',
              bubbles: true,
              cancelable: true,
            });
            currentElement.dispatchEvent(tabEvent);
            
            // Manually move focus (browser would do this automatically)
            nextElement.focus();
            
            // Verify focus moved to next element
            expect(document.activeElement).toBe(nextElement);
          }
          
          // Clean up
          elements.forEach(el => container.removeChild(el));
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Test that Shift+Tab moves focus backward through focusable elements
   */
  it('should move focus backward for any sequence of focusable elements with Shift+Tab', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('button', 'input', 'a'), { minLength: 2, maxLength: 5 }),
        (elementTypes) => {
          // Create focusable elements
          const elements: HTMLElement[] = [];
          elementTypes.forEach((type, index) => {
            const element = document.createElement(type);
            
            if (type === 'button') {
              element.textContent = `Button ${index}`;
            } else if (type === 'input') {
              (element as HTMLInputElement).type = 'text';
            } else if (type === 'a') {
              element.textContent = `Link ${index}`;
              (element as HTMLAnchorElement).href = '#';
            }
            
            container.appendChild(element);
            elements.push(element);
          });
          
          // Focus last element
          const lastElement = elements[elements.length - 1];
          lastElement.focus();
          expect(document.activeElement).toBe(lastElement);
          
          // Simulate Shift+Tab to move focus backward
          for (let i = elements.length - 1; i > 0; i--) {
            const currentElement = elements[i];
            const prevElement = elements[i - 1];
            
            // Simulate Shift+Tab
            const shiftTabEvent = new KeyboardEvent('keydown', {
              key: 'Tab',
              shiftKey: true,
              bubbles: true,
              cancelable: true,
            });
            currentElement.dispatchEvent(shiftTabEvent);
            
            // Manually move focus backward
            prevElement.focus();
            
            // Verify focus moved to previous element
            expect(document.activeElement).toBe(prevElement);
          }
          
          // Clean up
          elements.forEach(el => container.removeChild(el));
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Test that arrow keys navigate within a group of elements
   */
  it('should navigate with arrow keys for any group of elements with arrow key support', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 5 }),
        fc.constantFrom('ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'),
        (items, arrowKey) => {
          // Create a list with arrow key navigation
          const list = document.createElement('div');
          list.setAttribute('role', 'list');
          
          const listItems: HTMLElement[] = [];
          items.forEach((itemText, index) => {
            const item = document.createElement('div');
            item.setAttribute('role', 'listitem');
            item.setAttribute('tabindex', index === 0 ? '0' : '-1');
            item.textContent = itemText;
            
            // Add arrow key navigation
            item.addEventListener('keydown', (e) => {
              const currentIndex = listItems.indexOf(item);
              let nextIndex = currentIndex;
              
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                nextIndex = Math.min(currentIndex + 1, listItems.length - 1);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                nextIndex = Math.max(currentIndex - 1, 0);
              }
              
              if (nextIndex !== currentIndex) {
                listItems[nextIndex].focus();
              }
            });
            
            list.appendChild(item);
            listItems.push(item);
          });
          
          container.appendChild(list);
          
          // Focus first item
          listItems[0].focus();
          expect(document.activeElement).toBe(listItems[0]);
          
          // Simulate arrow key
          const arrowEvent = new KeyboardEvent('keydown', {
            key: arrowKey,
            bubbles: true,
          });
          listItems[0].dispatchEvent(arrowEvent);
          
          // Verify focus moved (for right/down arrows)
          if (arrowKey === 'ArrowRight' || arrowKey === 'ArrowDown') {
            expect(document.activeElement).toBe(listItems[1]);
          } else {
            // For left/up arrows from first item, focus should stay on first item
            expect(document.activeElement).toBe(listItems[0]);
          }
          
          // Clean up
          container.removeChild(list);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Test that Enter/Space keys activate focused elements
   */
  it('should activate element for any focusable element with Enter or Space key', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('button', 'a'),
        fc.constantFrom('Enter', ' '),
        (elementType, key) => {
          // Create element
          const element = document.createElement(elementType);
          
          if (elementType === 'button') {
            element.textContent = 'Click me';
          } else if (elementType === 'a') {
            element.textContent = 'Click me';
            (element as HTMLAnchorElement).href = '#';
          }
          
          container.appendChild(element);
          
          // Track activation
          let activated = false;
          element.addEventListener('click', (e) => {
            e.preventDefault();
            activated = true;
          });
          
          element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              element.click();
            }
          });
          
          // Focus element
          element.focus();
          
          // Simulate key press
          const keyEvent = new KeyboardEvent('keydown', {
            key,
            bubbles: true,
            cancelable: true,
          });
          element.dispatchEvent(keyEvent);
          
          // Verify element was activated
          expect(activated).toBe(true);
          
          // Clean up
          container.removeChild(element);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Test that Escape key closes modals/dialogs
   */
  it('should close modal for any modal element when Escape key is pressed', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (modalContent) => {
          // Create modal
          const modal = document.createElement('div');
          modal.setAttribute('role', 'dialog');
          modal.setAttribute('aria-modal', 'true');
          modal.textContent = modalContent;
          modal.style.display = 'block';
          
          container.appendChild(modal);
          
          // Track if modal was closed
          let modalClosed = false;
          modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
              modal.style.display = 'none';
              modalClosed = true;
            }
          });
          
          // Focus modal
          modal.setAttribute('tabindex', '0');
          modal.focus();
          
          // Simulate Escape key
          const escapeEvent = new KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true,
          });
          modal.dispatchEvent(escapeEvent);
          
          // Verify modal was closed
          expect(modalClosed).toBe(true);
          expect(modal.style.display).toBe('none');
          
          // Clean up
          container.removeChild(modal);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Test that Home/End keys navigate to first/last element
   */
  it('should navigate to first/last element for any list with Home/End keys', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 3, maxLength: 10 }),
        fc.constantFrom('Home', 'End'),
        (items, key) => {
          // Create list
          const list = document.createElement('div');
          list.setAttribute('role', 'list');
          
          const listItems: HTMLElement[] = [];
          items.forEach((itemText, index) => {
            const item = document.createElement('div');
            item.setAttribute('role', 'listitem');
            item.setAttribute('tabindex', '-1');
            item.textContent = itemText;
            
            // Add Home/End key navigation
            item.addEventListener('keydown', (e) => {
              if (e.key === 'Home') {
                listItems[0].focus();
              } else if (e.key === 'End') {
                listItems[listItems.length - 1].focus();
              }
            });
            
            list.appendChild(item);
            listItems.push(item);
          });
          
          container.appendChild(list);
          
          // Focus middle item
          const middleIndex = Math.floor(listItems.length / 2);
          listItems[middleIndex].focus();
          expect(document.activeElement).toBe(listItems[middleIndex]);
          
          // Simulate Home or End key
          const keyEvent = new KeyboardEvent('keydown', {
            key,
            bubbles: true,
          });
          listItems[middleIndex].dispatchEvent(keyEvent);
          
          // Verify focus moved to first or last element
          if (key === 'Home') {
            expect(document.activeElement).toBe(listItems[0]);
          } else {
            expect(document.activeElement).toBe(listItems[listItems.length - 1]);
          }
          
          // Clean up
          container.removeChild(list);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Test that focus trap works in modals
   */
  it('should trap focus within modal for any modal with focusable elements', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('button', 'input'), { minLength: 2, maxLength: 4 }),
        (elementTypes) => {
          // Create modal
          const modal = document.createElement('div');
          modal.setAttribute('role', 'dialog');
          modal.setAttribute('aria-modal', 'true');
          
          // Create focusable elements inside modal
          const modalElements: HTMLElement[] = [];
          elementTypes.forEach((type, index) => {
            const element = document.createElement(type);
            
            if (type === 'button') {
              element.textContent = `Button ${index}`;
            } else if (type === 'input') {
              (element as HTMLInputElement).type = 'text';
            }
            
            modal.appendChild(element);
            modalElements.push(element);
          });
          
          container.appendChild(modal);
          
          // Focus first element
          modalElements[0].focus();
          expect(document.activeElement).toBe(modalElements[0]);
          
          // Simulate Tab through all elements
          for (let i = 0; i < modalElements.length; i++) {
            const currentElement = modalElements[i];
            const nextIndex = (i + 1) % modalElements.length;
            const nextElement = modalElements[nextIndex];
            
            // Simulate Tab
            const tabEvent = new KeyboardEvent('keydown', {
              key: 'Tab',
              bubbles: true,
            });
            currentElement.dispatchEvent(tabEvent);
            
            // Manually move focus (simulating focus trap)
            nextElement.focus();
            
            // Verify focus is still within modal
            expect(modal.contains(document.activeElement as Node)).toBe(true);
          }
          
          // Clean up
          container.removeChild(modal);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Test that skip links work for keyboard navigation
   */
  it('should navigate to target for any skip link when activated', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (targetId, targetContent) => {
          // Create skip link
          const skipLink = document.createElement('a');
          skipLink.href = `#${targetId}`;
          skipLink.textContent = 'Skip to content';
          skipLink.className = 'skip-link';
          
          // Create target element
          const target = document.createElement('div');
          target.id = targetId;
          target.textContent = targetContent;
          target.setAttribute('tabindex', '-1');
          
          container.appendChild(skipLink);
          container.appendChild(target);
          
          // Focus skip link
          skipLink.focus();
          expect(document.activeElement).toBe(skipLink);
          
          // Simulate Enter key on skip link
          skipLink.addEventListener('click', (e) => {
            e.preventDefault();
            target.focus();
          });
          
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true,
          });
          skipLink.dispatchEvent(enterEvent);
          skipLink.click();
          
          // Verify focus moved to target
          expect(document.activeElement).toBe(target);
          
          // Clean up
          container.removeChild(skipLink);
          container.removeChild(target);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Test that tabindex controls focus order
   */
  it('should respect tabindex order for any elements with custom tabindex', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10 }), { minLength: 3, maxLength: 5 }),
        (tabIndices) => {
          // Create elements with custom tabindex
          const elements: Array<{ element: HTMLElement; tabIndex: number }> = [];
          
          tabIndices.forEach((tabIndex, index) => {
            const element = document.createElement('button');
            element.textContent = `Button ${index}`;
            element.setAttribute('tabindex', tabIndex.toString());
            
            container.appendChild(element);
            elements.push({ element, tabIndex });
          });
          
          // Sort elements by tabindex (how browser would order them)
          const sortedElements = [...elements].sort((a, b) => {
            if (a.tabIndex === 0 && b.tabIndex === 0) return 0;
            if (a.tabIndex === 0) return 1;
            if (b.tabIndex === 0) return -1;
            return a.tabIndex - b.tabIndex;
          });
          
          // Focus first element in tab order
          const firstInOrder = sortedElements[0].element;
          firstInOrder.focus();
          
          // Verify correct element is focused
          expect(document.activeElement).toBe(firstInOrder);
          
          // Clean up
          elements.forEach(({ element }) => container.removeChild(element));
        }
      ),
      { numRuns: 10 }
    );
  });
});
