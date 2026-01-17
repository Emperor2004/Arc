/**
 * React Hook for Glassmorphism Effects
 * 
 * Provides easy integration of glassmorphism effects in React components
 */

import { useEffect, useRef, useState } from 'react';
import { glassmorphismProvider, GlassmorphismConfig } from '../utils/glassmorphismProvider';

/**
 * Hook to apply glassmorphism effect to an element
 */
export function useGlassmorphism(config?: Partial<GlassmorphismConfig>) {
  const elementRef = useRef<HTMLElement>(null);
  const [isSupported, setIsSupported] = useState<boolean>(false);

  useEffect(() => {
    // Check browser support
    const supported = glassmorphismProvider.validateBrowserSupport();
    setIsSupported(supported);

    // Apply glass effect if element exists
    if (elementRef.current) {
      const fullConfig = {
        ...glassmorphismProvider.getDefaultConfig(),
        ...config,
      };
      glassmorphismProvider.applyGlassEffect(elementRef.current, fullConfig);
    }

    // Cleanup
    return () => {
      if (elementRef.current) {
        glassmorphismProvider.removeGlassEffect(elementRef.current);
      }
    };
  }, [config]);

  return { ref: elementRef, isSupported };
}

/**
 * Hook to check if browser supports backdrop-filter
 */
export function useBackdropFilterSupport(): boolean {
  const [isSupported, setIsSupported] = useState<boolean>(false);

  useEffect(() => {
    const supported = glassmorphismProvider.validateBrowserSupport();
    setIsSupported(supported);
  }, []);

  return isSupported;
}

/**
 * Hook to get theme-specific glassmorphism config
 */
export function useThemeGlassmorphism(theme: 'light' | 'dark'): GlassmorphismConfig {
  const [config, setConfig] = useState<GlassmorphismConfig>(
    glassmorphismProvider.getDefaultConfig()
  );

  useEffect(() => {
    const newConfig = theme === 'light'
      ? glassmorphismProvider.getLightThemeConfig()
      : glassmorphismProvider.getDarkThemeConfig();
    setConfig(newConfig);
  }, [theme]);

  return config;
}

/**
 * Hook to apply glassmorphism to multiple elements
 */
export function useMultipleGlassmorphism(
  count: number,
  config?: Partial<GlassmorphismConfig>
) {
  const elementsRef = useRef<(HTMLElement | null)[]>([]);
  const [isSupported, setIsSupported] = useState<boolean>(false);

  useEffect(() => {
    // Check browser support
    const supported = glassmorphismProvider.validateBrowserSupport();
    setIsSupported(supported);

    // Apply glass effect to all elements
    const fullConfig = {
      ...glassmorphismProvider.getDefaultConfig(),
      ...config,
    };

    const validElements = elementsRef.current.filter(
      (el): el is HTMLElement => el !== null
    );

    if (validElements.length > 0) {
      glassmorphismProvider.applyGlassEffectToElements(validElements, fullConfig);
    }

    // Cleanup
    return () => {
      validElements.forEach(element => {
        glassmorphismProvider.removeGlassEffect(element);
      });
    };
  }, [count, config]);

  return { refs: elementsRef, isSupported };
}
