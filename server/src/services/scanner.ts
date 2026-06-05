import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { resolveNormalized, normalizePath } from '../utils/path.js'

const JPG_EXTS = new Set(['.jpg', '.jpeg'])
const RAW_EXTS = new Set(['.cr2', '.cr3', '.nef'])

export interface PhotoGroup {
  id: string
  name: string
  jpgPath: string | null
  rawPaths: string[]
  hasJpg: boolean
  hasRaw: boolean
  isOrphan: boolean
  orphanType?: 'jpg' | 'raw'
  date?: string
  folder: string
  subfolder: string
}

export interface SubfolderInfo {
  name: string
  path: string
  count: number
}

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

export async function scanFolder(folderPath: string): Promise<{
  photos: PhotoGroup[]
  total: number
  paired: number
  orphanJpg: number
  orphanRaw: number
}> {
  const normalized = resolveNormalized(folderPath)

  if (!fs.existsSync(normalized)) {
    throw new Error(`文件夹不存在: ${normalized}`)
  }

  const stat = await fs.promises.stat(normalized)
  if (!stat.isDirectory()) {
    throw new Error('路径不是一个文件夹')
  }

  const groups = new Map<string, { jpg: string[]; raw: string[]; dir: string }>()
  const visited = new Set<string>()

  const walkDir = async (dir: string) => {
    const realDir = await fs.promises.realpath(dir)
    if (visited.has(realDir)) return
    visited.add(realDir)
    const entries = await fs.promises.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = normalizePath(path.join(dir, entry.name))
      if (entry.isDirectory()) {
        await walkDir(fullPath)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        const baseName = path.basename(entry.name, path.extname(entry.name))

        if (JPG_EXTS.has(ext) || RAW_EXTS.has(ext)) {
          const key = normalizePath(path.join(dir, baseName))
          if (!groups.has(key)) {
            groups.set(key, { jpg: [], raw: [], dir })
          }
          const group = groups.get(key)!
          if (JPG_EXTS.has(ext)) {
            group.jpg.push(fullPath)
          } else {
            group.raw.push(fullPath)
          }
        }
      }
    }
  }

  await walkDir(normalized)

  const photos: PhotoGroup[] = []
  let paired = 0
  let orphanJpg = 0
  let orphanRaw = 0

  for (const [key, group] of groups) {
    const hasJpg = group.jpg.length > 0
    const hasRaw = group.raw.length > 0
    const isOrphan = !hasJpg || !hasRaw
    let orphanType: 'jpg' | 'raw' | undefined
    if (isOrphan) {
      orphanType = hasJpg ? 'jpg' : 'raw'
    }

    let date: string | undefined
    try {
      const fileStat = await fs.promises.stat(group.jpg[0] || group.raw[0])
      date = fileStat.mtime.toISOString().slice(0, 10)
    } catch {}

    const relative = path.relative(normalized, group.dir) || '.'
    const photo: PhotoGroup = {
      id: crypto.createHash('md5').update(key).digest('hex'),
      name: path.basename(key) + (hasJpg ? '.JPG' : path.extname(group.raw[0]).toUpperCase()),
      jpgPath: hasJpg ? group.jpg[0] : null,
      rawPaths: group.raw,
      hasJpg,
      hasRaw,
      isOrphan,
      orphanType,
      date,
      folder: normalized,
      subfolder: normalizePath(relative),
    }

    photos.push(photo)
    if (isOrphan) {
      if (orphanType === 'jpg') orphanJpg++
      else orphanRaw++
    } else {
      paired++
    }
  }

  photos.sort((a, b) => (a.date || '').localeCompare(b.date || ''))

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

  return { photos, total: photos.length, paired, orphanJpg, orphanRaw }
}
