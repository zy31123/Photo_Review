import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if ('code' in err && (err as any).code === 'ECONNREFUSED') {
              console.log('[proxy] 后端尚未就绪，将在下次请求时重试...')
            }
          })
        },
      },
    },
  },
})
