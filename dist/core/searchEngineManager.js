"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableEngines = getAvailableEngines;
exports.getSearchEngine = getSearchEngine;
exports.buildSearchUrl = buildSearchUrl;
exports.isSearchQuery = isSearchQuery;
exports.normalizeInput = normalizeInput;
exports.getSearchSuggestions = getSearchSuggestions;
const AVAILABLE_ENGINES = {
    google: {
        name: 'Google',
        type: 'google',
        searchUrl: 'https://www.google.com/search?q={query}',
        suggestionsUrl: 'https://www.google.com/complete/search?client=chrome&q={query}',
    },
    duckduckgo: {
        name: 'DuckDuckGo',
        type: 'duckduckgo',
        searchUrl: 'https://duckduckgo.com/?q={query}',
        suggestionsUrl: 'https://duckduckgo.com/ac/?q={query}',
    },
    bing: {
        name: 'Bing',
        type: 'bing',
        searchUrl: 'https://www.bing.com/search?q={query}',
        suggestionsUrl: 'https://www.bing.com/AS/suggestions?q={query}',
    },
    custom: {
        name: 'Custom',
        type: 'custom',
        searchUrl: 'https://www.google.com/search?q={query}', // Default fallback
    },
};
/**
 * Get all available search engines
 */
function getAvailableEngines() {
    return Object.values(AVAILABLE_ENGINES).filter(engine => engine.type !== 'custom');
}
/**
 * Get a specific search engine by type
 */
function getSearchEngine(type) {
    return AVAILABLE_ENGINES[type] || AVAILABLE_ENGINES.google;
}
/**
 * Build a search URL from a query
 */
function buildSearchUrl(query, engineType = 'google') {
    const engine = getSearchEngine(engineType);
    const encodedQuery = encodeURIComponent(query);
    return engine.searchUrl.replace('{query}', encodedQuery);
}
/**
 * Detect if input is a search query or a URL
 */
function isSearchQuery(input) {
    if (!input || input.trim().length === 0) {
        return false;
    }
    const trimmed = input.trim();
    // Check if it looks like a URL
    // URLs typically have:
    // - Protocol (http://, https://, ftp://, etc.)
    // - Domain with TLD (.com, .org, etc.)
    // - No spaces (unless encoded)
    // Pattern for URLs
    const urlPattern = /^(https?:\/\/|ftp:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,})/i;
    if (urlPattern.test(trimmed)) {
        return false; // It's a URL
    }
    // If it has spaces, it's likely a search query
    if (trimmed.includes(' ')) {
        return true;
    }
    // Check for common search keywords
    const searchKeywords = ['what', 'how', 'why', 'where', 'when', 'who', 'is', 'are', 'can', 'will', 'should'];
    const firstWord = trimmed.split(/[\s:]/)[0].toLowerCase();
    if (searchKeywords.includes(firstWord)) {
        return true;
    }
    // If it doesn't match URL pattern and has no spaces, assume it's a URL
    return false;
}
/**
 * Normalize input: convert search queries to URLs, keep URLs as-is
 */
function normalizeInput(input, engineType = 'google') {
    if (!input || input.trim().length === 0) {
        return '';
    }
    const trimmed = input.trim();
    // If it's a search query, build search URL
    if (isSearchQuery(trimmed)) {
        return buildSearchUrl(trimmed, engineType);
    }
    // If it's a URL without protocol, add https://
    if (!trimmed.match(/^[a-z][a-z0-9+.-]*:\/\//i)) {
        // Validate that it's not just special characters
        if (trimmed.match(/^[a-z0-9.-]+$/i)) {
            return `https://${trimmed}`;
        }
        // For other cases, treat as search query
        return buildSearchUrl(trimmed, engineType);
    }
    // Return as-is if it already has a protocol
    return trimmed;
}
/**
 * Get suggestions for a search query (placeholder for future implementation)
 */
async function getSearchSuggestions(query, engineType = 'google') {
    // This is a placeholder for future implementation
    // In a real application, you would fetch suggestions from the search engine API
    return [];
}
