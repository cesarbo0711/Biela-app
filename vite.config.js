import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'icon-192.png',
        'icon-512.png',
      ],
      manifest: {
        name: 'Biela — Taller & Bitácora Vehicular',
        short_name: 'Biela',
        description: 'Bitácora de mantenimiento, control de combustible, radar vial y asistente mecánico IA para tu moto.',
        lang: 'es',
        theme_color: '#050505',
        background_color: '#050505',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/favicon.ico',
            sizes: '48x48',
            type: 'image/x-icon',
            purpose: 'any',
          },
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
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
