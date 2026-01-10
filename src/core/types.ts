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
    personalizedScores?: {   // Optional personalization breakdown
        frequency: number;
        recency: number;
        feedback: number;
        combined: number;
    };
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
    searchEngine?: 'google' | 'duckduckgo' | 'bing' | 'custom';
    tabOrder?: string[];
    keyboardShortcutsEnabled?: boolean;
    restorePreviousSession?: boolean;
    // Personalization settings
    recencyWeight?: number;
    frequencyWeight?: number;
    feedbackWeight?: number;
    minScore?: number;
    maxRecommendations?: number;
    ollamaModel?: string;
    ollamaEnabled?: boolean;
    // Accessibility settings
    reducedMotion?: boolean;
    highContrast?: boolean;
    fontSize?: 'small' | 'medium' | 'large' | 'extra-large';
    focusIndicators?: boolean;
    screenReaderOptimizations?: boolean;
}

export interface Bookmark {
    id: string;
    url: string;
    title: string;
    createdAt: number;
    updatedAt: number;
    tags?: string[];
    favicon?: string;
}

export interface Tab {
    id: string;
    title: string;
    url: string;
    isActive: boolean;
    incognito?: boolean;
}

export interface TabGroup {
    id: string;
    name: string;
    color: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'gray';
    tabIds: string[];
    isCollapsed: boolean;
    createdAt: number;
}
