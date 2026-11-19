import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The browser talks to /api on this same address, and Vite passes those calls on
    // to the Express server. One address means the login cookies work without extra setup.
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
