export interface PageLoadedPayload {
    url: string;
    title: string;
    tabId?: string;
    incognito?: boolean;
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

export interface ArcSettings {
    theme: 'system' | 'light' | 'dark';
    jarvisEnabled: boolean;
    useHistoryForRecommendations: boolean;
    incognitoEnabled: boolean;
}

export interface Tab {
    id: string;
    title: string;
    url: string;
    isActive: boolean;
    incognito?: boolean;
}
