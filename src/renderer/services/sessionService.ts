/**
 * Renderer-safe session service
 * Communicates with main process for database operations
 */

import { TabSession, SessionState } from '../../core/sessionManager';

// In-memory fallback for development
let memorySession: SessionState | null = null;

export function loadSession(): SessionState | null {
  // In development, use memory storage
  if (process.env.NODE_ENV === 'development') {
    return memorySession;
  }
  
  // In production, this would communicate with main process via IPC
  // For now, return null to avoid database issues
  return null;
}

export function saveSession(session: SessionState): void {
  // In development, use memory storage
  if (process.env.NODE_ENV === 'development') {
    memorySession = session;
    return;
  }
  
  // In production, this would communicate with main process via IPC
  console.log('Session save requested:', session);
}

export function clearSession(): void {
  // In development, clear memory storage
  if (process.env.NODE_ENV === 'development') {
    memorySession = null;
    return;
  }
  
  // In production, this would communicate with main process via IPC
  console.log('Session clear requested');
}