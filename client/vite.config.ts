import { rm } from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function removeDevOnlyPublicAssets() {
  return {
    name: 'remove-dev-only-public-assets',
    apply: 'build' as const,
    closeBundle: async () => {
      await rm(fileURLToPath(new URL('./dist/mockServiceWorker.js', import.meta.url)), {
        force: true,
      })
    },
  }
}

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/main.tsx', 'src/mocks/**', 'src/test/**'],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,

      pwaAssets: {
        disabled: false,
        config: true,
      },

      manifest: {
        name: 'CoachMatch',
        short_name: 'CoachMatch',
        description: 'Seu personal, sem adivinhação.',
        theme_color: '#F4FFC6',
      },

      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        globIgnores: ['**/mockServiceWorker.js'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },

      devOptions: {
        enabled: false,
        navigateFallback: 'index.html',
        suppressWarnings: true,
        type: 'module',
      },
    }),
    removeDevOnlyPublicAssets(),
  ],
})
