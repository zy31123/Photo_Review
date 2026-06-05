import { Router } from 'express'
import { z } from 'zod'
import { getPhotosForFolder, removePhoto } from '../services/scanner.js'
import { getReviewStatuses } from '../services/review.js'
import { getPhotoMetaBatch, setRating, toggleFavorite, setFavorite } from '../services/photoMeta.js'
import { getThumbnail, getFullImage, getImageMimeType } from '../services/image.js'
import { extractExif } from '../services/exif.js'
import { deletePhoto } from '../services/deleter.js'
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
  const photos = getPhotosForFolder(folder)

  const filePaths = photos.map(p => p.jpgPath || p.rawPaths[0] || '')
  const reviewMap = getReviewStatuses(filePaths)
  const metaMap = getPhotoMetaBatch(filePaths)

  const photosWithStatus = photos.map((p, i) => {
    const status = reviewMap.get(filePaths[i])
    const meta = metaMap.get(filePaths[i])
    return {
      ...p,
      reviewAction: status?.action || null,
      reviewedAt: status?.reviewedAt || null,
      rating: meta?.rating ?? 0,
      favorite: meta?.favorite ?? false,
    }
  })

  const status = req.query.status as string | undefined
  const subfolder = req.query.subfolder as string | undefined
  let filtered = photosWithStatus
  if (subfolder) {
    filtered = filtered.filter(p => p.subfolder === subfolder)
  }
  if (status === 'unreviewed') {
    filtered = filtered.filter(p => !p.reviewAction)
  } else if (status === 'reviewed') {
    filtered = filtered.filter(p => p.reviewAction)
  }

  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 2000
  const start = (page - 1) * limit
  const paged = filtered.slice(start, start + limit)

  res.json({
    photos: paged,
    total: filtered.length,
  })
})

// Set rating (0-5)
const ratingSchema = z.object({
  rating: z.number().int().min(0).max(5),
})

router.put('/:id/rating', loadPhoto, validate(ratingSchema, 'body'), (req, res) => {
  const filePath = req.photo!.jpgPath || req.photo!.rawPaths[0] || ''
  setRating(filePath, req.body.rating)
  res.json({ success: true })
})

// Toggle favorite
router.put('/:id/favorite', loadPhoto, (req, res) => {
  const filePath = req.photo!.jpgPath || req.photo!.rawPaths[0] || ''
  const nowFavorite = toggleFavorite(filePath)
  res.json({ success: true, favorite: nowFavorite })
})

// Set favorite (for undo — explicit value)
const favoriteSchema = z.object({
  favorite: z.boolean(),
})

router.put('/:id/favorite/set', loadPhoto, validate(favoriteSchema, 'body'), (req, res) => {
  const filePath = req.photo!.jpgPath || req.photo!.rawPaths[0] || ''
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

// Delete photo
router.delete('/:id', loadPhoto, asyncHandler(async (req, res) => {
  const deleted = await deletePhoto(req.photo!)
  removePhoto(req.photo!.id)
  res.json({ success: true, deleted })
}))

export default router
