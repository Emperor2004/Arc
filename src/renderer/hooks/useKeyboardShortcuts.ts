import { useEffect } from 'react';

export interface KeyboardShortcutHandlers {
  newTab: () => void;
  newIncognitoTab: () => void;
  closeTab: () => void;
  nextTab: () => void;
  previousTab: () => void;
  focusAddressBar: () => void;
  reloadPage: () => void;
  clearData: () => void;
}

/**
 * Hook to provide keyboard shortcut handlers
 * The window.arc methods are already defined in preload.ts and handle IPC communication
 * This hook just ensures the handlers are available for local use
 */
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers): void {
  // Store handlers in a global object for keyboard shortcut manager access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).arcHandlers = handlers;
    }
  }, [handlers]);
}
