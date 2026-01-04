import { HistoryEntry } from './types';

// Mock in-memory store
let history: HistoryEntry[] = [];
let nextId = 1;

export const recordVisit = async (url: string, title: string | null): Promise<void> => {
  const visitedAt = Date.now();
  const existingIndex = history.findIndex(h => h.url === url);

  if (existingIndex >= 0) {
    history[existingIndex] = {
      ...history[existingIndex],
      title: title || history[existingIndex].title,
      visited_at: visitedAt,
      visit_count: history[existingIndex].visit_count + 1
    };
  } else {
    history.push({
      id: nextId++,
      url,
      title,
      visited_at: visitedAt,
      visit_count: 1
    });
  }
  // console.log('Mock History Updated:', history);
};

export const getRecentHistory = async (limit: number): Promise<HistoryEntry[]> => {
  return [...history]
    .sort((a, b) => b.visited_at - a.visited_at)
    .slice(0, limit);
};
