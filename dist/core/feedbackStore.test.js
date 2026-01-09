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
const vitest_1 = require("vitest");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const feedbackStore_1 = require("./feedbackStore");
// Mock fs module
vitest_1.vi.mock('fs');
vitest_1.vi.mock('path');
(0, vitest_1.describe)('FeedbackStore Module', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        // Mock path.join to return a consistent path
        vitest_1.vi.mocked(path.join).mockReturnValue('/mock/feedback.json');
        // Mock fs.existsSync to return true
        vitest_1.vi.mocked(fs.existsSync).mockReturnValue(true);
    });
    (0, vitest_1.describe)('addFeedback', () => {
        (0, vitest_1.it)('should add a like feedback entry', () => {
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            const feedback = (0, feedbackStore_1.addFeedback)('https://github.com', 'like');
            (0, vitest_1.expect)(feedback.url).toBe('https://github.com');
            (0, vitest_1.expect)(feedback.value).toBe('like');
            (0, vitest_1.expect)(feedback.id).toBe(1);
        });
        (0, vitest_1.it)('should add a dislike feedback entry', () => {
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            const feedback = (0, feedbackStore_1.addFeedback)('https://example.com', 'dislike');
            (0, vitest_1.expect)(feedback.url).toBe('https://example.com');
            (0, vitest_1.expect)(feedback.value).toBe('dislike');
        });
        (0, vitest_1.it)('should increment ID for multiple entries', () => {
            const existingFeedback = JSON.stringify([
                {
                    id: 1,
                    url: 'https://github.com',
                    value: 'like',
                    created_at: Date.now(),
                },
            ]);
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(existingFeedback);
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            const feedback = (0, feedbackStore_1.addFeedback)('https://example.com', 'dislike');
            (0, vitest_1.expect)(feedback.id).toBe(2);
        });
        (0, vitest_1.it)('should set created_at timestamp', () => {
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            const before = Date.now();
            const feedback = (0, feedbackStore_1.addFeedback)('https://github.com', 'like');
            const after = Date.now();
            (0, vitest_1.expect)(feedback.created_at).toBeGreaterThanOrEqual(before);
            (0, vitest_1.expect)(feedback.created_at).toBeLessThanOrEqual(after);
        });
    });
    (0, vitest_1.describe)('getAllFeedback', () => {
        (0, vitest_1.it)('should return all feedback entries', async () => {
            const feedbackData = JSON.stringify([
                {
                    id: 1,
                    url: 'https://github.com',
                    value: 'like',
                    created_at: Date.now(),
                },
                {
                    id: 2,
                    url: 'https://example.com',
                    value: 'dislike',
                    created_at: Date.now(),
                },
            ]);
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(feedbackData);
            const all = await (0, feedbackStore_1.getAllFeedback)();
            (0, vitest_1.expect)(all.length).toBe(2);
        });
        (0, vitest_1.it)('should return empty array when no feedback', async () => {
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
            const all = await (0, feedbackStore_1.getAllFeedback)();
            (0, vitest_1.expect)(all).toEqual([]);
        });
    });
    (0, vitest_1.describe)('getFeedbackByUrl', () => {
        (0, vitest_1.it)('should return feedback for specific URL', async () => {
            const feedbackData = JSON.stringify([
                {
                    id: 1,
                    url: 'https://github.com',
                    value: 'like',
                    created_at: Date.now(),
                },
                {
                    id: 2,
                    url: 'https://github.com',
                    value: 'like',
                    created_at: Date.now(),
                },
                {
                    id: 3,
                    url: 'https://example.com',
                    value: 'dislike',
                    created_at: Date.now(),
                },
            ]);
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(feedbackData);
            const feedback = await (0, feedbackStore_1.getFeedbackByUrl)('https://github.com');
            (0, vitest_1.expect)(feedback.length).toBe(2);
            (0, vitest_1.expect)(feedback.every(f => f.url === 'https://github.com')).toBe(true);
        });
        (0, vitest_1.it)('should return empty array for URL with no feedback', async () => {
            const feedbackData = JSON.stringify([
                {
                    id: 1,
                    url: 'https://github.com',
                    value: 'like',
                    created_at: Date.now(),
                },
            ]);
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(feedbackData);
            const feedback = await (0, feedbackStore_1.getFeedbackByUrl)('https://nonexistent.com');
            (0, vitest_1.expect)(feedback).toEqual([]);
        });
    });
    (0, vitest_1.describe)('clearFeedback', () => {
        (0, vitest_1.it)('should clear all feedback', () => {
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            (0, feedbackStore_1.clearFeedback)();
            (0, vitest_1.expect)(vitest_1.vi.mocked(fs.writeFileSync)).toHaveBeenCalled();
            const writeCall = vitest_1.vi.mocked(fs.writeFileSync).mock.calls[0];
            const writtenData = JSON.parse(writeCall[1]);
            (0, vitest_1.expect)(writtenData).toEqual([]);
        });
    });
    (0, vitest_1.describe)('removeFeedback', () => {
        (0, vitest_1.it)('should remove feedback entry by ID', () => {
            const feedbackData = JSON.stringify([
                {
                    id: 1,
                    url: 'https://github.com',
                    value: 'like',
                    created_at: Date.now(),
                },
                {
                    id: 2,
                    url: 'https://example.com',
                    value: 'dislike',
                    created_at: Date.now(),
                },
            ]);
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(feedbackData);
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            (0, feedbackStore_1.removeFeedback)(1);
            const writeCall = vitest_1.vi.mocked(fs.writeFileSync).mock.calls[0];
            const writtenData = JSON.parse(writeCall[1]);
            (0, vitest_1.expect)(writtenData.length).toBe(1);
            (0, vitest_1.expect)(writtenData[0].id).toBe(2);
        });
    });
    (0, vitest_1.describe)('getFeedbackStats', () => {
        (0, vitest_1.it)('should return feedback statistics for URL', async () => {
            const feedbackData = JSON.stringify([
                {
                    id: 1,
                    url: 'https://github.com',
                    value: 'like',
                    created_at: Date.now(),
                },
                {
                    id: 2,
                    url: 'https://github.com',
                    value: 'like',
                    created_at: Date.now(),
                },
                {
                    id: 3,
                    url: 'https://github.com',
                    value: 'dislike',
                    created_at: Date.now(),
                },
            ]);
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(feedbackData);
            const stats = await (0, feedbackStore_1.getFeedbackStats)('https://github.com');
            (0, vitest_1.expect)(stats.likes).toBe(2);
            (0, vitest_1.expect)(stats.dislikes).toBe(1);
        });
        (0, vitest_1.it)('should return zero stats for URL with no feedback', async () => {
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('[]');
            const stats = await (0, feedbackStore_1.getFeedbackStats)('https://nonexistent.com');
            (0, vitest_1.expect)(stats.likes).toBe(0);
            (0, vitest_1.expect)(stats.dislikes).toBe(0);
        });
    });
});
