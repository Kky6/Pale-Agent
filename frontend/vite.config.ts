import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // 移除这个rewrite，保持/api前缀
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
