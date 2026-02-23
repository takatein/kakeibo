import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/kakeibo/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Kakeibo AI - 概算家計管理',
        short_name: 'Kakeibo AI',
        description: 'きっちり記録しない。なんとなく把握できる。それでいい。',
        theme_color: '#1E3A5F',
        background_color: '#F5F5F5',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/kakeibo/',
        start_url: '/kakeibo/',
        icons: [
          {
            src: '/kakeibo/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/kakeibo/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/kakeibo/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
})
