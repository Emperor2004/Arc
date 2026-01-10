import { PageLoadedPayload, RecommendationFeedback, Recommendation, HistoryEntry, ArcSettings } from '../../core/types';
import { TabSession, SessionState } from '../../core/sessionManager';

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
  clearJarvisCache: () => Promise<{ ok: boolean }>;
  getRecentHistory: (limit?: number) => Promise<HistoryEntry[]>;
  sendJarvisFeedback: (feedback: RecommendationFeedback) => Promise<{ ok: boolean }>;
  
  // Settings methods
  getSettings: () => Promise<ArcSettings>;
  updateSettings: (partial: Partial<ArcSettings>) => Promise<ArcSettings>;
  clearHistory: () => Promise<{ ok: boolean }>;
  clearFeedback: () => Promise<{ ok: boolean }>;

  // Session management methods
  loadSession: () => Promise<{ ok: boolean; session: SessionState | null }>;
  saveSession: (tabs: TabSession[], activeTabId: string) => Promise<{ ok: boolean }>;
  clearSession: () => Promise<{ ok: boolean }>;
  restoreSession: (tabs: TabSession[]) => Promise<{ ok: boolean }>;
}