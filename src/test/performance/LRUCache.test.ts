import { describe, it, expect } from 'vitest';
import { LRUCache } from '../../core/performance/LRUCache';

describe('LRUCache', () => {
  it('should create cache with specified capacity', () => {
    const cache = new LRUCache<string, number>(3);
    expect(cache.size()).toBe(0);
  });

  it('should store and retrieve values', () => {
    const cache = new LRUCache<string, number>(3);
    
    cache.set('a', 1);
    cache.set('b', 2);
    
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);
    expect(cache.size()).toBe(2);
  });

  it('should evict least recently used items when capacity is exceeded', () => {
    const cache = new LRUCache<string, number>(2);
    
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3); // Should evict 'a'
    
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.size()).toBe(2);
  });

  it('should update LRU order on access', () => {
    const cache = new LRUCache<string, number>(2);
    
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // Make 'a' most recently used
    cache.set('c', 3); // Should evict 'b', not 'a'
    
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
  });

  it('should update existing keys without changing capacity', () => {
    const cache = new LRUCache<string, number>(2);
    
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 10); // Update existing key
    
    expect(cache.get('a')).toBe(10);
    expect(cache.get('b')).toBe(2);
    expect(cache.size()).toBe(2);
  });

  it('should support has, delete, and clear operations', () => {
    const cache = new LRUCache<string, number>(3);
    
    cache.set('a', 1);
    cache.set('b', 2);
    
    expect(cache.has('a')).toBe(true);
    expect(cache.has('c')).toBe(false);
    
    expect(cache.delete('a')).toBe(true);
    expect(cache.delete('c')).toBe(false);
    expect(cache.has('a')).toBe(false);
    expect(cache.size()).toBe(1);
    
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.has('b')).toBe(false);
  });

  it('should provide iterators for keys, values, and entries', () => {
    const cache = new LRUCache<string, number>(3);
    
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    
    const keys = Array.from(cache.keys());
    const values = Array.from(cache.values());
    const entries = Array.from(cache.entries());
    
    expect(keys).toEqual(['a', 'b', 'c']);
    expect(values).toEqual([1, 2, 3]);
    expect(entries).toEqual([['a', 1], ['b', 2], ['c', 3]]);
  });
});