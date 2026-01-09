export type KeyboardModifier = 'ctrl' | 'shift' | 'alt' | 'meta';
export type KeyboardKey = string; // e.g., 'a', 'Enter', 'Tab', etc.

export interface KeyboardShortcut {
  id: string;
  key: KeyboardKey;
  modifiers: KeyboardModifier[];
  handler: () => void | Promise<void>;
  platform?: 'win32' | 'darwin' | 'linux'; // undefined means all platforms
  description?: string;
}

export interface ShortcutConfig {
  shortcuts: KeyboardShortcut[];
  platform: string;
}

export class KeyboardShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private platform: string;

  constructor(platform: string = process.platform) {
    this.platform = platform;
  }

  /**
   * Register a keyboard shortcut
   */
  registerShortcut(shortcut: KeyboardShortcut): void {
    // Check if shortcut is for this platform
    if (shortcut.platform && shortcut.platform !== this.platform) {
      return;
    }

    // Create a unique key for this shortcut
    const shortcutKey = this.createShortcutKey(shortcut.key, shortcut.modifiers);
    
    // Check for duplicates on the same platform
    if (this.shortcuts.has(shortcutKey)) {
      console.warn(`Shortcut ${shortcutKey} is already registered`);
      return;
    }

    this.shortcuts.set(shortcutKey, shortcut);
  }

  /**
   * Register multiple shortcuts at once
   */
  registerShortcuts(shortcuts: KeyboardShortcut[]): void {
    shortcuts.forEach(shortcut => this.registerShortcut(shortcut));
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregisterShortcut(key: KeyboardKey, modifiers: KeyboardModifier[]): void {
    const shortcutKey = this.createShortcutKey(key, modifiers);
    this.shortcuts.delete(shortcutKey);
  }

  /**
   * Handle keyboard events
   */
  async handleKeyDown(event: KeyboardEvent): Promise<boolean> {
    const modifiers = this.extractModifiers(event);
    const key = this.normalizeKey(event.key);
    const shortcutKey = this.createShortcutKey(key, modifiers);

    const shortcut = this.shortcuts.get(shortcutKey);
    if (shortcut) {
      event.preventDefault();
      await shortcut.handler();
      return true;
    }

    return false;
  }

  /**
   * Get all registered shortcuts for this platform
   */
  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts by platform
   */
  getShortcutsByPlatform(platform: string): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values()).filter(
      s => !s.platform || s.platform === platform
    );
  }

  /**
   * Check if a shortcut is registered
   */
  hasShortcut(key: KeyboardKey, modifiers: KeyboardModifier[]): boolean {
    const shortcutKey = this.createShortcutKey(key, modifiers);
    return this.shortcuts.has(shortcutKey);
  }

  /**
   * Clear all shortcuts
   */
  clearShortcuts(): void {
    this.shortcuts.clear();
  }

  /**
   * Create a unique key for a shortcut
   */
  private createShortcutKey(key: KeyboardKey, modifiers: KeyboardModifier[]): string {
    const sortedModifiers = [...modifiers].sort().join('+');
    const normalizedKey = this.normalizeKey(key);
    return sortedModifiers ? `${sortedModifiers}+${normalizedKey}` : normalizedKey;
  }

  /**
   * Extract modifiers from keyboard event
   */
  private extractModifiers(event: KeyboardEvent): KeyboardModifier[] {
    const modifiers: KeyboardModifier[] = [];

    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.shiftKey) modifiers.push('shift');
    if (event.altKey) modifiers.push('alt');
    if (event.metaKey) modifiers.push('meta');

    return modifiers;
  }

  /**
   * Normalize key names for consistency
   */
  private normalizeKey(key: string): string {
    const keyMap: Record<string, string> = {
      ' ': 'Space',
      'Enter': 'Enter',
      'Tab': 'Tab',
      'Escape': 'Escape',
      'Backspace': 'Backspace',
      'Delete': 'Delete',
      'ArrowUp': 'ArrowUp',
      'ArrowDown': 'ArrowDown',
      'ArrowLeft': 'ArrowLeft',
      'ArrowRight': 'ArrowRight',
    };

    // Return mapped key or uppercase the key for consistency
    return keyMap[key] || key.toUpperCase();
  }
}

/**
 * Create default shortcuts for Arc Browser
 */
export function createDefaultShortcuts(handlers: {
  newTab: () => void;
  newIncognitoTab: () => void;
  closeTab: () => void;
  nextTab: () => void;
  previousTab: () => void;
  focusAddressBar: () => void;
  reloadPage: () => void;
  clearData: () => void;
}): KeyboardShortcut[] {
  return [
    {
      id: 'new-tab',
      key: 't',
      modifiers: ['ctrl'],
      handler: handlers.newTab,
      platform: 'win32',
      description: 'New Tab',
    },
    {
      id: 'new-tab-mac',
      key: 't',
      modifiers: ['meta'],
      handler: handlers.newTab,
      platform: 'darwin',
      description: 'New Tab',
    },
    {
      id: 'new-incognito-tab',
      key: 'n',
      modifiers: ['ctrl'],
      handler: handlers.newIncognitoTab,
      platform: 'win32',
      description: 'New Incognito Tab',
    },
    {
      id: 'new-incognito-tab-mac',
      key: 'n',
      modifiers: ['meta'],
      handler: handlers.newIncognitoTab,
      platform: 'darwin',
      description: 'New Incognito Tab',
    },
    {
      id: 'close-tab',
      key: 'w',
      modifiers: ['ctrl'],
      handler: handlers.closeTab,
      platform: 'win32',
      description: 'Close Tab',
    },
    {
      id: 'close-tab-mac',
      key: 'w',
      modifiers: ['meta'],
      handler: handlers.closeTab,
      platform: 'darwin',
      description: 'Close Tab',
    },
    {
      id: 'next-tab',
      key: 'Tab',
      modifiers: ['ctrl'],
      handler: handlers.nextTab,
      description: 'Next Tab',
    },
    {
      id: 'previous-tab',
      key: 'Tab',
      modifiers: ['ctrl', 'shift'],
      handler: handlers.previousTab,
      description: 'Previous Tab',
    },
    {
      id: 'focus-address-bar',
      key: 'l',
      modifiers: ['ctrl'],
      handler: handlers.focusAddressBar,
      platform: 'win32',
      description: 'Focus Address Bar',
    },
    {
      id: 'focus-address-bar-mac',
      key: 'l',
      modifiers: ['meta'],
      handler: handlers.focusAddressBar,
      platform: 'darwin',
      description: 'Focus Address Bar',
    },
    {
      id: 'reload-page',
      key: 'r',
      modifiers: ['ctrl'],
      handler: handlers.reloadPage,
      platform: 'win32',
      description: 'Reload Page',
    },
    {
      id: 'reload-page-mac',
      key: 'r',
      modifiers: ['meta'],
      handler: handlers.reloadPage,
      platform: 'darwin',
      description: 'Reload Page',
    },
    {
      id: 'clear-data',
      key: 'Delete',
      modifiers: ['ctrl', 'shift'],
      handler: handlers.clearData,
      description: 'Clear Data',
    },
  ];
}
