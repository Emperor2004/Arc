/**
 * Translation Panel Component
 * Provides UI for translating page content and managing translation settings
 */

import React, { useState, useEffect, useCallback } from 'react';

interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  popular: boolean;
}

interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  translatedAt: number;
  wordCount: number;
  translationTime: number;
}

interface TranslationCacheStats {
  translationCacheSize: number;
  detectionCacheSize: number;
  totalCacheSize: number;
  oldestTranslation?: number;
  newestTranslation?: number;
}

export interface TranslationPanelProps {
  onNavigate?: (url: string) => void;
}

const TranslationPanel: React.FC<TranslationPanelProps> = ({ onNavigate }) => {
  const [allLanguages, setAllLanguages] = useState<SupportedLanguage[]>([]);
  const [popularLanguages, setPopularLanguages] = useState<SupportedLanguage[]>([]);
  const [selectedTargetLanguage, setSelectedTargetLanguage] = useState<string>('');
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [cacheStats, setCacheStats] = useState<TranslationCacheStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [translationMode, setTranslationMode] = useState<'page' | 'text'>('page');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load supported languages and cache stats
  const loadLanguagesAndStats = useCallback(async () => {
    try {
      const [languagesResult, statsResult] = await Promise.all([
        window.arc.getSupportedLanguages(),
        window.arc.getTranslationCacheStats()
      ]);

      if (languagesResult.ok) {
        setAllLanguages(languagesResult.allLanguages || []);
        setPopularLanguages(languagesResult.popularLanguages || []);
        
        // Set default target language to English if not already set
        if (!selectedTargetLanguage && languagesResult.popularLanguages?.length > 0) {
          const english = languagesResult.popularLanguages.find((lang: SupportedLanguage) => lang.code === 'en');
          if (english) {
            setSelectedTargetLanguage('en');
          }
        }
      }

      if (statsResult.ok) {
        setCacheStats(statsResult.stats);
      }
    } catch (err) {
      console.error('Failed to load languages and stats:', err);
      setError('Failed to load translation data');
    }
  }, [selectedTargetLanguage]);

  // Load data on mount
  useEffect(() => {
    loadLanguagesAndStats();
  }, [loadLanguagesAndStats]);

  // Auto-detect language of input text
  const detectLanguage = useCallback(async (text: string) => {
    if (!text.trim()) {
      setDetectedLanguage('');
      return;
    }

    try {
      setDetecting(true);
      setError(null);

      const result = await window.arc.detectLanguage(text);

      if (result.ok && result.result) {
        setDetectedLanguage(result.result.language);
      } else {
        setError(result.error || 'Failed to detect language');
      }
    } catch (err) {
      console.error('Language detection error:', err);
      setError('Failed to detect language');
    } finally {
      setDetecting(false);
    }
  }, []);

  // Translate page content
  const translatePage = useCallback(async () => {
    if (!selectedTargetLanguage) {
      setError('Please select a target language');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setTranslationResult(null);

      // Get current page content
      const pageResult = await window.arc.getCurrentPageText();
      if (!pageResult.ok || !pageResult.text) {
        throw new Error('Could not get page content');
      }

      // Translate page content
      const result = await window.arc.translatePageContent(
        pageResult.text,
        selectedTargetLanguage,
        undefined,
        {
          chunkSize: 2000,
          preserveFormatting: true
        }
      );

      if (result.ok && result.result) {
        setTranslationResult(result.result);
        setDetectedLanguage(result.result.sourceLanguage);
      } else {
        throw new Error(result.error || 'Translation failed');
      }
    } catch (err) {
      console.error('Page translation error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setLoading(false);
    }
  }, [selectedTargetLanguage]);

  // Translate custom text
  const translateText = useCallback(async () => {
    if (!inputText.trim()) {
      setError('Please enter text to translate');
      return;
    }

    if (!selectedTargetLanguage) {
      setError('Please select a target language');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setTranslationResult(null);

      const result = await window.arc.translateText(
        inputText,
        selectedTargetLanguage,
        detectedLanguage || undefined
      );

      if (result.ok && result.result) {
        setTranslationResult(result.result);
        setDetectedLanguage(result.result.sourceLanguage);
      } else {
        throw new Error(result.error || 'Translation failed');
      }
    } catch (err) {
      console.error('Text translation error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setLoading(false);
    }
  }, [inputText, selectedTargetLanguage, detectedLanguage]);

  // Clear translation cache
  const clearCache = useCallback(async () => {
    try {
      const result = await window.arc.clearTranslationCache();
      if (result.ok) {
        setCacheStats(prev => prev ? { ...prev, translationCacheSize: 0, detectionCacheSize: 0, totalCacheSize: 0 } : null);
        setError(null);
      } else {
        setError(result.error || 'Failed to clear cache');
      }
    } catch (err) {
      console.error('Clear cache error:', err);
      setError('Failed to clear cache');
    }
  }, []);

  // Auto-detect language when input text changes
  useEffect(() => {
    if (translationMode === 'text' && inputText.trim()) {
      const timer = setTimeout(() => {
        detectLanguage(inputText);
      }, 500); // Debounce detection
      return () => clearTimeout(timer);
    }
  }, [inputText, translationMode, detectLanguage]);

  // Get language name by code
  const getLanguageName = (code: string) => {
    const lang = allLanguages.find(l => l.code === code);
    return lang ? `${lang.name} (${lang.nativeName})` : code;
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="glass-card translation-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Translation</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="icon-button icon-button--glass"
              title="Toggle advanced options"
              aria-label="Toggle advanced options"
            >
              ⚙️
            </button>
            <button
              onClick={loadLanguagesAndStats}
              className="icon-button icon-button--glass"
              title="Refresh"
              aria-label="Refresh translation data"
            >
              ↻
            </button>
          </div>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Translate web pages and text using AI
        </p>
      </div>

      {/* Translation Mode Toggle */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setTranslationMode('page')}
          className={`btn-secondary ${translationMode === 'page' ? 'btn-secondary--active' : ''}`}
          style={{
            flex: 1,
            fontSize: '12px',
            padding: '8px 12px',
            background: translationMode === 'page' ? 'var(--accent)' : 'transparent'
          }}
        >
          📄 Translate Page
        </button>
        <button
          onClick={() => setTranslationMode('text')}
          className={`btn-secondary ${translationMode === 'text' ? 'btn-secondary--active' : ''}`}
          style={{
            flex: 1,
            fontSize: '12px',
            padding: '8px 12px',
            background: translationMode === 'text' ? 'var(--accent)' : 'transparent'
          }}
        >
          📝 Translate Text
        </button>
      </div>

      {/* Language Selection */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', display: 'block', color: 'var(--text-primary)' }}>
            Target Language:
          </label>
          <select
            value={selectedTargetLanguage}
            onChange={(e) => setSelectedTargetLanguage(e.target.value)}
            className="pill-input"
            style={{ fontSize: '14px', width: '100%' }}
          >
            <option value="">Select language...</option>
            <optgroup label="Popular Languages">
              {popularLanguages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.nativeName})
                </option>
              ))}
            </optgroup>
            <optgroup label="All Languages">
              {allLanguages.filter(lang => !lang.popular).map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.nativeName})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Detected Language Display */}
        {detectedLanguage && (
          <div style={{ 
            fontSize: '12px', 
            color: 'var(--text-secondary)',
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 'var(--radius-sm)'
          }}>
            {detecting ? (
              <span>🔍 Detecting language...</span>
            ) : (
              <span>🌐 Detected: {getLanguageName(detectedLanguage)}</span>
            )}
          </div>
        )}
      </div>

      {/* Text Input (for text mode) */}
      {translationMode === 'text' && (
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', display: 'block', color: 'var(--text-primary)' }}>
            Text to translate:
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text to translate..."
            className="pill-input"
            style={{
              fontSize: '14px',
              minHeight: '100px',
              resize: 'vertical',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />
        </div>
      )}

      {/* Translate Button */}
      <button
        onClick={translationMode === 'page' ? translatePage : translateText}
        className="btn-primary"
        disabled={loading || !selectedTargetLanguage || (translationMode === 'text' && !inputText.trim())}
        style={{
          fontSize: '14px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        {loading ? (
          <>
            <span>🔄</span>
            <span>Translating...</span>
          </>
        ) : (
          <>
            <span>🌐</span>
            <span>{translationMode === 'page' ? 'Translate Page' : 'Translate Text'}</span>
          </>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)', 
          padding: '12px',
          fontSize: '13px',
          color: '#ef4444'
        }}>
          {error}
        </div>
      )}

      {/* Translation Result */}
      {translationResult && (
        <div style={{ 
          flex: 1, 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {/* Translation Metadata */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              fontSize: '12px',
              color: 'var(--text-secondary)'
            }}>
              <span>
                {getLanguageName(translationResult.sourceLanguage)} → {getLanguageName(translationResult.targetLanguage)}
              </span>
              <span>
                {Math.round(translationResult.confidence * 100)}% confidence • {translationResult.translationTime}ms
              </span>
            </div>

            {/* Original Text */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Original ({getLanguageName(translationResult.sourceLanguage)}):
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                fontSize: '13px',
                lineHeight: '1.5',
                maxHeight: '150px',
                overflowY: 'auto'
              }}>
                {translationResult.originalText}
              </div>
            </div>

            {/* Translated Text */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Translation ({getLanguageName(translationResult.targetLanguage)}):
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                fontSize: '13px',
                lineHeight: '1.5',
                maxHeight: '150px',
                overflowY: 'auto',
                border: '1px solid var(--accent)'
              }}>
                {translationResult.translatedText}
              </div>
            </div>

            {/* Translation Stats */}
            <div style={{ 
              fontSize: '11px', 
              color: 'var(--text-tertiary)',
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <span>{translationResult.wordCount} words</span>
              <span>•</span>
              <span>Translated {formatDate(translationResult.translatedAt)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Options */}
      {showAdvanced && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
            Advanced Options
          </h3>

          {/* Cache Stats */}
          {cacheStats && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Translation Cache:
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                <div>Translations: {cacheStats.translationCacheSize}</div>
                <div>Language detections: {cacheStats.detectionCacheSize}</div>
                <div>Total cached items: {cacheStats.totalCacheSize}</div>
                {cacheStats.oldestTranslation && (
                  <div>Oldest: {formatDate(cacheStats.oldestTranslation)}</div>
                )}
              </div>
            </div>
          )}

          {/* Clear Cache Button */}
          <button
            onClick={clearCache}
            className="btn-secondary"
            style={{
              fontSize: '12px',
              padding: '8px 12px',
              alignSelf: 'flex-start'
            }}
          >
            🗑️ Clear Cache
          </button>
        </div>
      )}
    </div>
  );
};

export default TranslationPanel;