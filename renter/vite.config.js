import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['care_logo.png', 'favicon.ico'],
      manifest: {
        name: 'CARe',
        short_name: 'CARe',
        theme_color: '#F7A633',
        background_color: '#F7A633',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'care_logo.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'care_logo.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/jenkins/, /^\/api/, /^\/company/, /^\/ai/],
      },
    }),
  ],
  server: {
    port: 5174,
    proxy: {
      '/ai': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai/, '')
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true },
      '/ai/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai/, '') }
    }
  }
})
