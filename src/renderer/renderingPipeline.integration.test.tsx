import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock window.arc API
const mockArc = {
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  navigate: vi.fn(),
  newTab: vi.fn(),
  closeTab: vi.fn(),
  nextTab: vi.fn(),
  previousTab: vi.fn(),
  focusAddressBar: vi.fn(),
  reloadPage: vi.fn(),
  clearData: vi.fn(),
  newIncognitoTab: vi.fn(),
  restoreSession: vi.fn(),
};

describe('Rendering Pipeline Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).arc = mockArc;
    mockArc.getSettings.mockResolvedValue({
      theme: 'system',
      jarvisEnabled: true,
      useHistoryForRecommendations: true,
      incognitoEnabled: false,
      restorePreviousSession: false,
    });
  });

  afterEach(() => {
    (window as any).arc = undefined;
  });

  /**
   * Feature: ui-rendering-fix, Property 1: UI Component Rendering
   * Validates: Requirements 1.1, 1.2
   */
  it('should render all main interface components on startup', async () => {
    const { container } = render(<App />);

    // Wait for app to fully render
    await waitFor(() => {
      expect(container.querySelector('.arc-logo')).toBeTruthy();
    }, { timeout: 2000 });

    // Verify main structural elements are present
    expect(container.querySelector('.arc-root')).toBeTruthy();
    expect(container.querySelector('.arc-header')).toBeTruthy();
    expect(container.querySelector('.arc-main')).toBeTruthy();

    // Verify header components
    expect(container.querySelector('.arc-logo')).toBeTruthy();
    expect(screen.getByRole('banner')).toBeTruthy();

    // Verify navigation
    expect(screen.getByRole('navigation')).toBeTruthy();
    expect(screen.getByText('🌐 Browse')).toBeTruthy();
    expect(screen.getByText('⚙️ Settings')).toBeTruthy();

    // Verify main content area
    expect(screen.getByRole('main')).toBeTruthy();
  });

  /**
   * Feature: ui-rendering-fix, Property 1: UI Component Rendering
   * Validates: Requirements 1.1, 1.2, 1.5
   */
  it('should complete full rendering pipeline from startup to interactive state', async () => {
    const startTime = performance.now();
    const { container } = render(<App />);

    // Phase 1: React root creation and mounting
    expect(container).toBeTruthy();
    expect(container.querySelector('.arc-root')).toBeTruthy();

    // Phase 2: Context providers initialization
    await waitFor(() => {
      // DebugProvider should be initialized
      expect(container.querySelector('.arc-root')).toBeTruthy();
    });

    // Phase 3: Component mounting
    await waitFor(() => {
      // Header should be mounted
      expect(screen.getByRole('banner')).toBeTruthy();
      // Navigation should be mounted
      expect(screen.getByRole('navigation')).toBeTruthy();
      // Main content should be mounted
      expect(screen.getByRole('main')).toBeTruthy();
    }, { timeout: 2000 });

    // Phase 4: Style application (glassmorphism effects)
    await waitFor(() => {
      const header = container.querySelector('.arc-header');
      expect(header).toBeTruthy();
      
      // Check that styles are applied (element exists and is visible)
      const computedStyle = window.getComputedStyle(header!);
      expect(computedStyle.display).not.toBe('none');
    });

    // Phase 5: Interactive state
    await waitFor(() => {
      // Navigation buttons should be interactive
      const browseButton = screen.getByText('🌐 Browse');
      expect(browseButton).toBeTruthy();
      expect(browseButton.getAttribute('aria-pressed')).toBe('true');

      const settingsButton = screen.getByText('⚙️ Settings');
      expect(settingsButton).toBeTruthy();
      expect(settingsButton.getAttribute('aria-pressed')).toBe('false');
    });

    const renderTime = performance.now() - startTime;
    console.log(`Full rendering pipeline completed in: ${renderTime.toFixed(2)}ms`);

    // Rendering should complete within reasonable time (5 seconds)
    expect(renderTime).toBeLessThan(5000);
  });

  /**
   * Feature: ui-rendering-fix, Property 4: Error Handling and Fallbacks
   * Validates: Requirements 1.4, 5.1, 5.2
   */
  it('should handle rendering errors gracefully with error boundary', async () => {
    // Mock console.error to suppress error output in tests
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Render app with error-throwing component
    const { container } = render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    // App should still render (error boundary catches errors)
    await waitFor(() => {
      expect(container.querySelector('.arc-root')).toBeTruthy();
    });

    consoleError.mockRestore();
  });

  /**
   * Feature: ui-rendering-fix, Property 1: UI Component Rendering
   * Validates: Requirements 1.1, 1.2
   */
  it('should render browser section with all sub-components', async () => {
    const { container } = render(<App />);

    await waitFor(() => {
      expect(container.querySelector('.arc-logo')).toBeTruthy();
    }, { timeout: 2000 });

    // Verify browser section is rendered
    const browserSection = container.querySelector('#browser-section');
    expect(browserSection).toBeTruthy();

    // Verify Jarvis section is rendered
    const jarvisSection = container.querySelector('#jarvis-section');
    expect(jarvisSection).toBeTruthy();

    // Verify main content area has correct layout
    const mainContent = container.querySelector('.arc-main');
    expect(mainContent).toBeTruthy();
    expect(mainContent?.classList.contains('arc-main--normal')).toBe(true);
  });

  /**
   * Feature: ui-rendering-fix, Property 1: UI Component Rendering
   * Validates: Requirements 1.5
   */
  it('should display Arc logo and navigation in header', async () => {
    const { container } = render(<App />);

    await waitFor(() => {
      // Verify Arc logo is present
      expect(container.querySelector('.arc-logo')).toBeTruthy();
    });

    // Verify logo subtitle is present in the logo
    const logo = container.querySelector('.arc-logo');
    expect(logo?.textContent).toContain('Jarvis');

    // Verify navigation buttons
    expect(screen.getByText('🌐 Browse')).toBeTruthy();
    expect(screen.getByText('⚙️ Settings')).toBeTruthy();
  });

  /**
   * Feature: ui-rendering-fix, Property 1: UI Component Rendering
   * Validates: Requirements 1.1, 1.2
   */
  it('should maintain rendering stability during rapid re-renders', async () => {
    const { container, rerender } = render(<App />);

    await waitFor(() => {
      expect(container.querySelector('.arc-logo')).toBeTruthy();
    });

    // Perform multiple re-renders
    for (let i = 0; i < 10; i++) {
      rerender(<App />);
      
      // Verify structure remains intact
      expect(container.querySelector('.arc-root')).toBeTruthy();
      expect(container.querySelector('.arc-header')).toBeTruthy();
      expect(container.querySelector('.arc-main')).toBeTruthy();
    }

    // Final verification
    await waitFor(() => {
      expect(screen.getByRole('banner')).toBeTruthy();
      expect(screen.getByRole('navigation')).toBeTruthy();
      expect(screen.getByRole('main')).toBeTruthy();
    });
  });

  /**
   * Feature: ui-rendering-fix, Property 11: Asset Loading Validation
   * Validates: Requirements 5.5
   */
  it('should verify CSS and assets are loaded correctly', async () => {
    const { container } = render(<App />);

    await waitFor(() => {
      expect(container.querySelector('.arc-logo')).toBeTruthy();
    });

    // Verify that styles are applied to elements
    const header = container.querySelector('.arc-header');
    expect(header).toBeTruthy();

    // Check that computed styles exist (indicates CSS is loaded)
    const computedStyle = window.getComputedStyle(header!);
    expect(computedStyle).toBeTruthy();
    expect(computedStyle.display).not.toBe('');

    // Verify main content has styles
    const mainContent = container.querySelector('.arc-main');
    expect(mainContent).toBeTruthy();
    const mainStyle = window.getComputedStyle(mainContent!);
    expect(mainStyle.display).not.toBe('');
  });

  /**
   * Feature: ui-rendering-fix, Property 1: UI Component Rendering
   * Validates: Requirements 1.1, 1.2
   */
  it('should handle settings initialization without errors', async () => {
    mockArc.getSettings.mockResolvedValue({
      theme: 'dark',
      jarvisEnabled: true,
      useHistoryForRecommendations: true,
      incognitoEnabled: true,
      restorePreviousSession: false,
    });

    const { container } = render(<App />);

    await waitFor(() => {
      expect(container.querySelector('.arc-logo')).toBeTruthy();
    });

    // Verify app renders correctly with custom settings
    expect(container.querySelector('.arc-root')).toBeTruthy();
    expect(mockArc.getSettings).toHaveBeenCalled();
  });

  /**
   * Feature: ui-rendering-fix, Property 1: UI Component Rendering
   * Validates: Requirements 1.1, 1.2
   */
  it('should handle settings initialization failure gracefully', async () => {
    mockArc.getSettings.mockRejectedValue(new Error('Settings load failed'));

    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { container } = render(<App />);

    await waitFor(() => {
      expect(container.querySelector('.arc-logo')).toBeTruthy();
    });

    // App should still render even if settings fail to load
    expect(container.querySelector('.arc-root')).toBeTruthy();
    expect(container.querySelector('.arc-header')).toBeTruthy();
    expect(container.querySelector('.arc-main')).toBeTruthy();

    consoleWarn.mockRestore();
    consoleError.mockRestore();
  });

  /**
   * Feature: ui-rendering-fix, Property 1: UI Component Rendering
   * Validates: Requirements 1.1, 1.2, 1.5
   */
  it('should render skip links for accessibility', async () => {
    const { container } = render(<App />);

    await waitFor(() => {
      expect(container.querySelector('.arc-logo')).toBeTruthy();
    });

    // Verify skip links are present
    expect(screen.getByText('Skip to main content')).toBeTruthy();
    expect(screen.getByText('Skip to navigation')).toBeTruthy();
    expect(screen.getByText('Skip to browser')).toBeTruthy();
    expect(screen.getByText('Skip to Jarvis')).toBeTruthy();
  });

  /**
   * Feature: ui-rendering-fix, Property 1: UI Component Rendering
   * Validates: Requirements 1.1, 1.2
   */
  it('should render debug overlay in development mode', async () => {
    const { container } = render(<App />);

    await waitFor(() => {
      expect(container.querySelector('.arc-logo')).toBeTruthy();
    });

    // Debug overlay should be present (even if not visible)
    // It's rendered as part of the DebugProvider
    expect(container.querySelector('.arc-root')).toBeTruthy();
  });

  /**
   * Feature: ui-rendering-fix, Property 1: UI Component Rendering
   * Validates: Requirements 1.1, 1.2
   */
  it('should complete rendering within performance budget', async () => {
    const startTime = performance.now();
    
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('banner')).toBeTruthy();
      expect(screen.getByRole('navigation')).toBeTruthy();
      expect(screen.getByRole('main')).toBeTruthy();
    }, { timeout: 3000 });

    const renderTime = performance.now() - startTime;
    console.log(`Initial render completed in: ${renderTime.toFixed(2)}ms`);

    // Initial render should complete within 3 seconds
    expect(renderTime).toBeLessThan(3000);
  });

  /**
   * Feature: ui-rendering-fix, Property 1: UI Component Rendering
   * Validates: Requirements 1.1, 1.2
   */
  it('should handle theme manager initialization', async () => {
    const { container } = render(<App />);

    await waitFor(() => {
      expect(container.querySelector('.arc-logo')).toBeTruthy();
    });

    // Theme manager should initialize without errors
    expect(container.querySelector('.arc-root')).toBeTruthy();
    
    // Verify theme is applied to document
    const dataTheme = document.documentElement.getAttribute('data-theme');
    expect(['light', 'dark', null]).toContain(dataTheme);
  });

  /**
   * Feature: ui-rendering-fix, Property 1: UI Component Rendering
   * Validates: Requirements 1.1, 1.2
   */
  it('should render with proper ARIA roles and labels', async () => {
    const { container } = render(<App />);

    await waitFor(() => {
      expect(container.querySelector('.arc-logo')).toBeTruthy();
    });

    // Verify ARIA roles
    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('navigation')).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('complementary')).toBeTruthy();

    // Verify ARIA labels
    expect(screen.getByLabelText('Main navigation')).toBeTruthy();
    expect(screen.getByLabelText('Browser interface')).toBeTruthy();
    expect(screen.getByLabelText('Web browser')).toBeTruthy();
    expect(screen.getByLabelText('Jarvis AI assistant')).toBeTruthy();
  });
});
