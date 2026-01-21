/**
 * Diagnostics Provider - System health and status monitoring
 * Provides user-friendly system diagnostics and health checks
 */

import { getSettings } from './settingsStoreMain';
import { getDatabaseManager } from './database';
import { getWorkspaceStats } from './workspaceManager';

export interface DiagnosticsSnapshot {
  ollama: {
    available: boolean;
    model?: string;
    endpoint?: string;
    lastError?: string;
    modelCount?: number;
  };
  database: {
    connected: boolean;
    ready: boolean;
    lastError?: string;
    tablesCount?: number;
    workspacesCount?: number;
  };
  session: {
    tabs: number;
    lastSavedAt?: number;
    restoreEnabled: boolean;
    workspacesAvailable: number;
  };
  jarvis: {
    enabled: boolean;
    recommendationsLoaded: boolean;
    lastRecommendationCount?: number;
    chatAvailable: boolean;
  };
  app: {
    version: string;
    env: 'development' | 'production';
    platform: string;
    uptime: number;
    memoryUsage?: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  overall: {
    status: 'healthy' | 'warning' | 'error';
    issues: string[];
    recommendations: string[];
  };
}

/**
 * Get comprehensive system diagnostics snapshot
 */
export async function getDiagnosticsSnapshot(): Promise<DiagnosticsSnapshot> {
  const startTime = Date.now();
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Initialize snapshot with defaults
  const snapshot: DiagnosticsSnapshot = {
    ollama: {
      available: false,
    },
    database: {
      connected: false,
      ready: false,
    },
    session: {
      tabs: 0,
      restoreEnabled: false,
      workspacesAvailable: 0,
    },
    jarvis: {
      enabled: false,
      recommendationsLoaded: false,
      chatAvailable: false,
    },
    app: {
      version: '1.2.0', // This should be read from package.json in a real implementation
      env: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      platform: process.platform,
      uptime: Date.now() - startTime,
    },
    overall: {
      status: 'healthy',
      issues: [],
      recommendations: [],
    },
  };

  try {
    // Check Ollama status
    await checkOllamaStatus(snapshot, issues, recommendations);

    // Check database status
    await checkDatabaseStatus(snapshot, issues, recommendations);

    // Check session and workspace status
    await checkSessionStatus(snapshot, issues, recommendations);

    // Check Jarvis status
    await checkJarvisStatus(snapshot, issues, recommendations);

    // Check app performance
    await checkAppPerformance(snapshot, issues, recommendations);

    // Determine overall status
    snapshot.overall.issues = issues;
    snapshot.overall.recommendations = recommendations;
    
    if (issues.length === 0) {
      snapshot.overall.status = 'healthy';
    } else if (issues.some(issue => issue.includes('critical') || issue.includes('error'))) {
      snapshot.overall.status = 'error';
    } else {
      snapshot.overall.status = 'warning';
    }

  } catch (error) {
    console.error('Error generating diagnostics snapshot:', error);
    issues.push('Failed to generate complete diagnostics');
    snapshot.overall.status = 'error';
    snapshot.overall.issues = issues;
    snapshot.overall.recommendations = recommendations;
  }

  return snapshot;
}

/**
 * Check Ollama AI service status
 */
async function checkOllamaStatus(
  snapshot: DiagnosticsSnapshot,
  issues: string[],
  recommendations: string[]
): Promise<void> {
  try {
    const settings = await getSettings();
    snapshot.ollama.endpoint = settings.ollamaEndpoint || 'http://localhost:11434';
    
    if (!settings.ollamaEnabled) {
      snapshot.ollama.available = false;
      recommendations.push('Enable Ollama in settings to use AI features');
      return;
    }

    // Try to get Ollama client and check status
    try {
      const { getOllamaClient } = await import('./ollamaClient');
      const ollamaClient = getOllamaClient(snapshot.ollama.endpoint);
      const status = await ollamaClient.getStatus();
      
      snapshot.ollama.available = status.available;
      snapshot.ollama.modelCount = status.models.length;
      
      if (status.available) {
        if (status.hasModels) {
          snapshot.ollama.model = settings.ollamaModel || status.models[0]?.name;
        } else {
          issues.push('Ollama is running but no models are installed');
          recommendations.push('Install a model with: ollama pull llama3');
        }
      } else {
        issues.push('Ollama server is not running');
        recommendations.push('Start Ollama with: ollama serve');
      }
    } catch (ollamaError) {
      snapshot.ollama.available = false;
      snapshot.ollama.lastError = ollamaError instanceof Error ? ollamaError.message : 'Unknown error';
      issues.push('Cannot connect to Ollama service');
      recommendations.push('Check if Ollama is installed and running');
    }
  } catch (error) {
    snapshot.ollama.lastError = error instanceof Error ? error.message : 'Unknown error';
    issues.push('Failed to check Ollama status');
  }
}

/**
 * Check database connection and health
 */
async function checkDatabaseStatus(
  snapshot: DiagnosticsSnapshot,
  issues: string[],
  recommendations: string[]
): Promise<void> {
  try {
    const db = await getDatabaseManager();
    snapshot.database.connected = true;
    snapshot.database.ready = db.isReady();
    
    if (!snapshot.database.ready) {
      issues.push('Database is not ready');
      recommendations.push('Wait for database initialization to complete');
      return;
    }

    // Check table counts
    try {
      const tables = await db.query<{ count: number }>('SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"');
      snapshot.database.tablesCount = tables[0]?.count || 0;
      
      // Check workspaces count
      const workspaces = await db.query<{ count: number }>('SELECT COUNT(*) as count FROM workspaces');
      snapshot.database.workspacesCount = workspaces[0]?.count || 0;
      
      if (snapshot.database.tablesCount < 5) {
        issues.push('Database schema appears incomplete');
        recommendations.push('Restart the application to reinitialize the database');
      }
    } catch (queryError) {
      issues.push('Database queries are failing');
      recommendations.push('Check database file permissions and disk space');
    }
  } catch (error) {
    snapshot.database.connected = false;
    snapshot.database.lastError = error instanceof Error ? error.message : 'Unknown error';
    issues.push('Database connection failed');
    recommendations.push('Check database file permissions and available disk space');
  }
}

/**
 * Check session management and workspace status
 */
async function checkSessionStatus(
  snapshot: DiagnosticsSnapshot,
  issues: string[],
  recommendations: string[]
): Promise<void> {
  try {
    const settings = await getSettings();
    snapshot.session.restoreEnabled = settings.restorePreviousSession !== false;
    
    // Get workspace statistics
    try {
      const stats = await getWorkspaceStats();
      snapshot.session.workspacesAvailable = stats.totalWorkspaces;
      snapshot.session.tabs = stats.totalTabs;
      
      if (stats.totalWorkspaces === 0) {
        recommendations.push('Create your first workspace to save and organize your browsing sessions');
      }
    } catch (workspaceError) {
      issues.push('Cannot access workspace data');
    }

    // Check session restore functionality
    if (!snapshot.session.restoreEnabled) {
      recommendations.push('Enable session restore in settings to automatically restore tabs on startup');
    }
  } catch (error) {
    issues.push('Failed to check session status');
  }
}

/**
 * Check Jarvis AI assistant status
 */
async function checkJarvisStatus(
  snapshot: DiagnosticsSnapshot,
  issues: string[],
  recommendations: string[]
): Promise<void> {
  try {
    const settings = await getSettings();
    snapshot.jarvis.enabled = settings.ollamaEnabled === true;
    snapshot.jarvis.chatAvailable = snapshot.ollama.available && snapshot.jarvis.enabled;
    
    // Check if recommendations are working
    try {
      const { getJarvisRecommendations } = await import('./recommender');
      const recommendations_data = await getJarvisRecommendations(1);
      snapshot.jarvis.recommendationsLoaded = true;
      snapshot.jarvis.lastRecommendationCount = recommendations_data.length;
    } catch (recError) {
      snapshot.jarvis.recommendationsLoaded = false;
      issues.push('Jarvis recommendations are not loading');
    }

    if (snapshot.jarvis.enabled && !snapshot.jarvis.chatAvailable) {
      issues.push('Jarvis is enabled but AI chat is not available');
      recommendations.push('Check Ollama connection and model installation');
    }
  } catch (error) {
    issues.push('Failed to check Jarvis status');
  }
}

/**
 * Check application performance metrics
 */
async function checkAppPerformance(
  snapshot: DiagnosticsSnapshot,
  issues: string[],
  recommendations: string[]
): Promise<void> {
  try {
    // Check memory usage (if available in Electron)
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const percentage = Math.round((usedMB / totalMB) * 100);
      
      snapshot.app.memoryUsage = {
        used: usedMB,
        total: totalMB,
        percentage,
      };
      
      if (percentage > 80) {
        issues.push('High memory usage detected');
        recommendations.push('Consider closing unused tabs or restarting the application');
      }
    }

    // Check uptime
    snapshot.app.uptime = Date.now();
    
  } catch (error) {
    // Performance checks are optional, don't add issues for failures
    console.warn('Could not check performance metrics:', error);
  }
}

/**
 * Run a quick health check (lighter version of full diagnostics)
 */
export async function runHealthCheck(): Promise<{
  status: 'healthy' | 'warning' | 'error';
  message: string;
  criticalIssues: number;
}> {
  try {
    const snapshot = await getDiagnosticsSnapshot();
    
    const criticalIssues = snapshot.overall.issues.filter(issue => 
      issue.includes('critical') || 
      issue.includes('failed') || 
      issue.includes('error')
    ).length;
    
    let message = '';
    if (snapshot.overall.status === 'healthy') {
      message = 'All systems are running normally';
    } else if (snapshot.overall.status === 'warning') {
      message = `${snapshot.overall.issues.length} minor issues detected`;
    } else {
      message = `${criticalIssues} critical issues need attention`;
    }
    
    return {
      status: snapshot.overall.status,
      message,
      criticalIssues,
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Health check failed',
      criticalIssues: 1,
    };
  }
}

/**
 * Get user-friendly status descriptions
 */
export function getStatusDescription(status: 'healthy' | 'warning' | 'error'): {
  icon: string;
  color: string;
  title: string;
  description: string;
} {
  switch (status) {
    case 'healthy':
      return {
        icon: '✅',
        color: '#22c55e',
        title: 'All Systems Operational',
        description: 'Everything is working correctly'
      };
    case 'warning':
      return {
        icon: '⚠️',
        color: '#f59e0b',
        title: 'Minor Issues Detected',
        description: 'Some features may not work optimally'
      };
    case 'error':
      return {
        icon: '❌',
        color: '#ef4444',
        title: 'Critical Issues Found',
        description: 'Some features may not work properly'
      };
    default:
      return {
        icon: '❓',
        color: '#6b7280',
        title: 'Unknown Status',
        description: 'Unable to determine system status'
      };
  }
}