import React, { useState, useEffect, useCallback } from 'react';
import { 
  getPersonalizationSettings, 
  updatePersonalizationSettings, 
  RecommendationPersonalization,
  getOllamaModels 
} from '../../core/personalizationManager';
import { getJarvisRecommendations } from '../../core/recommender';
import { Recommendation } from '../../core/types';

export interface PersonalizationSettingsProps {
  onMessage?: (message: string) => void;
}

const PersonalizationSettings: React.FC<PersonalizationSettingsProps> = ({ onMessage }) => {
  const [settings, setSettings] = useState<RecommendationPersonalization | null>(null);
  const [previewRecommendations, setPreviewRecommendations] = useState<Recommendation[]>([]);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial settings and Ollama models
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const currentSettings = getPersonalizationSettings();
        setSettings(currentSettings);
        
        // Load Ollama models
        const models = await getOllamaModels();
        setOllamaModels(models);
        
        // Load initial recommendations
        const recommendations = await getJarvisRecommendations(5);
        setPreviewRecommendations(recommendations);
      } catch (err) {
        console.error('Failed to load personalization data:', err);
        setError('Failed to load personalization settings');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Update recommendations when settings change
  const updatePreview = useCallback(async (newSettings: RecommendationPersonalization) => {
    try {
      setPreviewLoading(true);
      
      // Apply the new settings temporarily for preview
      await updatePersonalizationSettings(newSettings);
      
      // Clear the cache to force fresh recommendations
      if (window.arc && window.arc.clearJarvisCache) {
        await window.arc.clearJarvisCache();
      }
      
      // Get updated recommendations
      const recommendations = await getJarvisRecommendations(5);
      setPreviewRecommendations(recommendations);
    } catch (err) {
      console.error('Failed to update preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  // Handle weight slider changes
  const handleWeightChange = useCallback(async (
    weightType: 'recencyWeight' | 'frequencyWeight' | 'feedbackWeight',
    value: number
  ) => {
    if (!settings) return;

    const newSettings = {
      ...settings,
      [weightType]: value
    };

    setSettings(newSettings);
    await updatePreview(newSettings);
  }, [settings, updatePreview]);

  // Handle other setting changes
  const handleSettingChange = useCallback(async <K extends keyof RecommendationPersonalization>(
    key: K,
    value: RecommendationPersonalization[K]
  ) => {
    if (!settings) return;

    const newSettings = {
      ...settings,
      [key]: value
    };

    setSettings(newSettings);
    
    try {
      await updatePersonalizationSettings(newSettings);
      onMessage?.('Personalization settings saved');
    } catch (err) {
      console.error('Failed to save settings:', err);
      onMessage?.('Failed to save settings');
    }
  }, [settings, onMessage]);

  // Reset to defaults
  const handleReset = useCallback(async () => {
    const defaultSettings: RecommendationPersonalization = {
      recencyWeight: 0.5,
      frequencyWeight: 0.3,
      feedbackWeight: 0.2,
      minScore: 0.1,
      maxRecommendations: 5,
      ollamaModel: 'mistral',
      ollamaEnabled: false,
    };

    setSettings(defaultSettings);
    
    try {
      await updatePersonalizationSettings(defaultSettings);
      await updatePreview(defaultSettings);
      onMessage?.('Settings reset to defaults');
    } catch (err) {
      console.error('Failed to reset settings:', err);
      onMessage?.('Failed to reset settings');
    }
  }, [updatePreview, onMessage]);

  if (loading) {
    return (
      <div className="settings-card">
        <div className="settings-group">
          <h2>Recommendation Personalization</h2>
          <p>Loading personalization settings...</p>
        </div>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="settings-card">
        <div className="settings-group">
          <h2>Recommendation Personalization</h2>
          <p style={{ color: 'var(--danger)' }}>
            {error || 'Failed to load settings'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-card">
      <div className="settings-group">
        <h2>Recommendation Personalization</h2>
        <p>Customize how Jarvis generates recommendations based on your preferences</p>

        {/* Weight Sliders */}
        <div className="personalization-weights">
          <h3 className="personalization-section-title">Algorithm Weights</h3>
          <p className="personalization-section-description">
            Adjust how much each factor influences your recommendations. Weights are automatically normalized.
          </p>

          {/* Recency Weight */}
          <div className="personalization-weight-item">
            <div className="personalization-weight-header">
              <label className="personalization-weight-label">
                Recent Activity
              </label>
              <span className="personalization-weight-value">
                {Math.round(settings.recencyWeight * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.recencyWeight}
              onChange={(e) => handleWeightChange('recencyWeight', parseFloat(e.target.value))}
              className="personalization-weight-slider"
            />
            <p className="personalization-weight-description">
              How much recent visits influence recommendations
            </p>
          </div>

          {/* Frequency Weight */}
          <div className="personalization-weight-item">
            <div className="personalization-weight-header">
              <label className="personalization-weight-label">
                Visit Frequency
              </label>
              <span className="personalization-weight-value">
                {Math.round(settings.frequencyWeight * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.frequencyWeight}
              onChange={(e) => handleWeightChange('frequencyWeight', parseFloat(e.target.value))}
              className="personalization-weight-slider"
            />
            <p className="personalization-weight-description">
              How much visit count influences recommendations
            </p>
          </div>

          {/* Feedback Weight */}
          <div className="personalization-weight-item">
            <div className="personalization-weight-header">
              <label className="personalization-weight-label">
                Your Feedback
              </label>
              <span className="personalization-weight-value">
                {Math.round(settings.feedbackWeight * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.feedbackWeight}
              onChange={(e) => handleWeightChange('feedbackWeight', parseFloat(e.target.value))}
              className="personalization-weight-slider"
            />
            <p className="personalization-weight-description">
              How much your likes/dislikes influence recommendations
            </p>
          </div>
        </div>

        {/* Additional Settings */}
        <div className="personalization-advanced">
          <h3 className="personalization-section-title">Advanced Settings</h3>

          {/* Min Score */}
          <div className="settings-item">
            <div className="personalization-setting-row">
              <div className="personalization-setting-info">
                <label className="personalization-setting-label">
                  Minimum Score Threshold
                </label>
                <p className="personalization-setting-description">
                  Only show recommendations above this score ({Math.round(settings.minScore * 100)}%)
                </p>
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={settings.minScore}
                onChange={(e) => handleSettingChange('minScore', parseFloat(e.target.value))}
                className="personalization-setting-slider"
              />
            </div>
          </div>

          {/* Max Recommendations */}
          <div className="settings-item">
            <div className="personalization-setting-row">
              <div className="personalization-setting-info">
                <label className="personalization-setting-label">
                  Maximum Recommendations
                </label>
                <p className="personalization-setting-description">
                  Show up to {settings.maxRecommendations} recommendations
                </p>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={settings.maxRecommendations}
                onChange={(e) => handleSettingChange('maxRecommendations', parseInt(e.target.value))}
                className="personalization-setting-slider"
              />
            </div>
          </div>

          {/* Ollama Settings */}
          <div className="settings-item">
            <label className="settings-label">
              <div className="settings-label-content">
                <span>Enable Ollama Enhancement</span>
                <span className="settings-description">
                  Use local AI model for enhanced recommendation understanding
                </span>
              </div>
              <div className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.ollamaEnabled ?? false}
                  onChange={(e) => handleSettingChange('ollamaEnabled', e.target.checked)}
                  className="settings-checkbox"
                />
                <span className="settings-toggle-slider"></span>
              </div>
            </label>
          </div>

          {settings.ollamaEnabled && (
            <div className="settings-item">
              <div className="personalization-setting-row">
                <div className="personalization-setting-info">
                  <label className="personalization-setting-label">
                    Ollama Model
                  </label>
                  <p className="personalization-setting-description">
                    Choose which local AI model to use for enhanced recommendations
                  </p>
                </div>
                <select
                  value={settings.ollamaModel || 'mistral'}
                  onChange={(e) => handleSettingChange('ollamaModel', e.target.value)}
                  className="settings-select"
                >
                  {ollamaModels.map(model => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Reset Button */}
        <div className="settings-item">
          <div className="settings-action">
            <div className="settings-action-content">
              <span>Reset to Defaults</span>
              <span className="settings-description">
                Restore all personalization settings to their default values
              </span>
            </div>
            <button 
              className="btn-secondary"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Real-time Preview */}
        <div className="personalization-preview">
          <h3 className="personalization-section-title">Live Preview</h3>
          <p className="personalization-section-description">
            See how your settings affect recommendations in real-time
          </p>
          
          {previewLoading ? (
            <div className="personalization-preview-loading">
              <p>Updating recommendations...</p>
            </div>
          ) : (
            <div className="personalization-preview-list">
              {previewRecommendations.length === 0 ? (
                <div className="personalization-preview-empty">
                  <p>No recommendations available with current settings</p>
                </div>
              ) : (
                previewRecommendations.map((rec, index) => (
                  <div key={`${rec.url}-${index}`} className="personalization-preview-item">
                    <div className="personalization-preview-item-header">
                      <span className="personalization-preview-item-title">
                        {rec.title || new URL(rec.url).hostname}
                      </span>
                      <span className="personalization-preview-item-score">
                        {Math.round(rec.score * 100)}%
                      </span>
                    </div>
                    <p className="personalization-preview-item-url">
                      {rec.url}
                    </p>
                    <p className="personalization-preview-item-reason">
                      {rec.reason}
                    </p>
                    
                    {/* Weight indicators */}
                    {rec.personalizedScores && (
                      <div style={{
                        display: 'flex',
                        gap: '4px',
                        marginTop: '8px',
                        flexWrap: 'wrap'
                      }}>
                        <div style={{
                          fontSize: '9px',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#60a5fa',
                          border: '1px solid rgba(59, 130, 246, 0.3)'
                        }}>
                          Frequency: {Math.round(rec.personalizedScores.frequency * 100)}%
                        </div>
                        <div style={{
                          fontSize: '9px',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          background: 'rgba(34, 197, 94, 0.2)',
                          color: '#4ade80',
                          border: '1px solid rgba(34, 197, 94, 0.3)'
                        }}>
                          Recency: {Math.round(rec.personalizedScores.recency * 100)}%
                        </div>
                        <div style={{
                          fontSize: '9px',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          background: 'rgba(168, 85, 247, 0.2)',
                          color: '#a78bfa',
                          border: '1px solid rgba(168, 85, 247, 0.3)'
                        }}>
                          Feedback: {Math.round(rec.personalizedScores.feedback * 100)}%
                        </div>
                      </div>
                    )}
                    
                    <span className="personalization-preview-item-kind">
                      {rec.kind}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalizationSettings;