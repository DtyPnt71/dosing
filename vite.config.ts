import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'favicon.png', 'apple-touch-icon.png', 'logo.png', 'html2pdf.bundle.js'],
      manifest: {
        id: './',
        name: 'HDT GmbH Dosier-Tool',
        short_name: 'Dosier-Tool',
        description: 'Berechnung und Dokumentation von Mischungsverhältnissen für HDT Dosiertechnik.',
        lang: 'de',
        theme_color: '#f1f5f8',
        background_color: '#f1f5f8',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/dosing-v1-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/dosing-v1-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/dosing-v1-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,json}'],
        globIgnores: ['version.json'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html'
      }
    })
  ]
})
