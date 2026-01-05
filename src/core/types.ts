export interface PageLoadedPayload {
    url: string;
    title: string;
}

export interface HistoryEntry {
    id: number;
    url: string;
    title: string | null;
    visited_at: number;
    visit_count: number;
}

export type RecommendationKind = 'favorite' | 'old_but_gold' | 'explore';

export interface Recommendation {
    id: number;              // internal id for DB/history link (can be 0 for synthetic)
    url: string;
    title: string | null;
    reason: string;          // short human explanation
    score: number;           // numeric ranking
    kind: RecommendationKind;
}

export type FeedbackValue = 'like' | 'dislike';

export interface RecommendationFeedback {
    id: number;              // recommendation-related or history id
    url: string;
    value: FeedbackValue;
    created_at: number;      // timestamp (ms)
}
