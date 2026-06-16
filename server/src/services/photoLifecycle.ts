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
 * 事务: DB 写入 + removePhoto 在同一调用中完成。
 */
export function deletePhotoToTrash(photo: PhotoGroup): DeleteResult {
  const { trashPaths, failed } = moveToTrash(photo)

  if (Object.keys(trashPaths).length === 0) {
    return { success: false, message: '无法移动文件到回收站' }
  }

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
  return { success: true, trashPaths }
}

/**
 * 恢复单张照片：从回收站还原文件 → 重建内存存储 → 处理审阅记录 → 清除 deleted_photos。
 * 返回带有完整状态的照片对象。
 */
function restoreSingle(item: RestoreItem): PhotoGroupWithStatus | null {
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
 * 恢复单张已删除照片（外部调用）。
 */
export function restorePhoto(item: RestoreItem): PhotoGroupWithStatus | null {
  return restoreSingle(item)
}

/**
 * 批量恢复已删除照片，全部操作包裹在单个 SQLite 事务中，
 * 任一步骤失败则整体回滚。
 */
export function restorePhotos(items: RestoreItem[]): PhotoGroupWithStatus[] {
  const db = getDb()
  const restoredPhotos: PhotoGroupWithStatus[] = []

  const runInTransaction = db.transaction(() => {
    for (const item of items) {
      const result = restoreSingle(item)
      if (result) restoredPhotos.push(result)
    }
  })

  runInTransaction()
  return restoredPhotos
}
