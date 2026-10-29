import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development the browser talks to Vite (5173) and Vite forwards /api to the Express server.
// That keeps everything same-origin, so the httpOnly login cookie just works.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: process.env.API_PROXY ?? 'http://127.0.0.1:4000', changeOrigin: false } },
  },
});
