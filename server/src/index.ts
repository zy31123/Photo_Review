import express from 'express'
import cors from 'cors'
import { getDb } from './db/index.js'
import routes from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/requestLogger.js'
import { killPortOccupant } from './utils/cleanupPort.js'
import { PORT, CORS_ORIGINS } from './config.js'

await killPortOccupant(PORT)

// Initialize database
getDb()

const app = express()
app.use(cors({ origin: CORS_ORIGINS }))
app.use(express.json())
app.use(requestLogger)
app.use('/api', routes)
app.use(errorHandler)

process.on('uncaughtException', (err) => {
  console.error('[server] 未捕获异常:', err)
  process.exit(1)
})

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`Photo Review server running at http://127.0.0.1:${PORT}`)
})

server.on('error', (err: NodeJS.ErrnoException) => {
  console.error(`[server] 启动失败: ${err.message}`)
  process.exit(1)
})

process.on('SIGTERM', () => server.close())
process.on('SIGINT', () => server.close())
