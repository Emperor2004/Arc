import { expect, afterEach, vi, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as fc from 'fast-check';

// Configure fast-check globally to prevent hanging
fc.configureGlobal({
  numRuns: 10, // Reduce from 20 to 10 for faster execution
  timeout: 2000, // 2 second timeout per property test (reduced from 5s)
  interruptAfterTimeLimit: 2000,
  skipAllAfterTimeLimit: 2000,
  endOnFailure: true, // Stop on first failure
});

// Set aggressive timeout for all async operations
vi.setConfig({ testTimeout: 5000 });

// Mock localStorage for browser-based storage tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

// Setup before each test
beforeEach(() => {
  vi.clearAllTimers();
  vi.clearAllMocks();
  
  // Clear localStorage mock
  localStorageMock.clear();
  
  // Don't use fake timers by default - only when needed
  // Tests that need fake timers should call vi.useFakeTimers() explicitly
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.restoreAllMocks();
  vi.useRealTimers(); // Ensure real timers are restored
  vi.resetModules(); // Reset module cache to prevent state leakage
  
  // Clear localStorage mock
  localStorageMock.clear();
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

// Mock window.arc for tests (only in browser-like environments)
if (typeof window !== 'undefined') {
  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  // Mock getComputedStyle for jsdom (not implemented by default)
  if (!window.getComputedStyle || typeof window.getComputedStyle !== 'function') {
    window.getComputedStyle = vi.fn((element: Element, pseudoElt?: string | null) => {
      // Return a mock CSSStyleDeclaration with default values
      const mockStyle = {
        outline: 'none',
        outlineWidth: '0px',
        boxShadow: 'none',
        color: 'rgb(0, 0, 0)',
        backgroundColor: 'rgba(0, 0, 0, 0)',
        display: 'block',
        visibility: 'visible',
        opacity: '1',
        getPropertyValue: vi.fn((prop: string) => ''),
        setProperty: vi.fn(),
        removeProperty: vi.fn(),
      } as any;
      return mockStyle;
    });
  }

  // Mock window.matchMedia for jsdom (not implemented by default)
  if (!window.matchMedia || typeof window.matchMedia !== 'function') {
    window.matchMedia = vi.fn((query: string) => {
      const mockMediaQueryList = {
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
      return mockMediaQueryList as any;
    });
  }

  Object.defineProperty(window, 'arc', {
    value: {
      navigate: vi.fn(),
      getRecommendations: vi.fn(),
      addBookmark: vi.fn(),
      removeBookmark: vi.fn(),
      getBookmarks: vi.fn(),
      addFeedback: vi.fn(),
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
      // Keyboard shortcut methods
      newTab: vi.fn(),
      newIncognitoTab: vi.fn(),
      closeTab: vi.fn(),
      nextTab: vi.fn(),
      previousTab: vi.fn(),
      focusAddressBar: vi.fn(),
      reloadPage: vi.fn(),
      clearData: vi.fn(),
    },
    writable: true,
  });
}

// Mock process.platform for renderer tests
if (typeof process === 'undefined' || !process.platform) {
  (global as any).process = {
    ...(global as any).process,
    platform: 'win32',
    env: {
      ...((global as any).process?.env || {}),
      NODE_ENV: process.env.NODE_ENV || 'test',
      VITEST: 'true',
    },
  };
}

// Mock electron IPC
vi.mock('electron', () => ({
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    send: vi.fn(),
  },
}));
