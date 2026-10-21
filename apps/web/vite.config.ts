import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    // Same shape as production: the app calls /api, Caddy (here: Vite) forwards to the api.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
