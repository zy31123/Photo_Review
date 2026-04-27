import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { type PhotoGroup } from './scanner.js'

const THUMBNAIL_SIZE = 200
const MAX_CACHE_SIZE = 500

// LRU thumbnail cache
const thumbCache = new Map<string, Buffer>()

export async function getThumbnail(photo: PhotoGroup): Promise<Buffer | null> {
  const sourcePath = photo.jpgPath || photo.rawPaths[0]
  if (!sourcePath) return null

  const cached = thumbCache.get(photo.id)
  if (cached) {
    thumbCache.delete(photo.id)
    thumbCache.set(photo.id, cached)
    return cached
  }

  try {
    const buf = await sharp(sourcePath, { failOn: 'none' })
      .rotate()
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
      .jpeg({ quality: 70 })
      .toBuffer()

    thumbCache.set(photo.id, buf)
    if (thumbCache.size > MAX_CACHE_SIZE) {
      const oldest = thumbCache.keys().next().value
      if (oldest !== undefined) thumbCache.delete(oldest)
    }
    return buf
  } catch {
    return null
  }
}

export function getFullImageStream(photo: PhotoGroup): NodeJS.ReadableStream | null {
  const sourcePath = photo.jpgPath || photo.rawPaths[0]
  if (!sourcePath || !fs.existsSync(sourcePath)) return null

  return fs.createReadStream(sourcePath)
}

export function getImageMimeType(photo: PhotoGroup): string {
  const sourcePath = photo.jpgPath || photo.rawPaths[0]
  if (!sourcePath) return 'image/jpeg'
  const ext = path.extname(sourcePath).toLowerCase()
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.cr2': 'image/x-canon-cr2',
    '.cr3': 'image/x-canon-cr3',
    '.nef': 'image/x-nikon-nef',
  }
  return mimeMap[ext] || 'application/octet-stream'
}
