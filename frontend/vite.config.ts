import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api/instituciones': {
        target: 'http://localhost:3004',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/instituciones/, ''),
      },
      '/api/deportes': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deportes/, ''),
      },
      '/api/equipos': {
        target: 'http://localhost:3006',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/equipos/, ''),
      },
      '/api/participantes': {
        target: 'http://localhost:3007',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/participantes/, ''),
      },
      '/api/encuentros': {
        target: 'http://localhost:3008',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/encuentros/, ''),
      },
      '/api/resultados': {
        target: 'http://localhost:3009',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/resultados/, ''),
      },
      '/api/estadisticas': {
        target: 'http://localhost:3010',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/estadisticas/, ''),
      },
      '/api/notificaciones': {
        target: 'http://localhost:3011',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/notificaciones/, ''),
      },
    },
  },
})
