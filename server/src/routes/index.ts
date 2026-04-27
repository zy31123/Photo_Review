import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { scanFolder, getPhotoById, getPhotosForFolder } from '../services/scanner.js'
import { setCurrentFolder, getCurrentFolder, recordReview, getRandomUnreviewedPhoto, getCacheDays, setCacheDays, getStats } from '../services/review.js'
import { getThumbnail, getFullImageStream, getImageMimeType } from '../services/image.js'
import { deletePhoto, deleteOrphanedFiles } from '../services/deleter.js'

const router = Router()

// Browse directories
router.get('/folders/browse', (req, res) => {
  const dir = (req.query.path as string) || os.homedir()

  try {
    const stat = fs.statSync(dir)
    if (!stat.isDirectory()) {
      return res.status(400).json({ message: '不是文件夹' })
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const children = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => ({
        name: e.name,
        path: path.join(dir, e.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))

    const parent = path.dirname(dir)
    res.json({
      current: dir,
      parent: parent !== dir ? parent : null,
      children,
    })
  } catch (e: any) {
    res.status(400).json({ message: e.message })
  }
})

// Scan folder
router.post('/folders/scan', (req, res) => {
  try {
    const { path: folderPath } = req.body
    if (!folderPath) return res.status(400).json({ message: '缺少文件夹路径' })

    const result = scanFolder(folderPath)
    setCurrentFolder(folderPath)
    res.json({
      total: result.total,
      paired: result.paired,
      orphanJpg: result.orphanJpg,
      orphanRaw: result.orphanRaw,
    })
  } catch (e: any) {
    res.status(400).json({ message: e.message })
  }
})

// Get photos list
router.get('/photos', (req, res) => {
  const folder = getCurrentFolder()
  const photos = getPhotosForFolder(folder).filter(p => !p.isOrphan)

  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 2000
  const start = (page - 1) * limit
  const paged = photos.slice(start, start + limit)

  res.json({
    photos: paged,
    total: photos.length,
  })
})

// Get thumbnail
router.get('/photos/:id/thumbnail', async (req, res) => {
  const photo = getPhotoById(req.params.id)
  if (!photo) return res.status(404).json({ message: '照片不存在' })

  const buf = await getThumbnail(photo)
  if (!buf) return res.status(404).json({ message: '无法生成缩略图' })

  res.set('Content-Type', 'image/jpeg')
  res.set('Cache-Control', 'public, max-age=3600')
  res.send(buf)
})

// Get full image
router.get('/photos/:id/full', (req, res) => {
  const photo = getPhotoById(req.params.id)
  if (!photo) return res.status(404).json({ message: '照片不存在' })

  const stream = getFullImageStream(photo)
  if (!stream) return res.status(404).json({ message: '无法读取图片' })

  res.set('Content-Type', getImageMimeType(photo))
  res.set('Cache-Control', 'public, max-age=86400')
  stream.pipe(res)
})

// Delete photo (JPG + RAW)
router.delete('/photos/:id', async (req, res) => {
  const photo = getPhotoById(req.params.id)
  if (!photo) return res.status(404).json({ message: '照片不存在' })

  try {
    const deleted = await deletePhoto(photo)
    res.json({ success: true, deleted })
  } catch (e: any) {
    res.status(500).json({ message: e.message })
  }
})

// Get orphaned files
router.get('/batch/orphaned', (req, res) => {
  const folder = getCurrentFolder()
  const photos = getPhotosForFolder(folder)
  const jpg = photos.filter(p => p.orphanType === 'jpg')
  const raw = photos.filter(p => p.orphanType === 'raw')
  res.json({ jpg, raw })
})

// Delete orphaned files
router.post('/batch/orphaned', async (req, res) => {
  const { type } = req.body
  if (!type || !['jpg', 'raw'].includes(type)) {
    return res.status(400).json({ message: '无效类型' })
  }

  const folder = getCurrentFolder()
  const photos = getPhotosForFolder(folder)
  const orphaned = photos.filter(p => p.orphanType === type)

  try {
    const count = await deleteOrphanedFiles(orphaned, type)
    res.json({ success: true, deleted: count })
  } catch (e: any) {
    res.status(500).json({ message: e.message })
  }
})

// Submit review
router.post('/reviews', (req, res) => {
  const { photoId, action, mode } = req.body
  if (!photoId || !action || !mode) {
    return res.status(400).json({ message: '参数不完整' })
  }

  const photo = getPhotoById(photoId)
  if (!photo) return res.status(404).json({ message: '照片不存在' })

  const filePath = photo.jpgPath || photo.rawPaths[0] || ''
  const cacheDays = mode === 'random' ? getCacheDays() : undefined
  recordReview(filePath, photo.name, action, mode, cacheDays)
  res.json({ success: true })
})

// Get random photo
router.get('/reviews/random', (req, res) => {
  const photo = getRandomUnreviewedPhoto()
  res.json(photo)
})

// Get stats
router.get('/stats', (req, res) => {
  res.json(getStats())
})

// Get settings
router.get('/settings', (req, res) => {
  const cacheDays = getCacheDays()
  res.json({ random_cache_days: String(cacheDays) })
})

// Update settings
router.put('/settings', (req, res) => {
  const { random_cache_days } = req.body
  if (random_cache_days) {
    setCacheDays(Number(random_cache_days))
  }
  res.json({ success: true })
})

export default router
