import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    strictPort: true,
    proxy: {
      '/api/bulk-import': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/authyo': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom')) return 'react-vendor'
          if (id.includes('node_modules/react/')) return 'react-vendor'
          if (id.includes('node_modules/framer-motion')) return 'motion'
          if (id.includes('node_modules/gsap')) return 'gsap'
          if (id.includes('node_modules/lenis')) return 'lenis'
        },
      },
    },
  },
})
