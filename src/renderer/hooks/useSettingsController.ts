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
        incognitoEnabled: true
    });
    const [loading, setLoading] = useState(true);

    const loadSettings = async () => {
        try {
            setLoading(true);
            if (window.arc && window.arc.getSettings) {
                const loadedSettings = await window.arc.getSettings();
                setSettings(loadedSettings);
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
            if (window.arc && window.arc.updateSettings) {
                const updatedSettings = await window.arc.updateSettings({ [key]: value });
                setSettings(updatedSettings);
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