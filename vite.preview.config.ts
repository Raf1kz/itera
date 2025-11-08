import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => ({
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
  // No test section - this config is for preview/build only
}));
