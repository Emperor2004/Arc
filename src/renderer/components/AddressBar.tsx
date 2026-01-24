import React, { useState, useEffect, useRef, useCallback } from 'react';
import BookmarkButton from './BookmarkButton';
import { 
  generateNavigationPredictions, 
  getTopSitesPredictions, 
  getSearchRelatedPredictions,
  updatePredictionFeedback,
  NavigationPrediction 
} from '../../core/predictiveNavigation';
import { searchHistory } from '../../core/historyStore';
import { useDebug } from '../contexts/DebugContext';
import { useSettingsController } from '../hooks/useSettingsController';
import { 
  autoPreloadForContext, 
  isUrlPreloaded,
  initializePreloadingSystem 
} from '../../core/preloadingSystem';

export interface AddressBarProps {
    url: string;
    title?: string;
    onUrlChange: (url: string) => void;
    onNavigate: () => void;
    onBack: () => void;
    onForward: () => void;
    onReload: () => void;
    onMaximize?: () => void;
    isMaximized?: boolean;
    canGoBack?: boolean;
    canGoForward?: boolean;
    hasActiveTab?: boolean;
    onBookmarkAdded?: () => void;
    onBookmarkRemoved?: () => void;
    currentUrl?: string; // For predictive context
    recentUrls?: string[]; // For predictive context
}

interface Suggestion {
  id: string;
  url: string;
  title: string | null;
  type: 'prediction' | 'history' | 'top-site';
  category?: string;
  confidence?: number;
  reason?: string;
  icon: string;
  isPreloaded?: boolean;
}

const AddressBar: React.FC<AddressBarProps> = ({
    url,
    title,
    onUrlChange,
    onNavigate,
    onBack,
    onForward,
    onReload,
    onMaximize,
    isMaximized,
    canGoBack = false,
    canGoForward = false,
    hasActiveTab = true,
    onBookmarkAdded,
    onBookmarkRemoved,
    currentUrl,
    recentUrls = [],
}) => {
    const { logAction } = useDebug();
    const { settings } = useSettingsController();
    
    // State for suggestions
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isLoading, setIsLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    
    // Refs
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout>();
    const preloadDebounceRef = useRef<NodeJS.Timeout>();
    
    // Debounced suggestion generation
    const generateSuggestions = useCallback(async (query: string) => {
      if (!query.trim()) {
        // Show top sites when no query
        try {
          setIsLoading(true);
          const topSites = await getTopSitesPredictions(6);
          
          const topSiteSuggestions: Suggestion[] = topSites.map((prediction, index) => ({
            id: `top-${index}`,
            url: prediction.url,
            title: prediction.title,
            type: 'top-site',
            category: prediction.category,
            confidence: prediction.confidence,
            reason: prediction.reason,
            icon: '⭐'
          }));
          
          setSuggestions(topSiteSuggestions);
          logAction(`Generated ${topSiteSuggestions.length} top site suggestions`);
        } catch (error) {
          console.error('Error generating top site suggestions:', error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Generate multiple types of suggestions in parallel
        const [historyResults, predictions, searchPredictions] = await Promise.all([
          searchHistory(query).catch(() => []),
          generateNavigationPredictions({
            currentUrl,
            currentTime: Date.now(),
            recentUrls,
            userIntent: 'browsing'
          }, {
            maxPredictions: 4,
            minConfidence: 0.1
          }).catch(() => []),
          query.length > 2 ? getSearchRelatedPredictions(query, 3).catch(() => []) : []
        ]);
        
        const allSuggestions: Suggestion[] = [];
        
        // Add history suggestions
        historyResults.slice(0, 3).forEach((entry, index) => {
          if (entry.url.toLowerCase().includes(query.toLowerCase()) || 
              (entry.title && entry.title.toLowerCase().includes(query.toLowerCase()))) {
            allSuggestions.push({
              id: `history-${index}`,
              url: entry.url,
              title: entry.title,
              type: 'history',
              icon: '🕒'
            });
          }
        });
        
        // Add AI predictions
        predictions.forEach((prediction, index) => {
          // Filter predictions that match the query
          const matchesQuery = 
            prediction.url.toLowerCase().includes(query.toLowerCase()) ||
            (prediction.title && prediction.title.toLowerCase().includes(query.toLowerCase())) ||
            prediction.domain.toLowerCase().includes(query.toLowerCase());
          
          if (matchesQuery) {
            allSuggestions.push({
              id: `prediction-${index}`,
              url: prediction.url,
              title: prediction.title,
              type: 'prediction',
              category: prediction.category,
              confidence: prediction.confidence,
              reason: prediction.reason,
              icon: getPredictionIcon(prediction.category),
              isPreloaded: isUrlPreloaded(prediction.url)
            });
          }
        });
        
        // Add search-related predictions
        searchPredictions.forEach((prediction, index) => {
          allSuggestions.push({
            id: `search-${index}`,
            url: prediction.url,
            title: prediction.title,
            type: 'prediction',
            category: prediction.category,
            confidence: prediction.confidence,
            reason: prediction.reason,
            icon: '🔍',
            isPreloaded: isUrlPreloaded(prediction.url)
          });
        });
        
        // Remove duplicates and sort by relevance
        const uniqueSuggestions = allSuggestions.filter((suggestion, index, self) =>
          index === self.findIndex(s => s.url === suggestion.url)
        );
        
        // Sort by type priority and confidence
        uniqueSuggestions.sort((a, b) => {
          // Prioritize exact matches
          const aExact = a.url.toLowerCase() === query.toLowerCase() || 
                        (a.title && a.title.toLowerCase() === query.toLowerCase());
          const bExact = b.url.toLowerCase() === query.toLowerCase() || 
                        (b.title && b.title.toLowerCase() === query.toLowerCase());
          
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          
          // Then by confidence for predictions
          if (a.confidence && b.confidence) {
            return b.confidence - a.confidence;
          }
          
          // Then by type priority
          const typePriority = { 'history': 3, 'prediction': 2, 'top-site': 1 };
          return (typePriority[b.type] || 0) - (typePriority[a.type] || 0);
        });
        
        setSuggestions(uniqueSuggestions.slice(0, 8)); // Limit to 8 suggestions
        logAction(`Generated ${uniqueSuggestions.length} suggestions for query: "${query}"`);
        
        // Trigger preloading for top predictions (debounced)
        if (preloadDebounceRef.current) {
          clearTimeout(preloadDebounceRef.current);
        }
        
        preloadDebounceRef.current = setTimeout(() => {
          const topPredictions = predictions.slice(0, 3); // Preload top 3 predictions
          if (topPredictions.length > 0 && settings.preloadingEnabled) {
            autoPreloadForContext(currentUrl, recentUrls, settings)
              .then(preloaded => {
                if (preloaded.length > 0) {
                  logAction(`Preloaded ${preloaded.length} connections for predictions`);
                }
              })
              .catch(error => {
                console.error('Preloading failed:', error);
              });
          }
        }, 1000); // Delay preloading by 1 second to avoid excessive requests
      } catch (error) {
        console.error('Error generating suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, [currentUrl, recentUrls, logAction]);
    
    // Get icon for prediction category
    const getPredictionIcon = (category: string): string => {
      switch (category) {
        case 'frequent': return '🔥';
        case 'recent': return '⏰';
        case 'contextual': return '🎯';
        case 'time-based': return '📅';
        case 'search-related': return '🔍';
        case 'similar-content': return '📄';
        default: return '✨';
      }
    };
    
    // Handle input changes with debouncing
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onUrlChange(newValue);
      
      // Clear existing debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      // Debounce suggestion generation
      debounceRef.current = setTimeout(() => {
        generateSuggestions(newValue);
      }, 150);
    };
    
    // Handle input focus
    const handleInputFocus = () => {
      setIsFocused(true);
      setShowSuggestions(true);
      
      // Generate suggestions if input is empty (show top sites)
      if (!url.trim()) {
        generateSuggestions('');
      }
    };
    
    // Handle input blur
    const handleInputBlur = (e: React.FocusEvent) => {
      // Don't hide suggestions if clicking on a suggestion
      if (suggestionsRef.current && suggestionsRef.current.contains(e.relatedTarget as Node)) {
        return;
      }
      
      setTimeout(() => {
        setIsFocused(false);
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }, 150);
    };
    
    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || suggestions.length === 0) {
        if (e.key === 'Enter') {
          onNavigate();
        }
        return;
      }
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
          
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            const selectedSuggestion = suggestions[selectedIndex];
            handleSuggestionSelect(selectedSuggestion);
          } else {
            onNavigate();
          }
          break;
          
        case 'Escape':
          setShowSuggestions(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    };
    
    // Handle suggestion selection
    const handleSuggestionSelect = (suggestion: Suggestion) => {
      onUrlChange(suggestion.url);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      
      // Provide feedback for predictions
      if (suggestion.type === 'prediction') {
        updatePredictionFeedback(suggestion.url, true, {
          currentUrl,
          currentTime: Date.now(),
          recentUrls
        });
      }
      
      logAction(`Selected suggestion: ${suggestion.title || suggestion.url} (${suggestion.type})`);
      
      // Navigate immediately
      setTimeout(() => {
        onNavigate();
      }, 50);
    };
    
    // Initialize preloading system
    useEffect(() => {
      if (settings.preloadingEnabled) {
        initializePreloadingSystem(settings);
      }
    }, [settings.preloadingEnabled]);
    
    // Generate initial suggestions on mount
    useEffect(() => {
      if (isFocused && !url.trim()) {
        generateSuggestions('');
      }
    }, [isFocused, url, generateSuggestions]);
    
    // Cleanup debounce on unmount
    useEffect(() => {
      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        if (preloadDebounceRef.current) {
          clearTimeout(preloadDebounceRef.current);
        }
      };
    }, []);

    return (
        <div className="browser-toolbar">
            <div className="browser-nav-buttons" role="toolbar" aria-label="Browser navigation">
                <button 
                    className="round-btn" 
                    onClick={onBack} 
                    title="Go back"
                    aria-label="Go back"
                    disabled={!canGoBack}
                >
                    ←
                </button>
                <button 
                    className="round-btn" 
                    onClick={onForward} 
                    title="Go forward"
                    aria-label="Go forward"
                    disabled={!canGoForward}
                >
                    →
                </button>
                <button 
                    className="round-btn" 
                    onClick={onReload} 
                    title="Reload page"
                    aria-label="Reload page"
                    disabled={!hasActiveTab || !url}
                >
                    ↻
                </button>
            </div>

            <div className="browser-address-bar" role="search" aria-label="Address and search bar">
                <div style={{ position: 'relative', flex: 1 }}>
                    <input
                        ref={inputRef}
                        type="text"
                        className="pill-input"
                        value={url}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        placeholder="Search or enter URL"
                        aria-label="Enter URL or search terms"
                        role="combobox"
                        aria-expanded={showSuggestions}
                        aria-autocomplete="both"
                        aria-owns="address-suggestions"
                        aria-activedescendant={selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined}
                    />
                    
                    {/* Suggestions Dropdown */}
                    {showSuggestions && (suggestions.length > 0 || isLoading) && (
                        <div
                            ref={suggestionsRef}
                            id="address-suggestions"
                            className="address-suggestions"
                            style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                zIndex: 1000,
                                background: 'rgba(0, 0, 0, 0.9)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '8px',
                                marginTop: '4px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                maxHeight: '400px',
                                overflowY: 'auto'
                            }}
                            role="listbox"
                            aria-label="Address suggestions"
                        >
                            {isLoading && (
                                <div style={{
                                    padding: '12px 16px',
                                    color: 'var(--text-secondary)',
                                    fontSize: '14px',
                                    textAlign: 'center'
                                }}>
                                    <span style={{ marginRight: '8px' }}>⚡</span>
                                    Generating suggestions...
                                </div>
                            )}
                            
                            {!isLoading && suggestions.map((suggestion, index) => (
                                <div
                                    key={suggestion.id}
                                    id={`suggestion-${index}`}
                                    className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                                    style={{
                                        padding: '12px 16px',
                                        cursor: 'pointer',
                                        borderBottom: index < suggestions.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                                        background: index === selectedIndex ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                        transition: 'background-color 0.2s ease'
                                    }}
                                    onClick={() => handleSuggestionSelect(suggestion)}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    role="option"
                                    aria-selected={index === selectedIndex}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '16px', flexShrink: 0 }}>
                                            {suggestion.icon}
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '14px',
                                                fontWeight: 500,
                                                color: 'var(--text-primary)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {suggestion.title || suggestion.url}
                                            </div>
                                            <div style={{
                                                fontSize: '12px',
                                                color: 'var(--text-secondary)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                marginTop: '2px'
                                            }}>
                                                {suggestion.url}
                                            </div>
                                            {suggestion.reason && (
                                                <div style={{
                                                    fontSize: '11px',
                                                    color: 'var(--accent)',
                                                    marginTop: '2px',
                                                    opacity: 0.8
                                                }}>
                                                    {suggestion.reason}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {suggestion.confidence && (
                                                <span style={{
                                                    fontSize: '10px',
                                                    color: 'var(--text-secondary)',
                                                    background: 'rgba(255, 255, 255, 0.1)',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px'
                                                }}>
                                                    {Math.round(suggestion.confidence * 100)}%
                                                </span>
                                            )}
                                            {suggestion.isPreloaded && (
                                                <span style={{
                                                    fontSize: '10px',
                                                    color: 'var(--accent)',
                                                    background: 'rgba(0, 255, 0, 0.1)',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    border: '1px solid rgba(0, 255, 0, 0.3)'
                                                }} title="Connection preloaded for faster loading">
                                                    ⚡ Fast
                                                </span>
                                            )}
                                            <span style={{
                                                fontSize: '10px',
                                                color: 'var(--text-secondary)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                {suggestion.type === 'prediction' ? 'AI' : 
                                                 suggestion.type === 'history' ? 'History' : 'Top Site'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {!isLoading && suggestions.length === 0 && url.trim() && (
                                <div style={{
                                    padding: '12px 16px',
                                    color: 'var(--text-secondary)',
                                    fontSize: '14px',
                                    textAlign: 'center'
                                }}>
                                    No suggestions found
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <BookmarkButton
                    url={url}
                    title={title}
                    onBookmarkAdded={onBookmarkAdded}
                    onBookmarkRemoved={onBookmarkRemoved}
                />
                <button 
                    className="btn-primary" 
                    onClick={onNavigate}
                    disabled={!url.trim()}
                    aria-label="Navigate to URL or search"
                >
                    Go
                </button>
                {onMaximize && (
                    <button 
                        className="icon-button icon-button--glass" 
                        type="button"
                        onClick={onMaximize}
                        title={isMaximized ? "Restore browser" : "Maximize browser"}
                        aria-label={isMaximized ? "Restore browser window" : "Maximize browser window"}
                    >
                        ⤢
                    </button>
                )}
            </div>
        </div>
    );
};

export default AddressBar;