import express from 'express'
import cors from 'cors'
import { getDb } from './db/index.js'
import routes from './routes/index.js'

const app = express()
const PORT = 3001

// Initialize database
getDb()

app.use(cors())
app.use(express.json())
app.use('/api', routes)

app.listen(PORT, () => {
  console.log(`Photo Review server running at http://localhost:${PORT}`)
})
