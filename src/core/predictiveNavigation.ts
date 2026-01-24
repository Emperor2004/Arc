/**
 * Predictive Navigation Engine
 * ML-lite ranking model for URL prediction based on context and history
 */

import { HistoryEntry } from './types';
import { 
  getEnhancedHistory, 
  getUserBehaviorPatterns, 
  getDomainVisitPatterns,
  analyzeUserBehaviorPatterns 
} from './enhancedHistoryStore';

export interface NavigationPrediction {
  url: string;
  title: string | null;
  domain: string;
  confidence: number;
  reason: string;
  category: 'frequent' | 'recent' | 'contextual' | 'time-based' | 'search-related' | 'similar-content';
  metadata: {
    visitCount: number;
    lastVisited: number;
    averageTimeSpent?: number;
    engagementScore?: number;
    timeOfDayMatch?: boolean;
    dayOfWeekMatch?: boolean;
    contextualRelevance?: number;
  };
}

export interface PredictionContext {
  currentUrl?: string;
  currentDomain?: string;
  currentTime?: number;
  searchQuery?: string;
  tabCount?: number;
  recentUrls?: string[];
  userIntent?: 'browsing' | 'searching' | 'working' | 'entertainment';
}

export interface PredictionOptions {
  maxPredictions?: number;
  minConfidence?: number;
  categories?: NavigationPrediction['category'][];
  timeWindow?: number; // milliseconds
  includeMetadata?: boolean;
}

// Prediction weights for different factors
const PREDICTION_WEIGHTS = {
  frequency: 0.25,
  recency: 0.20,
  engagement: 0.15,
  timePattern: 0.15,
  contextual: 0.15,
  similarity: 0.10
};

// Time-based prediction cache
const predictionCache = new Map<string, {
  predictions: NavigationPrediction[];
  timestamp: number;
  context: string;
}>();

const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50;

/**
 * Clean expired entries from prediction cache
 */
function cleanPredictionCache(): void {
  const now = Date.now();
  
  for (const [key, cached] of predictionCache.entries()) {
    if (now - cached.timestamp > CACHE_EXPIRY_MS) {
      predictionCache.delete(key);
    }
  }
  
  // Limit cache size
  if (predictionCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(predictionCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE);
    toDelete.forEach(([key]) => predictionCache.delete(key));
  }
}

/**
 * Generate cache key for prediction context
 */
function getPredictionCacheKey(context: PredictionContext, options: PredictionOptions): string {
  const contextStr = JSON.stringify({
    domain: context.currentDomain,
    hour: context.currentTime ? new Date(context.currentTime).getHours() : new Date().getHours(),
    searchQuery: context.searchQuery,
    intent: context.userIntent
  });
  
  const optionsStr = JSON.stringify({
    max: options.maxPredictions,
    categories: options.categories?.sort()
  });
  
  return `${contextStr}:${optionsStr}`;
}

/**
 * Calculate frequency score for a history entry
 */
function calculateFrequencyScore(entry: HistoryEntry, maxVisitCount: number): number {
  if (maxVisitCount === 0) return 0;
  return entry.visit_count / maxVisitCount;
}

/**
 * Calculate recency score for a history entry
 */
function calculateRecencyScore(entry: HistoryEntry, now: number): number {
  const daysSinceVisit = (now - entry.visited_at) / (24 * 60 * 60 * 1000);
  
  // Exponential decay: more recent = higher score
  return Math.exp(-daysSinceVisit / 7); // Half-life of 7 days
}

/**
 * Calculate engagement score
 */
function calculateEngagementScore(entry: HistoryEntry): number {
  if (!entry.engagement_score) return 0.5; // Default neutral score
  return entry.engagement_score / 100; // Normalize to 0-1
}

/**
 * Calculate time pattern score based on current time
 */
function calculateTimePatternScore(entry: HistoryEntry, currentTime: number): number {
  if (!entry.visit_patterns) return 0.5;
  
  const currentDate = new Date(currentTime);
  const currentHour = currentDate.getHours();
  const currentDay = currentDate.getDay();
  
  let score = 0;
  
  // Hour of day match (±2 hours tolerance)
  const hourDiff = Math.abs(currentHour - entry.visit_patterns.hour_of_day);
  const hourMatch = hourDiff <= 2 || hourDiff >= 22; // Handle wrap-around
  if (hourMatch) {
    score += 0.6;
  }
  
  // Day of week match
  if (currentDay === entry.visit_patterns.day_of_week) {
    score += 0.4;
  }
  
  return Math.min(score, 1.0);
}

/**
 * Calculate contextual relevance score
 */
function calculateContextualScore(entry: HistoryEntry, context: PredictionContext): number {
  let score = 0;
  
  // Same domain bonus
  if (context.currentDomain && entry.domain === context.currentDomain) {
    score += 0.3;
  }
  
  // Search query relevance
  if (context.searchQuery && entry.context?.search_query) {
    const queryWords = context.searchQuery.toLowerCase().split(/\s+/);
    const entryWords = entry.context.search_query.toLowerCase().split(/\s+/);
    const commonWords = queryWords.filter(word => entryWords.includes(word));
    
    if (commonWords.length > 0) {
      score += (commonWords.length / Math.max(queryWords.length, entryWords.length)) * 0.4;
    }
  }
  
  // Recent navigation pattern
  if (context.recentUrls && context.recentUrls.length > 0) {
    const recentDomains = context.recentUrls.map(url => {
      try {
        return new URL(url).hostname;
      } catch {
        return '';
      }
    }).filter(Boolean);
    
    if (entry.domain && recentDomains.includes(entry.domain)) {
      score += 0.2;
    }
  }
  
  // Tab count context (more tabs = likely working/researching)
  if (context.tabCount && context.tabCount > 5 && entry.context?.tab_count && entry.context.tab_count > 5) {
    score += 0.1;
  }
  
  return Math.min(score, 1.0);
}

/**
 * Calculate content similarity score (simplified)
 */
function calculateSimilarityScore(entry: HistoryEntry, context: PredictionContext): number {
  if (!context.currentUrl || !entry.url) return 0;
  
  try {
    const currentUrl = new URL(context.currentUrl);
    const entryUrl = new URL(entry.url);
    
    let score = 0;
    
    // Same domain
    if (currentUrl.hostname === entryUrl.hostname) {
      score += 0.5;
      
      // Similar path structure
      const currentParts = currentUrl.pathname.split('/').filter(Boolean);
      const entryParts = entryUrl.pathname.split('/').filter(Boolean);
      
      if (currentParts.length > 0 && entryParts.length > 0) {
        const commonParts = currentParts.filter(part => entryParts.includes(part));
        score += (commonParts.length / Math.max(currentParts.length, entryParts.length)) * 0.3;
      }
    }
    
    // Topic tags similarity (if available)
    if (entry.topic_tags && entry.topic_tags.length > 0) {
      // Simplified: assume current page has similar topics if same domain
      if (currentUrl.hostname === entryUrl.hostname) {
        score += 0.2;
      }
    }
    
    return Math.min(score, 1.0);
  } catch {
    return 0;
  }
}

/**
 * Generate navigation predictions based on context and history
 */
export async function generateNavigationPredictions(
  context: PredictionContext = {},
  options: PredictionOptions = {}
): Promise<NavigationPrediction[]> {
  const {
    maxPredictions = 10,
    minConfidence = 0.1,
    categories,
    timeWindow = 30 * 24 * 60 * 60 * 1000, // 30 days
    includeMetadata = true
  } = options;
  
  // Check cache first
  const cacheKey = getPredictionCacheKey(context, options);
  const cached = predictionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
    console.log('🔮 [Predictive Navigation] Cache hit for predictions');
    return cached.predictions;
  }
  
  // Clean cache periodically
  if (Math.random() < 0.1) {
    cleanPredictionCache();
  }
  
  console.log('🔮 [Predictive Navigation] Generating predictions with context:', context);
  
  const now = context.currentTime || Date.now();
  const startTime = now - timeWindow;
  
  // Get enhanced history within time window
  const history = await getEnhancedHistory({
    timeRange: { start: startTime, end: now },
    limit: 1000 // Process up to 1000 recent entries
  });
  
  if (history.length === 0) {
    console.log('🔮 [Predictive Navigation] No history available for predictions');
    return [];
  }
  
  // Calculate normalization factors
  const maxVisitCount = Math.max(...history.map(entry => entry.visit_count));
  
  // Generate predictions for each history entry
  const predictions: NavigationPrediction[] = [];
  
  for (const entry of history) {
    // Skip current URL
    if (context.currentUrl && entry.url === context.currentUrl) {
      continue;
    }
    
    // Calculate individual scores
    const frequencyScore = calculateFrequencyScore(entry, maxVisitCount);
    const recencyScore = calculateRecencyScore(entry, now);
    const engagementScore = calculateEngagementScore(entry);
    const timePatternScore = calculateTimePatternScore(entry, now);
    const contextualScore = calculateContextualScore(entry, context);
    const similarityScore = calculateSimilarityScore(entry, context);
    
    // Calculate weighted confidence score
    const confidence = 
      frequencyScore * PREDICTION_WEIGHTS.frequency +
      recencyScore * PREDICTION_WEIGHTS.recency +
      engagementScore * PREDICTION_WEIGHTS.engagement +
      timePatternScore * PREDICTION_WEIGHTS.timePattern +
      contextualScore * PREDICTION_WEIGHTS.contextual +
      similarityScore * PREDICTION_WEIGHTS.similarity;
    
    // Skip low-confidence predictions
    if (confidence < minConfidence) {
      continue;
    }
    
    // Determine prediction category
    let category: NavigationPrediction['category'] = 'frequent';
    let reason = 'Frequently visited';
    
    if (recencyScore > 0.8) {
      category = 'recent';
      reason = 'Recently visited';
    } else if (contextualScore > 0.6) {
      category = 'contextual';
      reason = 'Related to current context';
    } else if (timePatternScore > 0.7) {
      category = 'time-based';
      reason = 'Usually visited at this time';
    } else if (context.searchQuery && entry.context?.search_query) {
      category = 'search-related';
      reason = 'Related to your search';
    } else if (similarityScore > 0.5) {
      category = 'similar-content';
      reason = 'Similar to current page';
    }
    
    // Filter by categories if specified
    if (categories && !categories.includes(category)) {
      continue;
    }
    
    const prediction: NavigationPrediction = {
      url: entry.url,
      title: entry.title,
      domain: entry.domain || 'unknown',
      confidence,
      reason,
      category,
      metadata: {
        visitCount: entry.visit_count,
        lastVisited: entry.visited_at,
        averageTimeSpent: entry.time_spent,
        engagementScore: entry.engagement_score,
        timeOfDayMatch: timePatternScore > 0.5,
        dayOfWeekMatch: timePatternScore > 0.4,
        contextualRelevance: contextualScore
      }
    };
    
    predictions.push(prediction);
  }
  
  // Sort by confidence and limit results
  const sortedPredictions = predictions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxPredictions);
  
  // Cache results
  predictionCache.set(cacheKey, {
    predictions: sortedPredictions,
    timestamp: Date.now(),
    context: cacheKey
  });
  
  console.log('🔮 [Predictive Navigation] Generated', sortedPredictions.length, 'predictions');
  
  return sortedPredictions;
}

/**
 * Get top sites predictions
 */
export async function getTopSitesPredictions(limit: number = 8): Promise<NavigationPrediction[]> {
  const userPatterns = getUserBehaviorPatterns();
  
  if (!userPatterns) {
    // Analyze patterns if not available
    analyzeUserBehaviorPatterns();
  }
  
  const context: PredictionContext = {
    currentTime: Date.now(),
    userIntent: 'browsing'
  };
  
  return generateNavigationPredictions(context, {
    maxPredictions: limit,
    minConfidence: 0.3,
    categories: ['frequent', 'recent'],
    timeWindow: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

/**
 * Get contextual predictions based on current page
 */
export async function getContextualPredictions(
  currentUrl: string,
  recentUrls: string[] = [],
  limit: number = 6
): Promise<NavigationPrediction[]> {
  let currentDomain: string;
  try {
    currentDomain = new URL(currentUrl).hostname;
  } catch {
    currentDomain = 'unknown';
  }
  
  const context: PredictionContext = {
    currentUrl,
    currentDomain,
    currentTime: Date.now(),
    recentUrls,
    userIntent: 'browsing'
  };
  
  return generateNavigationPredictions(context, {
    maxPredictions: limit,
    minConfidence: 0.2,
    categories: ['contextual', 'similar-content', 'frequent'],
    timeWindow: 14 * 24 * 60 * 60 * 1000 // 14 days
  });
}

/**
 * Get search-related predictions
 */
export async function getSearchRelatedPredictions(
  searchQuery: string,
  limit: number = 5
): Promise<NavigationPrediction[]> {
  const context: PredictionContext = {
    currentTime: Date.now(),
    searchQuery,
    userIntent: 'searching'
  };
  
  return generateNavigationPredictions(context, {
    maxPredictions: limit,
    minConfidence: 0.15,
    categories: ['search-related', 'contextual'],
    timeWindow: 30 * 24 * 60 * 60 * 1000 // 30 days
  });
}

/**
 * Get time-based predictions for current time
 */
export async function getTimeBasedPredictions(limit: number = 5): Promise<NavigationPrediction[]> {
  const now = Date.now();
  const context: PredictionContext = {
    currentTime: now,
    userIntent: 'browsing'
  };
  
  return generateNavigationPredictions(context, {
    maxPredictions: limit,
    minConfidence: 0.25,
    categories: ['time-based', 'frequent'],
    timeWindow: 30 * 24 * 60 * 60 * 1000 // 30 days
  });
}

/**
 * Update prediction model with user feedback
 */
export function updatePredictionFeedback(
  url: string,
  wasUseful: boolean,
  context: PredictionContext
): void {
  // In a full implementation, this would update ML model weights
  // For now, we'll log the feedback for future improvements
  console.log('🔮 [Predictive Navigation] Prediction feedback:', {
    url,
    wasUseful,
    context: context.currentDomain || 'unknown',
    timestamp: Date.now()
  });
  
  // Could store feedback in localStorage for future model improvements
  const feedbackKey = 'arc-prediction-feedback';
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const existing = JSON.parse(localStorage.getItem(feedbackKey) || '[]');
      existing.push({
        url,
        wasUseful,
        context: context.currentDomain || 'unknown',
        timestamp: Date.now()
      });
      
      // Keep only recent feedback (last 1000 entries)
      const recent = existing.slice(-1000);
      localStorage.setItem(feedbackKey, JSON.stringify(recent));
    }
  } catch (error) {
    console.error('Error saving prediction feedback:', error);
  }
}

/**
 * Get prediction statistics
 */
export function getPredictionStats(): {
  cacheSize: number;
  totalPredictions: number;
  averageConfidence: number;
  categoryDistribution: Record<string, number>;
} {
  const allPredictions = Array.from(predictionCache.values())
    .flatMap(cached => cached.predictions);
  
  const categoryDistribution: Record<string, number> = {};
  let totalConfidence = 0;
  
  allPredictions.forEach(prediction => {
    categoryDistribution[prediction.category] = (categoryDistribution[prediction.category] || 0) + 1;
    totalConfidence += prediction.confidence;
  });
  
  return {
    cacheSize: predictionCache.size,
    totalPredictions: allPredictions.length,
    averageConfidence: allPredictions.length > 0 ? totalConfidence / allPredictions.length : 0,
    categoryDistribution
  };
}

/**
 * Clear prediction cache
 */
export function clearPredictionCache(): { cleared: number } {
  const count = predictionCache.size;
  predictionCache.clear();
  console.log('🔮 [Predictive Navigation] Prediction cache cleared:', count, 'entries');
  return { cleared: count };
}

/**
 * Precompute predictions for common contexts
 */
export async function precomputePredictions(): Promise<void> {
  console.log('🔮 [Predictive Navigation] Precomputing predictions for common contexts');
  
  const userPatterns = getUserBehaviorPatterns();
  if (!userPatterns) {
    console.log('🔮 [Predictive Navigation] No user patterns available, skipping precomputation');
    return;
  }
  
  // Precompute top sites
  await getTopSitesPredictions(10);
  
  // Precompute time-based predictions
  await getTimeBasedPredictions(8);
  
  // Precompute predictions for top domains
  for (const domainInfo of userPatterns.topDomains.slice(0, 5)) {
    const context: PredictionContext = {
      currentDomain: domainInfo.domain,
      currentTime: Date.now(),
      userIntent: 'browsing'
    };
    
    await generateNavigationPredictions(context, {
      maxPredictions: 5,
      minConfidence: 0.2
    });
  }
  
  console.log('🔮 [Predictive Navigation] Precomputation completed');
}