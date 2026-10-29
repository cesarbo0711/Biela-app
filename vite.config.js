import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // El puerto donde Vercel levanta sus funciones
        changeOrigin: true,
        secure: false,
      }
    }
  }
})