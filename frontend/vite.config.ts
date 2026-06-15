import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  base: '/userManage/',
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3005,
    host: true,
    allowedHosts: ['xn--3o2ba525hba.com', 'www.xn--3o2ba525hba.com', '여록여록.com', 'www.여록여록.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:3004',
        rewrite: (path) => path.replace(/^\/userManage/, ''),
        changeOrigin: true,
      },
      '/static': {
        target: 'http://localhost:3004',
        rewrite: (path) => path.replace(/^\/userManage/, ''),
        changeOrigin: true,
      },
    },
  },
})
