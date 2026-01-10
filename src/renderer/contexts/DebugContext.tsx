import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DebugState {
  section: 'browser' | 'settings';
  layoutMode: 'normal' | 'browser_max' | 'jarvis_max';
  activeTabId: string | null;
  isIncognito: boolean;
  jarvisStatus: 'idle' | 'thinking' | 'error';
  lastAction: string;
  timestamp: number;
}

interface DebugContextType {
  debugState: DebugState;
  updateDebugState: (updates: Partial<DebugState>) => void;
  logAction: (action: string) => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export const useDebug = () => {
  const context = useContext(DebugContext);
  if (!context) {
    // Return safe defaults instead of throwing
    return {
      debugState: {
        section: 'browser' as const,
        layoutMode: 'normal' as const,
        activeTabId: null,
        isIncognito: false,
        jarvisStatus: 'idle' as const,
        lastAction: 'App initialized',
        timestamp: Date.now()
      },
      updateDebugState: () => {},
      logAction: () => {}
    };
  }
  return context;
};

interface DebugProviderProps {
  children: ReactNode;
}

export const DebugProvider: React.FC<DebugProviderProps> = ({ children }) => {
  const [debugState, setDebugState] = useState<DebugState>({
    section: 'browser',
    layoutMode: 'normal',
    activeTabId: null,
    isIncognito: false,
    jarvisStatus: 'idle',
    lastAction: 'App initialized',
    timestamp: Date.now()
  });

  const updateDebugState = (updates: Partial<DebugState>) => {
    setDebugState(prev => ({
      ...prev,
      ...updates,
      timestamp: Date.now()
    }));
  };

  const logAction = (action: string) => {
    setDebugState(prev => ({
      ...prev,
      lastAction: action,
      timestamp: Date.now()
    }));
  };

  return (
    <DebugContext.Provider value={{ debugState, updateDebugState, logAction }}>
      {children}
    </DebugContext.Provider>
  );
};