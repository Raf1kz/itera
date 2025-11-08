import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  // Explicitly load environment variables from .env files
  loadEnv(mode, process.cwd(), '');

  return {
  plugins: [react()],
  resolve: {
    alias: {
      'jsr:@supabase/functions-js/edge-runtime.d.ts': pathResolve(
        rootDir,
        'tests/mocks/edge-runtime.ts'
      ),
      'https://deno.land/x/zod@v3.22.4/mod.ts': 'zod'
    }
  },
  build: {
    target: 'es2022',
    sourcemap: mode !== 'production' ? 'hidden' : false,
    cssMinify: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  // Explicitly expose environment variables to the client
  envPrefix: ['VITE_'],
  test: {
    environment: 'node',
    globals: false,
    restoreMocks: true,
    include: [
      'tests/**/*.test.{ts,tsx,js,jsx}',
      'tests/**/*.spec.{ts,tsx,js,jsx}',
      'src/**/*.{test,spec}.{ts,tsx,js,jsx}'
    ],
    exclude: ['tests/smoke/**', 'node_modules/**'],
  },
}});

