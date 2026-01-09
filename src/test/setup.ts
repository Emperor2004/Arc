import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.arc for tests (only in browser-like environments)
if (typeof window !== 'undefined') {
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

// Mock electron IPC
vi.mock('electron', () => ({
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    send: vi.fn(),
  },
}));
