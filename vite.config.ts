import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    base: '/',
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: false,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            if (id.includes('@firebase/firestore') || id.includes('firebase/firestore')) return 'vendor-firebase-firestore';
            if (id.includes('@firebase/auth') || id.includes('firebase/auth')) return 'vendor-firebase-auth';
            if (id.includes('@firebase/storage') || id.includes('firebase/storage')) return 'vendor-firebase-storage';
            if (id.includes('@firebase/') || id.includes('firebase/')) return 'vendor-firebase-core';
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/scheduler/')
            ) return 'vendor-react';
            if (id.includes('motion')) return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('react-quill') || id.includes('quill')) return 'vendor-editor';
            if (id.includes('@google/genai')) return 'vendor-ai';
            if (id.includes('@base-ui') || id.includes('sonner') || id.includes('class-variance-authority')) return 'vendor-ui';
          },
        },
      },
    },
  };
});
