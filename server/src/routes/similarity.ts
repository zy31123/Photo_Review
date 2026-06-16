import { Router } from 'express'
import { z } from 'zod'
import { analyzeFolder, getSimilarGroups, getSimilarStats } from '../services/similarity/index.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { validate } from '../middleware/validate.js'
import { ForbiddenError } from '../middleware/errorHandler.js'
import { isPathAllowed } from '../utils/security.js'

const router = Router()

// Analyze folder for similar photos (SSE streaming progress)
const analyzeSchema = z.object({
  folder: z.string().min(1, '缺少 folder 参数'),
  timeGap: z.number().optional(),
  strictThreshold: z.number().optional(),
  relaxedThreshold: z.number().optional(),
})

router.post('/analyze', validate(analyzeSchema, 'body'), async (req, res) => {
  const { folder, timeGap, strictThreshold, relaxedThreshold } = req.body
  if (!isPathAllowed(folder)) throw new ForbiddenError('不允许访问此路径')

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  // 客户端断开时中止分析
  const controller = new AbortController()
  req.on('close', () => controller.abort())

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  // 15 秒心跳保活（背压时跳过本次，下次重试）
  const heartbeat = setInterval(() => {
    send('heartbeat', null)
  }, 15000)

  controller.signal.addEventListener('abort', () => {
    clearInterval(heartbeat)
    console.log('[sse] 客户端断开，中止分析')
  })

  try {
    const result = await analyzeFolder(
      folder,
      timeGap,
      strictThreshold,
      relaxedThreshold,
      (current, total) => {
        if (!controller.signal.aborted) send('progress', { current, total })
      },
      controller.signal,
    )
    if (!controller.signal.aborted) {
      send('complete', result)
    }
  } catch (e: any) {
    if (!controller.signal.aborted) {
      send('error', { message: e.message })
    }
  } finally {
    clearInterval(heartbeat)
    res.end()
  }
})

// Get similar groups
const groupsSchema = z.object({
  folder: z.string().min(1, '缺少 folder 参数'),
  timeGap: z.coerce.number().optional(),
  strictThreshold: z.coerce.number().optional(),
  relaxedThreshold: z.coerce.number().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
})

router.get('/groups', validate(groupsSchema), (req, res) => {
  const folder = req.query.folder as string
  if (!isPathAllowed(folder)) throw new ForbiddenError('不允许访问此路径')

  const timeGap = req.query.timeGap !== undefined ? Number(req.query.timeGap) : undefined
  const strictThreshold = req.query.strictThreshold !== undefined ? Number(req.query.strictThreshold) : undefined
  const relaxedThreshold = req.query.relaxedThreshold !== undefined ? Number(req.query.relaxedThreshold) : undefined
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 50

  const groups = getSimilarGroups(folder, timeGap, strictThreshold, relaxedThreshold)
  const start = (page - 1) * limit
  const paged = groups.slice(start, start + limit)

  res.json({ groups: paged, total: groups.length })
})

// Get similarity stats
const statsSchema = z.object({
  folder: z.string().min(1, '缺少 folder 参数'),
  timeGap: z.coerce.number().optional(),
  strictThreshold: z.coerce.number().optional(),
  relaxedThreshold: z.coerce.number().optional(),
})

router.get('/stats', validate(statsSchema), (req, res) => {
  const folder = req.query.folder as string
  if (!isPathAllowed(folder)) throw new ForbiddenError('不允许访问此路径')

  const timeGap = req.query.timeGap !== undefined ? Number(req.query.timeGap) : undefined
  const strictThreshold = req.query.strictThreshold !== undefined ? Number(req.query.strictThreshold) : undefined
  const relaxedThreshold = req.query.relaxedThreshold !== undefined ? Number(req.query.relaxedThreshold) : undefined

  const stats = getSimilarStats(folder, timeGap, strictThreshold, relaxedThreshold)
  res.json(stats)
})

export default router
