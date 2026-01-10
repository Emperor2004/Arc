"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJarvisRecommendations = getJarvisRecommendations;
exports.extractDomain = extractDomain;
exports.extractKeywords = extractKeywords;
exports.buildFeedbackMap = buildFeedbackMap;
exports.applyFeedbackToScore = applyFeedbackToScore;
exports.calculateTemporalWeight = calculateTemporalWeight;
exports.clearRecommendationCache = clearRecommendationCache;
const historyStore_1 = require("./historyStore");
const feedbackStore_1 = require("./feedbackStore");
const personalizationManager_1 = require("./personalizationManager");
let recommendationCache = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
function hashPersonalizationSettings(settings) {
    return JSON.stringify({
        recencyWeight: settings.recencyWeight,
        frequencyWeight: settings.frequencyWeight,
        feedbackWeight: settings.feedbackWeight,
        minScore: settings.minScore,
        maxRecommendations: settings.maxRecommendations
    });
}
function extractDomain(url) {
    try {
        const u = new URL(url);
        return u.hostname;
    }
    catch {
        return url;
    }
}
function extractKeywords(str) {
    return new Set(str.toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(w => w.length > 3));
}
function buildFeedbackMap(feedback) {
    const feedbackMap = new Map();
    for (const entry of feedback) {
        const stats = feedbackMap.get(entry.url) || { likes: 0, dislikes: 0 };
        if (entry.value === 'like') {
            stats.likes++;
        }
        else if (entry.value === 'dislike') {
            stats.dislikes++;
        }
        feedbackMap.set(entry.url, stats);
    }
    return feedbackMap;
}
/**
 * Calculate temporal weight based on days since last visit
 * Uses exponential decay with thresholds at 7, 30, and 90 days
 *
 * @param daysSinceVisit - Number of days since last visit
 * @returns Weight multiplier between 0 and 1
 */
function calculateTemporalWeight(daysSinceVisit) {
    if (daysSinceVisit < 0)
        return 1.0; // Future dates treated as current
    // Exponential decay with different rates for different time periods
    if (daysSinceVisit <= 7) {
        // Recent visits: minimal decay
        return 1.0 - (daysSinceVisit / 7) * 0.1; // 1.0 to 0.9
    }
    else if (daysSinceVisit <= 30) {
        // Within a month: moderate decay
        const daysInRange = daysSinceVisit - 7;
        return 0.9 - (daysInRange / 23) * 0.3; // 0.9 to 0.6
    }
    else if (daysSinceVisit <= 90) {
        // Within 3 months: steeper decay
        const daysInRange = daysSinceVisit - 30;
        return 0.6 - (daysInRange / 60) * 0.4; // 0.6 to 0.2
    }
    else {
        // Older than 3 months: minimal weight
        return Math.max(0.05, 0.2 * Math.exp(-daysSinceVisit / 180));
    }
}
function applyFeedbackToScore(baseScore, feedbackStats, kind) {
    if (!feedbackStats) {
        return { score: baseScore, feedbackReason: '' };
    }
    const { likes, dislikes } = feedbackStats;
    let adjustedScore = baseScore;
    let feedbackReason = '';
    // Feedback weighting constants
    const LIKE_BONUS = 0.15; // Reduced to prevent exceeding 1.0
    const DISLIKE_PENALTY = 0.2; // Reduced to prevent NaN
    const STRONG_DISLIKE_THRESHOLD = 2; // If dislikes >= this, heavily demote
    if (likes > 0 && dislikes === 0) {
        // Pure positive feedback
        adjustedScore += LIKE_BONUS * Math.min(likes, 3); // Cap at 3 likes
        feedbackReason = likes === 1 ? ' (You liked this previously)' : ` (You liked this ${likes} times)`;
    }
    else if (dislikes > 0 && likes === 0) {
        // Pure negative feedback
        adjustedScore -= DISLIKE_PENALTY * Math.min(dislikes, 3); // Cap at 3 dislikes
        // Heavy demotion for strongly disliked content
        if (dislikes >= STRONG_DISLIKE_THRESHOLD) {
            adjustedScore *= 0.1; // Severe penalty
            feedbackReason = ' (Muting similar sites)';
        }
        else {
            feedbackReason = dislikes === 1 ? ' (You disliked this previously)' : ` (You disliked this ${dislikes} times)`;
        }
    }
    else if (likes > 0 && dislikes > 0) {
        // Mixed feedback - net effect
        const netLikes = likes - dislikes;
        if (netLikes > 0) {
            adjustedScore += LIKE_BONUS * Math.min(netLikes, 2) * 0.5; // Reduced bonus due to mixed signals
            feedbackReason = ' (Mixed feedback, mostly positive)';
        }
        else if (netLikes < 0) {
            adjustedScore -= DISLIKE_PENALTY * Math.min(Math.abs(netLikes), 2) * 0.5;
            feedbackReason = ' (Mixed feedback, mostly negative)';
        }
        else {
            feedbackReason = ' (Mixed feedback)';
        }
    }
    // Ensure score is in valid range [0, 1]
    adjustedScore = Math.max(0, Math.min(1, adjustedScore));
    // Handle NaN
    if (Number.isNaN(adjustedScore)) {
        adjustedScore = baseScore;
    }
    return { score: adjustedScore, feedbackReason };
}
async function getJarvisRecommendations(limit = 5) {
    // Get personalization settings
    const personalizationSettings = (0, personalizationManager_1.getPersonalizationSettings)();
    const effectiveLimit = personalizationSettings.maxRecommendations || limit;
    // Check cache first
    const settingsHash = hashPersonalizationSettings(personalizationSettings);
    const now = Date.now();
    if (recommendationCache &&
        (now - recommendationCache.timestamp) < CACHE_DURATION &&
        recommendationCache.settingsHash === settingsHash) {
        return recommendationCache.recommendations.slice(0, effectiveLimit);
    }
    const history = await (0, historyStore_1.getRecentHistory)(200);
    const feedback = await (0, feedbackStore_1.getAllFeedback)();
    const feedbackMap = buildFeedbackMap(feedback);
    const domainMap = new Map();
    // 1. Aggregate stats by domain
    for (const entry of history) {
        const domain = extractDomain(entry.url);
        const stats = domainMap.get(domain) || {
            domain,
            visitCount: 0,
            lastVisitedAt: 0,
            keywords: new Set(),
            originalUrls: []
        };
        stats.visitCount += entry.visit_count; // Aggregate total visits
        stats.lastVisitedAt = Math.max(stats.lastVisitedAt, entry.visited_at);
        stats.originalUrls.push(entry.url);
        extractKeywords(domain).forEach(k => stats.keywords.add(k));
        if (entry.title) {
            extractKeywords(entry.title).forEach(k => stats.keywords.add(k));
        }
        domainMap.set(domain, stats);
    }
    const allStats = Array.from(domainMap.values());
    if (allStats.length === 0)
        return [];
    // Calculate max visit count for normalization
    const maxVisits = Math.max(...allStats.map(s => s.visitCount));
    const now_ms = Date.now();
    const DAY_MS = 86400000;
    // Identify top favorites for keywords
    const favoriteStats = allStats
        .sort((a, b) => b.visitCount - a.visitCount)
        .slice(0, 5);
    const favoriteKeywords = new Set();
    favoriteStats.forEach(s => s.keywords.forEach(k => favoriteKeywords.add(k)));
    const candidates = [];
    for (const stats of allStats) {
        let kind = null;
        let baseReason = '';
        const daysSinceVisit = (now_ms - stats.lastVisitedAt) / DAY_MS;
        const normalizedVisits = stats.visitCount / maxVisits;
        const temporalWeight = calculateTemporalWeight(daysSinceVisit);
        // Pick a representative URL for feedback lookup
        const url = stats.originalUrls[0];
        const urlFeedback = feedbackMap.get(url);
        // Check if this URL should be filtered out due to strong negative feedback
        const shouldFilterOut = urlFeedback &&
            urlFeedback.dislikes >= 2 &&
            urlFeedback.likes === 0;
        // Calculate individual component scores for personalization
        let frequencyScore = normalizedVisits;
        let recencyScore = temporalWeight;
        let feedbackScore = 0.5; // neutral baseline
        // Apply feedback to feedback score
        if (urlFeedback) {
            const { likes, dislikes } = urlFeedback;
            if (likes > 0 && dislikes === 0) {
                feedbackScore = Math.min(1.0, 0.7 + (likes * 0.1));
            }
            else if (dislikes > 0 && likes === 0) {
                feedbackScore = Math.max(0.0, 0.3 - (dislikes * 0.15));
            }
            else if (likes > 0 && dislikes > 0) {
                const netLikes = likes - dislikes;
                feedbackScore = 0.5 + (netLikes * 0.1);
                feedbackScore = Math.max(0.0, Math.min(1.0, feedbackScore));
            }
        }
        // Apply personalized scoring
        const personalizedScore = (0, personalizationManager_1.applyPersonalization)(frequencyScore, recencyScore, feedbackScore, personalizationSettings);
        // Check if score meets minimum threshold
        if (!(0, personalizationManager_1.meetsMinimumScore)(personalizedScore, personalizationSettings)) {
            continue;
        }
        // Categorize based on original logic but use personalized score
        if (normalizedVisits > 0.5) {
            // High visit count
            if (daysSinceVisit > 7) {
                kind = 'old_but_gold';
                baseReason = "You used to come here a lot but haven't visited recently.";
            }
            else {
                kind = 'favorite';
                baseReason = "You visit this domain often — one of your favorites.";
            }
        }
        else {
            // Low visit count - potential 'explore'
            // Calculate similarity score
            let overlap = 0;
            stats.keywords.forEach(k => {
                if (favoriteKeywords.has(k))
                    overlap++;
            });
            if (overlap > 1) { // Threshold for relevance
                // Skip explore recommendations for heavily disliked URLs unless very few candidates
                if (shouldFilterOut && allStats.length > 10) {
                    continue; // Skip this candidate
                }
                kind = 'explore';
                baseReason = "Similar to content you like, but you rarely visit it.";
            }
        }
        if (kind) {
            // Add feedback reason if applicable
            let feedbackReason = '';
            if (urlFeedback) {
                const { likes, dislikes } = urlFeedback;
                if (likes > 0 && dislikes === 0) {
                    feedbackReason = likes === 1 ? ' (You liked this previously)' : ` (You liked this ${likes} times)`;
                }
                else if (dislikes > 0 && likes === 0) {
                    if (dislikes >= 2) {
                        feedbackReason = ' (Muting similar sites)';
                    }
                    else {
                        feedbackReason = dislikes === 1 ? ' (You disliked this previously)' : ` (You disliked this ${dislikes} times)`;
                    }
                }
                else if (likes > 0 && dislikes > 0) {
                    const netLikes = likes - dislikes;
                    if (netLikes > 0) {
                        feedbackReason = ' (Mixed feedback, mostly positive)';
                    }
                    else if (netLikes < 0) {
                        feedbackReason = ' (Mixed feedback, mostly negative)';
                    }
                    else {
                        feedbackReason = ' (Mixed feedback)';
                    }
                }
            }
            // Add temporal indicator to reason
            let temporalIndicator = '';
            if (daysSinceVisit > 90) {
                temporalIndicator = ' (Old favorite)';
            }
            else if (daysSinceVisit > 30) {
                temporalIndicator = ' (Haven\'t visited in a while)';
            }
            else if (daysSinceVisit > 7) {
                temporalIndicator = ' (Not visited recently)';
            }
            candidates.push({
                id: 0, // Generated on the fly
                url: url,
                title: stats.domain, // Use domain as safe title fallback
                reason: baseReason + feedbackReason + temporalIndicator,
                score: personalizedScore,
                kind,
                // Add personalization metadata for UI display
                personalizedScores: {
                    frequency: frequencyScore,
                    recency: recencyScore,
                    feedback: feedbackScore,
                    combined: personalizedScore
                }
            });
        }
    }
    // Sort by personalized score and take top N
    const finalRecommendations = candidates
        .sort((a, b) => b.score - a.score)
        .slice(0, effectiveLimit);
    // Cache the results
    recommendationCache = {
        recommendations: finalRecommendations,
        timestamp: now,
        settingsHash
    };
    return finalRecommendations;
}
/**
 * Clear the recommendation cache
 * This should be called when personalization settings change
 */
function clearRecommendationCache() {
    recommendationCache = null;
}
