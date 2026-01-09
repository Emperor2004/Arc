"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const searchEngineManager_1 = require("./searchEngineManager");
(0, vitest_1.describe)('SearchEngineManager Module', () => {
    (0, vitest_1.describe)('getAvailableEngines', () => {
        (0, vitest_1.it)('should return list of available search engines', () => {
            const engines = (0, searchEngineManager_1.getAvailableEngines)();
            (0, vitest_1.expect)(engines.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(engines.some(e => e.type === 'google')).toBe(true);
            (0, vitest_1.expect)(engines.some(e => e.type === 'duckduckgo')).toBe(true);
            (0, vitest_1.expect)(engines.some(e => e.type === 'bing')).toBe(true);
        });
        (0, vitest_1.it)('should not include custom engine in available list', () => {
            const engines = (0, searchEngineManager_1.getAvailableEngines)();
            (0, vitest_1.expect)(engines.some(e => e.type === 'custom')).toBe(false);
        });
        (0, vitest_1.it)('should have required properties for each engine', () => {
            const engines = (0, searchEngineManager_1.getAvailableEngines)();
            engines.forEach(engine => {
                (0, vitest_1.expect)(engine.name).toBeDefined();
                (0, vitest_1.expect)(engine.type).toBeDefined();
                (0, vitest_1.expect)(engine.searchUrl).toBeDefined();
            });
        });
    });
    (0, vitest_1.describe)('getSearchEngine', () => {
        (0, vitest_1.it)('should return Google engine by default', () => {
            const engine = (0, searchEngineManager_1.getSearchEngine)('google');
            (0, vitest_1.expect)(engine.type).toBe('google');
            (0, vitest_1.expect)(engine.name).toBe('Google');
        });
        (0, vitest_1.it)('should return DuckDuckGo engine', () => {
            const engine = (0, searchEngineManager_1.getSearchEngine)('duckduckgo');
            (0, vitest_1.expect)(engine.type).toBe('duckduckgo');
            (0, vitest_1.expect)(engine.name).toBe('DuckDuckGo');
        });
        (0, vitest_1.it)('should return Bing engine', () => {
            const engine = (0, searchEngineManager_1.getSearchEngine)('bing');
            (0, vitest_1.expect)(engine.type).toBe('bing');
            (0, vitest_1.expect)(engine.name).toBe('Bing');
        });
        (0, vitest_1.it)('should return Google for invalid engine type', () => {
            const engine = (0, searchEngineManager_1.getSearchEngine)('invalid');
            (0, vitest_1.expect)(engine.type).toBe('google');
        });
    });
    (0, vitest_1.describe)('buildSearchUrl', () => {
        (0, vitest_1.it)('should build Google search URL', () => {
            const url = (0, searchEngineManager_1.buildSearchUrl)('typescript', 'google');
            (0, vitest_1.expect)(url).toContain('google.com/search');
            (0, vitest_1.expect)(url).toContain('typescript');
        });
        (0, vitest_1.it)('should build DuckDuckGo search URL', () => {
            const url = (0, searchEngineManager_1.buildSearchUrl)('react', 'duckduckgo');
            (0, vitest_1.expect)(url).toContain('duckduckgo.com');
            (0, vitest_1.expect)(url).toContain('react');
        });
        (0, vitest_1.it)('should build Bing search URL', () => {
            const url = (0, searchEngineManager_1.buildSearchUrl)('nodejs', 'bing');
            (0, vitest_1.expect)(url).toContain('bing.com/search');
            (0, vitest_1.expect)(url).toContain('nodejs');
        });
        (0, vitest_1.it)('should encode special characters in query', () => {
            const url = (0, searchEngineManager_1.buildSearchUrl)('hello world', 'google');
            (0, vitest_1.expect)(url).toContain('hello%20world');
        });
        (0, vitest_1.it)('should handle empty query', () => {
            const url = (0, searchEngineManager_1.buildSearchUrl)('', 'google');
            (0, vitest_1.expect)(url).toContain('google.com/search');
        });
        (0, vitest_1.it)('should use Google by default', () => {
            const url = (0, searchEngineManager_1.buildSearchUrl)('test');
            (0, vitest_1.expect)(url).toContain('google.com/search');
        });
    });
    (0, vitest_1.describe)('isSearchQuery', () => {
        (0, vitest_1.it)('should identify search queries with spaces', () => {
            (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)('how to learn typescript')).toBe(true);
            (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)('best react practices')).toBe(true);
        });
        (0, vitest_1.it)('should identify search queries with question words', () => {
            (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)('what is javascript')).toBe(true);
            (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)('how do i use react')).toBe(true);
            (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)('why is typescript useful')).toBe(true);
        });
        (0, vitest_1.it)('should identify URLs with protocol', () => {
            (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)('https://github.com')).toBe(false);
            (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)('http://example.com')).toBe(false);
            (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)('ftp://files.example.com')).toBe(false);
        });
        (0, vitest_1.it)('should identify URLs with www', () => {
            (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)('www.github.com')).toBe(false);
            (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)('www.example.org')).toBe(false);
        });
        (0, vitest_1.it)('should identify URLs with domain and TLD', () => {
            (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)('github.com')).toBe(false);
            (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)('example.org')).toBe(false);
            (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)('localhost.dev')).toBe(false);
        });
        (0, vitest_1.it)('should identify single words as URLs', () => {
            (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)('localhost')).toBe(false);
            (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)('example')).toBe(false);
        });
        (0, vitest_1.it)('should handle empty input', () => {
            (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)('')).toBe(false);
            (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)('   ')).toBe(false);
        });
        (0, vitest_1.it)('should be case-insensitive for question words', () => {
            (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)('WHAT is typescript')).toBe(true);
            (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)('How to learn react')).toBe(true);
        });
    });
    (0, vitest_1.describe)('normalizeInput', () => {
        (0, vitest_1.it)('should convert search queries to search URLs', () => {
            const url = (0, searchEngineManager_1.normalizeInput)('how to learn typescript', 'google');
            (0, vitest_1.expect)(url).toContain('google.com/search');
            (0, vitest_1.expect)(url).toContain('how%20to%20learn%20typescript');
        });
        (0, vitest_1.it)('should add https:// to URLs without protocol', () => {
            const url = (0, searchEngineManager_1.normalizeInput)('github.com');
            (0, vitest_1.expect)(url).toBe('https://github.com');
        });
        (0, vitest_1.it)('should keep URLs with protocol unchanged', () => {
            const url = (0, searchEngineManager_1.normalizeInput)('https://github.com');
            (0, vitest_1.expect)(url).toBe('https://github.com');
        });
        (0, vitest_1.it)('should keep www URLs unchanged', () => {
            const url = (0, searchEngineManager_1.normalizeInput)('www.github.com');
            (0, vitest_1.expect)(url).toBe('https://www.github.com');
        });
        (0, vitest_1.it)('should use specified search engine', () => {
            const googleUrl = (0, searchEngineManager_1.normalizeInput)('test query', 'google');
            const duckUrl = (0, searchEngineManager_1.normalizeInput)('test query', 'duckduckgo');
            (0, vitest_1.expect)(googleUrl).toContain('google.com');
            (0, vitest_1.expect)(duckUrl).toContain('duckduckgo.com');
        });
        (0, vitest_1.it)('should handle empty input', () => {
            (0, vitest_1.expect)((0, searchEngineManager_1.normalizeInput)('')).toBe('');
            (0, vitest_1.expect)((0, searchEngineManager_1.normalizeInput)('   ')).toBe('');
        });
        (0, vitest_1.it)('should use Google by default', () => {
            const url = (0, searchEngineManager_1.normalizeInput)('test query');
            (0, vitest_1.expect)(url).toContain('google.com/search');
        });
    });
    (0, vitest_1.describe)('getSearchSuggestions', () => {
        (0, vitest_1.it)('should return empty array (placeholder)', async () => {
            const suggestions = await (0, searchEngineManager_1.getSearchSuggestions)('test', 'google');
            (0, vitest_1.expect)(Array.isArray(suggestions)).toBe(true);
            (0, vitest_1.expect)(suggestions.length).toBe(0);
        });
    });
});
