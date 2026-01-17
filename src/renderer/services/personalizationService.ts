/**
 * Renderer-safe personalization service
 * Communicates with main process for personalization operations
 */

// Define the interface locally to avoid import issues
export interface RecommendationPersonalization {
  recencyWeight: number;      // 0.0 to 1.0, default 0.5
  frequencyWeight: number;    // 0.0 to 1.0, default 0.3
  feedbackWeight: number;     // 0.0 to 1.0, default 0.2
  minScore: number;           // 0.0 to 1.0, default 0.1
  maxRecommendations: number; // 1 to 20, default 5
  ollamaModel?: string;       // Ollama model name (e.g., 'mistral', 'neural-chat')
  ollamaEnabled?: boolean;    // Enable Ollama for enhanced recommendations
}

// Default personalization settings
const DEFAULT_PERSONALIZATION: RecommendationPersonalization = {
  frequencyWeight: 0.4,
  recencyWeight: 0.3,
  feedbackWeight: 0.3,
  diversityThreshold: 0.7,
  minConfidenceScore: 0.1,
  maxRecommendations: 10,
  ollamaModel: 'llama3:latest',
  ollamaEndpoint: 'http://localhost:11434'
};

// In-memory settings for development
let memoryPersonalization: RecommendationPersonalization = { ...DEFAULT_PERSONALIZATION };

export function getPersonalizationSettings(): RecommendationPersonalization {
  // In development, use memory storage
  if (process.env.NODE_ENV === 'development') {
    return memoryPersonalization;
  }
  
  // In production, this would communicate with main process via IPC
  return DEFAULT_PERSONALIZATION;
}

export function updatePersonalizationSettings(updates: Partial<RecommendationPersonalization>): void {
  // In development, use memory storage
  if (process.env.NODE_ENV === 'development') {
    memoryPersonalization = { ...memoryPersonalization, ...updates };
    return;
  }
  
  // In production, this would communicate with main process via IPC
  console.log('Personalization settings update requested:', updates);
}

export async function getOllamaModels(): Promise<string[]> {
  // In development, return mock models
  if (process.env.NODE_ENV === 'development') {
    return ['llama2', 'codellama', 'mistral', 'neural-chat'];
  }
  
  // In production, this would communicate with main process via IPC
  return ['llama2'];
}

export { RecommendationPersonalization };