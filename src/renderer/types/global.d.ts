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
  jarvisChat: (messages: Array<{from: string; text: string}>) => Promise<any>;
  getCurrentPageText: () => Promise<{ ok: boolean; text?: string; error?: string }>;
  getCurrentTab: () => Promise<{ url: string; title: string } | null>;
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

  // Workspace management methods
  listWorkspaces: () => Promise<{ ok: boolean; workspaces: any[]; error?: string }>;
  saveWorkspace: (tabs: TabSession[], activeTabId: string, options: { name: string; description?: string; tags?: string[] }) => Promise<{ ok: boolean; workspaceId?: string; error?: string }>;
  loadWorkspace: (workspaceId: string) => Promise<{ ok: boolean; sessionSnapshot: SessionState | null; error?: string }>;
  deleteWorkspace: (workspaceId: string) => Promise<{ ok: boolean; error?: string }>;
  updateWorkspace: (workspaceId: string, options: { name?: string; description?: string; tags?: string[] }) => Promise<{ ok: boolean; error?: string }>;
  updateWorkspaceSession: (workspaceId: string, tabs: TabSession[], activeTabId: string) => Promise<{ ok: boolean; error?: string }>;
  searchWorkspaces: (query: string) => Promise<{ ok: boolean; workspaces: any[]; error?: string }>;
  getWorkspaceStats: () => Promise<{ ok: boolean; stats: any; error?: string }>;

  // Diagnostics methods
  getDiagnostics: () => Promise<{ ok: boolean; diagnostics: any; error?: string }>;

  // Onboarding methods
  isFirstRun: () => Promise<{ ok: boolean; isFirstRun: boolean; error?: string }>;
  markOnboardingCompleted: () => Promise<{ ok: boolean; error?: string }>;
  skipOnboarding: () => Promise<{ ok: boolean; error?: string }>;
  createDemoWorkspace: () => Promise<{ ok: boolean; workspaceId: string | null; error?: string }>;

  // Enhanced summarization methods
  summarizePage: (options?: { type?: 'short' | 'bullets' | 'insights' | 'detailed'; includeKeywords?: boolean; includeTopics?: boolean }) => Promise<{ ok: boolean; result: any; error?: string }>;
  summarizeText: (text: string, metadata?: { title?: string; url?: string; language?: string }, options?: { type?: 'short' | 'bullets' | 'insights' | 'detailed'; includeKeywords?: boolean; includeTopics?: boolean }) => Promise<{ ok: boolean; result: any; error?: string }>;
  getSummaryTypes: () => Promise<{ ok: boolean; types: Array<{ type: string; name: string; description: string }>; error?: string }>;
  clearSummaryCache: () => Promise<{ ok: boolean; error?: string }>;
  getSummaryCacheStats: () => Promise<{ ok: boolean; stats: any; error?: string }>;

  // Reading list methods
  addToReadingList: (url: string, title: string, options?: { autoSummarize?: boolean; tags?: string[]; addedFrom?: 'manual' | 'jarvis' | 'command-palette' }) => Promise<{ ok: boolean; item?: any; error?: string }>;
  removeFromReadingList: (id: string) => Promise<{ ok: boolean; error?: string }>;
  updateReadingListItem: (id: string, updates: { isRead?: boolean; progress?: number; tags?: string[] }) => Promise<{ ok: boolean; item?: any; error?: string }>;
  getReadingList: (filter?: { isRead?: boolean; tags?: string[]; domain?: string; dateRange?: { start: number; end: number }; minReadingTime?: number; maxReadingTime?: number }) => Promise<{ ok: boolean; items: any[]; error?: string }>;
  getReadingListItem: (id: string) => Promise<{ ok: boolean; item: any | null; error?: string }>;
  searchReadingList: (query: string) => Promise<{ ok: boolean; items: any[]; error?: string }>;
  getReadingListStats: () => Promise<{ ok: boolean; stats: any; error?: string }>;
  clearReadingList: () => Promise<{ ok: boolean; error?: string }>;
  exportReadingList: () => Promise<{ ok: boolean; data?: any; error?: string }>;
  importReadingList: (data: any, mode: 'merge' | 'replace') => Promise<{ ok: boolean; imported: number; error?: string }>;

  // Translation methods
  detectLanguage: (text: string) => Promise<{ ok: boolean; result?: any; error?: string; code?: string }>;
  translateText: (text: string, targetLanguage: string, sourceLanguage?: string) => Promise<{ ok: boolean; result?: any; error?: string; code?: string }>;
  translatePageContent: (content: string, targetLanguage: string, sourceLanguage?: string, options?: { chunkSize?: number; preserveFormatting?: boolean }) => Promise<{ ok: boolean; result?: any; error?: string; code?: string }>;
  getSupportedLanguages: () => Promise<{ ok: boolean; allLanguages?: any[]; popularLanguages?: any[]; error?: string }>;
  clearTranslationCache: () => Promise<{ ok: boolean; cleared?: number; error?: string }>;
  getTranslationCacheStats: () => Promise<{ ok: boolean; stats?: any; error?: string }>;

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
