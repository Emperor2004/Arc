import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
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
    include: ['src/**/*.{test,pbt.test}.{ts,tsx}'],
    environmentMatchGlobs: [
      ['src/renderer/**', 'jsdom'],
    ],
  },
});
