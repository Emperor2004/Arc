import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { OllamaClient, OllamaError, OllamaErrorType } from './ollamaClient';

// Mock fetch globally
global.fetch = vi.fn();

describe('Ollama Error Handling Property-Based Tests', () => {
  let client: OllamaClient;

  beforeEach(() => {
    client = new OllamaClient('http://localhost:11434', 5000);
    vi.clearAllMocks();
  });

  /**
   * Property 1: Error Type Accuracy
   * Validates: Requirements 1.3, 1.4
   */
  describe('Property 1: Error Type Accuracy', () => {
    it('should create OllamaError with correct type and message', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            OllamaErrorType.SERVER_NOT_RUNNING,
            OllamaErrorType.NO_MODELS_INSTALLED,
            OllamaErrorType.MODEL_NOT_FOUND,
            OllamaErrorType.TIMEOUT,
            OllamaErrorType.UNKNOWN
          ),
          fc.string({ minLength: 10, maxLength: 200 }),
          (errorType, message) => {
            const error = new OllamaError(message, errorType);
            
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(OllamaError);
            expect(error.type).toBe(errorType);
            expect(error.message).toBe(message);
            expect(error.name).toBe('OllamaError');
            expect(error.details).toBeUndefined();
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should create OllamaError with details', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            OllamaErrorType.SERVER_NOT_RUNNING,
            OllamaErrorType.NO_MODELS_INSTALLED,
            OllamaErrorType.MODEL_NOT_FOUND
          ),
          fc.string({ minLength: 10 }),
          fc.anything(),
          (errorType, message, details) => {
            const error = new OllamaError(message, errorType, details);
            
            expect(error.type).toBe(errorType);
            expect(error.message).toBe(message);
            expect(error.details).toBe(details);
            
            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 4: Model Detection Accuracy
   * Validates: Requirements 4.1, 4.3, 4.4
   */
  describe('Property 4: Model Detection Accuracy', () => {
    it('should correctly detect when models are available', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1 }),
              modified_at: fc.string(),
              size: fc.integer({ min: 0 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (models) => {
            (global.fetch as any).mockResolvedValueOnce({
              ok: true,
              json: async () => ({ models })
            });

            const result = await client.hasModels();
            expect(result).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    });

    it('should correctly detect when no models are available', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant([]),
          async (models) => {
            (global.fetch as any).mockResolvedValueOnce({
              ok: true,
              json: async () => ({ models })
            });

            const result = await client.hasModels();
            expect(result).toBe(false);
            
            return true;
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    });

    it('should return false when server is not available', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

            const result = await client.hasModels();
            expect(result).toBe(false);
            
            return true;
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    });

    it('should return false when response is not ok', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 400, max: 599 }),
          async (statusCode) => {
            (global.fetch as any).mockResolvedValueOnce({
              ok: false,
              status: statusCode
            });

            const result = await client.hasModels();
            expect(result).toBe(false);
            
            return true;
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    });
  });

  /**
   * Property 2: Fallback Consistency
   * Validates: Requirements 3.1, 3.5
   */
  describe('Property 2: Fallback Consistency', () => {
    it('should consistently return error status when server is not running', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            (global.fetch as any).mockRejectedValueOnce(new Error('Connection refused'));

            const status = await client.getStatus();
            
            expect(status.available).toBe(false);
            expect(status.hasModels).toBe(false);
            expect(status.models).toEqual([]);
            expect(status.error).toBeDefined();
            expect(status.error?.type).toBe(OllamaErrorType.SERVER_NOT_RUNNING);
            
            return true;
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    });

    it('should consistently return error status when no models are installed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            // First call for isAvailable
            (global.fetch as any).mockResolvedValueOnce({
              ok: true,
              json: async () => ({ models: [] })
            });
            // Second call for listModels
            (global.fetch as any).mockResolvedValueOnce({
              ok: true,
              json: async () => ({ models: [] })
            });

            const status = await client.getStatus();
            
            expect(status.available).toBe(true);
            expect(status.hasModels).toBe(false);
            expect(status.models).toEqual([]);
            expect(status.error).toBeDefined();
            expect(status.error?.type).toBe(OllamaErrorType.NO_MODELS_INSTALLED);
            
            return true;
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    });

    it('should consistently return success status when models are available', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1 }),
              modified_at: fc.string(),
              size: fc.integer({ min: 0 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (models) => {
            // First call for isAvailable
            (global.fetch as any).mockResolvedValueOnce({
              ok: true,
              json: async () => ({ models })
            });
            // Second call for listModels
            (global.fetch as any).mockResolvedValueOnce({
              ok: true,
              json: async () => ({ models })
            });

            const status = await client.getStatus();
            
            expect(status.available).toBe(true);
            expect(status.hasModels).toBe(true);
            expect(status.models).toEqual(models);
            expect(status.error).toBeUndefined();
            
            return true;
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    });
  });

  /**
   * Property 7: No Repeated Checks
   * Validates: Requirements 3.4
   */
  describe('Property 7: No Repeated Checks', () => {
    it('should throw NO_MODELS_INSTALLED error before attempting chat', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.array(
            fc.record({
              role: fc.constantFrom('user', 'assistant', 'system'),
              content: fc.string({ minLength: 1 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (model, messages) => {
            // Mock hasModels to return false
            (global.fetch as any).mockResolvedValueOnce({
              ok: true,
              json: async () => ({ models: [] })
            });

            let error: OllamaError | null = null;
            try {
              await client.chat({
                model,
                messages: messages as any
              });
            } catch (e) {
              error = e as OllamaError;
            }

            expect(error).not.toBeNull();
            expect(error).toBeInstanceOf(OllamaError);
            expect(error?.type).toBe(OllamaErrorType.NO_MODELS_INSTALLED);
            expect(error?.message).toContain('No models installed');
            
            // Verify fetch was only called once (for hasModels check)
            expect(global.fetch).toHaveBeenCalledTimes(1);
            
            return true;
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    });
  });

  /**
   * Enhanced chat() error handling tests
   */
  describe('Enhanced chat() Error Handling', () => {
    it('should throw MODEL_NOT_FOUND error for 404 responses', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          async (model, message) => {
            // Mock hasModels to return true
            (global.fetch as any).mockResolvedValueOnce({
              ok: true,
              json: async () => ({ models: [{ name: 'other-model' }] })
            });
            // Mock chat request to return 404
            (global.fetch as any).mockResolvedValueOnce({
              ok: false,
              status: 404
            });

            let error: OllamaError | null = null;
            try {
              await client.chat({
                model,
                messages: [{ role: 'user', content: message }]
              });
            } catch (e) {
              error = e as OllamaError;
            }

            expect(error).not.toBeNull();
            expect(error).toBeInstanceOf(OllamaError);
            expect(error?.type).toBe(OllamaErrorType.MODEL_NOT_FOUND);
            expect(error?.message).toContain(model);
            expect(error?.message).toContain('not found');
            
            return true;
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    });

    it('should throw TIMEOUT error for AbortError', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          async (model, message) => {
            // Mock hasModels to return true
            (global.fetch as any).mockResolvedValueOnce({
              ok: true,
              json: async () => ({ models: [{ name: model }] })
            });
            // Mock chat request to timeout
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            (global.fetch as any).mockRejectedValueOnce(abortError);

            let error: OllamaError | null = null;
            try {
              await client.chat({
                model,
                messages: [{ role: 'user', content: message }]
              });
            } catch (e) {
              error = e as OllamaError;
            }

            expect(error).not.toBeNull();
            expect(error).toBeInstanceOf(OllamaError);
            expect(error?.type).toBe(OllamaErrorType.TIMEOUT);
            expect(error?.message).toContain('timed out');
            
            return true;
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    });
  });
});
