import { getDb } from '../db/index.js'
import { type PhotoGroup, getPhotosForFolder } from './scanner.js'

let currentFolder = ''

export function setCurrentFolder(folder: string) {
  currentFolder = folder
}

export function getCurrentFolder(): string {
  return currentFolder
}

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

export function getRandomUnreviewedPhoto(): PhotoGroup | null {
  const db = getDb()
  const photos = getPhotosForFolder(currentFolder).filter(p => !p.isOrphan)
  if (photos.length === 0) return null

  const now = new Date().toISOString()

  // Get file paths that have been recently reviewed and are still in cache
  const cached = db.prepare(`
    SELECT file_path FROM review_records
    WHERE cache_until IS NOT NULL AND cache_until > ?
  `).all(now) as { file_path: string }[]

  const cachedPaths = new Set(cached.map(r => r.file_path))

  // Filter out cached photos
  const candidates = photos.filter(p => {
    const filePath = p.jpgPath || p.rawPaths[0] || ''
    return !cachedPaths.has(filePath)
  })

  if (candidates.length === 0) return null

  const idx = Math.floor(Math.random() * candidates.length)
  return candidates[idx]
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

export function getStats() {
  const db = getDb()
  const photos = getPhotosForFolder(currentFolder)

  const total = photos.filter(p => !p.isOrphan).length
  const reviewed = db.prepare(`
    SELECT COUNT(*) as count FROM review_records
  `).get() as { count: number }

  const orphanJpg = photos.filter(p => p.orphanType === 'jpg').length
  const orphanRaw = photos.filter(p => p.orphanType === 'raw').length

  return {
    total,
    reviewed: reviewed.count,
    pending: total - reviewed.count,
    orphanJpg,
    orphanRaw,
  }
}
