"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addFeedback = addFeedback;
exports.getAllFeedback = getAllFeedback;
exports.getFeedbackByUrl = getFeedbackByUrl;
exports.clearFeedback = clearFeedback;
exports.removeFeedback = removeFeedback;
exports.getFeedbackStats = getFeedbackStats;
// Browser-safe feedback storage using localStorage
const FEEDBACK_KEY = 'arc-browser-feedback';
/**
 * Load feedback from localStorage
 */
function loadFeedback() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const stored = localStorage.getItem(FEEDBACK_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        }
    }
    catch (error) {
        console.error('Error loading feedback from localStorage:', error);
    }
    return [];
}
/**
 * Save feedback to localStorage
 */
function saveFeedback(feedback) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedback));
        }
    }
    catch (error) {
        console.error('Error saving feedback to localStorage:', error);
    }
}
/**
 * Add feedback entry
 */
function addFeedback(url, value) {
    const feedback = loadFeedback();
    const newEntry = {
        id: feedback.length > 0 ? Math.max(...feedback.map(f => f.id)) + 1 : 1,
        url,
        value,
        created_at: Date.now(),
    };
    feedback.push(newEntry);
    saveFeedback(feedback);
    return newEntry;
}
/**
 * Get all feedback entries
 */
async function getAllFeedback() {
    return loadFeedback();
}
/**
 * Get feedback for a specific URL
 */
async function getFeedbackByUrl(url) {
    const feedback = loadFeedback();
    return feedback.filter(f => f.url === url);
}
/**
 * Clear all feedback
 */
function clearFeedback() {
    saveFeedback([]);
}
/**
 * Remove feedback entry by ID
 */
function removeFeedback(id) {
    const feedback = loadFeedback();
    const filtered = feedback.filter(f => f.id !== id);
    saveFeedback(filtered);
}
/**
 * Get feedback statistics for a URL
 */
async function getFeedbackStats(url) {
    const feedback = await getFeedbackByUrl(url);
    return {
        likes: feedback.filter(f => f.value === 'like').length,
        dislikes: feedback.filter(f => f.value === 'dislike').length,
    };
}
