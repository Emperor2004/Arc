import { PageLoadedPayload, RecommendationFeedback, Recommendation, HistoryEntry, ArcSettings } from '../../core/types';
import { TabSession, SessionState } from '../../core/sessionManager';

// Cookie Management Types
export interface CookieInfo {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  expirationDate?: number;
  sameSite?: 'no_restriction' | 'lax' | 'strict';
}

export interface ClearCookiesResult {
  ok: boolean;
  cleared: number;
  error?: string;
}

export interface GetCookiesResult {
  ok: boolean;
  cookies: CookieInfo[];
  error?: string;
}

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

  // Bookmark methods
  addBookmark: (url: string, title: string) => Promise<{ ok: boolean }>;
  removeBookmark: (url: string) => Promise<{ ok: boolean }>;
  isBookmarked: (url: string) => Promise<{ ok: boolean; bookmarked: boolean }>;
  getAllBookmarks: () => Promise<{ ok: boolean; bookmarks: any[] }>;
  searchBookmarks: (query: string) => Promise<{ ok: boolean; bookmarks: any[] }>;

  // Data export/import methods
  exportData: () => Promise<{ ok: boolean; data?: any }>;
  importData: (data: unknown, mode: 'merge' | 'replace') => Promise<{ ok: boolean }>;

  // Session management methods
  loadSession: () => Promise<{ ok: boolean; session: SessionState | null }>;
  saveSession: (tabs: TabSession[], activeTabId: string) => Promise<{ ok: boolean }>;
  clearSession: () => Promise<{ ok: boolean }>;
  restoreSession: (tabs: TabSession[]) => Promise<{ ok: boolean }>;

  // Cookie management methods
  getCookies: (filter?: { url?: string; domain?: string; name?: string }) => Promise<GetCookiesResult>;
  clearCookies: () => Promise<ClearCookiesResult>;
  clearCookiesForUrl: (url: string) => Promise<ClearCookiesResult>;

  // Keyboard shortcut methods
  newTab: () => void;
  newIncognitoTab: () => void;
  closeTab: () => void;
  nextTab: () => void;
  previousTab: () => void;
  focusAddressBar: () => void;
  reloadPage: () => void;
  clearData: () => void;
}
