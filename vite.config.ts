import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api/sandbox': {
        target: 'http://127.0.0.1:4273',
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api/sandbox': {
        target: 'http://127.0.0.1:4273',
        changeOrigin: true,
      },
    },
  },
})
