import { describe, it, expect } from 'vitest';
import {
  getAvailableEngines,
  getSearchEngine,
  buildSearchUrl,
  isSearchQuery,
  normalizeInput,
  getSearchSuggestions,
} from './searchEngineManager';

describe('SearchEngineManager Module', () => {
  describe('getAvailableEngines', () => {
    it('should return list of available search engines', () => {
      const engines = getAvailableEngines();
      expect(engines.length).toBeGreaterThan(0);
      expect(engines.some(e => e.type === 'google')).toBe(true);
      expect(engines.some(e => e.type === 'duckduckgo')).toBe(true);
      expect(engines.some(e => e.type === 'bing')).toBe(true);
    });

    it('should not include custom engine in available list', () => {
      const engines = getAvailableEngines();
      expect(engines.some(e => e.type === 'custom')).toBe(false);
    });

    it('should have required properties for each engine', () => {
      const engines = getAvailableEngines();
      engines.forEach(engine => {
        expect(engine.name).toBeDefined();
        expect(engine.type).toBeDefined();
        expect(engine.searchUrl).toBeDefined();
      });
    });
  });

  describe('getSearchEngine', () => {
    it('should return Google engine by default', () => {
      const engine = getSearchEngine('google');
      expect(engine.type).toBe('google');
      expect(engine.name).toBe('Google');
    });

    it('should return DuckDuckGo engine', () => {
      const engine = getSearchEngine('duckduckgo');
      expect(engine.type).toBe('duckduckgo');
      expect(engine.name).toBe('DuckDuckGo');
    });

    it('should return Bing engine', () => {
      const engine = getSearchEngine('bing');
      expect(engine.type).toBe('bing');
      expect(engine.name).toBe('Bing');
    });

    it('should return Google for invalid engine type', () => {
      const engine = getSearchEngine('invalid' as any);
      expect(engine.type).toBe('google');
    });
  });

  describe('buildSearchUrl', () => {
    it('should build Google search URL', () => {
      const url = buildSearchUrl('typescript', 'google');
      expect(url).toContain('google.com/search');
      expect(url).toContain('typescript');
    });

    it('should build DuckDuckGo search URL', () => {
      const url = buildSearchUrl('react', 'duckduckgo');
      expect(url).toContain('duckduckgo.com');
      expect(url).toContain('react');
    });

    it('should build Bing search URL', () => {
      const url = buildSearchUrl('nodejs', 'bing');
      expect(url).toContain('bing.com/search');
      expect(url).toContain('nodejs');
    });

    it('should encode special characters in query', () => {
      const url = buildSearchUrl('hello world', 'google');
      expect(url).toContain('hello%20world');
    });

    it('should handle empty query', () => {
      const url = buildSearchUrl('', 'google');
      expect(url).toContain('google.com/search');
    });

    it('should use Google by default', () => {
      const url = buildSearchUrl('test');
      expect(url).toContain('google.com/search');
    });
  });

  describe('isSearchQuery', () => {
    it('should identify search queries with spaces', () => {
      expect(isSearchQuery('how to learn typescript')).toBe(true);
      expect(isSearchQuery('best react practices')).toBe(true);
    });

    it('should identify search queries with question words', () => {
      expect(isSearchQuery('what is javascript')).toBe(true);
      expect(isSearchQuery('how do i use react')).toBe(true);
      expect(isSearchQuery('why is typescript useful')).toBe(true);
    });

    it('should identify URLs with protocol', () => {
      expect(isSearchQuery('https://github.com')).toBe(false);
      expect(isSearchQuery('http://example.com')).toBe(false);
      expect(isSearchQuery('ftp://files.example.com')).toBe(false);
    });

    it('should identify URLs with www', () => {
      expect(isSearchQuery('www.github.com')).toBe(false);
      expect(isSearchQuery('www.example.org')).toBe(false);
    });

    it('should identify URLs with domain and TLD', () => {
      expect(isSearchQuery('github.com')).toBe(false);
      expect(isSearchQuery('example.org')).toBe(false);
      expect(isSearchQuery('localhost.dev')).toBe(false);
    });

    it('should identify single words as URLs', () => {
      expect(isSearchQuery('localhost')).toBe(false);
      expect(isSearchQuery('example')).toBe(false);
    });

    it('should handle empty input', () => {
      expect(isSearchQuery('')).toBe(false);
      expect(isSearchQuery('   ')).toBe(false);
    });

    it('should be case-insensitive for question words', () => {
      expect(isSearchQuery('WHAT is typescript')).toBe(true);
      expect(isSearchQuery('How to learn react')).toBe(true);
    });
  });

  describe('normalizeInput', () => {
    it('should convert search queries to search URLs', () => {
      const url = normalizeInput('how to learn typescript', 'google');
      expect(url).toContain('google.com/search');
      expect(url).toContain('how%20to%20learn%20typescript');
    });

    it('should add https:// to URLs without protocol', () => {
      const url = normalizeInput('github.com');
      expect(url).toBe('https://github.com');
    });

    it('should keep URLs with protocol unchanged', () => {
      const url = normalizeInput('https://github.com');
      expect(url).toBe('https://github.com');
    });

    it('should keep www URLs unchanged', () => {
      const url = normalizeInput('www.github.com');
      expect(url).toBe('https://www.github.com');
    });

    it('should use specified search engine', () => {
      const googleUrl = normalizeInput('test query', 'google');
      const duckUrl = normalizeInput('test query', 'duckduckgo');
      
      expect(googleUrl).toContain('google.com');
      expect(duckUrl).toContain('duckduckgo.com');
    });

    it('should handle empty input', () => {
      expect(normalizeInput('')).toBe('');
      expect(normalizeInput('   ')).toBe('');
    });

    it('should use Google by default', () => {
      const url = normalizeInput('test query');
      expect(url).toContain('google.com/search');
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return empty array (placeholder)', async () => {
      const suggestions = await getSearchSuggestions('test', 'google');
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBe(0);
    });
  });
});
