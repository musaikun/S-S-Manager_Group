import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,
    allowedHosts: [
      'burghal-ardath-apodemal.ngrok-free.dev',
      '.ngrok-free.dev', // 全てのngrokホストを許可
      '.ngrok.io'
    ]
  }
})
