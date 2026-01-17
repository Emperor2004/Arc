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
    ollamaEndpoint?: string;
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
export interface RecommendationPersonalization {
  recencyWeight: number;      // 0.0 to 1.0, default 0.5
  frequencyWeight: number;    // 0.0 to 1.0, default 0.3
  feedbackWeight: number;     // 0.0 to 1.0, default 0.2
  minScore: number;           // 0.0 to 1.0, default 0.1
  maxRecommendations: number; // 1 to 20, default 5
  ollamaModel?: string;       // Ollama model name (e.g., 'mistral', 'neural-chat')
  ollamaEnabled?: boolean;    // Enable Ollama for enhanced recommendations
}

export interface PersonalizationManager {
  getSettings(): RecommendationPersonalization;
  updateSettings(updates: Partial<RecommendationPersonalization>): Promise<void>;
  applyPersonalization(baseScore: number, weights: RecommendationPersonalization): number;
  getOllamaModels(): Promise<string[]>;
}