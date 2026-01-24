/**
 * Safe Preloading System
 * Implements connection preloading for predicted URLs with privacy controls
 */

import { NavigationPrediction, generateNavigationPredictions } from './predictiveNavigation';
import { ArcSettings } from './types';

export interface PreloadingStats {
  totalPreloads: number;
  successfulPreloads: number;
  failedPreloads: number;
  averagePreloadTime: number;
  bandwidthSaved: number;
  cacheHitRate: number;
}

export interface PreloadedConnection {
  url: string;
  domain: string;
  preloadedAt: number;
  status: 'pending' | 'success' | 'failed' | 'timeout';
  connectionTime?: number;
  dnsResolved?: boolean;
  tcpConnected?: boolean;
  tlsHandshake?: boolean;
}

// Preloading state management
const preloadedConnections = new Map<string, PreloadedConnection>();
const preloadingQueue = new Set<string>();
const preloadingStats: PreloadingStats = {
  totalPreloads: 0,
  successfulPreloads: 0,
  failedPreloads: 0,
  averagePreloadTime: 0,
  bandwidthSaved: 0,
  cacheHitRate: 0
};

// Configuration constants
const MAX_CONCURRENT_PRELOADS = 3;
const PRELOAD_TIMEOUT_MS = 5000;
const CONNECTION_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DNS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_PRELOAD_CONNECTIONS = 20;

// DNS resolution cache
const dnsCache = new Map<string, { ip: string; resolvedAt: number }>();

/**
 * Check if preloading is enabled and user has given consent
 */
function isPreloadingAllowed(settings: Partial<ArcSettings>): boolean {
  return !!(
    settings.preloadingEnabled && 
    settings.preloadingConsent &&
    !isMeteredConnection()
  );
}

/**
 * Check if connection is metered (mobile data, limited bandwidth)
 */
function isMeteredConnection(): boolean {
  // In a browser environment, we can use the Network Information API
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection) {
      // Check if connection is metered or slow
      return connection.saveData || 
             connection.effectiveType === 'slow-2g' ||
             connection.effectiveType === '2g';
    }
  }
  
  return false;
}

/**
 * Check if user is on WiFi (for WiFi-only preloading setting)
 */
function isOnWiFi(): boolean {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection && connection.type) {
      return connection.type === 'wifi';
    }
  }
  
  // Default to true if we can't determine connection type
  return true;
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
 * Clean expired connections from cache
 */
function cleanExpiredConnections(): void {
  const now = Date.now();
  
  // Clean preloaded connections
  for (const [url, connection] of preloadedConnections.entries()) {
    if (now - connection.preloadedAt > CONNECTION_CACHE_TTL_MS) {
      preloadedConnections.delete(url);
    }
  }
  
  // Clean DNS cache
  for (const [domain, entry] of dnsCache.entries()) {
    if (now - entry.resolvedAt > DNS_CACHE_TTL_MS) {
      dnsCache.delete(domain);
    }
  }
  
  // Limit cache size
  if (preloadedConnections.size > MAX_PRELOAD_CONNECTIONS) {
    const entries = Array.from(preloadedConnections.entries());
    entries.sort((a, b) => a[1].preloadedAt - b[1].preloadedAt);
    const toDelete = entries.slice(0, entries.length - MAX_PRELOAD_CONNECTIONS);
    toDelete.forEach(([url]) => preloadedConnections.delete(url));
  }
}

/**
 * Resolve DNS for domain
 */
async function resolveDNS(domain: string): Promise<boolean> {
  // Check cache first
  const cached = dnsCache.get(domain);
  if (cached && Date.now() - cached.resolvedAt < DNS_CACHE_TTL_MS) {
    return true;
  }
  
  try {
    // In a real implementation, this would use DNS-over-HTTPS or similar
    // For now, we'll simulate DNS resolution with a fetch to the domain
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const response = await fetch(`https://${domain}/favicon.ico`, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors'
    });
    
    clearTimeout(timeoutId);
    
    // Cache successful resolution
    dnsCache.set(domain, {
      ip: 'resolved', // In real implementation, would store actual IP
      resolvedAt: Date.now()
    });
    
    return true;
  } catch (error) {
    console.log(`🔗 [Preloading] DNS resolution failed for ${domain}:`, error);
    return false;
  }
}

/**
 * Preload connection to URL
 */
async function preloadConnection(url: string): Promise<PreloadedConnection> {
  const domain = extractDomain(url);
  const startTime = Date.now();
  
  const connection: PreloadedConnection = {
    url,
    domain,
    preloadedAt: startTime,
    status: 'pending'
  };
  
  preloadedConnections.set(url, connection);
  preloadingStats.totalPreloads++;
  
  try {
    console.log(`🔗 [Preloading] Starting preload for ${url}`);
    
    // Step 1: DNS Resolution
    const dnsResolved = await resolveDNS(domain);
    connection.dnsResolved = dnsResolved;
    
    if (!dnsResolved) {
      throw new Error('DNS resolution failed');
    }
    
    // Step 2: TCP Connection + TLS Handshake
    // We'll use a HEAD request to establish the connection without downloading content
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PRELOAD_TIMEOUT_MS);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors',
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    
    connection.tcpConnected = true;
    connection.tlsHandshake = url.startsWith('https://');
    connection.connectionTime = Date.now() - startTime;
    connection.status = 'success';
    
    preloadingStats.successfulPreloads++;
    preloadingStats.averagePreloadTime = 
      (preloadingStats.averagePreloadTime * (preloadingStats.successfulPreloads - 1) + connection.connectionTime) / 
      preloadingStats.successfulPreloads;
    
    console.log(`🔗 [Preloading] Successfully preloaded ${url} in ${connection.connectionTime}ms`);
    
  } catch (error) {
    connection.status = error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'failed';
    connection.connectionTime = Date.now() - startTime;
    
    preloadingStats.failedPreloads++;
    
    console.log(`🔗 [Preloading] Failed to preload ${url}:`, error);
  } finally {
    preloadingQueue.delete(url);
  }
  
  return connection;
}

/**
 * Preload connections for predicted URLs
 */
export async function preloadPredictedUrls(
  predictions: NavigationPrediction[],
  settings: Partial<ArcSettings>
): Promise<PreloadedConnection[]> {
  if (!isPreloadingAllowed(settings)) {
    console.log('🔗 [Preloading] Preloading disabled or not allowed');
    return [];
  }
  
  // Check WiFi-only setting
  if (settings.preloadingOnlyOnWifi && !isOnWiFi()) {
    console.log('🔗 [Preloading] WiFi-only mode enabled, but not on WiFi');
    return [];
  }
  
  // Clean expired connections
  cleanExpiredConnections();
  
  // Filter predictions by confidence threshold
  const minConfidence = settings.preloadingMinConfidence || 0.3;
  const filteredPredictions = predictions.filter(p => p.confidence >= minConfidence);
  
  // Limit concurrent preloads
  const maxConnections = Math.min(
    settings.preloadingMaxConnections || MAX_CONCURRENT_PRELOADS,
    MAX_CONCURRENT_PRELOADS
  );
  
  const urlsToPreload = filteredPredictions
    .slice(0, maxConnections)
    .map(p => p.url)
    .filter(url => {
      // Skip if already preloaded recently
      const existing = preloadedConnections.get(url);
      if (existing && Date.now() - existing.preloadedAt < CONNECTION_CACHE_TTL_MS) {
        return false;
      }
      
      // Skip if already in queue
      if (preloadingQueue.has(url)) {
        return false;
      }
      
      return true;
    });
  
  if (urlsToPreload.length === 0) {
    console.log('🔗 [Preloading] No URLs to preload');
    return [];
  }
  
  console.log(`🔗 [Preloading] Preloading ${urlsToPreload.length} URLs:`, urlsToPreload);
  
  // Add to queue
  urlsToPreload.forEach(url => preloadingQueue.add(url));
  
  // Start preloading (with concurrency limit)
  const preloadPromises = urlsToPreload.map(url => preloadConnection(url));
  const results = await Promise.allSettled(preloadPromises);
  
  return results
    .filter((result): result is PromiseFulfilledResult<PreloadedConnection> => 
      result.status === 'fulfilled'
    )
    .map(result => result.value);
}

/**
 * Check if URL has been preloaded
 */
export function isUrlPreloaded(url: string): boolean {
  const connection = preloadedConnections.get(url);
  if (!connection) return false;
  
  // Check if preload is still valid
  const isValid = 
    connection.status === 'success' &&
    Date.now() - connection.preloadedAt < CONNECTION_CACHE_TTL_MS;
  
  if (isValid) {
    // Update cache hit rate
    preloadingStats.cacheHitRate = 
      (preloadingStats.cacheHitRate * preloadingStats.totalPreloads + 1) / 
      (preloadingStats.totalPreloads + 1);
  }
  
  return isValid;
}

/**
 * Get preloading statistics
 */
export function getPreloadingStats(): PreloadingStats {
  return { ...preloadingStats };
}

/**
 * Clear preloading cache
 */
export function clearPreloadingCache(): { cleared: number } {
  const count = preloadedConnections.size;
  preloadedConnections.clear();
  preloadingQueue.clear();
  dnsCache.clear();
  
  console.log('🔗 [Preloading] Cache cleared:', count, 'connections');
  return { cleared: count };
}

/**
 * Get current preloaded connections
 */
export function getPreloadedConnections(): PreloadedConnection[] {
  return Array.from(preloadedConnections.values());
}

/**
 * Auto-preload based on current context
 */
export async function autoPreloadForContext(
  currentUrl?: string,
  recentUrls: string[] = [],
  settings: Partial<ArcSettings> = {}
): Promise<PreloadedConnection[]> {
  if (!isPreloadingAllowed(settings)) {
    return [];
  }
  
  try {
    // Generate predictions for current context
    const predictions = await generateNavigationPredictions({
      currentUrl,
      currentTime: Date.now(),
      recentUrls,
      userIntent: 'browsing'
    }, {
      maxPredictions: 6,
      minConfidence: settings.preloadingMinConfidence || 0.3
    });
    
    if (predictions.length === 0) {
      return [];
    }
    
    // Preload top predictions
    return preloadPredictedUrls(predictions, settings);
  } catch (error) {
    console.error('🔗 [Preloading] Auto-preload failed:', error);
    return [];
  }
}

/**
 * Initialize preloading system
 */
export function initializePreloadingSystem(settings: Partial<ArcSettings>): void {
  if (!isPreloadingAllowed(settings)) {
    console.log('🔗 [Preloading] Preloading system disabled');
    return;
  }
  
  console.log('🔗 [Preloading] Initializing preloading system');
  
  // Set up periodic cleanup
  setInterval(() => {
    cleanExpiredConnections();
  }, 60000); // Clean every minute
  
  // Set up connection type monitoring
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', () => {
        console.log('🔗 [Preloading] Connection type changed:', connection.effectiveType);
        
        // Clear cache if connection becomes metered
        if (isMeteredConnection()) {
          clearPreloadingCache();
        }
      });
    }
  }
  
  console.log('🔗 [Preloading] Preloading system initialized');
}

/**
 * Request user consent for preloading
 */
export function requestPreloadingConsent(): Promise<boolean> {
  return new Promise((resolve) => {
    // In a real implementation, this would show a proper consent dialog
    const consent = confirm(
      'Arc can preload pages you\'re likely to visit to make browsing faster. ' +
      'This uses a small amount of bandwidth to establish connections. ' +
      'Would you like to enable this feature?'
    );
    
    resolve(consent);
  });
}

/**
 * Update preloading settings
 */
export function updatePreloadingSettings(updates: Partial<ArcSettings>): void {
  console.log('🔗 [Preloading] Settings updated:', updates);
  
  // If preloading was disabled, clear cache
  if (updates.preloadingEnabled === false) {
    clearPreloadingCache();
  }
}

/**
 * Get preloading recommendations for settings
 */
export function getPreloadingRecommendations(): {
  recommendation: string;
  reason: string;
  settings: Partial<ArcSettings>;
}[] {
  const recommendations = [];
  
  // Check connection type
  if (isMeteredConnection()) {
    recommendations.push({
      recommendation: 'Disable preloading on metered connections',
      reason: 'You appear to be on a limited data connection',
      settings: { preloadingEnabled: false }
    });
  }
  
  // Check if on mobile
  if (typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent)) {
    recommendations.push({
      recommendation: 'Enable WiFi-only preloading',
      reason: 'Mobile devices benefit from WiFi-only preloading to save data',
      settings: { preloadingOnlyOnWifi: true }
    });
  }
  
  // Check preloading effectiveness
  const stats = getPreloadingStats();
  if (stats.totalPreloads > 10 && stats.cacheHitRate < 0.2) {
    recommendations.push({
      recommendation: 'Increase minimum confidence threshold',
      reason: 'Low cache hit rate suggests predictions are not accurate enough',
      settings: { preloadingMinConfidence: 0.5 }
    });
  }
  
  return recommendations;
}