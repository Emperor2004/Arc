import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      external: ['better-sqlite3', 'path', 'fs', 'electron', 'util', 'os', 'crypto']
    }
  },
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      // Use browser-safe database implementation in renderer
      '@core/database/DatabaseManager': resolve(__dirname, 'src/core/database.browser.ts'),
      '@core/database': resolve(__dirname, 'src/core/database.browser.ts')
    }
  },
  server: {
    port: 3000,
    strictPort: true,
    host: 'localhost'
  },
  define: {
    'process.env': {},
    'process.platform': '"browser"',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  optimizeDeps: {
    exclude: ['better-sqlite3', 'fs', 'path', 'util', 'os', 'crypto']
  }
})