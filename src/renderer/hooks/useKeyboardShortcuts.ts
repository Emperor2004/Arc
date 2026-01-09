import { useCallback } from 'react';

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
 * These handlers are called by the KeyboardShortcutManager in the App component
 */
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers): void {
  // Expose handlers on window.arc for keyboard shortcut manager to call
  const exposeHandlers = useCallback(() => {
    if (window.arc) {
      // Override the methods with the actual handlers
      window.arc.newTab = handlers.newTab;
      window.arc.newIncognitoTab = handlers.newIncognitoTab;
      window.arc.closeTab = handlers.closeTab;
      window.arc.nextTab = handlers.nextTab;
      window.arc.previousTab = handlers.previousTab;
      window.arc.focusAddressBar = handlers.focusAddressBar;
      window.arc.reloadPage = handlers.reloadPage;
      window.arc.clearData = handlers.clearData;
    }
  }, [handlers]);

  // Expose handlers when they change
  exposeHandlers();
}
