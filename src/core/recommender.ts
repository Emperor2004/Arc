import { HistoryEntry, Recommendation, RecommendationKind, RecommendationFeedback } from './types';
import { getRecentHistory } from './historyStore';
import { getAllFeedback } from './feedbackStore';

interface DomainStats {
    domain: string;
    visitCount: number;
    lastVisitedAt: number;
    keywords: Set<string>;
    originalUrls: string[];
}

interface FeedbackStats {
    likes: number;
    dislikes: number;
}

function extractDomain(url: string): string {
    try {
        const u = new URL(url);
        return u.hostname;
    } catch {
        return url;
    }
}

function extractKeywords(str: string): Set<string> {
    return new Set(
        str.toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter(w => w.length > 3)
    );
}

function buildFeedbackMap(feedback: RecommendationFeedback[]): Map<string, FeedbackStats> {
    const feedbackMap = new Map<string, FeedbackStats>();
    
    for (const entry of feedback) {
        const stats = feedbackMap.get(entry.url) || { likes: 0, dislikes: 0 };
        
        if (entry.value === 'like') {
            stats.likes++;
        } else if (entry.value === 'dislike') {
            stats.dislikes++;
        }
        
        feedbackMap.set(entry.url, stats);
    }
    
    return feedbackMap;
}

function applyFeedbackToScore(
    baseScore: number, 
    feedbackStats: FeedbackStats | undefined,
    kind: RecommendationKind
): { score: number; feedbackReason: string } {
    if (!feedbackStats) {
        return { score: baseScore, feedbackReason: '' };
    }
    
    const { likes, dislikes } = feedbackStats;
    let adjustedScore = baseScore;
    let feedbackReason = '';
    
    // Feedback weighting constants
    const LIKE_BONUS = 0.3;
    const DISLIKE_PENALTY = 0.4;
    const STRONG_DISLIKE_THRESHOLD = 2; // If dislikes >= this, heavily demote
    
    if (likes > 0 && dislikes === 0) {
        // Pure positive feedback
        adjustedScore += LIKE_BONUS * likes;
        feedbackReason = likes === 1 ? ' (You liked this previously)' : ` (You liked this ${likes} times)`;
    } else if (dislikes > 0 && likes === 0) {
        // Pure negative feedback
        adjustedScore -= DISLIKE_PENALTY * dislikes;
        
        // Heavy demotion for strongly disliked content
        if (dislikes >= STRONG_DISLIKE_THRESHOLD) {
            adjustedScore *= 0.1; // Severe penalty
            feedbackReason = ' (Muting similar sites)';
        } else {
            feedbackReason = dislikes === 1 ? ' (You disliked this previously)' : ` (You disliked this ${dislikes} times)`;
        }
    } else if (likes > 0 && dislikes > 0) {
        // Mixed feedback - net effect
        const netLikes = likes - dislikes;
        if (netLikes > 0) {
            adjustedScore += LIKE_BONUS * netLikes * 0.5; // Reduced bonus due to mixed signals
            feedbackReason = ' (Mixed feedback, mostly positive)';
        } else if (netLikes < 0) {
            adjustedScore -= DISLIKE_PENALTY * Math.abs(netLikes) * 0.5;
            feedbackReason = ' (Mixed feedback, mostly negative)';
        } else {
            feedbackReason = ' (Mixed feedback)';
        }
    }
    
    // Ensure score doesn't go negative
    adjustedScore = Math.max(0, adjustedScore);
    
    return { score: adjustedScore, feedbackReason };
}

export async function getJarvisRecommendations(limit = 5): Promise<Recommendation[]> {
    const history = await getRecentHistory(200);
    const feedback = await getAllFeedback();
    const feedbackMap = buildFeedbackMap(feedback);
    
    const domainMap = new Map<string, DomainStats>();

    // 1. Aggregate stats by domain
    for (const entry of history) {
        const domain = extractDomain(entry.url);
        const stats = domainMap.get(domain) || {
            domain,
            visitCount: 0,
            lastVisitedAt: 0,
            keywords: new Set<string>(),
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
    if (allStats.length === 0) return [];

    // Calculate max visit count for normalization
    const maxVisits = Math.max(...allStats.map(s => s.visitCount));
    const now = Date.now();
    const DAY_MS = 86400000;

    // Identify top favorites for keywords
    const favoriteStats = allStats
        .sort((a, b) => b.visitCount - a.visitCount)
        .slice(0, 5);

    const favoriteKeywords = new Set<string>();
    favoriteStats.forEach(s => s.keywords.forEach(k => favoriteKeywords.add(k)));

    const candidates: Recommendation[] = [];

    for (const stats of allStats) {
        let kind: RecommendationKind | null = null;
        let baseScore = 0;
        let baseReason = '';

        const daysSinceVisit = (now - stats.lastVisitedAt) / DAY_MS;
        const normalizedVisits = stats.visitCount / maxVisits;

        // Pick a representative URL for feedback lookup
        const url = stats.originalUrls[0];
        const urlFeedback = feedbackMap.get(url);

        // Check if this URL should be filtered out due to strong negative feedback
        const shouldFilterOut = urlFeedback && 
            urlFeedback.dislikes >= 2 && 
            urlFeedback.likes === 0;

        // Categorize
        if (normalizedVisits > 0.5) {
            // High visit count
            if (daysSinceVisit > 7) {
                kind = 'old_but_gold';
                baseScore = normalizedVisits * 0.8; // Decay slightly
                baseReason = "You used to come here a lot but haven't visited recently.";
            } else {
                kind = 'favorite';
                baseScore = normalizedVisits;
                baseReason = "You visit this domain often — one of your favorites.";
            }
        } else {
            // Low visit count - potential 'explore'
            // Calculate similarity score
            let overlap = 0;
            stats.keywords.forEach(k => {
                if (favoriteKeywords.has(k)) overlap++;
            });

            if (overlap > 1) { // Threshold for relevance
                // Skip explore recommendations for heavily disliked URLs unless very few candidates
                if (shouldFilterOut && allStats.length > 10) {
                    continue; // Skip this candidate
                }
                
                kind = 'explore';
                baseScore = 0.3 + (Math.min(overlap, 5) * 0.1);
                baseReason = "Similar to content you like, but you rarely visit it.";
            }
        }

        if (kind) {
            // Apply feedback adjustments to score and reason
            const { score, feedbackReason } = applyFeedbackToScore(baseScore, urlFeedback, kind);
            
            // Skip candidates with very low scores after feedback adjustment
            if (score < 0.05) {
                continue;
            }

            candidates.push({
                id: 0, // Generated on the fly
                url: url,
                title: stats.domain, // Use domain as safe title fallback
                reason: baseReason + feedbackReason,
                score,
                kind
            });
        }
    }

    // Sort by score, shuffle types a bit? 
    // For now, strict score sort + taking top N
    return candidates
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}