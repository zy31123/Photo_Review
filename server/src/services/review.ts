import { getDb } from '../db/index.js'
import { type PhotoGroup, getPhotosForFolder } from './scanner.js'

export function recordReview(filePath: string, fileName: string, action: 'keep' | 'deleted', mode: 'sequential' | 'random', cacheDays?: number) {
  const db = getDb()
  let cacheUntil: string | null = null
  if (cacheDays && cacheDays > 0) {
    const until = new Date()
    until.setDate(until.getDate() + cacheDays)
    cacheUntil = until.toISOString()
  }

  db.prepare(`
    INSERT OR REPLACE INTO review_records (file_path, file_name, action, review_mode, cache_until)
    VALUES (?, ?, ?, ?, ?)
  `).run(filePath, fileName, action, mode, cacheUntil)
}

function getCandidates(folder: string): PhotoGroup[] {
  const db = getDb()
  const photos = getPhotosForFolder(folder)
  if (photos.length === 0) return []

  const now = new Date().toISOString()
  const filePaths = photos.map(p => p.jpgPath || p.rawPaths[0] || '')
  const placeholders = filePaths.map(() => '?').join(',')

  const cached = filePaths.length > 0
    ? (db.prepare(`SELECT file_path FROM review_records WHERE cache_until IS NOT NULL AND cache_until > ? AND file_path IN (${placeholders})`).all(now, ...filePaths) as { file_path: string }[])
    : []

  const cachedPaths = new Set(cached.map(r => r.file_path))

  return photos.filter(p => {
    const filePath = p.jpgPath || p.rawPaths[0] || ''
    return !cachedPaths.has(filePath)
  })
}

export function getRandomUnreviewedPhoto(folder: string): PhotoGroup | null {
  const candidates = getCandidates(folder)
  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export function getRandomUnreviewedPhotos(folder: string, count: number): PhotoGroup[] {
  const candidates = getCandidates(folder)
  const result = [...candidates]
  const n = Math.min(count, result.length)
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (result.length - i))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result.slice(0, n)
}

export function getCacheDays(): number {
  const db = getDb()
  const row = db.prepare("SELECT value FROM settings WHERE key = 'random_cache_days'").get() as { value: string } | undefined
  return row ? Number(row.value) : 7
}

export function setCacheDays(days: number) {
  const db = getDb()
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('random_cache_days', ?)").run(String(days))
}

export function getStats(folder: string) {
  const db = getDb()
  const photos = getPhotosForFolder(folder)

  const total = photos.filter(p => !p.isOrphan).length

  const filePaths = photos.map(p => p.jpgPath || p.rawPaths[0] || '')
  const placeholders = filePaths.map(() => '?').join(',')
  const reviewedCount = filePaths.length > 0
    ? (db.prepare(`SELECT COUNT(*) as count FROM review_records WHERE file_path IN (${placeholders})`).get(...filePaths) as { count: number }).count
    : 0

  const orphanJpg = photos.filter(p => p.orphanType === 'jpg').length
  const orphanRaw = photos.filter(p => p.orphanType === 'raw').length

  return {
    total,
    reviewed: reviewedCount,
    pending: Math.max(0, total - reviewedCount),
    orphanJpg,
    orphanRaw,
  }
}
