import React, { useState } from 'react';
import { KeyboardShortcut } from '../../core/keyboardShortcutManager';

export interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[];
  platform: string;
  onClose?: () => void;
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ shortcuts, platform, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  // Filter shortcuts for current platform
  const relevantShortcuts = shortcuts.filter(
    s => !s.platform || s.platform === platform
  );

  // Group shortcuts by category
  const groupedShortcuts = {
    'Tab Management': relevantShortcuts.filter(s => 
      ['new-tab', 'new-tab-mac', 'new-incognito-tab', 'new-incognito-tab-mac', 'close-tab', 'close-tab-mac', 'next-tab', 'previous-tab'].includes(s.id)
    ),
    'Navigation': relevantShortcuts.filter(s => 
      ['focus-address-bar', 'focus-address-bar-mac', 'reload-page', 'reload-page-mac'].includes(s.id)
    ),
    'Data': relevantShortcuts.filter(s => 
      ['clear-data'].includes(s.id)
    ),
  };

  const formatShortcut = (shortcut: KeyboardShortcut): string => {
    const modifiers = shortcut.modifiers.map(m => {
      if (m === 'meta') return platform === 'darwin' ? '⌘' : 'Win';
      if (m === 'ctrl') return 'Ctrl';
      if (m === 'shift') return 'Shift';
      if (m === 'alt') return platform === 'darwin' ? '⌥' : 'Alt';
      return m;
    });

    const key = shortcut.key === 'Tab' ? 'Tab' : 
                shortcut.key === 'Delete' ? 'Delete' :
                shortcut.key === 'Enter' ? 'Enter' :
                shortcut.key.toUpperCase();

    return [...modifiers, key].join('+');
  };

  if (!isOpen) {
    return (
      <button
        className="keyboard-help-button"
        onClick={() => setIsOpen(true)}
        title="Show keyboard shortcuts (Ctrl+?)"
      >
        ⌨️ Shortcuts
      </button>
    );
  }

  return (
    <div className="keyboard-shortcuts-overlay" onClick={handleClose}>
      <div className="keyboard-shortcuts-dialog" onClick={e => e.stopPropagation()}>
        <div className="keyboard-shortcuts-header">
          <h2>⌨️ Keyboard Shortcuts</h2>
          <button className="close-button" onClick={handleClose}>✕</button>
        </div>

        <div className="keyboard-shortcuts-content">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            categoryShortcuts.length > 0 && (
              <div key={category} className="shortcut-category">
                <h3>{category}</h3>
                <div className="shortcut-list">
                  {categoryShortcuts.map(shortcut => (
                    <div key={shortcut.id} className="shortcut-item">
                      <div className="shortcut-key">
                        <kbd>{formatShortcut(shortcut)}</kbd>
                      </div>
                      <div className="shortcut-description">
                        {shortcut.description || shortcut.id}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>

        <div className="keyboard-shortcuts-footer">
          <p>Press <kbd>Ctrl+?</kbd> to toggle this help dialog</p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;
