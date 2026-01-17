/**
 * Ollama API Client
 * Provides integration with local Ollama server for AI-powered features
 */

// Helper to check if we're in a test environment
const isTestEnvironment = (): boolean => {
  return (typeof process !== 'undefined' && 
    (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true')) ||
    (typeof window !== 'undefined' && (window as any).__VITEST__);
};

export enum OllamaErrorType {
  SERVER_NOT_RUNNING = 'SERVER_NOT_RUNNING',
  NO_MODELS_INSTALLED = 'NO_MODELS_INSTALLED',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

export class OllamaError extends Error {
  constructor(
    message: string,
    public type: OllamaErrorType,
    public details?: any
  ) {
    super(message);
    this.name = 'OllamaError';
  }
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaChatMessage;
  done: boolean;
}

export interface OllamaStatus {
  available: boolean;
  hasModels: boolean;
  models: OllamaModel[];
  error?: OllamaError;
}

export class OllamaClient {
  private baseUrl: string;
  private timeout: number;
  private modelCache: {
    models: string[];
    timestamp: number;
  } | null = null;
  private readonly MODEL_CACHE_TTL = 60000; // 60 seconds

  constructor(baseUrl: string = 'http://localhost:11434', timeout: number = 30000) {
    // Remove trailing slash to ensure consistent URL construction
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeout = timeout;
  }

  /**
   * Check if Ollama server is running
   */
  async isAvailable(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/api/tags`;
      console.log('🔍 [Ollama] Checking availability at:', url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      
      console.log('🔍 [Ollama] Health check response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });
      
      return response.ok;
    } catch (error) {
      // Handle network errors, CORS errors, etc.
      if (error instanceof Error) {
        // Only log if not in test environment to reduce noise in test output
        if (!isTestEnvironment()) {
          console.log('🔍 [Ollama] Health check failed:', {
            error: error.message,
            type: error.name
          });
        }
      }
      return false;
    }
  }

  /**
   * Get list of available models
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const url = `${this.baseUrl}/api/tags`;
      console.log('🔍 [Ollama] Listing models at:', url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.log('🔍 [Ollama] List models failed:', {
          status: response.status,
          statusText: response.statusText
        });
        throw new Error(`Failed to list models: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      const models = data.models || [];
      
      console.log('🔍 [Ollama] Found models:', {
        count: models.length,
        names: models.map((m: OllamaModel) => m.name)
      });
      
      return models;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🔍 [Ollama] List models timed out');
        throw new Error('Request to Ollama timed out');
      }
      console.error('🔍 [Ollama] Error listing models:', error);
      throw error;
    }
  }

  /**
   * Check if Ollama has any models installed
   */
  async hasModels(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      const models = data.models || [];
      return models.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get list of installed model names (cached)
   */
  async getInstalledModels(): Promise<string[]> {
    const now = Date.now();
    
    // Return cached if still valid
    if (this.modelCache && (now - this.modelCache.timestamp) < this.MODEL_CACHE_TTL) {
      console.log('🔍 [Ollama] Using cached model list:', this.modelCache.models);
      return this.modelCache.models;
    }
    
    try {
      console.log('🔍 [Ollama] Fetching fresh model list');
      const models = await this.listModels();
      const modelNames = models.map(m => m.name);
      
      this.modelCache = {
        models: modelNames,
        timestamp: now
      };
      
      console.log('🔍 [Ollama] Cached model list:', modelNames);
      return modelNames;
    } catch (error) {
      console.error('⚠️ [Ollama] Failed to get installed models:', error);
      return [];
    }
  }

  /**
   * Validate model and select fallback if needed
   */
  async validateAndSelectModel(configuredModel: string): Promise<{
    model: string;
    isFallback: boolean;
    reason?: string;
  }> {
    console.log('🔍 [Ollama] Validating model:', configuredModel);
    
    const installedModels = await this.getInstalledModels();
    console.log('🔍 [Ollama] Installed models:', installedModels);
    
    if (installedModels.length === 0) {
      throw new OllamaError(
        'No models installed. Install one with: ollama pull llama3',
        OllamaErrorType.NO_MODELS_INSTALLED
      );
    }
    
    // Check if configured model exists (exact match or prefix match)
    const modelExists = installedModels.some(m => 
      m === configuredModel || 
      m.startsWith(configuredModel.split(':')[0])
    );
    
    if (modelExists) {
      // Find the exact match or the first prefix match
      const exactModel = installedModels.find(m => 
        m === configuredModel || 
        m.startsWith(configuredModel.split(':')[0])
      );
      console.log('✅ [Ollama] Using configured model:', exactModel);
      return {
        model: exactModel!,
        isFallback: false
      };
    }
    
    // Select fallback model
    const fallbackPriority = ['llama3', 'llama3:latest', 'mistral', 'mistral:latest'];
    
    for (const fallback of fallbackPriority) {
      const found = installedModels.find(m => 
        m === fallback || m.startsWith(fallback.split(':')[0])
      );
      if (found) {
        console.log('🔄 [Ollama] Fallback to model:', found);
        return {
          model: found,
          isFallback: true,
          reason: `Model '${configuredModel}' not installed, using '${found}' instead`
        };
      }
    }
    
    // Use first available model as last resort
    const firstModel = installedModels[0];
    console.log('🔄 [Ollama] Fallback to first available model:', firstModel);
    return {
      model: firstModel,
      isFallback: true,
      reason: `Model '${configuredModel}' not installed, using '${firstModel}' instead`
    };
  }

  /**
   * Get detailed Ollama status
   */
  async getStatus(): Promise<OllamaStatus> {
    console.log('🔍 [Ollama] Getting status...');
    
    const available = await this.isAvailable();
    console.log('🔍 [Ollama] Available:', available);
    
    if (!available) {
      return {
        available: false,
        hasModels: false,
        models: [],
        error: new OllamaError(
          'Ollama server is not running',
          OllamaErrorType.SERVER_NOT_RUNNING
        )
      };
    }
    
    try {
      const models = await this.listModels();
      const hasModels = models.length > 0;
      
      console.log('🔍 [Ollama] Status result:', {
        available: true,
        hasModels,
        modelCount: models.length,
        modelNames: models.map(m => m.name)
      });
      
      if (!hasModels) {
        return {
          available: true,
          hasModels: false,
          models: [],
          error: new OllamaError(
            'No models installed in Ollama',
            OllamaErrorType.NO_MODELS_INSTALLED
          )
        };
      }
      
      return {
        available: true,
        hasModels: true,
        models
      };
    } catch (error) {
      console.log('🔍 [Ollama] Status check error:', error);
      return {
        available: true,
        hasModels: false,
        models: [],
        error: new OllamaError(
          'Failed to check models',
          OllamaErrorType.UNKNOWN,
          error
        )
      };
    }
  }

  /**
   * Generate text completion
   */
  async generate(request: OllamaGenerateRequest): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          stream: false, // Always use non-streaming for simplicity
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama generate failed: ${response.statusText}`);
      }

      const data: OllamaGenerateResponse = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error generating with Ollama:', error);
      throw error;
    }
  }

  /**
   * Chat with context
   */
  async chat(request: OllamaChatRequest): Promise<string> {
    try {
      console.log('🤖 [Ollama] chat() called with model:', request.model);
      console.log('🤖 [Ollama] Checking if models are available...');
      
      // Check if models are available first
      const hasModels = await this.hasModels();
      console.log('🤖 [Ollama] Has models:', hasModels);
      
      if (!hasModels) {
        throw new OllamaError(
          'No models installed. Install a model with: ollama pull llama3',
          OllamaErrorType.NO_MODELS_INSTALLED
        );
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      console.log('🤖 [Ollama] Sending POST request to:', `${this.baseUrl}/api/chat`);
      console.log('🤖 [Ollama] Request body:', JSON.stringify({ ...request, stream: false }, null, 2));

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          stream: false, // Always use non-streaming for simplicity
        }),
        signal: controller.signal,
      }).catch((fetchError) => {
        console.error('🤖 [Ollama] Fetch error:', fetchError);
        console.error('🤖 [Ollama] Fetch error type:', fetchError.constructor.name);
        console.error('🤖 [Ollama] Fetch error message:', fetchError.message);
        
        // Handle network errors (CORS, connection refused, etc.)
        if (fetchError instanceof TypeError) {
          const errorMsg = fetchError.message.toLowerCase();
          if (errorMsg.includes('fetch') || 
              errorMsg.includes('network') || 
              errorMsg.includes('failed') ||
              errorMsg.includes('refused')) {
            throw new OllamaError(
              `Cannot connect to Ollama at ${this.baseUrl}. Make sure Ollama is running: ollama serve`,
              OllamaErrorType.SERVER_NOT_RUNNING,
              fetchError
            );
          }
        }
        // Re-throw AbortError (timeout) to be handled by outer catch
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw fetchError;
        }
        throw fetchError;
      });

      clearTimeout(timeoutId);

      console.log('🤖 [Ollama] Response status:', response.status, response.statusText);
      console.log('🤖 [Ollama] Response ok:', response.ok);

      if (!response.ok) {
        // Try to get error body
        let errorBody = '';
        try {
          errorBody = await response.text();
          console.error('🤖 [Ollama] Error response body:', errorBody);
        } catch (e) {
          console.error('🤖 [Ollama] Could not read error body');
        }
        
        // Handle 404 specifically
        if (response.status === 404) {
          throw new OllamaError(
            `Model '${request.model}' not found. Check installed models with: ollama list`,
            OllamaErrorType.MODEL_NOT_FOUND
          );
        }
        throw new OllamaError(
          `Ollama chat failed: ${response.statusText}${errorBody ? ` - ${errorBody}` : ''}`,
          OllamaErrorType.UNKNOWN
        );
      }

      console.log('🤖 [Ollama] Parsing JSON response...');
      const data: OllamaChatResponse = await response.json();
      console.log('🤖 [Ollama] Response data:', JSON.stringify(data, null, 2));
      console.log('🤖 [Ollama] Extracted message content:', data.message.content.substring(0, 100) + '...');
      
      return data.message.content;
    } catch (error) {
      console.error('🤖 [Ollama] Error in chat():', error);
      
      if (error instanceof OllamaError) {
        console.error('🤖 [Ollama] Throwing OllamaError:', error.type, error.message);
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('🤖 [Ollama] Request timed out');
        throw new OllamaError(
          'Request timed out',
          OllamaErrorType.TIMEOUT
        );
      }
      console.error('🤖 [Ollama] Unknown error, wrapping in OllamaError');
      throw new OllamaError(
        'Failed to communicate with Ollama',
        OllamaErrorType.UNKNOWN,
        error
      );
    }
  }

  /**
   * Analyze browsing history and generate recommendations
   */
  async analyzeHistory(history: Array<{ url: string; title: string; visitCount: number }>): Promise<string> {
    const historyText = history
      .slice(0, 10) // Limit to top 10
      .map((h, i) => `${i + 1}. ${h.title || h.url} (visited ${h.visitCount} times)`)
      .join('\n');

    const prompt = `Based on this browsing history, suggest 3 relevant websites or topics the user might be interested in. Be concise and specific.

Browsing History:
${historyText}

Provide 3 recommendations in this format:
1. [Website/Topic] - [Brief reason]
2. [Website/Topic] - [Brief reason]
3. [Website/Topic] - [Brief reason]`;

    try {
      return await this.generate({
        model: 'llama2', // Default model, can be configured
        prompt,
        options: {
          temperature: 0.7,
        },
      });
    } catch (error) {
      console.error('Error analyzing history with Ollama:', error);
      throw error;
    }
  }

  /**
   * Chat with Jarvis using Ollama
   */
  async chatWithJarvis(
    userMessage: string,
    context: {
      recentHistory?: Array<{ url: string; title: string }>;
      recommendations?: Array<{ url: string; title: string; reason: string }>;
    },
    configuredModel: string = 'llama3:latest'
  ): Promise<{ reply: string; usedModel: string; fallbackNotice?: string }> {
    console.log('🤖 [Ollama] chatWithJarvis called with configured model:', configuredModel);
    console.log('🤖 [Ollama] User message:', userMessage.substring(0, 100) + (userMessage.length > 100 ? '...' : ''));
    console.log('🤖 [Ollama] Base URL:', this.baseUrl);
    console.log('🤖 [Ollama] Full URL will be:', `${this.baseUrl}/api/chat`);
    
    // Validate and select model
    const { model, isFallback, reason } = await this.validateAndSelectModel(configuredModel);
    console.log('🤖 [Ollama] Selected model:', model, isFallback ? '(fallback)' : '(configured)');
    
    const systemPrompt = `You are Jarvis, an AI assistant integrated into the Arc Browser. You help users with their browsing experience by providing recommendations, answering questions about their history, and offering helpful suggestions. Be concise, friendly, and helpful.`;

    const contextInfo: string[] = [];
    
    if (context.recentHistory && context.recentHistory.length > 0) {
      const historyText = context.recentHistory
        .slice(0, 5)
        .map((h, i) => `${i + 1}. ${h.title || h.url}`)
        .join('\n');
      contextInfo.push(`Recent browsing history:\n${historyText}`);
    }

    if (context.recommendations && context.recommendations.length > 0) {
      const recsText = context.recommendations
        .slice(0, 3)
        .map((r, i) => `${i + 1}. ${r.title || r.url} - ${r.reason}`)
        .join('\n');
      contextInfo.push(`Current recommendations:\n${recsText}`);
    }

    const messages: OllamaChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    if (contextInfo.length > 0) {
      messages.push({
        role: 'system',
        content: `Context:\n${contextInfo.join('\n\n')}`,
      });
    }

    messages.push({
      role: 'user',
      content: userMessage,
    });

    console.log('📤 [Ollama] Sending request to Ollama with model:', model);
    console.log('🤖 [Ollama] Request:', { model, messageCount: messages.length });

    try {
      const reply = await this.chat({
        model, // Use validated model
        messages,
        options: {
          temperature: 0.8,
        },
      });
      
      console.log('📥 [Ollama] Response received:', reply.length, 'characters');
      console.log('🤖 [Ollama] Response preview:', reply.substring(0, 100) + (reply.length > 100 ? '...' : ''));
      
      return {
        reply,
        usedModel: model,
        fallbackNotice: isFallback ? reason : undefined
      };
    } catch (error) {
      console.error('🤖 [Ollama] Error in chatWithJarvis:', error);
      console.error('🤖 [Ollama] Error type:', error instanceof OllamaError ? 'OllamaError' : typeof error);
      if (error instanceof OllamaError) {
        console.error('🤖 [Ollama] OllamaError type:', error.type);
        console.error('🤖 [Ollama] OllamaError message:', error.message);
      }
      throw error;
    }
  }
}

// Singleton instance
let ollamaClient: OllamaClient | null = null;
let currentBaseUrl: string = 'http://localhost:11434';

/**
 * Get the Ollama client instance
 * If baseUrl is provided and different from current, recreates the client
 */
export function getOllamaClient(baseUrl?: string): OllamaClient {
  const effectiveBaseUrl = baseUrl || currentBaseUrl;
  
  // Recreate client if baseUrl changed
  if (!ollamaClient || currentBaseUrl !== effectiveBaseUrl) {
    ollamaClient = new OllamaClient(effectiveBaseUrl);
    currentBaseUrl = effectiveBaseUrl;
  }
  
  return ollamaClient;
}

/**
 * Reset the Ollama client instance (useful for testing or reconfiguration)
 */
export function resetOllamaClient(): void {
  ollamaClient = null;
  currentBaseUrl = 'http://localhost:11434';
}

/**
 * Check if Ollama is available
 */
export async function isOllamaAvailable(): Promise<boolean> {
  const client = getOllamaClient();
  return await client.isAvailable();
}
