import { Router } from 'express'
import { z } from 'zod'
import { getPhotoById, getPhotosForFolder } from '../services/photoStore.js'
import { scanFolder } from '../services/scanner.js'
import { getPrimaryPath } from '../utils/path.js'
import { recordReview, getRandomUnreviewedPhoto, getRandomUnreviewedPhotos, getCacheDays, deleteReviewRecord } from '../services/review.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { validate } from '../middleware/validate.js'
import { NotFoundError, ForbiddenError, ValidationError } from '../middleware/errorHandler.js'
import { isPathAllowed } from '../utils/security.js'

const router = Router()

// Submit review
const reviewSchema = z.object({
  photoId: z.string().min(1, '缺少 photoId'),
  action: z.enum(['keep', 'deleted'], { message: 'action 必须为 keep 或 deleted' }),
  mode: z.enum(['sequential', 'random'], { message: 'mode 必须为 sequential 或 random' }),
})

router.post('/', validate(reviewSchema, 'body'), (req, res) => {
  const { photoId, action, mode } = req.body

  const photo = getPhotoById(photoId)
  if (!photo) throw new NotFoundError('照片不存在')

  const filePath = getPrimaryPath(photo) || ''
  const cacheDays = mode === 'random' ? getCacheDays() : undefined
  recordReview(filePath, photo.name, action, mode, cacheDays)
  res.json({ success: true })
})

// Delete review record (for undo)
router.delete('/:photoId', (req, res) => {
  const photo = getPhotoById(req.params.photoId)
  if (!photo) throw new NotFoundError('照片不存在')

  const filePath = getPrimaryPath(photo) || ''
  deleteReviewRecord(filePath)
  res.json({ success: true })
})

// Get random photo
const randomSchema = z.object({
  folder: z.string().min(1, '缺少 folder 参数'),
})

router.get('/random', validate(randomSchema), asyncHandler(async (req, res) => {
  const folder = req.query.folder as string
  if (!isPathAllowed(folder)) throw new ForbiddenError('不允许访问此路径')
  if (getPhotosForFolder(folder).length === 0) {
    try { await scanFolder(folder) } catch (e: any) { throw new ValidationError(e.message) }
  }
  const photo = getRandomUnreviewedPhoto(folder)
  res.json(photo)
}))

// Get batch of random photos
const randomBatchSchema = z.object({
  folder: z.string().min(1, '缺少 folder 参数'),
  count: z.coerce.number().int().min(1).max(100).optional(),
})

router.get('/random/batch', validate(randomBatchSchema), asyncHandler(async (req, res) => {
  const folder = req.query.folder as string
  if (!isPathAllowed(folder)) throw new ForbiddenError('不允许访问此路径')
  const count = Math.min(Math.max(Number(req.query.count) || 20, 1), 100)
  if (getPhotosForFolder(folder).length === 0) {
    try { await scanFolder(folder) } catch (e: any) { throw new ValidationError(e.message) }
  }
  const photos = getRandomUnreviewedPhotos(folder, count)
  res.json({ photos, total: photos.length })
}))

export default router
