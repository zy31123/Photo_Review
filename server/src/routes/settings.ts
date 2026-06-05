import { Router } from 'express'
import { z } from 'zod'
import { getCacheDays, setCacheDays } from '../services/review.js'
import { validate } from '../middleware/validate.js'
import { ValidationError } from '../middleware/errorHandler.js'

const router = Router()

// Get settings
router.get('/', (_req, res) => {
  const cacheDays = getCacheDays()
  res.json({ random_cache_days: String(cacheDays) })
})

// Update settings
const settingsSchema = z.object({
  random_cache_days: z.string().optional(),
})

router.put('/', validate(settingsSchema, 'body'), (req, res) => {
  const { random_cache_days } = req.body
  if (random_cache_days) {
    const days = Number(random_cache_days)
    if (isNaN(days) || days < 1) throw new ValidationError('缓存天数必须为正整数')
    setCacheDays(days)
  }
  res.json({ success: true })
})

export default router
