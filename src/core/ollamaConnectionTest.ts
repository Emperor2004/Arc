/**
 * Ollama Connection Test Utility
 * Provides functions to test and verify Ollama connectivity
 */

import { getOllamaClient, OllamaError, OllamaErrorType } from './ollamaClient';

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: {
    available: boolean;
    hasModels: boolean;
    modelCount: number;
    models?: string[];
    endpoint: string;
  };
  error?: {
    type: OllamaErrorType;
    message: string;
  };
}

/**
 * Test Ollama connection with a specific endpoint
 */
export async function testOllamaConnection(endpoint?: string): Promise<ConnectionTestResult> {
  const testEndpoint = endpoint || 'http://localhost:11434';
  
  try {
    const client = getOllamaClient(testEndpoint);
    
    // Test availability
    const available = await client.isAvailable();
    
    if (!available) {
      return {
        success: false,
        message: `Ollama server is not running at ${testEndpoint}`,
        details: {
          available: false,
          hasModels: false,
          modelCount: 0,
          endpoint: testEndpoint,
        },
        error: {
          type: OllamaErrorType.SERVER_NOT_RUNNING,
          message: `Cannot connect to Ollama at ${testEndpoint}. Start Ollama with: ollama serve`,
        },
      };
    }
    
    // Test model availability
    const status = await client.getStatus();
    
    if (!status.hasModels) {
      return {
        success: false,
        message: `Ollama is running but no models are installed`,
        details: {
          available: true,
          hasModels: false,
          modelCount: 0,
          endpoint: testEndpoint,
        },
        error: {
          type: OllamaErrorType.NO_MODELS_INSTALLED,
          message: 'Install a model with: ollama pull llama3',
        },
      };
    }
    
    return {
      success: true,
      message: `Ollama is ready with ${status.models.length} model(s)`,
      details: {
        available: true,
        hasModels: true,
        modelCount: status.models.length,
        models: status.models.map(m => m.name),
        endpoint: testEndpoint,
      },
    };
  } catch (error) {
    let errorType = OllamaErrorType.UNKNOWN;
    let errorMessage = 'Unknown error';
    
    if (error instanceof OllamaError) {
      errorType = error.type;
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        errorType = OllamaErrorType.TIMEOUT;
      } else if (error.message.includes('fetch') || error.message.includes('network')) {
        errorType = OllamaErrorType.SERVER_NOT_RUNNING;
      }
    }
    
    return {
      success: false,
      message: `Connection test failed: ${errorMessage}`,
      details: {
        available: false,
        hasModels: false,
        modelCount: 0,
        endpoint: testEndpoint,
      },
      error: {
        type: errorType,
        message: errorMessage,
      },
    };
  }
}

/**
 * Test if a specific model is available
 */
export async function testModelAvailability(
  modelName: string,
  endpoint?: string
): Promise<{ available: boolean; message: string }> {
  try {
    const testEndpoint = endpoint || 'http://localhost:11434';
    const client = getOllamaClient(testEndpoint);
    
    const models = await client.listModels();
    const modelExists = models.some(m => m.name === modelName || m.name.startsWith(modelName));
    
    if (modelExists) {
      return {
        available: true,
        message: `Model '${modelName}' is available`,
      };
    } else {
      return {
        available: false,
        message: `Model '${modelName}' is not installed. Available models: ${models.map(m => m.name).join(', ') || 'none'}`,
      };
    }
  } catch (error) {
    return {
      available: false,
      message: `Error checking model: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
