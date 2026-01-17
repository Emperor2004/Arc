import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ArcSettings } from '../../core/types';

interface SettingsContextValue {
  settings: ArcSettings;
  loading: boolean;
  updateSettings: (updates: Partial<ArcSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<ArcSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load initial settings
    const loadInitialSettings = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).arc && (window as any).arc.getSettings) {
          const initialSettings = await (window as any).arc.getSettings();
          console.log('📥 [SettingsContext] Loaded initial settings');
          setSettings(initialSettings);
        }
      } catch (error) {
        console.error('📥 [SettingsContext] Failed to load initial settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialSettings();

    // Subscribe to settings updates
    if (typeof window !== 'undefined' && (window as any).arc && (window as any).arc.onSettingsUpdated) {
      const unsubscribe = (window as any).arc.onSettingsUpdated((newSettings: ArcSettings) => {
        console.log('📥 [SettingsContext] Received settings update');
        setSettings(newSettings);
      });

      return unsubscribe;
    }
  }, []);

  const updateSettings = async (updates: Partial<ArcSettings>) => {
    try {
      console.log('🔧 [SettingsContext] Updating settings:', Object.keys(updates));
      
      // Optimistic update - update local state immediately
      if (settings) {
        setSettings(prev => ({ ...prev!, ...updates }));
      }

      // Persist to main process
      if (typeof window !== 'undefined' && (window as any).arc && (window as any).arc.updateSettings) {
        await (window as any).arc.updateSettings(updates);
      }
    } catch (error) {
      console.error('🔧 [SettingsContext] Failed to update settings:', error);
      // Revert optimistic update on error
      if (typeof window !== 'undefined' && (window as any).arc && (window as any).arc.getSettings) {
        const currentSettings = await (window as any).arc.getSettings();
        setSettings(currentSettings);
      }
      throw error;
    }
  };

  // Don't render children until settings are loaded
  if (loading || !settings) {
    return null;
  }

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};
