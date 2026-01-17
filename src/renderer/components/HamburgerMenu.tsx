import React, { useState, useRef, useEffect } from 'react';

export interface HamburgerMenuProps {
  currentSection: 'browser' | 'settings';
  onSectionChange: (section: 'browser' | 'settings') => void;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ currentSection, onSectionChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleMenuItemClick = (section: 'browser' | 'settings') => {
    onSectionChange(section);
    setIsOpen(false);
  };

  return (
    <div className="hamburger-menu" ref={menuRef}>
      <button
        className="hamburger-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Open menu"
        title="Menu"
      >
        <div className="hamburger-icon">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      {isOpen && (
        <div className="hamburger-dropdown">
          <div className="hamburger-menu-items">
            <button
              className={`hamburger-menu-item ${currentSection === 'browser' ? 'active' : ''}`}
              onClick={() => handleMenuItemClick('browser')}
              aria-pressed={currentSection === 'browser'}
            >
              <span className="menu-icon">🌐</span>
              <span className="menu-text">Browse</span>
            </button>
            <button
              className={`hamburger-menu-item ${currentSection === 'settings' ? 'active' : ''}`}
              onClick={() => handleMenuItemClick('settings')}
              aria-pressed={currentSection === 'settings'}
            >
              <span className="menu-icon">⚙️</span>
              <span className="menu-text">Settings</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HamburgerMenu;