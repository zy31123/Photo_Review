import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const frontendPort = Number(env.FRONTEND_PORT) || 5173
  const backendPort = Number(env.BACKEND_PORT || env.PORT) || 3001

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: frontendPort,
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${backendPort}`,
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
  }
})
