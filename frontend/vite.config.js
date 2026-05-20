import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    middlewareMode: false,
    middleware: [
      (req, res, next) => {
        // SPA fallback: serve index.html for all non-file requests
        if (!req.url.includes('.') && !req.url.startsWith('/api')) {
          req.url = '/index.html';
        }
        next();
      }
    ]
  },
})
