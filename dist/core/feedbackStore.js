"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.addFeedback = addFeedback;
exports.getAllFeedback = getAllFeedback;
exports.getFeedbackByUrl = getFeedbackByUrl;
exports.clearFeedback = clearFeedback;
exports.removeFeedback = removeFeedback;
exports.getFeedbackStats = getFeedbackStats;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const FEEDBACK_FILE = path.join(process.env.APPDATA || process.env.HOME || '.', 'arc-browser', 'data', 'feedback.json');
// Ensure directory exists
function ensureDir() {
    const dir = path.dirname(FEEDBACK_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
/**
 * Load feedback from file
 */
function loadFeedback() {
    try {
        ensureDir();
        if (fs.existsSync(FEEDBACK_FILE)) {
            const data = fs.readFileSync(FEEDBACK_FILE, 'utf-8');
            return JSON.parse(data);
        }
    }
    catch (error) {
        console.error('Error loading feedback:', error);
    }
    return [];
}
/**
 * Save feedback to file
 */
function saveFeedback(feedback) {
    try {
        ensureDir();
        fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedback, null, 2), 'utf-8');
    }
    catch (error) {
        console.error('Error saving feedback:', error);
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
