import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AccessibilitySettings from './AccessibilitySettings';

// Mock the useSettingsController hook
const mockUpdateSetting = vi.fn();
let mockSettings = {
  reducedMotion: false,
  highContrast: false,
  fontSize: 'medium' as const,
  focusIndicators: true,
  screenReaderOptimizations: false,
};

vi.mock('../hooks/useSettingsController', () => ({
  useSettingsController: () => ({
    settings: mockSettings,
    updateSetting: mockUpdateSetting,
    loading: false,
  }),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('AccessibilitySettings', () => {
  const mockOnMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset document classes
    document.documentElement.className = '';
    // Reset mock settings
    mockSettings = {
      reducedMotion: false,
      highContrast: false,
      fontSize: 'medium' as const,
      focusIndicators: true,
      screenReaderOptimizations: false,
    };
  });

  it('should render accessibility settings section', () => {
    render(<AccessibilitySettings onMessage={mockOnMessage} />);
    
    expect(screen.getByText('Accessibility')).toBeDefined();
    expect(screen.getByText('Configure accessibility features to improve your browsing experience')).toBeDefined();
  });

  it('should render all accessibility toggles', () => {
    render(<AccessibilitySettings onMessage={mockOnMessage} />);
    
    expect(screen.getByRole('checkbox', { name: /Reduce Motion/ })).toBeDefined();
    expect(screen.getByRole('checkbox', { name: /High Contrast Mode/ })).toBeDefined();
    expect(screen.getByRole('checkbox', { name: /Enhanced Focus Indicators/ })).toBeDefined();
    expect(screen.getByRole('checkbox', { name: /Screen Reader Optimizations/ })).toBeDefined();
  });

  it('should render font size selector', () => {
    render(<AccessibilitySettings onMessage={mockOnMessage} />);
    
    const fontSizeSelect = screen.getByDisplayValue('Medium (Default)');
    expect(fontSizeSelect).toBeDefined();
    expect(fontSizeSelect.tagName).toBe('SELECT');
  });

  it('should call updateSetting when reduced motion toggle is changed', async () => {
    render(<AccessibilitySettings onMessage={mockOnMessage} />);
    
    const reducedMotionToggle = screen.getByRole('checkbox', { name: /Reduce Motion/ });
    fireEvent.click(reducedMotionToggle);
    
    await waitFor(() => {
      expect(mockUpdateSetting).toHaveBeenCalledWith('reducedMotion', true);
    });
  });

  it('should call updateSetting when high contrast toggle is changed', async () => {
    render(<AccessibilitySettings onMessage={mockOnMessage} />);
    
    const highContrastToggle = screen.getByRole('checkbox', { name: /High Contrast Mode/ });
    fireEvent.click(highContrastToggle);
    
    await waitFor(() => {
      expect(mockUpdateSetting).toHaveBeenCalledWith('highContrast', true);
    });
  });

  it('should call updateSetting when font size is changed', async () => {
    render(<AccessibilitySettings onMessage={mockOnMessage} />);
    
    const fontSizeSelect = screen.getByDisplayValue('Medium (Default)');
    fireEvent.change(fontSizeSelect, { target: { value: 'large' } });
    
    await waitFor(() => {
      expect(mockUpdateSetting).toHaveBeenCalledWith('fontSize', 'large');
    });
  });

  it('should call updateSetting when focus indicators toggle is changed', async () => {
    render(<AccessibilitySettings onMessage={mockOnMessage} />);
    
    const focusIndicatorsToggle = screen.getByRole('checkbox', { name: /Enhanced Focus Indicators/ });
    fireEvent.click(focusIndicatorsToggle);
    
    await waitFor(() => {
      expect(mockUpdateSetting).toHaveBeenCalledWith('focusIndicators', false);
    });
  });

  it('should call updateSetting when screen reader optimizations toggle is changed', async () => {
    render(<AccessibilitySettings onMessage={mockOnMessage} />);
    
    const screenReaderToggle = screen.getByRole('checkbox', { name: /Screen Reader Optimizations/ });
    fireEvent.click(screenReaderToggle);
    
    await waitFor(() => {
      expect(mockUpdateSetting).toHaveBeenCalledWith('screenReaderOptimizations', true);
    });
  });

  it('should show success message when settings are updated', async () => {
    mockUpdateSetting.mockResolvedValue(undefined);
    render(<AccessibilitySettings onMessage={mockOnMessage} />);
    
    const reducedMotionToggle = screen.getByRole('checkbox', { name: /Reduce Motion/ });
    fireEvent.click(reducedMotionToggle);
    
    await waitFor(() => {
      expect(mockOnMessage).toHaveBeenCalledWith('Accessibility settings updated');
    });
  });

  it('should show error message when settings update fails', async () => {
    mockUpdateSetting.mockRejectedValue(new Error('Update failed'));
    render(<AccessibilitySettings onMessage={mockOnMessage} />);
    
    const reducedMotionToggle = screen.getByRole('checkbox', { name: /Reduce Motion/ });
    fireEvent.click(reducedMotionToggle);
    
    await waitFor(() => {
      expect(mockOnMessage).toHaveBeenCalledWith('Failed to save accessibility settings');
    });
  });

  it('should reset settings to defaults when reset button is clicked', async () => {
    render(<AccessibilitySettings onMessage={mockOnMessage} />);
    
    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);
    
    await waitFor(() => {
      expect(mockUpdateSetting).toHaveBeenCalledWith('reducedMotion', false);
      expect(mockUpdateSetting).toHaveBeenCalledWith('highContrast', false);
      expect(mockUpdateSetting).toHaveBeenCalledWith('fontSize', 'medium');
      expect(mockUpdateSetting).toHaveBeenCalledWith('focusIndicators', true);
      expect(mockUpdateSetting).toHaveBeenCalledWith('screenReaderOptimizations', false);
    });
  });
});