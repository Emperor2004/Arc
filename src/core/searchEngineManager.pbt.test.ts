import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { isSearchQuery, buildSearchUrl, normalizeInput } from './searchEngineManager';

describe('SearchEngineManager Properties', () => {
  describe('Property 4: Search Query Detection Consistency', () => {
    it('should consistently classify inputs as search or URL', () => {
      // Feature: arc-browser-enhancements, Property 4: Search Query Detection Consistency
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.includes(' ')),
            fc.webUrl(),
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes(' ') && !s.includes('.') && /^[a-z0-9-]+$/i.test(s))
          ),
          (input) => {
            const result1 = isSearchQuery(input);
            const result2 = isSearchQuery(input);
            
            // Same input should always produce same result
            expect(result1).toBe(result2);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should classify inputs with spaces as search queries', () => {
      // Feature: arc-browser-enhancements, Property 4: Search Query Detection Consistency
      fc.assert(
        fc.property(
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 20, noNaN: true }).filter(s => /^[a-z0-9]+$/i.test(s)),
            fc.string({ minLength: 1, maxLength: 20, noNaN: true }).filter(s => /^[a-z0-9]+$/i.test(s))
          ),
          ([word1, word2]) => {
            const input = `${word1} ${word2}`;
            expect(isSearchQuery(input)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should classify URLs as non-search queries', () => {
      // Feature: arc-browser-enhancements, Property 4: Search Query Detection Consistency
      fc.assert(
        fc.property(
          fc.webUrl(),
          (url) => {
            expect(isSearchQuery(url)).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Search URL Building Consistency', () => {
    it('should always produce valid URLs from search queries', () => {
      // Feature: arc-browser-enhancements, Property 4: Search Query Detection Consistency
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.constantFrom('google', 'duckduckgo', 'bing'),
          (query, engine) => {
            const url = buildSearchUrl(query, engine as any);
            
            // URL should be valid
            expect(url).toBeDefined();
            expect(url.length).toBeGreaterThan(0);
            
            // URL should contain the engine domain
            if (engine === 'google') {
              expect(url).toContain('google.com');
            } else if (engine === 'duckduckgo') {
              expect(url).toContain('duckduckgo.com');
            } else if (engine === 'bing') {
              expect(url).toContain('bing.com');
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should encode special characters in search URLs', () => {
      // Feature: arc-browser-enhancements, Property 4: Search Query Detection Consistency
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (query) => {
            const url = buildSearchUrl(query, 'google');
            
            // URL should be properly encoded (no unencoded spaces)
            expect(url).not.toContain(' ');
            
            // URL should be a valid URL
            try {
              new URL(url);
            } catch {
              throw new Error(`Invalid URL: ${url}`);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property: Input Normalization Idempotence', () => {
    it('should produce consistent results when normalizing URLs', () => {
      // Feature: arc-browser-enhancements, Property 4: Search Query Detection Consistency
      fc.assert(
        fc.property(
          fc.webUrl(),
          (url) => {
            const normalized1 = normalizeInput(url);
            const normalized2 = normalizeInput(normalized1);
            
            // Normalizing twice should produce same result
            expect(normalized1).toBe(normalized2);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should always produce valid URLs from normalization', () => {
      // Feature: arc-browser-enhancements, Property 4: Search Query Detection Consistency
      fc.assert(
        fc.property(
          fc.oneof(
            fc.webUrl(),
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0 && !s.includes(' '))
          ),
          (input) => {
            const normalized = normalizeInput(input);
            
            // Result should be a valid URL or empty
            if (normalized.length > 0) {
              try {
                new URL(normalized);
              } catch {
                throw new Error(`Invalid URL: ${normalized}`);
              }
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property: Search Query vs URL Distinction', () => {
    it('should distinguish between search queries and URLs', () => {
      // Feature: arc-browser-enhancements, Property 4: Search Query Detection Consistency
      fc.assert(
        fc.property(
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-z0-9]+$/i.test(s)),
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-z0-9]+$/i.test(s))
          ),
          ([word1, word2]) => {
            const searchQuery = `${word1} ${word2}`;
            const url = `${word1}.${word2}`;
            
            // Search query should be detected as search
            expect(isSearchQuery(searchQuery)).toBe(true);
            
            // URL should not be detected as search
            expect(isSearchQuery(url)).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
