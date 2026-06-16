import type { PhotoGroup, PhotoGroupWithStatus, ReviewAction } from '@photo-review/shared'
import { getDb } from '../db/index.js'
import { moveToTrash, restoreFromTrash } from './trash.js'
import { removePhoto, addPhoto } from './photoStore.js'
import { getPrimaryPath } from '../utils/path.js'
import { getReviewStatuses, recordReview, deleteReviewRecord } from './review.js'
import { getPhotoMetaBatch } from './photoMeta.js'

export interface RestoreItem {
  photoId: string
  trashPaths: Record<string, string>
  previousReviewAction: ReviewAction | null
}

export interface DeleteResult {
  success: boolean
  trashPaths?: Record<string, string>
  message?: string
}

/**
 * 将照片移入回收站，并在 deleted_photos 表中记录以便撤销。
 *
 * 执行顺序: 文件移动 → DB INSERT → 内存移除。
 * 若 DB INSERT 失败，执行补偿操作将文件移回原位，确保三态一致。
 */
export function deletePhotoToTrash(photo: PhotoGroup): DeleteResult {
  const { trashPaths } = moveToTrash(photo)

  if (Object.keys(trashPaths).length === 0) {
    return { success: false, message: '无法移动文件到回收站' }
  }

  const db = getDb()
  const originalPaths = [photo.jpgPath, ...photo.rawPaths].filter(Boolean) as string[]

  try {
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
  } catch (err) {
    // DB 写入失败: 补偿回滚，将文件从回收站移回原位
    restoreFromTrash(photo.id, trashPaths)
    throw err
  }

  removePhoto(photo.id)
  return { success: true, trashPaths }
}

/**
 * 为单张照片构建带状态的返回对象。
 */
function buildPhotoWithStatus(photoData: PhotoGroup): PhotoGroupWithStatus {
  const filePath = getPrimaryPath(photoData) || ''
  const reviewMap = getReviewStatuses([filePath])
  const metaMap = getPhotoMetaBatch([filePath])
  const status = reviewMap.get(filePath)
  const meta = metaMap.get(filePath)

  return {
    ...photoData,
    reviewAction: status?.action || null,
    reviewedAt: status?.reviewedAt || null,
    rating: meta?.rating ?? 0,
    favorite: meta?.favorite ?? false,
  }
}

/**
 * 恢复单张已删除照片（非事务，仅用于单张恢复接口）。
 * 执行顺序: 文件还原 → addPhoto → DB 清理 → 返回带状态对象。
 */
export function restorePhoto(item: RestoreItem): PhotoGroupWithStatus | null {
  const { restored } = restoreFromTrash(item.photoId, item.trashPaths)
  if (restored.length === 0) return null

  const db = getDb()
  const row = db.prepare(
    'SELECT photo_data, folder FROM deleted_photos WHERE id = ?'
  ).get(item.photoId) as { photo_data: string; folder: string } | undefined

  if (!row) return null

  const photoData: PhotoGroup = JSON.parse(row.photo_data)
  addPhoto(photoData)

  const filePath = getPrimaryPath(photoData) || ''
  if (item.previousReviewAction) {
    recordReview(filePath, photoData.name, item.previousReviewAction, 'sequential')
  } else {
    deleteReviewRecord(filePath)
  }

  db.prepare('DELETE FROM deleted_photos WHERE id = ?').run(item.photoId)

  return buildPhotoWithStatus(photoData)
}

/**
 * 批量恢复已删除照片。
 *
 * 策略: 两阶段执行，避免文件 I/O 被 SQLite 事务回滚导致不可逆的不一致。
 *   Phase 1 (事务外): 逐项执行文件还原 + addPhoto，失败项跳过并记录日志。
 *   Phase 2 (事务内): 仅对成功项做 DB 操作（审阅记录 + 清除 deleted_photos）。
 *
 * 返回成功恢复的照片数组。部分失败时返回已成功项，不会回滚已成功的恢复。
 */
export function restorePhotos(items: RestoreItem[]): PhotoGroupWithStatus[] {
  if (items.length === 0) return []
  const db = getDb()

  // ── Phase 1: 文件 I/O + 内存更新（事务外，失败项跳过） ──

  interface RestoredEntry {
    item: RestoreItem
    photoData: PhotoGroup
  }

  const entries: RestoredEntry[] = []

  for (const item of items) {
    const { restored } = restoreFromTrash(item.photoId, item.trashPaths)
    if (restored.length === 0) {
      console.error(`[restorePhotos] 文件还原失败: photoId=${item.photoId}`)
      continue
    }

    const row = db.prepare(
      'SELECT photo_data, folder FROM deleted_photos WHERE id = ?'
    ).get(item.photoId) as { photo_data: string; folder: string } | undefined

    if (!row) {
      console.error(`[restorePhotos] deleted_photos 记录缺失: photoId=${item.photoId}`)
      continue
    }

    const photoData: PhotoGroup = JSON.parse(row.photo_data)
    addPhoto(photoData)
    entries.push({ item, photoData })
  }

  if (entries.length === 0) return []

  // ── Phase 2: 仅 DB 操作（事务内） ──

  try {
    db.transaction(() => {
      for (const { item, photoData } of entries) {
        const filePath = getPrimaryPath(photoData) || ''
        if (item.previousReviewAction) {
          recordReview(filePath, photoData.name, item.previousReviewAction, 'sequential')
        } else {
          deleteReviewRecord(filePath)
        }
        db.prepare('DELETE FROM deleted_photos WHERE id = ?').run(item.photoId)
      }
    })()
  } catch (err) {
    // DB 事务失败 (极罕见): 文件已恢复、addPhoto 已执行但 DB 记录未清理。
    // 返回已成功项，让调用方知晓部分恢复。
    console.error('[restorePhotos] Phase 2 DB 事务失败:', err)
  }

  // ── 构建带状态的返回值 ──

  return entries.map(({ photoData }) => buildPhotoWithStatus(photoData))
}
