import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
})
