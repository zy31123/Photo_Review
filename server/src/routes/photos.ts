import { Router } from 'express'
import { z } from 'zod'
import type { ReviewAction } from '@photo-review/shared'
import { getPhotosWithStatus } from '../services/photoQuery.js'
import { deletePhotoToTrash, restorePhoto, restorePhotos } from '../services/photoLifecycle.js'
import { getPrimaryPath } from '../utils/path.js'
import { setRating, toggleFavorite, setFavorite } from '../services/photoMeta.js'
import { getThumbnail, getFullImage, getImageMimeType } from '../services/image.js'
import { extractExif } from '../services/exif.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { validate } from '../middleware/validate.js'
import { loadPhoto } from '../middleware/loadPhoto.js'
import { NotFoundError } from '../middleware/errorHandler.js'

const router = Router()

// Get photos list
const photosQuerySchema = z.object({
  folder: z.string().min(1, '缺少 folder 参数'),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  status: z.enum(['unreviewed', 'reviewed']).optional(),
  subfolder: z.string().optional(),
})

router.get('/', validate(photosQuerySchema), (req, res) => {
  const folder = req.query.folder as string
  const result = getPhotosWithStatus(folder, {
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    status: req.query.status as 'unreviewed' | 'reviewed' | undefined,
    subfolder: req.query.subfolder as string | undefined,
  })
  res.json(result)
})

// Set rating (0-5)
const ratingSchema = z.object({
  rating: z.number().int().min(0).max(5),
})

router.put('/:id/rating', loadPhoto, validate(ratingSchema, 'body'), (req, res) => {
  const filePath = getPrimaryPath(req.photo!) || ''
  setRating(filePath, req.body.rating)
  res.json({ success: true })
})

// Toggle favorite
router.put('/:id/favorite', loadPhoto, (req, res) => {
  const filePath = getPrimaryPath(req.photo!) || ''
  const nowFavorite = toggleFavorite(filePath)
  res.json({ success: true, favorite: nowFavorite })
})

// Set favorite (for undo — explicit value)
const favoriteSchema = z.object({
  favorite: z.boolean(),
})

router.put('/:id/favorite/set', loadPhoto, validate(favoriteSchema, 'body'), (req, res) => {
  const filePath = getPrimaryPath(req.photo!) || ''
  setFavorite(filePath, req.body.favorite)
  res.json({ success: true })
})

// Get thumbnail
router.get('/:id/thumbnail', loadPhoto, asyncHandler(async (req, res) => {
  const buf = await getThumbnail(req.photo!)
  if (!buf) throw new NotFoundError('无法生成缩略图')

  res.set('Content-Type', 'image/jpeg')
  res.set('Cache-Control', 'public, max-age=3600')
  res.send(buf)
}))

// Get full image
router.get('/:id/full', loadPhoto, asyncHandler(async (req, res) => {
  const data = await getFullImage(req.photo!)
  if (!data) throw new NotFoundError('无法读取图片')

  res.set('Content-Type', getImageMimeType(req.photo!))
  res.set('Cache-Control', 'public, max-age=86400')
  if (Buffer.isBuffer(data)) {
    res.send(data)
  } else {
    data.pipe(res)
  }
}))

// Get EXIF data
router.get('/:id/exif', loadPhoto, asyncHandler(async (req, res) => {
  const exif = await extractExif(req.photo!)
  if (!exif) { res.json(null); return }
  res.json(exif)
}))

// Delete photo (move to app trash)
router.delete('/:id', loadPhoto, (req, res) => {
  const result = deletePhotoToTrash(req.photo!)
  if (!result.success) {
    res.status(500).json({ success: false, message: result.message })
    return
  }
  res.json({ success: true, trashPaths: result.trashPaths })
})

// Restore a deleted photo
const restoreSchema = z.object({
  photoId: z.string().min(1),
  trashPaths: z.record(z.string(), z.string()),
  previousReviewAction: z.string().nullable().optional(),
})

router.post('/restore', validate(restoreSchema, 'body'), (req, res) => {
  const { photoId, trashPaths, previousReviewAction } = req.body
  const photo = restorePhoto({
    photoId,
    trashPaths,
    previousReviewAction: (previousReviewAction as ReviewAction) ?? null,
  })
  if (!photo) {
    res.status(404).json({ success: false, message: '恢复失败，未找到记录或文件' })
    return
  }
  res.json({ success: true, photo })
})

// Batch restore deleted photos
const restoreBatchSchema = z.object({
  items: z.array(z.object({
    photoId: z.string().min(1),
    trashPaths: z.record(z.string(), z.string()),
    previousReviewAction: z.string().nullable().optional(),
  })),
})

router.post('/restore-batch', validate(restoreBatchSchema, 'body'), (req, res) => {
  const items = req.body.items.map((item: { photoId: string; trashPaths: Record<string, string>; previousReviewAction?: string | null }) => ({
    photoId: item.photoId,
    trashPaths: item.trashPaths,
    previousReviewAction: (item.previousReviewAction as ReviewAction) ?? null,
  }))
  const photos = restorePhotos(items)
  res.json({ success: true, photos })
})

export default router
