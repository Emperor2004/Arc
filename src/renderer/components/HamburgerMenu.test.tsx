import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HamburgerMenu from './HamburgerMenu';

describe('HamburgerMenu', () => {
  const mockOnSectionChange = vi.fn();

  beforeEach(() => {
    mockOnSectionChange.mockClear();
  });

  it('should render hamburger button', () => {
    render(
      <HamburgerMenu
        currentSection="browser"
        onSectionChange={mockOnSectionChange}
      />
    );

    const button = screen.getByRole('button', { name: /open menu/i });
    expect(button).toBeInTheDocument();
  });

  it('should show menu when button is clicked', () => {
    render(
      <HamburgerMenu
        currentSection="browser"
        onSectionChange={mockOnSectionChange}
      />
    );

    const button = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(button);

    expect(screen.getByText('Browse')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should highlight current section', () => {
    render(
      <HamburgerMenu
        currentSection="settings"
        onSectionChange={mockOnSectionChange}
      />
    );

    const button = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(button);

    const settingsButton = screen.getByRole('button', { name: /settings/i });
    expect(settingsButton).toHaveClass('active');
  });

  it('should call onSectionChange when menu item is clicked', () => {
    render(
      <HamburgerMenu
        currentSection="browser"
        onSectionChange={mockOnSectionChange}
      />
    );

    const button = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(button);

    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    expect(mockOnSectionChange).toHaveBeenCalledWith('settings');
  });

  it('should close menu when item is clicked', () => {
    render(
      <HamburgerMenu
        currentSection="browser"
        onSectionChange={mockOnSectionChange}
      />
    );

    const button = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(button);

    expect(screen.getByText('Browse')).toBeInTheDocument();

    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    expect(screen.queryByText('Browse')).not.toBeInTheDocument();
  });

  it('should close menu when clicking outside', () => {
    render(
      <div>
        <HamburgerMenu
          currentSection="browser"
          onSectionChange={mockOnSectionChange}
        />
        <div data-testid="outside">Outside element</div>
      </div>
    );

    const button = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(button);

    expect(screen.getByText('Browse')).toBeInTheDocument();

    const outsideElement = screen.getByTestId('outside');
    fireEvent.mouseDown(outsideElement);

    expect(screen.queryByText('Browse')).not.toBeInTheDocument();
  });

  it('should close menu when escape key is pressed', () => {
    render(
      <HamburgerMenu
        currentSection="browser"
        onSectionChange={mockOnSectionChange}
      />
    );

    const button = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(button);

    expect(screen.getByText('Browse')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByText('Browse')).not.toBeInTheDocument();
  });
});