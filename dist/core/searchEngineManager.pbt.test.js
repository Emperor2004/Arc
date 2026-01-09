"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fast_check_1 = __importDefault(require("fast-check"));
const searchEngineManager_1 = require("./searchEngineManager");
(0, vitest_1.describe)('SearchEngineManager Properties', () => {
    (0, vitest_1.describe)('Property 4: Search Query Detection Consistency', () => {
        (0, vitest_1.it)('should consistently classify inputs as search or URL', () => {
            // Feature: arc-browser-enhancements, Property 4: Search Query Detection Consistency
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.oneof(fast_check_1.default.string({ minLength: 1, maxLength: 100 }).filter(s => s.includes(' ')), fast_check_1.default.webUrl(), fast_check_1.default.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes(' ') && !s.includes('.') && /^[a-z0-9-]+$/i.test(s))), (input) => {
                const result1 = (0, searchEngineManager_1.isSearchQuery)(input);
                const result2 = (0, searchEngineManager_1.isSearchQuery)(input);
                // Same input should always produce same result
                (0, vitest_1.expect)(result1).toBe(result2);
            }), { numRuns: 100 });
        });
        (0, vitest_1.it)('should classify inputs with spaces as search queries', () => {
            // Feature: arc-browser-enhancements, Property 4: Search Query Detection Consistency
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.tuple(fast_check_1.default.string({ minLength: 1, maxLength: 20, noNaN: true }).filter(s => /^[a-z0-9]+$/i.test(s)), fast_check_1.default.string({ minLength: 1, maxLength: 20, noNaN: true }).filter(s => /^[a-z0-9]+$/i.test(s))), ([word1, word2]) => {
                const input = `${word1} ${word2}`;
                (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)(input)).toBe(true);
            }), { numRuns: 50 });
        });
        (0, vitest_1.it)('should classify URLs as non-search queries', () => {
            // Feature: arc-browser-enhancements, Property 4: Search Query Detection Consistency
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.webUrl(), (url) => {
                (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)(url)).toBe(false);
            }), { numRuns: 50 });
        });
    });
    (0, vitest_1.describe)('Property: Search URL Building Consistency', () => {
        (0, vitest_1.it)('should always produce valid URLs from search queries', () => {
            // Feature: arc-browser-enhancements, Property 4: Search Query Detection Consistency
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.string({ minLength: 1, maxLength: 100 }), fast_check_1.default.constantFrom('google', 'duckduckgo', 'bing'), (query, engine) => {
                const url = (0, searchEngineManager_1.buildSearchUrl)(query, engine);
                // URL should be valid
                (0, vitest_1.expect)(url).toBeDefined();
                (0, vitest_1.expect)(url.length).toBeGreaterThan(0);
                // URL should contain the engine domain
                if (engine === 'google') {
                    (0, vitest_1.expect)(url).toContain('google.com');
                }
                else if (engine === 'duckduckgo') {
                    (0, vitest_1.expect)(url).toContain('duckduckgo.com');
                }
                else if (engine === 'bing') {
                    (0, vitest_1.expect)(url).toContain('bing.com');
                }
            }), { numRuns: 100 });
        });
        (0, vitest_1.it)('should encode special characters in search URLs', () => {
            // Feature: arc-browser-enhancements, Property 4: Search Query Detection Consistency
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.string({ minLength: 1, maxLength: 50 }), (query) => {
                const url = (0, searchEngineManager_1.buildSearchUrl)(query, 'google');
                // URL should be properly encoded (no unencoded spaces)
                (0, vitest_1.expect)(url).not.toContain(' ');
                // URL should be a valid URL
                try {
                    new URL(url);
                }
                catch {
                    throw new Error(`Invalid URL: ${url}`);
                }
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property: Input Normalization Idempotence', () => {
        (0, vitest_1.it)('should produce consistent results when normalizing URLs', () => {
            // Feature: arc-browser-enhancements, Property 4: Search Query Detection Consistency
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.webUrl(), (url) => {
                const normalized1 = (0, searchEngineManager_1.normalizeInput)(url);
                const normalized2 = (0, searchEngineManager_1.normalizeInput)(normalized1);
                // Normalizing twice should produce same result
                (0, vitest_1.expect)(normalized1).toBe(normalized2);
            }), { numRuns: 50 });
        });
        (0, vitest_1.it)('should always produce valid URLs from normalization', () => {
            // Feature: arc-browser-enhancements, Property 4: Search Query Detection Consistency
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.oneof(fast_check_1.default.webUrl(), fast_check_1.default.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0 && !s.includes(' '))), (input) => {
                const normalized = (0, searchEngineManager_1.normalizeInput)(input);
                // Result should be a valid URL or empty
                if (normalized.length > 0) {
                    try {
                        new URL(normalized);
                    }
                    catch {
                        throw new Error(`Invalid URL: ${normalized}`);
                    }
                }
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property: Search Query vs URL Distinction', () => {
        (0, vitest_1.it)('should distinguish between search queries and URLs', () => {
            // Feature: arc-browser-enhancements, Property 4: Search Query Detection Consistency
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.tuple(fast_check_1.default.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-z0-9]+$/i.test(s)), fast_check_1.default.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-z0-9]+$/i.test(s))), ([word1, word2]) => {
                const searchQuery = `${word1} ${word2}`;
                const url = `${word1}.${word2}`;
                // Search query should be detected as search
                (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)(searchQuery)).toBe(true);
                // URL should not be detected as search
                (0, vitest_1.expect)((0, searchEngineManager_1.isSearchQuery)(url)).toBe(false);
            }), { numRuns: 50 });
        });
    });
});
