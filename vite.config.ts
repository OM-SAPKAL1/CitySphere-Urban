import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api/overpass-de': {
        target: 'https://overpass-api.de',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/overpass-de/, '/api/interpreter'),
        secure: true,
      },
      '/api/overpass-kumi': {
        target: 'https://overpass.kumi.systems',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/overpass-kumi/, '/api/interpreter'),
        secure: true,
      },
      '/api/overpass-lz4': {
        target: 'https://lz4.overpass-api.de',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/overpass-lz4/, '/api/interpreter'),
        secure: true,
      },
    },
  },
  optimizeDeps: {
    include: ['three', 'maplibre-gl', 'earcut'],
  },
})
