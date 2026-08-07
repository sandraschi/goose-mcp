import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['goliath'],
    port: 10949,
    strictPort: true,
    host: "127.0.0.1",
    proxy: {
      '/api': { target: 'http://localhost:10948', changeOrigin: true },
      '/mcp': { target: 'http://localhost:10948', changeOrigin: true, ws: true },
    },
  },
  build: {
    outDir: '../dist',
    sourcemap: false,
  },
})
