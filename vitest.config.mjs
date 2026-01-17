import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node', // Default to node for database operations
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 5000, // 5 second timeout for async operations (reduced from 10s)
    hookTimeout: 2000, // 2 second timeout for hooks (reduced from 5s)
    teardownTimeout: 1000, // 1 second timeout for cleanup (reduced from 3s)
    bail: 10, // Stop after 10 failures to prevent long runs
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.pbt.test.ts',
      ],
    },
    include: ['src/**/*.test.{ts,tsx}'], // ONLY unit tests
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.pbt.test.ts', // Exclude ALL property-based tests
      'src/test/**', // Exclude all test directory tests
      'src/renderer/renderingPipeline.integration.test.tsx',
      'src/renderer/themeManager.integration.test.ts',
    ],
    environmentMatchGlobs: [
      // Use jsdom for renderer tests (components, hooks, themeManager)
      ['src/renderer/**', 'jsdom'],
      // Use jsdom for core tests that use browser APIs (localStorage, window)
      ['src/core/bookmarkStore.test.ts', 'jsdom'],
      ['src/core/historyStore.test.ts', 'jsdom'],
      ['src/core/feedbackStore.test.ts', 'jsdom'],
      ['src/core/settingsStore.test.ts', 'jsdom'],
      // Use node for database-related core tests
      ['src/core/database/**', 'node'],
      ['src/core/**/*database*.test.ts', 'node'],
      ['src/core/integration.test.ts', 'node'],
      // Default core tests to node (can be overridden above)
      ['src/core/**', 'node'],
    ],
    // Use threads for better performance and stability
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
});
