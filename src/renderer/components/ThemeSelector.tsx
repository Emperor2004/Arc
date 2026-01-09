import React, { useState, useEffect } from 'react';
import { ThemeManager, ThemeMode } from '../../core/themeManager';

interface ThemeSelectorProps {
  themeManager: ThemeManager;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ themeManager }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(themeManager.getTheme());

  useEffect(() => {
    // Subscribe to theme changes
    const unsubscribe = themeManager.subscribe((config) => {
      setCurrentTheme(config.mode);
    });

    return unsubscribe;
  }, [themeManager]);

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value as ThemeMode;
    themeManager.setTheme(newTheme);
  };

  return (
    <div className="settings-item">
      <label className="settings-label">
        <div className="settings-label-content">
          <span>Theme</span>
          <span className="settings-description">
            Choose your preferred color scheme
          </span>
        </div>
        <select
          className="settings-select"
          value={currentTheme}
          onChange={handleThemeChange}
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
    </div>
  );
};

export default ThemeSelector;
