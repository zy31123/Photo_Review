import { getDb } from '../db/index.js'

export interface PhotoMeta {
  rating: number
  favorite: boolean
}

// SQLite SQLITE_MAX_VARIABLE_NUMBER 安全上限
const SQLITE_IN_CHUNK = 900

/** 批量获取照片 meta，返回 Map<filePath, PhotoMeta> */
export function getPhotoMetaBatch(filePaths: string[]): Map<string, PhotoMeta> {
  const result = new Map<string, PhotoMeta>()
  if (filePaths.length === 0) return result

  const db = getDb()

  for (let i = 0; i < filePaths.length; i += SQLITE_IN_CHUNK) {
    const chunk = filePaths.slice(i, i + SQLITE_IN_CHUNK)
    const placeholders = chunk.map(() => '?').join(',')
    const rows = db.prepare(
      `SELECT photo_path, rating, favorite FROM photo_meta WHERE photo_path IN (${placeholders})`
    ).all(...chunk) as { photo_path: string; rating: number; favorite: number }[]

    for (const row of rows) {
      result.set(row.photo_path, { rating: row.rating, favorite: row.favorite === 1 })
    }
  }
  return result
}

/** 设置照片评分 (0-5) */
export function setRating(filePath: string, rating: number): void {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)))
  const db = getDb()
  db.prepare(`
    INSERT INTO photo_meta (photo_path, rating, favorite, updated_at)
    VALUES (?, ?, 0, CURRENT_TIMESTAMP)
    ON CONFLICT(photo_path) DO UPDATE SET rating = ?, updated_at = CURRENT_TIMESTAMP
  `).run(filePath, clamped, clamped)
}

/** 切换收藏状态，返回新状态 */
export function toggleFavorite(filePath: string): boolean {
  const db = getDb()
  const row = db.prepare('SELECT favorite FROM photo_meta WHERE photo_path = ?').get(filePath) as { favorite: number } | undefined
  const newValue = row ? (row.favorite === 1 ? 0 : 1) : 1
  db.prepare(`
    INSERT INTO photo_meta (photo_path, rating, favorite, updated_at)
    VALUES (?, 0, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(photo_path) DO UPDATE SET favorite = ?, updated_at = CURRENT_TIMESTAMP
  `).run(filePath, newValue, newValue)
  return newValue === 1
}

/** 设置收藏状态（用于撤销时恢复确定值） */
export function setFavorite(filePath: string, value: boolean): void {
  const db = getDb()
  db.prepare(`
    INSERT INTO photo_meta (photo_path, rating, favorite, updated_at)
    VALUES (?, 0, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(photo_path) DO UPDATE SET favorite = ?, updated_at = CURRENT_TIMESTAMP
  `).run(filePath, value ? 1 : 0, value ? 1 : 0)
}
