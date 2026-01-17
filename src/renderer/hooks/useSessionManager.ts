import { useEffect, useCallback, useRef } from 'react';
import { Tab } from '../../core/types';
import { TabSession } from '../../core/sessionManager';

export interface UseSessionManagerOptions {
  tabs: Tab[];
  activeTab: Tab | undefined;
  onRestoreTabs: (tabs: Tab[]) => void;
}

export const useSessionManager = ({ tabs, activeTab, onRestoreTabs }: UseSessionManagerOptions) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedStateRef = useRef<string>('');

  // Debounced save function
  const debouncedSave = useCallback(async () => {
    try {
      if (!window.arc?.saveSession || !activeTab) return;

      // Filter out incognito tabs
      const normalTabs = tabs.filter(tab => !tab.incognito);
      
      if (normalTabs.length === 0) {
        // If only incognito tabs, clear session
        await window.arc.clearSession();
        lastSavedStateRef.current = '';
        return;
      }

      // Convert to TabSession format
      const tabSessions: TabSession[] = normalTabs.map(tab => ({
        id: tab.id,
        url: tab.url,
        title: tab.title,
        scrollPosition: { x: 0, y: 0 },
      }));

      // Only save if state has changed
      const currentState = JSON.stringify({ tabSessions, activeTabId: activeTab.id });
      if (currentState !== lastSavedStateRef.current) {
        await window.arc.saveSession(tabSessions, activeTab.id);
        lastSavedStateRef.current = currentState;
      }
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }, [tabs, activeTab]);

  // Trigger debounced save on tab changes
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave();
    }, 2000); // 2 second debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [tabs, activeTab, debouncedSave]);

  // Save on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      debouncedSave();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [debouncedSave]);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Check if session restore is enabled
        const settings = await window.arc.getSettings();
        if (settings?.restorePreviousSession === false) return;

        // Check if we should restore (via global flag set by App.tsx)
        const shouldRestore = (window as any).arcSessionRestore?.sessionChoice === 'restored';
        if (!shouldRestore) return;

        const result = await window.arc.loadSession();
        if (!result?.ok || !result.session) return;

        // Validate session structure
        const session = result.session;
        if (!session.tabs || !Array.isArray(session.tabs) || session.tabs.length === 0) {
          console.warn('Invalid session: no tabs found');
          return;
        }

        // Validate and filter tabs
        const validTabs = session.tabs.filter((ts: TabSession) => {
          return (
            ts &&
            typeof ts.id === 'string' &&
            ts.id.trim() !== '' &&
            typeof ts.url === 'string' &&
            ts.url.trim() !== '' &&
            typeof ts.title === 'string'
          );
        });

        if (validTabs.length === 0) {
          console.warn('Invalid session: no valid tabs found');
          // Clear corrupted session
          await window.arc.clearSession();
          return;
        }

        // Convert to Tab format
        const restoredTabs: Tab[] = validTabs.map((ts: TabSession) => ({
          id: ts.id,
          url: ts.url,
          title: ts.title || 'Untitled',
          isActive: false,
          incognito: false,
        }));

        // Set active tab
        const activeTabId = session.activeTabId;
        const activeIndex = restoredTabs.findIndex(t => t.id === activeTabId);
        if (activeIndex >= 0) {
          restoredTabs[activeIndex].isActive = true;
        } else if (restoredTabs.length > 0) {
          restoredTabs[0].isActive = true;
        }

        onRestoreTabs(restoredTabs);
      } catch (error) {
        console.error('Error restoring session:', error);
        // Clear potentially corrupted session
        try {
          await window.arc.clearSession();
        } catch (clearError) {
          console.error('Error clearing corrupted session:', clearError);
        }
      }
    };

    restoreSession();
  }, [onRestoreTabs]);

  return {};
};
