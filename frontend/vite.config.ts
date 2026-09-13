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
    port: 3005,
    proxy: {
      // dev 도 base '/userManage/' 를 쓰므로 axios baseURL 이 '/userManage/api'.
      // '/api' 로만 매칭하면 SPA fallback 이 index.html 을 돌려줘서 axios 가
      // HTML 문자열을 데이터로 받아 렌더가 깨짐.
      '/userManage/api': {
        target: 'http://localhost:3004',
        rewrite: (path) => path.replace(/^\/userManage/, ''),
        changeOrigin: true,
      },
      '/userManage/static': {
        target: 'http://localhost:3004',
        rewrite: (path) => path.replace(/^\/userManage/, ''),
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3005,
    host: true,
    allowedHosts: ['xn--3o2ba525hba.com', 'www.xn--3o2ba525hba.com', '여록여록.com', 'www.여록여록.com'],
    proxy: {
      // 브라우저가 요청하는 실제 prefix(/userManage/api, /userManage/static)를
      // 그대로 매칭해야 함. 이전에 '/api'로만 두면 SPA fallback 이 index.html 을
      // 돌려줘서 모든 API 콜이 조용히 실패했음.
      '/userManage/api': {
        target: 'http://localhost:3004',
        rewrite: (path) => path.replace(/^\/userManage/, ''),
        changeOrigin: true,
      },
      '/userManage/static': {
        target: 'http://localhost:3004',
        rewrite: (path) => path.replace(/^\/userManage/, ''),
        changeOrigin: true,
      },
    },
  },
})
