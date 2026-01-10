import { useEffect, useCallback } from 'react';
import { Tab } from '../../core/types';
import { TabSession } from '../../core/sessionManager';

export interface UseSessionManagerOptions {
  tabs: Tab[];
  activeTab: Tab | undefined;
  onRestoreTabs: (tabs: Tab[]) => void;
}

export const useSessionManager = ({ tabs, activeTab, onRestoreTabs }: UseSessionManagerOptions) => {
  // Auto-save session periodically
  useEffect(() => {
    const saveSessionPeriodically = async () => {
      try {
        if (window.arc && window.arc.saveSession && activeTab) {
          // Convert tabs to TabSession format
          const tabSessions: TabSession[] = tabs.map(tab => ({
            id: tab.id,
            url: tab.url,
            title: tab.title,
            scrollPosition: { x: 0, y: 0 },
            favicon: undefined,
          }));

          await window.arc.saveSession(tabSessions, activeTab.id);
        }
      } catch (error) {
        console.error('Error saving session:', error);
      }
    };

    // Save session every 30 seconds
    const interval = setInterval(saveSessionPeriodically, 30000);

    // Also save on beforeunload
    const handleBeforeUnload = () => {
      saveSessionPeriodically();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [tabs, activeTab]);

  // Restore tabs from session
  const restoreTabs = useCallback(async (sessionTabs: TabSession[]) => {
    try {
      // Convert TabSession back to Tab format
      const restoredTabs: Tab[] = sessionTabs.map(tabSession => ({
        id: tabSession.id,
        url: tabSession.url,
        title: tabSession.title,
        isActive: false,
        incognito: false,
      }));

      if (restoredTabs.length > 0) {
        // Set first tab as active
        restoredTabs[0].isActive = true;
        onRestoreTabs(restoredTabs);
      }
    } catch (error) {
      console.error('Error restoring tabs:', error);
    }
  }, [onRestoreTabs]);

  return { restoreTabs };
};
