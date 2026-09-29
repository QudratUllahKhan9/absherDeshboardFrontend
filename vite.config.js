import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev me /api requests backend (5000) par proxy ho jati hain — CORS ka jhanjhat nahi
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
