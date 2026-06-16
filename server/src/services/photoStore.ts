import path from 'path'
import { resolveNormalized } from '../utils/path.js'
import type { PhotoGroup, SubfolderInfo } from '@photo-review/shared'

// In-memory store for scanned photos (keyed by folder path)
const MAX_FOLDERS = 10
const photoStore = new Map<string, PhotoGroup[]>()
const photoIndex = new Map<string, PhotoGroup>()

export function getPhotoById(id: string): PhotoGroup | undefined {
  return photoIndex.get(id)
}

export function getPhotosForFolder(folder: string): PhotoGroup[] {
  return photoStore.get(resolveNormalized(folder)) || []
}

export function getSubfolders(folder: string): SubfolderInfo[] {
  const photos = photoStore.get(resolveNormalized(folder)) || []
  const counts = new Map<string, number>()
  for (const p of photos) {
    counts.set(p.subfolder, (counts.get(p.subfolder) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([p, count]) => ({
      name: p === '.' ? '(根目录)' : path.basename(p),
      path: p,
      count,
    }))
    .sort((a, b) => {
      if (a.path === '.') return -1
      if (b.path === '.') return 1
      return a.name.localeCompare(b.name, 'zh-CN')
    })
}

export function removePhoto(id: string): boolean {
  const photo = photoIndex.get(id)
  if (!photo) return false
  photoIndex.delete(id)
  const list = photoStore.get(photo.folder)
  if (list) {
    const idx = list.indexOf(photo)
    if (idx !== -1) list.splice(idx, 1)
  }
  return true
}

export function addPhoto(photo: PhotoGroup): void {
  if (photoIndex.has(photo.id)) return
  const folderKey = resolveNormalized(photo.folder)
  if (!photoStore.has(folderKey)) {
    photoStore.set(folderKey, [])
  }
  photoStore.get(folderKey)!.push(photo)
  photoIndex.set(photo.id, photo)
}

export function setFolderPhotos(folder: string, photos: PhotoGroup[]): void {
  const normalized = resolveNormalized(folder)

  // Clean up old index entries for this folder
  const oldPhotos = photoStore.get(normalized)
  if (oldPhotos) {
    for (const p of oldPhotos) photoIndex.delete(p.id)
  }

  // Evict oldest folder if at capacity
  if (!photoStore.has(normalized) && photoStore.size >= MAX_FOLDERS) {
    const oldestKey = photoStore.keys().next().value
    if (oldestKey !== undefined) {
      const oldest = photoStore.get(oldestKey)!
      for (const p of oldest) photoIndex.delete(p.id)
      photoStore.delete(oldestKey)
    }
  }

  photoStore.set(normalized, photos)
  for (const p of photos) photoIndex.set(p.id, p)
}
