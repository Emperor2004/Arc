import { PageLoadedPayload, RecommendationFeedback, Recommendation, HistoryEntry, ArcSettings } from '../../core/types';

declare global {
  interface Window {
    arc: ArcAPI;
  }
}

export interface ArcAPI {
  navigate: (url: string) => void;
  onNavigation: (callback: (event: any, url: string) => void) => void;
  pageLoaded: (data: PageLoadedPayload) => void;
  getJarvisRecommendations: (limit?: number) => Promise<Recommendation[]>;
  getRecentHistory: (limit?: number) => Promise<HistoryEntry[]>;
  sendJarvisFeedback: (feedback: RecommendationFeedback) => Promise<{ ok: boolean }>;
  
  // Settings methods
  getSettings: () => Promise<ArcSettings>;
  updateSettings: (partial: Partial<ArcSettings>) => Promise<ArcSettings>;
  clearHistory: () => Promise<{ ok: boolean }>;
  clearFeedback: () => Promise<{ ok: boolean }>;
}