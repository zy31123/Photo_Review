import { Router } from 'express'
import { z } from 'zod'
import { getPhotosForFolder, removePhoto, addPhoto } from '../services/scanner.js'
import { getReviewStatuses, recordReview, deleteReviewRecord } from '../services/review.js'
import { getPhotoMetaBatch, setRating, toggleFavorite, setFavorite } from '../services/photoMeta.js'
import { getThumbnail, getFullImage, getImageMimeType } from '../services/image.js'
import { extractExif } from '../services/exif.js'
import { moveToTrash, restoreFromTrash } from '../services/trash.js'
import { getDb } from '../db/index.js'
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
  const limit = Number(req.query.limit) || 5000
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

// Delete photo (move to app trash)
router.delete('/:id', loadPhoto, asyncHandler(async (req, res) => {
  const photo = req.photo!
  const { trashPaths, failed } = moveToTrash(photo)

  if (Object.keys(trashPaths).length === 0) {
    res.status(500).json({ success: false, message: '无法移动文件到回收站' })
    return
  }

  // Record in deleted_photos table for undo
  const db = getDb()
  const originalPaths = [photo.jpgPath, ...photo.rawPaths].filter(Boolean) as string[]
  db.prepare(`
    INSERT OR REPLACE INTO deleted_photos (id, original_paths, trash_paths, photo_data, folder)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    photo.id,
    JSON.stringify(originalPaths),
    JSON.stringify(trashPaths),
    JSON.stringify(photo),
    photo.folder,
  )

  removePhoto(photo.id)
  res.json({ success: true, trashPaths })
}))

// Restore a deleted photo
const restoreSchema = z.object({
  photoId: z.string().min(1),
  trashPaths: z.record(z.string(), z.string()),
  previousReviewAction: z.string().nullable().optional(),
})

router.post('/restore', validate(restoreSchema, 'body'), asyncHandler(async (req, res) => {
  const { photoId, trashPaths, previousReviewAction } = req.body

  // Restore files from trash
  const { restored, failed } = restoreFromTrash(photoId, trashPaths)
  if (restored.length === 0) {
    res.status(404).json({ success: false, message: '回收站中未找到文件' })
    return
  }

  // Read photo data from deleted_photos
  const db = getDb()
  const row = db.prepare('SELECT photo_data, folder FROM deleted_photos WHERE id = ?').get(photoId) as { photo_data: string; folder: string } | undefined

  if (!row) {
    res.status(404).json({ success: false, message: '未找到已删除照片记录' })
    return
  }

  const photoData = JSON.parse(row.photo_data)

  // Re-add to in-memory store
  addPhoto(photoData)

  // Handle review record
  const filePath = photoData.jpgPath || photoData.rawPaths?.[0] || ''
  if (previousReviewAction) {
    recordReview(filePath, photoData.name, previousReviewAction as 'keep' | 'deleted', 'sequential')
  } else {
    deleteReviewRecord(filePath)
  }

  // Remove from deleted_photos
  db.prepare('DELETE FROM deleted_photos WHERE id = ?').run(photoId)

  // Re-fetch with status
  const reviewMap = getReviewStatuses([filePath])
  const metaMap = getPhotoMetaBatch([filePath])
  const status = reviewMap.get(filePath)
  const meta = metaMap.get(filePath)
  const restoredPhoto = {
    ...photoData,
    reviewAction: status?.action || null,
    reviewedAt: status?.reviewedAt || null,
    rating: meta?.rating ?? 0,
    favorite: meta?.favorite ?? false,
  }

  res.json({ success: true, photo: restoredPhoto })
}))

// Batch restore deleted photos
const restoreBatchSchema = z.object({
  items: z.array(z.object({
    photoId: z.string().min(1),
    trashPaths: z.record(z.string(), z.string()),
    previousReviewAction: z.string().nullable().optional(),
  })),
})

router.post('/restore-batch', validate(restoreBatchSchema, 'body'), asyncHandler(async (req, res) => {
  const { items } = req.body
  const db = getDb()
  const restoredPhotos: any[] = []

  for (const item of items) {
    const { restored } = restoreFromTrash(item.photoId, item.trashPaths)
    if (restored.length === 0) continue

    const row = db.prepare('SELECT photo_data, folder FROM deleted_photos WHERE id = ?').get(item.photoId) as { photo_data: string; folder: string } | undefined
    if (!row) continue

    const photoData = JSON.parse(row.photo_data)
    addPhoto(photoData)

    const filePath = photoData.jpgPath || photoData.rawPaths?.[0] || ''
    if (item.previousReviewAction) {
      recordReview(filePath, photoData.name, item.previousReviewAction as 'keep' | 'deleted', 'sequential')
    } else {
      deleteReviewRecord(filePath)
    }

    db.prepare('DELETE FROM deleted_photos WHERE id = ?').run(item.photoId)
    restoredPhotos.push(photoData)
  }

  res.json({ success: true, photos: restoredPhotos })
}))

export default router
