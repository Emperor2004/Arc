/**
 * Onboarding Manager - First-run experience and demo workspace
 * Manages user onboarding flow and demo workspace creation
 */

import { getDatabaseManager } from './database';
import { saveWorkspaceFromCurrentSession, Workspace } from './workspaceManager';
import { TabSession, createSessionState } from './sessionManager';

export interface OnboardingState {
  hasSeenOnboarding: boolean;
  completedSteps: string[];
  skippedOnboarding: boolean;
  firstRunDate: number;
  onboardingVersion: string;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  content: string;
  actionText?: string;
  action?: () => void;
}

const CURRENT_ONBOARDING_VERSION = '1.0.0';
const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'command-palette',
    title: 'Command Palette',
    description: 'Access everything with Ctrl+K',
    icon: '⌨️',
    content: 'Press Ctrl+K (or Cmd+K on Mac) to open the command palette. Search and execute any action instantly - create tabs, switch workspaces, analyze pages, and more.',
    actionText: 'Try it now',
    action: () => {
      // Trigger command palette
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true
      });
      window.dispatchEvent(event);
    }
  },
  {
    id: 'workspaces',
    title: 'Workspaces',
    description: 'Organize your browsing sessions',
    icon: '📁',
    content: 'Save your current tabs as a workspace to quickly switch between different projects or contexts. Perfect for separating work, research, and personal browsing.',
    actionText: 'Create workspace',
    action: () => {
      const event = new CustomEvent('arc:workspace-save');
      window.dispatchEvent(event);
    }
  },
  {
    id: 'jarvis-analysis',
    title: 'Jarvis Page Analysis',
    description: 'AI-powered content analysis',
    icon: '🤖',
    content: 'Jarvis can analyze, summarize, or explain any webpage content. Use the analysis buttons in the Jarvis panel or access them via the command palette.',
    actionText: 'Open Jarvis',
    action: () => {
      const jarvisInput = document.querySelector('#jarvis-input') as HTMLTextAreaElement;
      if (jarvisInput) {
        jarvisInput.focus();
        jarvisInput.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }
];

/**
 * Check if this is the first run
 */
export async function isFirstRun(): Promise<boolean> {
  try {
    const state = await getOnboardingState();
    return !state.hasSeenOnboarding;
  } catch (error) {
    console.error('Error checking first run:', error);
    return true; // Assume first run on error
  }
}

/**
 * Get current onboarding state
 */
export async function getOnboardingState(): Promise<OnboardingState> {
  try {
    const db = await getDatabaseManager();
    const rows = await db.query<any>(
      'SELECT value FROM settings WHERE key = ?',
      ['onboarding_state']
    );
    
    if (rows.length === 0) {
      // Return default state for first run
      return {
        hasSeenOnboarding: false,
        completedSteps: [],
        skippedOnboarding: false,
        firstRunDate: Date.now(),
        onboardingVersion: CURRENT_ONBOARDING_VERSION,
      };
    }

    return JSON.parse(rows[0].value);
  } catch (error) {
    console.error('Error getting onboarding state:', error);
    // Return safe default
    return {
      hasSeenOnboarding: false,
      completedSteps: [],
      skippedOnboarding: false,
      firstRunDate: Date.now(),
      onboardingVersion: CURRENT_ONBOARDING_VERSION,
    };
  }
}

/**
 * Save onboarding state
 */
export async function saveOnboardingState(state: OnboardingState): Promise<void> {
  try {
    const db = await getDatabaseManager();
    await db.execute(
      `INSERT OR REPLACE INTO settings (key, value, updated_at)
       VALUES (?, ?, ?)`,
      ['onboarding_state', JSON.stringify(state), Date.now()]
    );
  } catch (error) {
    console.error('Error saving onboarding state:', error);
    throw error;
  }
}

/**
 * Mark onboarding as completed
 */
export async function markOnboardingCompleted(): Promise<void> {
  try {
    const state = await getOnboardingState();
    state.hasSeenOnboarding = true;
    state.completedSteps = ONBOARDING_STEPS.map(step => step.id);
    await saveOnboardingState(state);
    console.log('✅ Onboarding marked as completed');
  } catch (error) {
    console.error('Error marking onboarding completed:', error);
    throw error;
  }
}

/**
 * Skip onboarding
 */
export async function skipOnboarding(): Promise<void> {
  try {
    const state = await getOnboardingState();
    state.hasSeenOnboarding = true;
    state.skippedOnboarding = true;
    await saveOnboardingState(state);
    console.log('✅ Onboarding skipped');
  } catch (error) {
    console.error('Error skipping onboarding:', error);
    throw error;
  }
}

/**
 * Mark a specific onboarding step as completed
 */
export async function markStepCompleted(stepId: string): Promise<void> {
  try {
    const state = await getOnboardingState();
    if (!state.completedSteps.includes(stepId)) {
      state.completedSteps.push(stepId);
      await saveOnboardingState(state);
      console.log(`✅ Onboarding step completed: ${stepId}`);
    }
  } catch (error) {
    console.error('Error marking step completed:', error);
    throw error;
  }
}

/**
 * Get onboarding steps configuration
 */
export function getOnboardingSteps(): OnboardingStep[] {
  return ONBOARDING_STEPS;
}

/**
 * Create demo workspace with preconfigured tabs
 */
export async function createDemoWorkspace(): Promise<string | null> {
  try {
    // Define demo tabs
    const demoTabs: TabSession[] = [
      {
        id: 'demo-tab-1',
        url: 'https://github.com/features',
        title: 'GitHub Features - Explore development tools',
        scrollPosition: { x: 0, y: 0 },
        favicon: 'https://github.com/favicon.ico'
      },
      {
        id: 'demo-tab-2',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
        title: 'JavaScript | MDN - Learn web development',
        scrollPosition: { x: 0, y: 0 },
        favicon: 'https://developer.mozilla.org/favicon-48x48.cbbd161b5b0b.png'
      },
      {
        id: 'demo-tab-3',
        url: 'https://www.typescriptlang.org/docs/',
        title: 'TypeScript Documentation - Typed JavaScript',
        scrollPosition: { x: 0, y: 0 },
        favicon: 'https://www.typescriptlang.org/favicon-32x32.png'
      },
      {
        id: 'demo-tab-4',
        url: 'https://react.dev/learn',
        title: 'Learn React - Interactive tutorial',
        scrollPosition: { x: 0, y: 0 },
        favicon: 'https://react.dev/favicon.ico'
      }
    ];

    // Create the demo workspace
    const workspaceId = await saveWorkspaceFromCurrentSession(
      demoTabs,
      'demo-tab-1',
      {
        name: 'Demo Workspace',
        description: 'A sample workspace showcasing Arc Browser features with development resources',
        tags: ['demo', 'development', 'tutorial']
      }
    );

    console.log('✅ Demo workspace created:', workspaceId);
    return workspaceId;
  } catch (error) {
    console.error('Error creating demo workspace:', error);
    return null;
  }
}

/**
 * Check if demo workspace exists
 */
export async function hasDemoWorkspace(): Promise<boolean> {
  try {
    const { searchWorkspaces } = await import('./workspaceManager');
    const workspaces = await searchWorkspaces('Demo Workspace');
    return workspaces.length > 0;
  } catch (error) {
    console.error('Error checking demo workspace:', error);
    return false;
  }
}

/**
 * Get demo workspace if it exists
 */
export async function getDemoWorkspace(): Promise<Workspace | null> {
  try {
    const { searchWorkspaces } = await import('./workspaceManager');
    const workspaces = await searchWorkspaces('Demo Workspace');
    return workspaces.length > 0 ? workspaces[0] : null;
  } catch (error) {
    console.error('Error getting demo workspace:', error);
    return null;
  }
}

/**
 * Reset onboarding (for testing or re-onboarding)
 */
export async function resetOnboarding(): Promise<void> {
  try {
    const db = await getDatabaseManager();
    await db.execute('DELETE FROM settings WHERE key = ?', ['onboarding_state']);
    console.log('✅ Onboarding state reset');
  } catch (error) {
    console.error('Error resetting onboarding:', error);
    throw error;
  }
}

/**
 * Check if onboarding should be shown (handles version updates)
 */
export async function shouldShowOnboarding(): Promise<boolean> {
  try {
    const state = await getOnboardingState();
    
    // Show onboarding if never seen
    if (!state.hasSeenOnboarding) {
      return true;
    }
    
    // Show onboarding if version has changed (for new features)
    if (state.onboardingVersion !== CURRENT_ONBOARDING_VERSION) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if should show onboarding:', error);
    return true; // Show onboarding on error to be safe
  }
}

/**
 * Get onboarding progress
 */
export async function getOnboardingProgress(): Promise<{
  totalSteps: number;
  completedSteps: number;
  currentStep: number;
  isComplete: boolean;
}> {
  try {
    const state = await getOnboardingState();
    const totalSteps = ONBOARDING_STEPS.length;
    const completedSteps = state.completedSteps.length;
    const currentStep = Math.min(completedSteps, totalSteps - 1);
    const isComplete = completedSteps >= totalSteps;
    
    return {
      totalSteps,
      completedSteps,
      currentStep,
      isComplete,
    };
  } catch (error) {
    console.error('Error getting onboarding progress:', error);
    return {
      totalSteps: ONBOARDING_STEPS.length,
      completedSteps: 0,
      currentStep: 0,
      isComplete: false,
    };
  }
}

/**
 * Get user-friendly onboarding statistics
 */
export async function getOnboardingStats(): Promise<{
  isFirstTime: boolean;
  daysSinceFirstRun: number;
  hasCompletedOnboarding: boolean;
  hasSkippedOnboarding: boolean;
  completionPercentage: number;
}> {
  try {
    const state = await getOnboardingState();
    const progress = await getOnboardingProgress();
    const daysSinceFirstRun = Math.floor((Date.now() - state.firstRunDate) / (1000 * 60 * 60 * 24));
    
    return {
      isFirstTime: !state.hasSeenOnboarding,
      daysSinceFirstRun,
      hasCompletedOnboarding: progress.isComplete,
      hasSkippedOnboarding: state.skippedOnboarding,
      completionPercentage: Math.round((progress.completedSteps / progress.totalSteps) * 100),
    };
  } catch (error) {
    console.error('Error getting onboarding stats:', error);
    return {
      isFirstTime: true,
      daysSinceFirstRun: 0,
      hasCompletedOnboarding: false,
      hasSkippedOnboarding: false,
      completionPercentage: 0,
    };
  }
}