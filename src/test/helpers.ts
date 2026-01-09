import { HistoryEntry, Recommendation, RecommendationFeedback, Bookmark } from '../core/types';

/**
 * Create a mock history entry for testing
 */
export function createMockHistoryEntry(overrides?: Partial<HistoryEntry>): HistoryEntry {
  return {
    id: 1,
    url: 'https://example.com',
    title: 'Example Site',
    visited_at: Date.now(),
    visit_count: 1,
    ...overrides,
  };
}

/**
 * Create multiple mock history entries
 */
export function createMockHistoryEntries(count: number): HistoryEntry[] {
  return Array.from({ length: count }, (_, i) =>
    createMockHistoryEntry({
      id: i + 1,
      url: `https://example${i}.com`,
      title: `Example Site ${i}`,
      visited_at: Date.now() - i * 86400000, // Each day older
      visit_count: i + 1,
    })
  );
}

/**
 * Create a mock recommendation for testing
 */
export function createMockRecommendation(overrides?: Partial<Recommendation>): Recommendation {
  return {
    id: 1,
    url: 'https://example.com',
    title: 'Example Site',
    reason: 'You visit this domain often',
    score: 0.8,
    kind: 'favorite',
    ...overrides,
  };
}

/**
 * Create a mock feedback entry for testing
 */
export function createMockFeedback(overrides?: Partial<RecommendationFeedback>): RecommendationFeedback {
  return {
    id: 1,
    url: 'https://example.com',
    value: 'like',
    created_at: Date.now(),
    ...overrides,
  };
}

/**
 * Create a mock bookmark for testing
 */
export function createMockBookmark(overrides?: Partial<Bookmark>): Bookmark {
  return {
    id: '1',
    url: 'https://example.com',
    title: 'Example Bookmark',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

/**
 * Create multiple mock bookmarks
 */
export function createMockBookmarks(count: number): Bookmark[] {
  return Array.from({ length: count }, (_, i) =>
    createMockBookmark({
      id: String(i + 1),
      url: `https://example${i}.com`,
      title: `Bookmark ${i}`,
    })
  );
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 1000,
  interval = 50
): Promise<void> {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}
