import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: true,
    proxy: {
      '/socket.io': {
        target: 'http://127.0.0.1:3001',
        ws: true
      },
      '/uploads': {
        target: 'http://127.0.0.1:3001'
      },
      '/api': {
        target: 'http://127.0.0.1:3001'
      }
    }
  }
})
