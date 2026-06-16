import type { PhotoGroupWithStatus } from '@photo-review/shared'
import { getPhotosForFolder } from './photoStore.js'
import { getPrimaryPath } from '../utils/path.js'
import { getReviewStatuses } from './review.js'
import { getPhotoMetaBatch } from './photoMeta.js'
import { DEFAULT_PAGE_LIMIT } from '../config.js'

export interface PhotosQueryOptions {
  page?: number
  limit?: number
  status?: 'unreviewed' | 'reviewed'
  subfolder?: string
}

/**
 * 获取指定文件夹的照片列表，附带审阅状态、评分、收藏信息。
 * 支持按状态/子文件夹过滤及分页，分页在内存中执行（数据集有限）。
 */
export function getPhotosWithStatus(
  folder: string,
  options: PhotosQueryOptions = {}
): { photos: PhotoGroupWithStatus[]; total: number } {
  const { page, limit, status, subfolder } = options

  const photos = getPhotosForFolder(folder)
  const filePaths = photos.map(p => getPrimaryPath(p) || '')
  const reviewMap = getReviewStatuses(filePaths)
  const metaMap = getPhotoMetaBatch(filePaths)

  const photosWithStatus: PhotoGroupWithStatus[] = photos.map((p, i) => {
    const filePath = filePaths[i]
    const reviewStatus = reviewMap.get(filePath)
    const meta = metaMap.get(filePath)
    return {
      ...p,
      reviewAction: reviewStatus?.action || null,
      reviewedAt: reviewStatus?.reviewedAt || null,
      rating: meta?.rating ?? 0,
      favorite: meta?.favorite ?? false,
    }
  })

  let filtered = photosWithStatus
  if (subfolder) {
    filtered = filtered.filter(p => p.subfolder === subfolder)
  }
  if (status === 'unreviewed') {
    filtered = filtered.filter(p => !p.reviewAction)
  } else if (status === 'reviewed') {
    filtered = filtered.filter(p => p.reviewAction)
  }

  const pageNum = page && page > 0 ? page : 1
  const limitNum = limit && limit > 0 ? limit : DEFAULT_PAGE_LIMIT
  const start = (pageNum - 1) * limitNum
  const paged = filtered.slice(start, start + limitNum)

  return { photos: paged, total: filtered.length }
}
