import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import DebugOverlay from './DebugOverlay';
import { DebugProvider } from '../contexts/DebugContext';
import * as renderingDiagnosticModule from '../utils/renderingDiagnostic';

// Mock the rendering diagnostic
vi.mock('../utils/renderingDiagnostic', () => ({
  renderingDiagnostic: {
    runDiagnostic: vi.fn(),
    validateCSS: vi.fn(),
    attemptWhiteScreenFix: vi.fn()
  },
  RenderingDiagnostic: vi.fn()
}));

describe('DebugOverlay', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Set to development mode
    process.env.NODE_ENV = 'development';
    
    // Setup default mock returns
    vi.mocked(renderingDiagnosticModule.renderingDiagnostic.runDiagnostic).mockReturnValue({
      componentValidation: {
        reactMounted: true,
        arcRootPresent: true,
        headerPresent: true,
        navigationPresent: true,
        mainContentPresent: true,
        componentCount: 5
      },
      cssValid: {
        stylesLoaded: true,
        glassmorphismSupported: true,
        missingRules: [],
        conflictingRules: [],
        criticalStylesPresent: true
      },
      assetsValid: {
        allAssetsLoaded: true,
        failedAssets: [],
        loadingAssets: [],
        criticalAssetsLoaded: true
      },
      errors: [],
      overallHealth: 'healthy' as const
    });

    vi.mocked(renderingDiagnosticModule.renderingDiagnostic.validateCSS).mockReturnValue({
      stylesLoaded: true,
      glassmorphismSupported: true,
      missingRules: [],
      conflictingRules: [],
      criticalStylesPresent: true
    });

    vi.mocked(renderingDiagnosticModule.renderingDiagnostic.attemptWhiteScreenFix).mockReturnValue({
      attempted: ['Root element styling', 'CSS re-evaluation'],
      successful: ['Root element styling', 'CSS re-evaluation'],
      failed: []
    });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.clearAllMocks();
  });

  describe('Visibility in Development Mode', () => {
    it('should render debug overlay in development mode', () => {
      process.env.NODE_ENV = 'development';
      
      const { container } = render(
        <DebugProvider>
          <DebugOverlay />
        </DebugProvider>
      );

      expect(container.textContent).toContain('Debug Overlay');
    });

    it('should not render debug overlay in production mode', () => {
      process.env.NODE_ENV = 'production';
      
      const { container } = render(
        <DebugProvider>
          <DebugOverlay />
        </DebugProvider>
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Performance Metrics Display', () => {
    it('should display performance metrics section', () => {
      const { container } = render(
        <DebugProvider>
          <DebugOverlay />
        </DebugProvider>
      );

      expect(container.textContent).toContain('Performance');
      expect(container.textContent).toContain('FPS:');
      expect(container.textContent).toContain('Components:');
    });

    it('should show component count from diagnostic', async () => {
      const { container } = render(
        <DebugProvider>
          <DebugOverlay />
        </DebugProvider>
      );

      await waitFor(() => {
        expect(container.textContent).toContain('5');
      });
    });
  });

  describe('Rendering Health Status', () => {
    it('should show healthy status when CSS is valid', async () => {
      const { container } = render(
        <DebugProvider>
          <DebugOverlay />
        </DebugProvider>
      );

      await waitFor(() => {
        expect(container.textContent).toContain('Rendering Healthy');
      });
    });

    it('should show issues status when CSS is invalid', async () => {
      vi.mocked(renderingDiagnosticModule.renderingDiagnostic.runDiagnostic).mockReturnValue({
        componentValidation: {
          reactMounted: true,
          arcRootPresent: true,
          headerPresent: true,
          navigationPresent: true,
          mainContentPresent: true,
          componentCount: 5
        },
        cssValid: {
          stylesLoaded: true,
          glassmorphismSupported: true,
          missingRules: ['.missing-rule'],
          conflictingRules: [],
          criticalStylesPresent: false
        },
        assetsValid: {
          allAssetsLoaded: true,
          failedAssets: [],
          loadingAssets: [],
          criticalAssetsLoaded: true
        },
        errors: [],
        overallHealth: 'warning' as const
      });

      const { container } = render(
        <DebugProvider>
          <DebugOverlay />
        </DebugProvider>
      );

      await waitFor(() => {
        expect(container.textContent).toContain('Rendering Issues');
      });
    });

    it('should display error count when errors are present', async () => {
      vi.mocked(renderingDiagnosticModule.renderingDiagnostic.runDiagnostic).mockReturnValue({
        componentValidation: {
          reactMounted: true,
          arcRootPresent: true,
          headerPresent: true,
          navigationPresent: true,
          mainContentPresent: true,
          componentCount: 5
        },
        cssValid: {
          stylesLoaded: true,
          glassmorphismSupported: true,
          missingRules: [],
          conflictingRules: [],
          criticalStylesPresent: true
        },
        assetsValid: {
          allAssetsLoaded: true,
          failedAssets: [],
          loadingAssets: [],
          criticalAssetsLoaded: true
        },
        errors: [
          {
            type: 'css',
            message: 'Test error',
            timestamp: Date.now(),
            severity: 'high'
          }
        ],
        overallHealth: 'warning' as const
      });

      const { container } = render(
        <DebugProvider>
          <DebugOverlay />
        </DebugProvider>
      );

      await waitFor(() => {
        expect(container.textContent).toContain('1 error detected');
      });
    });
  });

  describe('App State Display', () => {
    it('should display current section', () => {
      const { container } = render(
        <DebugProvider>
          <DebugOverlay />
        </DebugProvider>
      );

      expect(container.textContent).toContain('Section:');
      expect(container.textContent).toContain('browser');
    });

    it('should display layout mode', () => {
      const { container } = render(
        <DebugProvider>
          <DebugOverlay />
        </DebugProvider>
      );

      expect(container.textContent).toContain('Layout:');
      expect(container.textContent).toContain('normal');
    });

    it('should display incognito status', () => {
      const { container } = render(
        <DebugProvider>
          <DebugOverlay />
        </DebugProvider>
      );

      expect(container.textContent).toContain('Incognito:');
    });

    it('should display Jarvis status', () => {
      const { container } = render(
        <DebugProvider>
          <DebugOverlay />
        </DebugProvider>
      );

      expect(container.textContent).toContain('Jarvis:');
      expect(container.textContent).toContain('IDLE');
    });
  });

  describe('Expandable Details', () => {
    it('should have a More/Less toggle button', () => {
      render(
        <DebugProvider>
          <DebugOverlay />
        </DebugProvider>
      );

      const toggleButton = screen.getByRole('button', { name: /More/i });
      expect(toggleButton).toBeTruthy();
    });

    it('should expand details when More button is clicked', () => {
      const { container } = render(
        <DebugProvider>
          <DebugOverlay />
        </DebugProvider>
      );

      const toggleButton = screen.getByRole('button', { name: /More/i });
      fireEvent.click(toggleButton);

      expect(container.textContent).toContain('Tools');
      expect(screen.getByRole('button', { name: /Validate CSS/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Attempt Auto-Fix/i })).toBeTruthy();
    });

    it('should collapse details when Less button is clicked', () => {
      const { container } = render(
        <DebugProvider>
          <DebugOverlay />
        </DebugProvider>
      );

      const toggleButton = screen.getByRole('button', { name: /More/i });
      fireEvent.click(toggleButton);
      
      const lessButton = screen.getByRole('button', { name: /Less/i });
      fireEvent.click(lessButton);

      expect(container.textContent).not.toContain('Tools');
    });

    it('should show error details when expanded and errors exist', async () => {
      vi.mocked(renderingDiagnosticModule.renderingDiagnostic.runDiagnostic).mockReturnValue({
        componentValidation: {
          reactMounted: true,
          arcRootPresent: true,
          headerPresent: true,
          navigationPresent: true,
          mainContentPresent: true,
          componentCount: 5
        },
        cssValid: {
          stylesLoaded: true,
          glassmorphismSupported: true,
          missingRules: [],
          conflictingRules: [],
          criticalStylesPresent: true
        },
        assetsValid: {
          allAssetsLoaded: true,
          failedAssets: [],
          loadingAssets: [],
          criticalAssetsLoaded: true
        },
        errors: [
          {
            type: 'css',
            message: 'Critical CSS error',
            element: '.test-element',
            timestamp: Date.now(),
            severity: 'critical'
          }
        ],
        overallHealth: 'critical' as const
      });

      const { container } = render(
        <DebugProvider>
          <DebugOverlay />
        </DebugProvider>
      );

      await waitFor(() => {
        const toggleButton = screen.getByRole('button', { name: /More/i });
        fireEvent.click(toggleButton);
      });

      await waitFor(() => {
        expect(container.textContent).toContain('Errors (1)');
        expect(container.textContent).toContain('Critical CSS error');
      });
    });
  });

  describe('CSS Validation Tool', () => {
    it('should call validateCSS when Validate CSS button is clicked', async () => {
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(
        <DebugProvider>
          <DebugOverlay />
        </DebugProvider>
      );

      const toggleButton = screen.getByRole('button', { name: /More/i });
      fireEvent.click(toggleButton);

      const validateButton = screen.getByRole('button', { name: /Validate CSS/i });
      fireEvent.click(validateButton);

      await waitFor(() => {
        expect(renderingDiagnosticModule.renderingDiagnostic.validateCSS).toHaveBeenCalled();
        expect(alertMock).toHaveBeenCalled();
      });

      alertMock.mockRestore();
    });
  });

  describe('Auto-Fix Tool', () => {
    it('should call attemptWhiteScreenFix when Attempt Auto-Fix button is clicked', async () => {
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(
        <DebugProvider>
          <DebugOverlay />
        </DebugProvider>
      );

      const toggleButton = screen.getByRole('button', { name: /More/i });
      fireEvent.click(toggleButton);

      const fixButton = screen.getByRole('button', { name: /Attempt Auto-Fix/i });
      fireEvent.click(fixButton);

      await waitFor(() => {
        expect(renderingDiagnosticModule.renderingDiagnostic.attemptWhiteScreenFix).toHaveBeenCalled();
        expect(alertMock).toHaveBeenCalled();
      });

      alertMock.mockRestore();
    });
  });

  describe('Last Action Display', () => {
    it('should display last action from debug state', () => {
      const { container } = render(
        <DebugProvider>
          <DebugOverlay />
        </DebugProvider>
      );

      expect(container.textContent).toContain('Last Action:');
      expect(container.textContent).toContain('App initialized');
    });
  });

  describe('Periodic Diagnostics', () => {
    it('should run diagnostics on mount', async () => {
      render(
        <DebugProvider>
          <DebugOverlay />
        </DebugProvider>
      );

      await waitFor(() => {
        expect(renderingDiagnosticModule.renderingDiagnostic.runDiagnostic).toHaveBeenCalled();
      });
    });
  });
});
