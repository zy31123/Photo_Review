import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { scanFolder, getPhotoById, getPhotosForFolder, removePhoto, getSubfolders } from '../services/scanner.js'
import { recordReview, getRandomUnreviewedPhoto, getRandomUnreviewedPhotos, getCacheDays, setCacheDays, getStats, getReviewStatuses } from '../services/review.js'
import { getThumbnail, getFullImage, getImageMimeType } from '../services/image.js'
import { deletePhoto, deleteOrphanedFiles } from '../services/deleter.js'
import { extractExif } from '../services/exif.js'
import { resolveNormalized } from '../utils/path.js'
import { analyzeFolder, getSimilarGroups, getSimilarStats } from '../services/similarity.js'

const BLOCKED_PREFIXES = [
  '/etc', '/usr', '/bin', '/sbin', '/var', '/System', '/Library',
  '/private/etc', '/private/var', '/dev', '/proc', '/sys',
  'C:/Windows', 'C:/Program Files', 'C:/Program Files (x86)', 'C:/ProgramData',
]

function isPathAllowed(p: string): boolean {
  const resolved = resolveNormalized(p).toLowerCase()
  return !BLOCKED_PREFIXES.some(prefix => resolved === prefix.toLowerCase() || resolved.startsWith(prefix.toLowerCase() + '/'))
}

function isWindowsDriveRoot(p: string): boolean {
  return process.platform === 'win32' && /^[A-Za-z]:\\$/.test(p)
}

let cachedDrives: string[] | null = null
let drivesCacheTime = 0
const DRIVES_CACHE_TTL = 30_000

function getWindowsDrives(): string[] {
  if (cachedDrives && Date.now() - drivesCacheTime < DRIVES_CACHE_TTL) return cachedDrives
  try {
    const result = execSync(
      'powershell -Command "Get-PSDrive -PSProvider FileSystem | Select-Object -ExpandProperty Root"',
      { encoding: 'utf-8', timeout: 5000 }
    )
    cachedDrives = result
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0 && /^[A-Za-z]:\\$/i.test(line))
    drivesCacheTime = Date.now()
    return cachedDrives
  } catch {
    return ['C:\\']
  }
}

function getMacVolumes(): { name: string; path: string }[] {
  const volumes: { name: string; path: string }[] = [
    { name: 'Macintosh HD (系统盘)', path: '/' },
  ]
  try {
    const entries = fs.readdirSync('/Volumes', { withFileTypes: true })
    for (const e of entries) {
      if (e.isDirectory() && e.name !== 'Macintosh HD') {
        volumes.push({ name: e.name, path: `/Volumes/${e.name}` })
      }
    }
  } catch {
    // /Volumes not accessible, return just system disk
  }
  return volumes
}

const router = Router()

// Browse directories
router.get('/folders/browse', (req, res) => {
  const dir = req.query.path as string

  // Virtual root: list available drives/volumes
  if (dir === '') {
    if (process.platform === 'win32') {
      const drives = getWindowsDrives()
      return res.json({
        current: '',
        parent: null,
        children: drives.map(d => ({ name: d, path: d })),
      })
    } else {
      return res.json({
        current: '',
        parent: null,
        children: getMacVolumes(),
      })
    }
  }

  const targetDir = (dir || os.homedir()).replace(/[A-Za-z]:$/, '$&\\')

  if (!isPathAllowed(targetDir)) {
    return res.status(403).json({ message: '不允许访问此路径' })
  }

  try {
    const stat = fs.statSync(targetDir)
    if (!stat.isDirectory()) {
      return res.status(400).json({ message: '不是文件夹' })
    }

    const entries = fs.readdirSync(targetDir, { withFileTypes: true })
    const children = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => ({
        name: e.name,
        path: path.join(targetDir, e.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))

    const parent = path.dirname(targetDir)
    const effectiveParent = parent !== targetDir
      ? parent
      : (isWindowsDriveRoot(targetDir) || targetDir === '/' ? '' : null)

    res.json({
      current: targetDir,
      parent: effectiveParent,
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
    if (!isPathAllowed(folderPath)) return res.status(403).json({ message: '不允许访问此路径' })

    const result = scanFolder(folderPath)
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

// Get subfolders
router.get('/folders/subfolders', (req, res) => {
  const folder = req.query.folder as string
  if (!folder) return res.status(400).json({ message: '缺少 folder 参数' })
  res.json(getSubfolders(folder))
})

// Get photos list
router.get('/photos', (req, res) => {
  const folder = req.query.folder as string
  if (!folder) return res.status(400).json({ message: '缺少 folder 参数' })
  const photos = getPhotosForFolder(folder)

  const filePaths = photos.map(p => p.jpgPath || p.rawPaths[0] || '')
  const reviewMap = getReviewStatuses(filePaths)

  const photosWithStatus = photos.map((p, i) => {
    const status = reviewMap.get(filePaths[i])
    return {
      ...p,
      reviewAction: status?.action || null,
      reviewedAt: status?.reviewedAt || null,
    }
  })

  const status = req.query.status as string
  const subfolder = req.query.subfolder as string
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
router.get('/photos/:id/full', async (req, res) => {
  const photo = getPhotoById(req.params.id)
  if (!photo) return res.status(404).json({ message: '照片不存在' })

  const data = await getFullImage(photo)
  if (!data) return res.status(404).json({ message: '无法读取图片' })

  res.set('Content-Type', getImageMimeType(photo))
  res.set('Cache-Control', 'public, max-age=86400')
  if (Buffer.isBuffer(data)) {
    res.send(data)
  } else {
    data.pipe(res)
  }
})

// Delete photo (JPG + RAW)
router.delete('/photos/:id', async (req, res) => {
  const photo = getPhotoById(req.params.id)
  if (!photo) return res.status(404).json({ message: '照片不存在' })

  try {
    const deleted = await deletePhoto(photo)
    removePhoto(photo.id)
    res.json({ success: true, deleted })
  } catch (e: any) {
    res.status(500).json({ message: e.message })
  }
})

// Get EXIF data for a photo
router.get('/photos/:id/exif', async (req, res) => {
  const photo = getPhotoById(req.params.id)
  if (!photo) return res.status(404).json({ message: '照片不存在' })

  const exif = await extractExif(photo)
  if (!exif) return res.json(null)
  res.json(exif)
})

// Get orphaned files
router.get('/batch/orphaned', (req, res) => {
  const folder = req.query.folder as string
  if (!folder) return res.status(400).json({ message: '缺少 folder 参数' })
  const photos = getPhotosForFolder(folder)
  const jpg = photos.filter(p => p.orphanType === 'jpg')
  const raw = photos.filter(p => p.orphanType === 'raw')
  res.json({ jpg, raw })
})

// Delete orphaned files
router.post('/batch/orphaned', async (req, res) => {
  const { type, folder } = req.body
  if (!type || !['jpg', 'raw'].includes(type)) {
    return res.status(400).json({ message: '无效类型' })
  }
  if (!folder) return res.status(400).json({ message: '缺少 folder 参数' })

  const photos = getPhotosForFolder(folder)
  const orphaned = photos.filter(p => p.orphanType === type)

  try {
    const result = await deleteOrphanedFiles(orphaned, type)
    res.json({ success: true, deleted: result.deleted, failed: result.failed })
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
  const folder = req.query.folder as string
  if (!folder) return res.status(400).json({ message: '缺少 folder 参数' })
  if (!isPathAllowed(folder)) return res.status(403).json({ message: '不允许访问此路径' })
  if (getPhotosForFolder(folder).length === 0) {
    try { scanFolder(folder) } catch (e: any) { return res.status(400).json({ message: e.message }) }
  }
  const photo = getRandomUnreviewedPhoto(folder)
  res.json(photo)
})

// Get batch of random photos
router.get('/reviews/random/batch', (req, res) => {
  const folder = req.query.folder as string
  if (!folder) return res.status(400).json({ message: '缺少 folder 参数' })
  if (!isPathAllowed(folder)) return res.status(403).json({ message: '不允许访问此路径' })
  const count = Math.min(Math.max(Number(req.query.count) || 20, 1), 100)
  if (getPhotosForFolder(folder).length === 0) {
    try { scanFolder(folder) } catch (e: any) { return res.status(400).json({ message: e.message }) }
  }
  const photos = getRandomUnreviewedPhotos(folder, count)
  res.json({ photos, total: photos.length })
})

// Get stats
router.get('/stats', (req, res) => {
  const folder = req.query.folder as string
  if (!folder) return res.status(400).json({ message: '缺少 folder 参数' })
  res.json(getStats(folder))
})

// Get settings
router.get('/settings', (_req, res) => {
  const cacheDays = getCacheDays()
  res.json({ random_cache_days: String(cacheDays) })
})

// Update settings
router.put('/settings', (req, res) => {
  const { random_cache_days } = req.body
  if (random_cache_days) {
    const days = Number(random_cache_days)
    if (isNaN(days) || days < 1) return res.status(400).json({ message: '缓存天数必须为正整数' })
    setCacheDays(days)
  }
  res.json({ success: true })
})

// --- Similarity endpoints ---

// Analyze folder for similar photos
router.post('/similarity/analyze', async (req, res) => {
  const { folder, timeGap, hashThreshold } = req.body
  if (!folder) return res.status(400).json({ message: '缺少 folder 参数' })
  if (!isPathAllowed(folder)) return res.status(403).json({ message: '不允许访问此路径' })

  try {
    const result = await analyzeFolder(folder, timeGap, hashThreshold)
    res.json(result)
  } catch (e: any) {
    res.status(500).json({ message: e.message })
  }
})

// Get similar groups
router.get('/similarity/groups', (req, res) => {
  const folder = req.query.folder as string
  if (!folder) return res.status(400).json({ message: '缺少 folder 参数' })
  if (!isPathAllowed(folder)) return res.status(403).json({ message: '不允许访问此路径' })

  const timeGap = Number(req.query.timeGap) || undefined
  const hashThreshold = Number(req.query.hashThreshold) || undefined
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 50

  const groups = getSimilarGroups(folder, timeGap, hashThreshold)
  const start = (page - 1) * limit
  const paged = groups.slice(start, start + limit)

  res.json({ groups: paged, total: groups.length })
})

// Get similarity stats
router.get('/similarity/stats', (req, res) => {
  const folder = req.query.folder as string
  if (!folder) return res.status(400).json({ message: '缺少 folder 参数' })

  const stats = getSimilarStats(folder)
  res.json(stats)
})

export default router
