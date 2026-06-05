import { Router } from 'express'
import { z } from 'zod'
import { getPhotosForFolder } from '../services/scanner.js'
import { deleteOrphanedFiles } from '../services/deleter.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { validate } from '../middleware/validate.js'

const router = Router()

// Get orphaned files
const orphanedQuerySchema = z.object({
  folder: z.string().min(1, '缺少 folder 参数'),
})

router.get('/orphaned', validate(orphanedQuerySchema), (req, res) => {
  const folder = req.query.folder as string
  const photos = getPhotosForFolder(folder)
  const jpg = photos.filter(p => p.orphanType === 'jpg')
  const raw = photos.filter(p => p.orphanType === 'raw')
  res.json({ jpg, raw })
})

// Delete orphaned files
const deleteOrphanedSchema = z.object({
  type: z.enum(['jpg', 'raw'], { message: '无效类型' }),
  folder: z.string().min(1, '缺少 folder 参数'),
})

router.post('/orphaned', validate(deleteOrphanedSchema, 'body'), asyncHandler(async (req, res) => {
  const { type, folder } = req.body
  const photos = getPhotosForFolder(folder)
  const orphaned = photos.filter(p => p.orphanType === type)

  const result = await deleteOrphanedFiles(orphaned, type)
  res.json({ success: true, deleted: result.deleted, failed: result.failed })
}))

export default router
