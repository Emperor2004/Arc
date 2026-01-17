import React, { useState } from 'react';
import { KeyboardShortcut } from '../../core/keyboardShortcutManager';

export interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[];
  platform: string;
  onClose?: () => void;
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ shortcuts, platform, onClose }) => {
  // Keyboard shortcuts help is disabled - return null to hide it completely
  return null;
};

export default KeyboardShortcutsHelp;
