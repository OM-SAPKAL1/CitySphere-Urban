import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import cesium from 'vite-plugin-cesium'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // @ts-ignore
    cesium(),
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
        headers: {
          'User-Agent': 'CitySphere-Urban/1.0 (urban-digital-twin)',
        },
      },
      '/api/overpass-kumi': {
        target: 'https://overpass.kumi.systems',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/overpass-kumi/, '/api/interpreter'),
        secure: true,
        headers: {
          'User-Agent': 'CitySphere-Urban/1.0 (urban-digital-twin)',
        },
      },
      '/api/overpass-lz4': {
        target: 'https://lz4.overpass-api.de',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/overpass-lz4/, '/api/interpreter'),
        secure: true,
        headers: {
          'User-Agent': 'CitySphere-Urban/1.0 (urban-digital-twin)',
        },
      },
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: {
    include: ['maplibre-gl', 'earcut', 'cesium'],
  },
})
