import { useState, useEffect } from 'react';
import { ArcSettings } from '../../core/types';

export interface SettingsController {
    settings: ArcSettings;
    loading: boolean;
    loadSettings: () => Promise<void>;
    updateSetting: <K extends keyof ArcSettings>(key: K, value: ArcSettings[K]) => Promise<void>;
}

export const useSettingsController = (): SettingsController => {
    const [settings, setSettings] = useState<ArcSettings>({
        theme: 'dark',
        jarvisEnabled: true,
        useHistoryForRecommendations: true,
        incognitoEnabled: true,
        searchEngine: 'google',
        tabOrder: []
    });
    const [loading, setLoading] = useState(true);

    const loadSettings = async () => {
        try {
            setLoading(true);
            if (typeof window !== 'undefined' && (window as any).arc && (window as any).arc.getSettings) {
                const loadedSettings = await (window as any).arc.getSettings();
                setSettings(prev => ({ ...prev, ...loadedSettings }));
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async <K extends keyof ArcSettings>(
        key: K,
        value: ArcSettings[K]
    ) => {
        try {
            if (typeof window !== 'undefined' && (window as any).arc && (window as any).arc.updateSettings) {
                const result = await (window as any).arc.updateSettings({ [key]: value });
                if (result && result.ok !== false) {
                    setSettings(prev => ({ ...prev, [key]: value }));
                }
            }
        } catch (error) {
            console.error('Failed to update settings:', error);
            throw error;
        }
    };

    // Load settings on mount
    useEffect(() => {
        loadSettings();
    }, []);

    return {
        settings,
        loading,
        loadSettings,
        updateSetting
    };
};