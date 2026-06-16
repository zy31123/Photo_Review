// 相似分析编排层：组合 hash 计算 + 聚类 + DB 持久化
// 所有 IO（DB、文件系统）集中在此文件

import pLimit from 'p-limit'
import { getDb } from '../../db/index.js'
import type { PhotoGroup, PhotoGroupWithStatus, SimilarGroup, AnalyzeResult } from '@photo-review/shared'
import { getPhotosForFolder } from '../photoStore.js'
import { getPrimaryPath } from '../../utils/path.js'
import { getReviewStatuses } from '../review.js'
import { getPhotoMetaBatch } from '../photoMeta.js'
import { computeDHash, computeColorHistogram } from './hash.js'
import { buildGroups, type HashRecord, type SimilarGroupRaw } from './clustering.js'

// SQLite SQLITE_MAX_VARIABLE_NUMBER 安全上限（兼容旧版 SQLite < 3.32）
const SQLITE_IN_CHUNK = 900

// --- 批量加载哈希记录（修复 N+1 查询 + IN 分批） ---

function loadHashesForPhotos(photos: PhotoGroup[]): Map<string, HashRecord> {
  const filePathToId = new Map<string, string>()
  const filePaths: string[] = []

  for (const photo of photos) {
    const filePath = getPrimaryPath(photo)
    if (!filePath) continue
    filePathToId.set(filePath, photo.id)
    filePaths.push(filePath)
  }

  if (filePaths.length === 0) return new Map()

  const db = getDb()
  const result = new Map<string, HashRecord>()

  // 分批查询，避免超过 SQLite 参数上限
  for (let i = 0; i < filePaths.length; i += SQLITE_IN_CHUNK) {
    const chunk = filePaths.slice(i, i + SQLITE_IN_CHUNK)
    const placeholders = chunk.map(() => '?').join(',')
    // SQL 别名对齐 HashRecord camelCase 字段名
    const rows = db
      .prepare(
        `SELECT file_path AS filePath, dhash, width, height,
                file_size AS fileSize, color_hist AS colorHist
         FROM photo_hashes WHERE file_path IN (${placeholders})`,
      )
      .all(...chunk) as HashRecord[]

    for (const row of rows) {
      const photoId = filePathToId.get(row.filePath)
      if (photoId) result.set(photoId, row)
    }
  }

  return result
}

// --- 为分组照片补充审阅状态 ---

function enrichGroupsWithStatus(rawGroups: SimilarGroupRaw[]): SimilarGroup[] {
  const allPhotos = rawGroups.flatMap(g => g.photos)
  if (allPhotos.length === 0) return rawGroups as SimilarGroup[]

  const filePaths = allPhotos.map(p => getPrimaryPath(p) || '')
  const reviewMap = getReviewStatuses(filePaths)
  const metaMap = getPhotoMetaBatch(filePaths)

  return rawGroups.map(group => ({
    ...group,
    photos: group.photos.map(photo => {
      const filePath = getPrimaryPath(photo) || ''
      const status = reviewMap.get(filePath)
      const meta = metaMap.get(filePath)
      return {
        ...photo,
        reviewAction: status?.action || null,
        reviewedAt: status?.reviewedAt || null,
        rating: meta?.rating ?? 0,
        favorite: meta?.favorite ?? false,
      }
    }),
  }))
}

// --- 主流程 ---

export async function analyzeFolder(
  folder: string,
  timeGap = 30,
  strictThreshold = 8,
  relaxedThreshold = 15,
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal,
): Promise<AnalyzeResult> {
  const photos = getPhotosForFolder(folder)
  const db = getDb()

  // 1. Load existing hashes for this folder's photos only
  const existingHashes = loadHashesForPhotos(photos)

  // 2. Compute hashes for photos that don't have one yet — parallel with p-limit
  const insertStmt = db.prepare(
    'INSERT OR REPLACE INTO photo_hashes (file_path, dhash, width, height, file_size, color_hist) VALUES (?, ?, ?, ?, ?, ?)',
  )
  // 预 prepare UPDATE 语句，避免循环内重复 prepare（N+1 写入修复）
  const updateHistStmt = db.prepare(
    'UPDATE photo_hashes SET color_hist = ? WHERE file_path = ?',
  )
  let computed = 0
  let skipped = 0

  const total = photos.length
  let processed = 0
  const photoHashMap = new Map<string, HashRecord>()

  const limit = pLimit(4)

  await Promise.all(
    photos.map(photo =>
      limit(async () => {
        if (signal?.aborted) return
        const filePath = getPrimaryPath(photo)
        if (!filePath) return

        const existing = existingHashes.get(photo.id)
        if (existing) {
          // Backfill color histogram for records that lack one
          if (!existing.colorHist) {
            try {
              const hist = await computeColorHistogram(filePath)
              // 创建新对象避免就地突变 DB 返回的记录
              const updated: HashRecord = { ...existing, colorHist: hist }
              updateHistStmt.run(hist, filePath)
              photoHashMap.set(photo.id, updated)
            } catch (err) {
              // UPDATE 失败时保留原记录（无 histogram）
              console.error(`[similarity] colorHist backfill failed for ${filePath}:`, err)
              photoHashMap.set(photo.id, existing)
            }
          } else {
            photoHashMap.set(photo.id, existing)
          }
          skipped++
        } else {
          try {
            const [dhashResult, colorHist] = await Promise.all([
              computeDHash(filePath),
              computeColorHistogram(filePath),
            ])
            const record: HashRecord = {
              filePath,
              dhash: dhashResult.hash,
              width: dhashResult.width,
              height: dhashResult.height,
              fileSize: dhashResult.fileSize,
              colorHist,
            }
            insertStmt.run(
              filePath,
              dhashResult.hash,
              dhashResult.width,
              dhashResult.height,
              dhashResult.fileSize,
              colorHist,
            )
            photoHashMap.set(photo.id, record)
            computed++
          } catch {
            // Skip photos that fail to process
          }
        }
        processed++
        onProgress?.(processed, total)
      }),
    ),
  )

  // 3. Build similar groups（断连时跳过，避免无意义的 CPU 消耗）
  if (signal?.aborted) {
    return { computed, skipped, totalGroups: 0, totalPhotos: 0 }
  }
  const groups = buildGroups(photos, photoHashMap, timeGap, strictThreshold, relaxedThreshold)

  return {
    computed,
    skipped,
    totalGroups: groups.length,
    totalPhotos: groups.reduce((sum, g) => sum + g.photos.length, 0),
  }
}

export function getSimilarGroups(
  folder: string,
  timeGap = 30,
  strictThreshold = 8,
  relaxedThreshold = 15,
): SimilarGroup[] {
  const photos = getPhotosForFolder(folder)
  const photoHashMap = loadHashesForPhotos(photos)
  const rawGroups = buildGroups(photos, photoHashMap, timeGap, strictThreshold, relaxedThreshold)
  // 补充审阅状态字段，对齐 SimilarGroup 的 PhotoGroupWithStatus[] 类型
  return enrichGroupsWithStatus(rawGroups)
}

// 复用已加载的哈希记录，避免 getSimilarGroups 重复执行 loadHashesForPhotos + buildGroups
export function getSimilarStats(
  folder: string,
  timeGap = 30,
  strictThreshold = 8,
  relaxedThreshold = 15,
): { analyzed: number; total: number; groups: number } {
  const photos = getPhotosForFolder(folder)
  const total = photos.length

  if (total === 0) return { analyzed: 0, total: 0, groups: 0 }

  const photoHashMap = loadHashesForPhotos(photos)
  const groups = buildGroups(photos, photoHashMap, timeGap, strictThreshold, relaxedThreshold)

  return { analyzed: photoHashMap.size, total, groups: groups.length }
}
