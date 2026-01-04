import { HistoryEntry, Recommendation, RecommendationKind } from './types';
import { getRecentHistory } from './historyStore';

interface DomainStats {
    domain: string;
    visitCount: number;
    lastVisitedAt: number;
    keywords: Set<string>;
    originalUrls: string[];
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

export async function getJarvisRecommendations(limit = 5): Promise<Recommendation[]> {
    const history = await getRecentHistory(200);
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
        let score = 0;
        let reason = '';

        const daysSinceVisit = (now - stats.lastVisitedAt) / DAY_MS;
        const normalizedVisits = stats.visitCount / maxVisits;

        // Categorize
        if (normalizedVisits > 0.5) {
            // High visit count
            if (daysSinceVisit > 7) {
                kind = 'old_but_gold';
                score = normalizedVisits * 0.8; // Decay slightly
                reason = "You used to come here a lot but haven’t visited recently.";
            } else {
                kind = 'favorite';
                score = normalizedVisits;
                reason = "You visit this domain often — one of your favorites.";
            }
        } else {
            // Low visit count - potential 'explore'
            // Calculate similarity score
            let overlap = 0;
            stats.keywords.forEach(k => {
                if (favoriteKeywords.has(k)) overlap++;
            });

            if (overlap > 1) { // Threshold for relevance
                kind = 'explore';
                score = 0.3 + (Math.min(overlap, 5) * 0.1);
                reason = "Similar to content you like, but you rarely visit it.";
            }
        }

        if (kind) {
            // Pick a representative URL (e.g., the root or the most visited one if we tracked per url)
            // For now, use the most recent original URL or just https://domain
            const url = stats.originalUrls[0];

            candidates.push({
                id: 0, // Generated on the fly
                url: url,
                title: stats.domain, // Use domain as safe title fallback
                reason,
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
