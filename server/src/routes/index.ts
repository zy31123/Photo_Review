import { Router } from 'express'
import { z } from 'zod'
import folders from './folders.js'
import photos from './photos.js'
import reviews from './reviews.js'
import similarity from './similarity.js'
import settings from './settings.js'
import batch from './batch.js'
import { getStats } from '../services/review.js'
import { validate } from '../middleware/validate.js'

const router = Router()

router.use('/folders', folders)
router.use('/photos', photos)
router.use('/reviews', reviews)
router.use('/similarity', similarity)
router.use('/settings', settings)
router.use('/batch', batch)

// Root-level stats endpoint (frontend calls GET /api/stats)
const statsSchema = z.object({
  folder: z.string().min(1, '缺少 folder 参数'),
})

router.get('/stats', validate(statsSchema), (req, res) => {
  res.json(getStats(req.query.folder as string))
})

export default router
