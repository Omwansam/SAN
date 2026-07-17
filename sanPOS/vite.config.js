import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // PWA is web-build only (set VITE_ENABLE_PWA=1 in the Docker build). It must
  // stay OFF for the desktop bundle — a service worker would fight the
  // Electron app:// protocol handler.
  const enablePwa = env.VITE_ENABLE_PWA === '1'

  const plugins = [react()]
  if (enablePwa) {
    const { VitePWA } = await import('vite-plugin-pwa')
    plugins.push(
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'SanPOS',
          short_name: 'SanPOS',
          description: 'Point of sale',
          theme_color: '#111827',
          background_color: '#f9fafb',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          ],
        },
        workbox: {
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /^\/api\//,
              handler: 'NetworkFirst',
              options: { cacheName: 'api', networkTimeoutSeconds: 5 },
            },
          ],
        },
      }),
    )
  }

  return {
    plugins,
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (id.includes('recharts')) return 'recharts'
            if (id.includes('@fullcalendar')) return 'fullcalendar'
            if (id.includes('lucide-react')) return 'lucide'
            if (id.includes('date-fns')) return 'datefns'
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf'
            if (id.includes('@radix-ui')) return 'radix'
            if (id.includes('papaparse')) return 'papaparse'
            return 'vendor'
          },
        },
      },
    },
  }
})
