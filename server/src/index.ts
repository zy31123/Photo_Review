import express from 'express'
import cors from 'cors'
import { execSync } from 'child_process'
import { getDb } from './db/index.js'
import routes from './routes/index.js'

const app = express()
const PORT = process.env.PORT || 3001

function killPortOccupant(port: number) {
  try {
    const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const match = out.match(/\s+(\d+)\s*$/m)
    if (match) {
      const pid = Number(match[1])
      console.log(`[server] 端口 ${port} 被 PID ${pid} 占用，正在终止...`)
      process.kill(pid)
      const deadline = Date.now() + 3000
      while (Date.now() < deadline) {
        try {
          const check = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          })
          if (!check.trim()) break
        } catch { break }
      }
    }
  } catch {
    // 端口空闲
  }
}

killPortOccupant(Number(PORT))

// Initialize database
getDb()

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }))
app.use(express.json())
app.use('/api', routes)

process.on('uncaughtException', (err) => {
  console.error('[server] 未捕获异常:', err)
  process.exit(1)
})

const server = app.listen(Number(PORT), '127.0.0.1', () => {
  console.log(`Photo Review server running at http://127.0.0.1:${PORT}`)
})

server.on('error', (err: NodeJS.ErrnoException) => {
  console.error(`[server] 启动失败: ${err.message}`)
  process.exit(1)
})

process.on('SIGTERM', () => server.close())
process.on('SIGINT', () => server.close())
