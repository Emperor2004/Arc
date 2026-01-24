/**
 * Enhanced History Store with Visit Patterns and Context
 * Extends basic history with behavioral data for predictive navigation
 */

import { HistoryEntry } from './types';

// Enhanced browser-safe history storage
const ENHANCED_HISTORY_KEY = 'arc-browser-enhanced-history';
const BROWSING_SESSIONS_KEY = 'arc-browser-sessions';
const USER_PATTERNS_KEY = 'arc-browser-patterns';

// Session tracking
let currentSessionId: string | null = null;
let sessionStartTime: number = Date.now();
let lastActiveTime: number = Date.now();

// Engagement tracking
const pageEngagementData = new Map<string, {
  startTime: number;
  interactions: number;
  maxScrollDepth: number;
}>();

export interface BrowsingSession {
  id: string;
  startTime: number;
  endTime?: number;
  urls: string[];
  totalTime: number;
  tabCount: number;
  searchQueries: string[];
}

export interface UserBehaviorPatterns {
  mostActiveHours: number[];
  mostActiveDays: number[];
  averageSessionDuration: number;
  topDomains: { domain: string; visits: number; timeSpent: number }[];
  searchPatterns: { query: string; frequency: number; lastUsed: number }[];
  navigationPatterns: { from: string; to: string; frequency: number }[];
  topicInterests: { topic: string; score: number; lastAccessed: number }[];
}

/**
 * Load enhanced history from localStorage
 */
function loadEnhancedHistory(): HistoryEntry[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(ENHANCED_HISTORY_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (error) {
    console.error('Error loading enhanced history:', error);
  }
  return [];
}

/**
 * Save enhanced history to localStorage
 */
function saveEnhancedHistory(history: HistoryEntry[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(ENHANCED_HISTORY_KEY, JSON.stringify(history));
    }
  } catch (error) {
    console.error('Error saving enhanced history:', error);
  }
}

/**
 * Load browsing sessions
 */
function loadBrowsingSessions(): BrowsingSession[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(BROWSING_SESSIONS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (error) {
    console.error('Error loading browsing sessions:', error);
  }
  return [];
}

/**
 * Save browsing sessions
 */
function saveBrowsingSessions(sessions: BrowsingSession[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(BROWSING_SESSIONS_KEY, JSON.stringify(sessions));
    }
  } catch (error) {
    console.error('Error saving browsing sessions:', error);
  }
}

/**
 * Load user behavior patterns
 */
function loadUserPatterns(): UserBehaviorPatterns | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(USER_PATTERNS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (error) {
    console.error('Error loading user patterns:', error);
  }
  return null;
}

/**
 * Save user behavior patterns
 */
function saveUserPatterns(patterns: UserBehaviorPatterns): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(USER_PATTERNS_KEY, JSON.stringify(patterns));
    }
  } catch (error) {
    console.error('Error saving user patterns:', error);
  }
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Start a new browsing session
 */
export function startBrowsingSession(): string {
  currentSessionId = generateSessionId();
  sessionStartTime = Date.now();
  lastActiveTime = Date.now();
  
  console.log('🔍 [Enhanced History] Started browsing session:', currentSessionId);
  return currentSessionId;
}

/**
 * End the current browsing session
 */
export function endBrowsingSession(): void {
  if (!currentSessionId) return;
  
  const sessions = loadBrowsingSessions();
  const currentSession = sessions.find(s => s.id === currentSessionId);
  
  if (currentSession) {
    currentSession.endTime = Date.now();
    currentSession.totalTime = currentSession.endTime - currentSession.startTime;
    saveBrowsingSessions(sessions);
  }
  
  console.log('🔍 [Enhanced History] Ended browsing session:', currentSessionId);
  currentSessionId = null;
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

/**
 * Extract path from URL
 */
function extractPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return '/';
  }
}

/**
 * Extract query parameters from URL
 */
function extractQueryParams(url: string): string {
  try {
    return new URL(url).search;
  } catch {
    return '';
  }
}

/**
 * Detect if URL is a search result
 */
function isSearchResult(url: string, referrer?: string): boolean {
  const searchDomains = ['google.com', 'bing.com', 'duckduckgo.com', 'yahoo.com'];
  
  if (referrer) {
    const referrerDomain = extractDomain(referrer);
    return searchDomains.some(domain => referrerDomain.includes(domain));
  }
  
  return false;
}

/**
 * Extract search query from referrer
 */
function extractSearchQuery(referrer: string): string | undefined {
  try {
    const url = new URL(referrer);
    
    // Google
    if (url.hostname.includes('google.com')) {
      return url.searchParams.get('q') || undefined;
    }
    
    // Bing
    if (url.hostname.includes('bing.com')) {
      return url.searchParams.get('q') || undefined;
    }
    
    // DuckDuckGo
    if (url.hostname.includes('duckduckgo.com')) {
      return url.searchParams.get('q') || undefined;
    }
    
    // Yahoo
    if (url.hostname.includes('yahoo.com')) {
      return url.searchParams.get('p') || undefined;
    }
  } catch {
    // Ignore parsing errors
  }
  
  return undefined;
}

/**
 * Calculate engagement score based on time spent, interactions, and scroll depth
 */
function calculateEngagementScore(timeSpent: number, interactions: number, scrollDepth: number): number {
  // Normalize values
  const timeScore = Math.min(timeSpent / 60000, 1); // Max 1 minute = 1.0
  const interactionScore = Math.min(interactions / 10, 1); // Max 10 interactions = 1.0
  const scrollScore = scrollDepth / 100; // 100% scroll = 1.0
  
  // Weighted combination
  return (timeScore * 0.4 + interactionScore * 0.3 + scrollScore * 0.3) * 100;
}

/**
 * Start tracking page engagement
 */
export function startPageEngagement(url: string): void {
  pageEngagementData.set(url, {
    startTime: Date.now(),
    interactions: 0,
    maxScrollDepth: 0
  });
}

/**
 * Track page interaction
 */
export function trackPageInteraction(url: string): void {
  const data = pageEngagementData.get(url);
  if (data) {
    data.interactions++;
  }
}

/**
 * Track page scroll
 */
export function trackPageScroll(url: string, scrollDepth: number): void {
  const data = pageEngagementData.get(url);
  if (data) {
    data.maxScrollDepth = Math.max(data.maxScrollDepth, scrollDepth);
  }
}

/**
 * End page engagement tracking
 */
export function endPageEngagement(url: string): { timeSpent: number; interactions: number; scrollDepth: number } {
  const data = pageEngagementData.get(url);
  if (!data) {
    return { timeSpent: 0, interactions: 0, scrollDepth: 0 };
  }
  
  const timeSpent = Date.now() - data.startTime;
  const result = {
    timeSpent,
    interactions: data.interactions,
    scrollDepth: data.maxScrollDepth
  };
  
  pageEngagementData.delete(url);
  return result;
}

/**
 * Add enhanced history entry with visit patterns and context
 */
export function addEnhancedHistoryEntry(
  url: string, 
  title: string, 
  options: {
    referrer?: string;
    tabCount?: number;
    previousUrl?: string;
    timeSpent?: number;
    interactions?: number;
    scrollDepth?: number;
  } = {}
): HistoryEntry {
  const history = loadEnhancedHistory();
  const existingIndex = history.findIndex(h => h.url === url);
  
  const now = Date.now();
  const date = new Date(now);
  
  // Ensure session is active
  if (!currentSessionId) {
    startBrowsingSession();
  }
  
  // Update session activity
  lastActiveTime = now;
  
  // Calculate engagement score
  const engagementScore = options.timeSpent && options.interactions !== undefined && options.scrollDepth !== undefined
    ? calculateEngagementScore(options.timeSpent, options.interactions, options.scrollDepth)
    : undefined;
  
  const enhancedData = {
    domain: extractDomain(url),
    path: extractPath(url),
    query_params: extractQueryParams(url),
    referrer: options.referrer,
    session_id: currentSessionId || undefined,
    time_spent: options.timeSpent,
    scroll_depth: options.scrollDepth,
    interactions: options.interactions,
    visit_patterns: {
      hour_of_day: date.getHours(),
      day_of_week: date.getDay(),
      time_of_visit: now
    },
    context: {
      previous_url: options.previousUrl,
      tab_count: options.tabCount,
      is_search_result: isSearchResult(url, options.referrer),
      search_query: options.referrer ? extractSearchQuery(options.referrer) : undefined
    },
    engagement_score: engagementScore
  };
  
  if (existingIndex >= 0) {
    // Update existing entry
    const existing = history[existingIndex];
    existing.visit_count++;
    existing.visited_at = now;
    if (title) {
      existing.title = title;
    }
    
    // Update enhanced data
    Object.assign(existing, enhancedData);
    
    // Update time spent (accumulate)
    if (options.timeSpent && existing.time_spent) {
      existing.time_spent += options.timeSpent;
    }
    
    // Update engagement score (average)
    if (engagementScore && existing.engagement_score) {
      existing.engagement_score = (existing.engagement_score + engagementScore) / 2;
    }
  } else {
    // Add new entry
    const newEntry: HistoryEntry = {
      id: history.length > 0 ? Math.max(...history.map(h => h.id)) + 1 : 1,
      url,
      title: title || null,
      visited_at: now,
      visit_count: 1,
      ...enhancedData
    };
    history.push(newEntry);
  }
  
  // Update browsing session
  updateBrowsingSession(url, options.referrer);
  
  saveEnhancedHistory(history);
  return history[existingIndex >= 0 ? existingIndex : history.length - 1];
}

/**
 * Update current browsing session with new URL
 */
function updateBrowsingSession(url: string, referrer?: string): void {
  if (!currentSessionId) return;
  
  const sessions = loadBrowsingSessions();
  let currentSession = sessions.find(s => s.id === currentSessionId);
  
  if (!currentSession) {
    currentSession = {
      id: currentSessionId,
      startTime: sessionStartTime,
      urls: [],
      totalTime: 0,
      tabCount: 1,
      searchQueries: []
    };
    sessions.push(currentSession);
  }
  
  // Add URL to session
  if (!currentSession.urls.includes(url)) {
    currentSession.urls.push(url);
  }
  
  // Add search query if detected
  if (referrer) {
    const searchQuery = extractSearchQuery(referrer);
    if (searchQuery && !currentSession.searchQueries.includes(searchQuery)) {
      currentSession.searchQueries.push(searchQuery);
    }
  }
  
  saveBrowsingSessions(sessions);
}

/**
 * Analyze user behavior patterns
 */
export function analyzeUserBehaviorPatterns(): UserBehaviorPatterns {
  const history = loadEnhancedHistory();
  const sessions = loadBrowsingSessions();
  
  console.log('🔍 [Enhanced History] Analyzing user behavior patterns from', history.length, 'entries');
  
  // Most active hours
  const hourCounts = new Array(24).fill(0);
  history.forEach(entry => {
    if (entry.visit_patterns?.hour_of_day !== undefined) {
      hourCounts[entry.visit_patterns.hour_of_day]++;
    }
  });
  const mostActiveHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map(item => item.hour);
  
  // Most active days
  const dayCounts = new Array(7).fill(0);
  history.forEach(entry => {
    if (entry.visit_patterns?.day_of_week !== undefined) {
      dayCounts[entry.visit_patterns.day_of_week]++;
    }
  });
  const mostActiveDays = dayCounts
    .map((count, day) => ({ day, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map(item => item.day);
  
  // Average session duration
  const completedSessions = sessions.filter(s => s.endTime);
  const averageSessionDuration = completedSessions.length > 0
    ? completedSessions.reduce((sum, s) => sum + s.totalTime, 0) / completedSessions.length
    : 0;
  
  // Top domains
  const domainStats = new Map<string, { visits: number; timeSpent: number }>();
  history.forEach(entry => {
    if (entry.domain) {
      const existing = domainStats.get(entry.domain) || { visits: 0, timeSpent: 0 };
      existing.visits += entry.visit_count;
      existing.timeSpent += entry.time_spent || 0;
      domainStats.set(entry.domain, existing);
    }
  });
  const topDomains = Array.from(domainStats.entries())
    .map(([domain, stats]) => ({ domain, ...stats }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 10);
  
  // Search patterns
  const searchQueries = new Map<string, { frequency: number; lastUsed: number }>();
  history.forEach(entry => {
    if (entry.context?.search_query) {
      const query = entry.context.search_query;
      const existing = searchQueries.get(query) || { frequency: 0, lastUsed: 0 };
      existing.frequency++;
      existing.lastUsed = Math.max(existing.lastUsed, entry.visited_at);
      searchQueries.set(query, existing);
    }
  });
  const searchPatterns = Array.from(searchQueries.entries())
    .map(([query, stats]) => ({ query, ...stats }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 20);
  
  // Navigation patterns (from -> to)
  const navigationPairs = new Map<string, number>();
  history.forEach(entry => {
    if (entry.context?.previous_url && entry.domain) {
      const fromDomain = extractDomain(entry.context.previous_url);
      const toDomain = entry.domain;
      const key = `${fromDomain} -> ${toDomain}`;
      navigationPairs.set(key, (navigationPairs.get(key) || 0) + 1);
    }
  });
  const navigationPatterns = Array.from(navigationPairs.entries())
    .map(([pattern, frequency]) => {
      const [from, to] = pattern.split(' -> ');
      return { from, to, frequency };
    })
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 15);
  
  // Topic interests (placeholder - would use AI classification in full implementation)
  const topicInterests = topDomains.slice(0, 5).map(domain => ({
    topic: domain.domain.replace(/^www\./, '').split('.')[0],
    score: domain.visits * 10 + (domain.timeSpent / 1000),
    lastAccessed: Date.now()
  }));
  
  const patterns: UserBehaviorPatterns = {
    mostActiveHours,
    mostActiveDays,
    averageSessionDuration,
    topDomains,
    searchPatterns,
    navigationPatterns,
    topicInterests
  };
  
  saveUserPatterns(patterns);
  console.log('🔍 [Enhanced History] User behavior patterns analyzed and saved');
  
  return patterns;
}

/**
 * Get enhanced history with filtering options
 */
export async function getEnhancedHistory(options: {
  limit?: number;
  domain?: string;
  timeRange?: { start: number; end: number };
  minEngagement?: number;
  sessionId?: string;
} = {}): Promise<HistoryEntry[]> {
  const history = loadEnhancedHistory();
  
  let filtered = history;
  
  // Filter by domain
  if (options.domain) {
    filtered = filtered.filter(entry => entry.domain === options.domain);
  }
  
  // Filter by time range
  if (options.timeRange) {
    filtered = filtered.filter(entry => 
      entry.visited_at >= options.timeRange!.start && 
      entry.visited_at <= options.timeRange!.end
    );
  }
  
  // Filter by engagement score
  if (options.minEngagement) {
    filtered = filtered.filter(entry => 
      (entry.engagement_score || 0) >= options.minEngagement!
    );
  }
  
  // Filter by session
  if (options.sessionId) {
    filtered = filtered.filter(entry => entry.session_id === options.sessionId);
  }
  
  // Sort by visit time (most recent first)
  filtered.sort((a, b) => b.visited_at - a.visited_at);
  
  // Apply limit
  if (options.limit) {
    filtered = filtered.slice(0, options.limit);
  }
  
  return filtered;
}

/**
 * Get browsing sessions
 */
export function getBrowsingSessions(limit: number = 50): BrowsingSession[] {
  const sessions = loadBrowsingSessions();
  return sessions
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, limit);
}

/**
 * Get user behavior patterns
 */
export function getUserBehaviorPatterns(): UserBehaviorPatterns | null {
  return loadUserPatterns();
}

/**
 * Clear enhanced history data
 */
export function clearEnhancedHistory(): void {
  saveEnhancedHistory([]);
  saveBrowsingSessions([]);
  saveUserPatterns({
    mostActiveHours: [],
    mostActiveDays: [],
    averageSessionDuration: 0,
    topDomains: [],
    searchPatterns: [],
    navigationPatterns: [],
    topicInterests: []
  });
  
  console.log('🔍 [Enhanced History] All enhanced history data cleared');
}

/**
 * Get visit patterns for a specific domain
 */
export function getDomainVisitPatterns(domain: string): {
  totalVisits: number;
  averageTimeSpent: number;
  averageEngagement: number;
  mostActiveHours: number[];
  mostActiveDays: number[];
  commonPaths: string[];
} {
  const history = loadEnhancedHistory();
  const domainEntries = history.filter(entry => entry.domain === domain);
  
  if (domainEntries.length === 0) {
    return {
      totalVisits: 0,
      averageTimeSpent: 0,
      averageEngagement: 0,
      mostActiveHours: [],
      mostActiveDays: [],
      commonPaths: []
    };
  }
  
  const totalVisits = domainEntries.reduce((sum, entry) => sum + entry.visit_count, 0);
  const averageTimeSpent = domainEntries.reduce((sum, entry) => sum + (entry.time_spent || 0), 0) / domainEntries.length;
  const averageEngagement = domainEntries.reduce((sum, entry) => sum + (entry.engagement_score || 0), 0) / domainEntries.length;
  
  // Most active hours for this domain
  const hourCounts = new Array(24).fill(0);
  domainEntries.forEach(entry => {
    if (entry.visit_patterns?.hour_of_day !== undefined) {
      hourCounts[entry.visit_patterns.hour_of_day] += entry.visit_count;
    }
  });
  const mostActiveHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(item => item.hour);
  
  // Most active days for this domain
  const dayCounts = new Array(7).fill(0);
  domainEntries.forEach(entry => {
    if (entry.visit_patterns?.day_of_week !== undefined) {
      dayCounts[entry.visit_patterns.day_of_week] += entry.visit_count;
    }
  });
  const mostActiveDays = dayCounts
    .map((count, day) => ({ day, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(item => item.day);
  
  // Common paths
  const pathCounts = new Map<string, number>();
  domainEntries.forEach(entry => {
    if (entry.path) {
      pathCounts.set(entry.path, (pathCounts.get(entry.path) || 0) + entry.visit_count);
    }
  });
  const commonPaths = Array.from(pathCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path]) => path);
  
  return {
    totalVisits,
    averageTimeSpent,
    averageEngagement,
    mostActiveHours,
    mostActiveDays,
    commonPaths
  };
}

/**
 * Initialize enhanced history tracking
 */
export function initializeEnhancedHistory(): void {
  // Start initial session
  if (!currentSessionId) {
    startBrowsingSession();
  }
  
  // Set up page visibility change handler to end sessions
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, potentially end session after delay
        setTimeout(() => {
          if (document.hidden && Date.now() - lastActiveTime > 30000) { // 30 seconds inactive
            endBrowsingSession();
          }
        }, 30000);
      } else {
        // Page is visible, ensure session is active
        if (!currentSessionId) {
          startBrowsingSession();
        }
        lastActiveTime = Date.now();
      }
    });
  }
  
  // Set up beforeunload handler
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      endBrowsingSession();
    });
  }
  
  console.log('🔍 [Enhanced History] Enhanced history tracking initialized');
}