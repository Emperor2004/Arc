import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OllamaClient, OllamaError, OllamaErrorType, getOllamaClient, resetOllamaClient } from './ollamaClient';

// Mock fetch globally
global.fetch = vi.fn();

describe('Ollama Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetOllamaClient();
  });

  describe('getOllamaClient', () => {
    it('should create client with default endpoint', () => {
      const client = getOllamaClient();
      expect(client).toBeDefined();
    });

    it('should create client with custom endpoint', () => {
      const client = getOllamaClient('http://custom:11434');
      expect(client).toBeDefined();
    });

    it('should recreate client when endpoint changes', () => {
      const client1 = getOllamaClient('http://localhost:11434');
      const client2 = getOllamaClient('http://custom:11434');
      // Should be different instances when endpoint changes
      expect(client1).toBeDefined();
      expect(client2).toBeDefined();
    });
  });

  describe('isAvailable', () => {
    it('should return true when Ollama is running', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const client = new OllamaClient();
      const available = await client.isAvailable();

      expect(available).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.objectContaining({
          method: 'GET',
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should return false when Ollama is not running', async () => {
      (global.fetch as any).mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const client = new OllamaClient();
      const available = await client.isAvailable();

      expect(available).toBe(false);
    });

    it('should return false on timeout', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      (global.fetch as any).mockRejectedValueOnce(abortError);

      const client = new OllamaClient();
      const available = await client.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe('hasModels', () => {
    it('should return true when models are available', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ name: 'llama3' }] }),
      });

      const client = new OllamaClient();
      const hasModels = await client.hasModels();

      expect(hasModels).toBe(true);
    });

    it('should return false when no models are installed', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      });

      const client = new OllamaClient();
      const hasModels = await client.hasModels();

      expect(hasModels).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return error status when server is not running', async () => {
      (global.fetch as any).mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const client = new OllamaClient();
      const status = await client.getStatus();

      expect(status.available).toBe(false);
      expect(status.hasModels).toBe(false);
      expect(status.error).toBeDefined();
      expect(status.error?.type).toBe(OllamaErrorType.SERVER_NOT_RUNNING);
    });

    it('should return error status when no models are installed', async () => {
      // First call for isAvailable
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      });
      // Second call for listModels
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      });

      const client = new OllamaClient();
      const status = await client.getStatus();

      expect(status.available).toBe(true);
      expect(status.hasModels).toBe(false);
      expect(status.error).toBeDefined();
      expect(status.error?.type).toBe(OllamaErrorType.NO_MODELS_INSTALLED);
    });

    it('should return success status when models are available', async () => {
      const models = [{ name: 'llama3:latest', modified_at: '2024-01-01', size: 1000000 }];
      
      // First call for isAvailable
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models }),
      });
      // Second call for listModels
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models }),
      });

      const client = new OllamaClient();
      const status = await client.getStatus();

      expect(status.available).toBe(true);
      expect(status.hasModels).toBe(true);
      expect(status.models).toEqual(models);
      expect(status.error).toBeUndefined();
    });
  });

  describe('chat', () => {
    it('should throw error when no models are installed', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      });

      const client = new OllamaClient();
      
      await expect(
        client.chat({
          model: 'llama3',
          messages: [{ role: 'user', content: 'test' }],
        })
      ).rejects.toThrow(OllamaError);
    });

    it('should handle network errors correctly', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ name: 'llama3' }] }),
      });
      
      const networkError = new TypeError('Failed to fetch');
      (global.fetch as any).mockRejectedValueOnce(networkError);

      const client = new OllamaClient();
      
      await expect(
        client.chat({
          model: 'llama3',
          messages: [{ role: 'user', content: 'test' }],
        })
      ).rejects.toThrow(OllamaError);
    });

    it('should handle 404 model not found', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ name: 'other-model' }] }),
      });
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const client = new OllamaClient();
      
      await expect(
        client.chat({
          model: 'nonexistent-model',
          messages: [{ role: 'user', content: 'test' }],
        })
      ).rejects.toThrow(OllamaError);
    });
  });
});
