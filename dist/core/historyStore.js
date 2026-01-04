"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentHistory = exports.recordVisit = void 0;
// Mock in-memory store
let history = [];
let nextId = 1;
const recordVisit = async (url, title) => {
    const visitedAt = Date.now();
    const existingIndex = history.findIndex(h => h.url === url);
    if (existingIndex >= 0) {
        history[existingIndex] = {
            ...history[existingIndex],
            title: title || history[existingIndex].title,
            visited_at: visitedAt,
            visit_count: history[existingIndex].visit_count + 1
        };
    }
    else {
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
exports.recordVisit = recordVisit;
const getRecentHistory = async (limit) => {
    return [...history]
        .sort((a, b) => b.visited_at - a.visited_at)
        .slice(0, limit);
};
exports.getRecentHistory = getRecentHistory;
