import express from 'express'
import cors from 'cors'
import { getDb } from './db/index.js'
import routes from './routes/index.js'

const app = express()
const PORT = process.env.PORT || 3001

// Initialize database
getDb()

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }))
app.use(express.json())
app.use('/api', routes)

const server = app.listen(PORT, () => {
  console.log(`Photo Review server running at http://localhost:${PORT}`)
})

process.on('SIGTERM', () => server.close())
process.on('SIGINT', () => server.close())
